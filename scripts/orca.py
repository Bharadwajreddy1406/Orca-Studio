"""Orca Studio command line: render any project without remembering which tools it uses."""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT_FOR_IMPORTS = str(Path(__file__).resolve().parents[1])
if ROOT_FOR_IMPORTS not in sys.path:
    sys.path.insert(0, ROOT_FOR_IMPORTS)

from shared import machine

if __package__:
    from .create import (
        create_project,
        numbered_projects,
        repository_root,
        resolve_project,
    )
    from .orca_setup import command_doctor, command_setup
else:
    from create import (
        create_project,
        numbered_projects,
        repository_root,
        resolve_project,
    )
    from orca_setup import command_doctor, command_setup


FINAL_RENDER = ("1080p60", ["-q", "delivery", "-f", "60"])
DRAFT_RENDER = ("draft", ["-q", "draft", "-f", "30"])
THREE_FILES = ("three.module.js", "three.core.js", "LICENSE")
COVER_SECONDS = "1.5"
KOKORO_VOICE = re.compile(r"^[abefhijpz][fm]_[a-z]+$")
CONFIGURED_VOICE = re.compile(r'^(\s*"voice":\s*")([^"]*)(")', re.MULTILINE)


def project_kind(project: Path) -> str | None:
    if (project / "scene.py").is_file():
        return "manim"
    if (project / "index.html").is_file() or (
        project / "source" / "index.template.html"
    ).is_file():
        return "hyperframes"
    return None


def configured_voice(project: Path) -> str | None:
    config = project / "voiceover.json"
    if not config.is_file():
        return None
    found = CONFIGURED_VOICE.search(config.read_text(encoding="utf-8"))
    return found.group(2) if found else None


def set_voice(project: Path, voice: str) -> None:
    """Write the voice into voiceover.json, leaving its option tables as they are."""
    config = project / "voiceover.json"
    text = config.read_text(encoding="utf-8")
    if not CONFIGURED_VOICE.search(text):
        raise ValueError(f'{config} has no "voice" field to change.')
    updated = CONFIGURED_VOICE.sub(rf"\g<1>{voice}\g<3>", text, count=1)
    if updated != text:
        config.write_text(updated, encoding="utf-8")


def is_stale(target: Path, sources: list[Path]) -> bool:
    """Return whether a build output is missing or older than anything it is made from."""
    if not target.exists():
        return True
    built_at = target.stat().st_mtime
    return any(
        source.exists() and source.stat().st_mtime > built_at for source in sources
    )


class Pipeline:
    """Runs a HyperFrames project's build steps, skipping any that are up to date."""

    def __init__(self, root: Path, project: Path, force: bool, dry_run: bool) -> None:
        self.root = root
        self.project = project
        self.force = force
        self.dry_run = dry_run

    def run(self, label: str, command: list[str], cwd: Path | None = None) -> None:
        print(f"  {label}", flush=True)
        if self.dry_run:
            return
        environment = {**os.environ, "PYTHONIOENCODING": "utf-8"}
        environment.setdefault("EARSHOT_HOME", str(machine.earshot_home()))
        if machine.load_config().get("hyperframes_telemetry") is False:
            environment["HYPERFRAMES_NO_TELEMETRY"] = "1"
            environment["HYPERFRAMES_NO_AUTO_INSTALL"] = "1"
        subprocess.run(command, cwd=cwd or self.root, env=environment, check=True)

    def step(
        self,
        label: str,
        script: str,
        python: str,
        target: str,
        sources: list[str],
    ) -> None:
        script_path = self.project / script
        if not script_path.is_file():
            return
        paths = [script_path, *(self.project / source for source in sources)]
        if self.force or is_stale(self.project / target, paths):
            self.run(label, [python, str(script_path)])
        else:
            print(f"  {label}: up to date, skipped", flush=True)

    def install_engine(self) -> None:
        self.run(
            "copying brand kit",
            [
                "node",
                str(self.root / "shared" / "brand" / "hyperframes" / "install.js"),
                str(self.project),
            ],
        )
        if self.dry_run:
            return
        library = self.project / "lib"
        library.mkdir(exist_ok=True)
        build = self.root / "node_modules" / "three" / "build"
        for name in THREE_FILES:
            source = (build if name != "LICENSE" else build.parent) / name
            shutil.copy2(source, library / name)
        # The shared Reel kit (stage, cast, end card), served from the project like the brand kit.
        kit = self.root / "shared" / "reel"
        if (self.project / "source" / "index.template.html").is_file() and kit.is_dir():
            target = self.project / "reel"
            target.mkdir(exist_ok=True)
            for script in kit.glob("*.js"):
                shutil.copy2(script, target / script.name)

    def build(self) -> None:
        python = sys.executable
        self.step(
            "narration (voice + word timings)",
            "build_narration.py",
            python,
            "timing.json",
            ["script.md", "voiceover.json"],
        )
        self.step(
            "timeline",
            "build_timeline.py",
            python,
            "index.html",
            ["timing.json", "source/index.template.html"],
        )
        self.step(
            "sound mix",
            "build_mix.py",
            str(machine.earshot_python_path()),
            "assets/audio/soundtrack.wav",
            ["cues.json", "timing.json"],
        )
        self.install_engine()

    def render(self, draft: bool) -> Path:
        preset, options = DRAFT_RENDER if draft else FINAL_RENDER
        output = self.root / "media" / "exports" / self.project.name / preset
        voice = configured_voice(self.project)
        name = f"{self.project.name}_{voice}" if voice else self.project.name
        video, merged = output / f"{name}_video.mp4", output / f"{name}_merged.mp4"
        cover = output / f"{name}_cover.png"
        hyperframes = machine.find_executable("hyperframes") or "hyperframes"
        if not self.dry_run:
            output.mkdir(parents=True, exist_ok=True)
        self.run(
            f"rendering picture ({preset})",
            [hyperframes, "render", "-o", str(video), *options],
            cwd=self.project,
        )
        soundtrack = self.project / "assets" / "audio" / "soundtrack.wav"
        if soundtrack.is_file():
            self.run(
                "merging audio",
                [
                    "ffmpeg",
                    "-y",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-i",
                    str(video),
                    "-i",
                    str(soundtrack),
                    "-map",
                    "0:v:0",
                    "-map",
                    "1:a:0",
                    "-c:v",
                    "copy",
                    "-c:a",
                    "aac",
                    "-b:a",
                    "192k",
                    "-ar",
                    "48000",
                    "-ac",
                    "2",
                    "-movflags",
                    "+faststart",
                    str(merged),
                ],
            )
        elif not self.dry_run:
            shutil.copy2(video, merged)
        self.run(
            "saving cover",
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-ss",
                COVER_SECONDS,
                "-i",
                str(merged),
                "-frames:v",
                "1",
                str(cover),
            ],
        )
        return merged


def command_render(arguments: argparse.Namespace, passthrough: list[str]) -> int:
    root = repository_root()
    project = resolve_project(arguments.project, root / "videos")
    kind = project_kind(project)
    if kind is None:
        print(f"orca: error: {project.name} has no scene.py or composition yet.")
        return 1

    if kind == "manim":
        print(f"{project.name} (Manim)", flush=True)
        command = [
            sys.executable,
            str(root / "scripts" / "render.py"),
            project.name,
            *passthrough,
            *(["--voice", arguments.voice] if arguments.voice else []),
        ]
        if arguments.dry_run:
            print("  " + " ".join(command))
            return 0
        return subprocess.run(command, cwd=root, check=False).returncode

    if passthrough:
        print(f"orca: error: unknown options for this project: {' '.join(passthrough)}")
        return 2
    print(f"{project.name} (HyperFrames)", flush=True)
    voices = arguments.voice.split(",") if arguments.voice else [None]
    for voice in voices:
        if voice is not None:
            if not KOKORO_VOICE.match(voice):
                print(f"orca: error: {voice!r} is not a Kokoro voice. See: orca voices")
                return 2
            print(f"Voice: {voice}", flush=True)
            if not arguments.dry_run:
                set_voice(project, voice)
        pipeline = Pipeline(root, project, arguments.force, arguments.dry_run)
        pipeline.build()
        merged = pipeline.render(arguments.draft)
        print(f"Done: {merged}" if not arguments.dry_run else "Dry run: no changes.")
    return 0


def command_list(_: argparse.Namespace, __: list[str]) -> int:
    root = repository_root()
    for number, project in sorted(numbered_projects(root / "videos")):
        print(f"{number:03d}  {project_kind(project) or 'empty':<11}  {project.name}")
    return 0


def command_create(arguments: argparse.Namespace, _: list[str]) -> int:
    destination = create_project(arguments.name)
    if machine.load_config().get("tts") == "edge-tts":
        # The template uses Kokoro; keep its option tables and swap only the settings.
        config = destination / "voiceover.json"
        lines = config.read_text(encoding="utf-8").splitlines()
        comments = [line for line in lines if line.lstrip().startswith("//")]
        settings = (
            '{"service": "edge-tts", "voice": "en-IN-NeerjaNeural", "options": {}}'
        )
        config.write_text("\n".join([*comments, settings]) + "\n", encoding="utf-8")
    print(f"Created {destination.name}\n{destination}")
    return 0


def command_voices(_: argparse.Namespace, __: list[str]) -> int:
    root = repository_root()
    script = str(root / "scripts" / "render.py")
    return subprocess.run(
        [sys.executable, script, "--list-kokoro-voices"], cwd=root, check=False
    ).returncode


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="orca",
        description="Orca Studio: render and manage video projects.",
    )
    commands = parser.add_subparsers(dest="command", required=True)

    render = commands.add_parser(
        "render",
        help="Build and render a project, whichever tools it uses.",
        description=(
            "Render a project. HyperFrames projects rebuild only out-of-date steps. "
            "Manim projects accept every .\\render option, such as --1080p60."
        ),
    )
    render.add_argument("project", help="A number such as 003, or the folder name.")
    render.add_argument(
        "--voice",
        help=(
            "Voice for this render, such as bf_emma, kept in the project's voiceover.json. "
            "On HyperFrames projects, a comma list renders one video per voice."
        ),
    )
    render.add_argument(
        "--draft", action="store_true", help="Faster HyperFrames preview at 30 fps."
    )
    render.add_argument(
        "--force", action="store_true", help="Rebuild every HyperFrames step."
    )
    render.add_argument(
        "--dry-run", action="store_true", help="Show the steps without running them."
    )
    render.set_defaults(handler=command_render)

    doctor = commands.add_parser(
        "doctor", help="Check the GPU, tools, and disk. Changes nothing."
    )
    doctor.set_defaults(handler=command_doctor)

    setup = commands.add_parser(
        "setup", help="Ask a few questions, then install what this machine needs."
    )
    setup.add_argument("--yes", action="store_true", help="Accept every default.")
    setup.add_argument(
        "--dry-run", action="store_true", help="Show the steps without running them."
    )
    setup.set_defaults(handler=command_setup)

    listing = commands.add_parser("list", help="List projects and their type.")
    listing.set_defaults(handler=command_list)

    create = commands.add_parser("create", help="Create the next numbered project.")
    create.add_argument("name", nargs="?", help="Project name.")
    create.set_defaults(handler=command_create)

    voices = commands.add_parser("voices", help="List the Kokoro voice shortlist.")
    voices.set_defaults(handler=command_voices)
    return parser


def main() -> int:
    parser = build_parser()
    arguments, passthrough = parser.parse_known_args()
    root = repository_root().resolve()
    working = Path.cwd().resolve()
    if working != root and root not in working.parents:
        print(f"orca: error: run this inside the Orca Studio folder: {root}")
        return 1
    if passthrough and arguments.command != "render":
        parser.error(f"unrecognized arguments: {' '.join(passthrough)}")
    try:
        return arguments.handler(arguments, passthrough)
    except (FileExistsError, FileNotFoundError, ValueError) as error:
        print(f"orca: error: {error}")
        return 1
    except subprocess.CalledProcessError as error:
        print(f"orca: error: a build step failed (exit {error.returncode}).")
        return error.returncode or 1


if __name__ == "__main__":
    raise SystemExit(main())
