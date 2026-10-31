"""Render a numbered Manim project and prepare its delivery assets."""

from __future__ import annotations

import argparse
import ast
import importlib.util
import os
import shutil
import subprocess
import sys
from pathlib import Path
from types import ModuleType

from manim import Scene

if __package__:
    from .create import numbered_projects, repository_root
else:
    from create import numbered_projects, repository_root


PRESETS = {
    "480p15": ("-ql", "480p15"),
    "720p30": ("-qm", "720p30"),
    "1080p60": ("-qh", "1080p60"),
    "2160p60": ("-qk", "2160p60"),
}
QUALITY_PRESETS = {
    "low": "480p15",
    "medium": "720p30",
    "high": "1080p60",
    "4k": "2160p60",
}
VOICE_SERVICES = ("edge-tts", "gtts", "azure", "elevenlabs", "openai")


def resolve_project(identifier: str, videos_dir: Path) -> Path:
    projects = numbered_projects(videos_dir)

    if identifier.isdigit():
        requested_number = int(identifier)
        matches = [path for number, path in projects if number == requested_number]
    else:
        matches = [
            path
            for _, path in projects
            if path.name.casefold() == identifier.casefold()
        ]

    if not matches:
        raise FileNotFoundError(
            f"No video project matches {identifier!r} in {videos_dir}"
        )
    if len(matches) > 1:
        names = ", ".join(sorted(path.name for path in matches))
        raise ValueError(f"Project identifier {identifier!r} is ambiguous: {names}")
    return matches[0]


def load_scene_module(scene_file: Path) -> ModuleType:
    root_string = str(repository_root())
    if root_string not in sys.path:
        sys.path.insert(0, root_string)

    module_name = f"_manima_scene_{scene_file.parent.name}"
    spec = importlib.util.spec_from_file_location(module_name, scene_file)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load scene module: {scene_file}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def declared_scene_names(scene_file: Path) -> list[str]:
    module = load_scene_module(scene_file)
    scenes: list[str] = []
    for name, value in vars(module).items():
        if (
            isinstance(value, type)
            and issubclass(value, Scene)
            and value is not Scene
            and value.__module__ == module.__name__
        ):
            scenes.append(name)
    return scenes


def source_uses_manim_voiceover(source: str, filename: str = "<scene>") -> bool:
    tree = ast.parse(source, filename=filename)
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            if any(
                alias.name == "manim_voiceover"
                or alias.name.startswith("manim_voiceover.")
                for alias in node.names
            ):
                return True
        elif (
            isinstance(node, ast.ImportFrom)
            and node.module
            and (
                node.module == "manim_voiceover"
                or node.module.startswith("manim_voiceover.")
            )
        ):
            return True
    return False


def uses_manim_voiceover(scene_file: Path) -> bool:
    return source_uses_manim_voiceover(
        scene_file.read_text(encoding="utf-8"),
        filename=str(scene_file),
    )


def selected_preset(args: argparse.Namespace) -> str:
    if args.preset:
        return args.preset
    if args.quality:
        return QUALITY_PRESETS[args.quality]
    return "480p15"


def list_edge_voices(root: Path) -> int:
    command = [sys.executable, "-m", "edge_tts", "--list-voices"]
    print("Available Edge TTS voices:", flush=True)
    return subprocess.run(command, cwd=root, check=False).returncode


def media_has_stream(path: Path, stream_selector: str, root: Path) -> bool:
    ffprobe = shutil.which("ffprobe")
    if ffprobe is None:
        raise FileNotFoundError("ffprobe is required to validate exported media")
    result = subprocess.run(
        [
            ffprobe,
            "-v",
            "error",
            "-select_streams",
            stream_selector,
            "-show_entries",
            "stream=index",
            "-of",
            "csv=p=0",
            str(path),
        ],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    )
    return bool(result.stdout.strip())


def run_ffmpeg(arguments: list[str], root: Path) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        raise FileNotFoundError(
            "ffmpeg is required to export separate and merged media tracks"
        )
    subprocess.run(
        [ffmpeg, "-y", "-hide_banner", "-loglevel", "error", *arguments],
        cwd=root,
        check=True,
    )


def find_native_video(
    root: Path,
    scene_file: Path,
    scene_name: str,
    preset: str,
) -> Path:
    """Find the newest render for a preset, including portrait output folders."""
    _, quality_directory = PRESETS[preset]
    scene_media_directory = root / "media" / "videos" / scene_file.stem
    expected_video = scene_media_directory / quality_directory / f"{scene_name}.mp4"

    frame_rate = preset.rsplit("p", maxsplit=1)[-1]
    candidates = [
        path
        for path in scene_media_directory.glob(f"*/{scene_name}.mp4")
        if path.parent.name.endswith(f"p{frame_rate}")
    ]
    if not candidates:
        raise FileNotFoundError(f"Rendered video not found: {expected_video}")
    return max(candidates, key=lambda path: path.stat().st_mtime_ns)


def export_scene_assets(
    root: Path,
    project_dir: Path,
    scene_file: Path,
    scene_name: str,
    preset: str,
    merge: bool,
    voiceover_enabled: bool,
) -> list[Path]:
    native_video = find_native_video(root, scene_file, scene_name, preset)
    native_directory = native_video.parent

    export_directory = root / "media" / "exports" / project_dir.name / preset
    export_directory.mkdir(parents=True, exist_ok=True)
    video_track = export_directory / f"{scene_name}_video.mp4"
    audio_track = export_directory / f"{scene_name}_audio.wav"
    subtitle_track = export_directory / f"{scene_name}.srt"
    merged_video = export_directory / f"{scene_name}_merged.mp4"

    run_ffmpeg(
        [
            "-i",
            str(native_video),
            "-map",
            "0:v:0",
            "-c:v",
            "copy",
            "-an",
            str(video_track),
        ],
        root,
    )
    outputs = [video_track]

    native_subtitles = native_directory / f"{scene_name}.srt"
    if native_subtitles.is_file():
        shutil.copy2(native_subtitles, subtitle_track)
        outputs.append(subtitle_track)

    if voiceover_enabled:
        run_ffmpeg(
            [
                "-i",
                str(native_video),
                "-map",
                "0:a:0",
                "-vn",
                "-c:a",
                "pcm_s16le",
                str(audio_track),
            ],
            root,
        )
        outputs.append(audio_track)

        if merge:
            run_ffmpeg(
                [
                    "-i",
                    str(video_track),
                    "-i",
                    str(audio_track),
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
                    str(merged_video),
                ],
                root,
            )
            if not media_has_stream(merged_video, "a:0", root):
                raise RuntimeError(
                    f"Merged video was created without an audio stream: {merged_video}"
                )
            outputs.append(merged_video)
    elif merge:
        shutil.copy2(video_track, merged_video)
        outputs.append(merged_video)

    return outputs


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="render",
        description="Render a numbered Manim project and export its media tracks.",
    )
    parser.add_argument(
        "project",
        nargs="?",
        help="A numeric prefix such as 034, or a full folder name.",
    )

    quality_group = parser.add_mutually_exclusive_group()
    quality_group.add_argument(
        "--quality",
        choices=QUALITY_PRESETS,
        help="Named quality preset (default: low).",
    )
    quality_group.add_argument(
        "--480p15", dest="preset", action="store_const", const="480p15"
    )
    quality_group.add_argument(
        "--720p30", dest="preset", action="store_const", const="720p30"
    )
    quality_group.add_argument(
        "--1080p60",
        "--108060p",
        dest="preset",
        action="store_const",
        const="1080p60",
    )
    quality_group.add_argument(
        "--2160p60",
        "--4k60",
        dest="preset",
        action="store_const",
        const="2160p60",
    )

    parser.add_argument(
        "--merge",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Create the final MP4 with video and audio merged (default: on).",
    )
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Open Manim's rendered video after rendering.",
    )
    parser.add_argument(
        "--list-voices",
        action="store_true",
        help="List voices available from Edge TTS and exit.",
    )
    parser.add_argument(
        "--voice-service",
        choices=VOICE_SERVICES,
        help="Override the project's configured speech service for this render.",
    )
    parser.add_argument(
        "--voice",
        help="Override the configured voice or voice ID for this render.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    root = repository_root()

    if args.list_voices:
        return list_edge_voices(root)
    if not args.project:
        parser.error("project is required unless --list-voices is used")

    try:
        project_dir = resolve_project(args.project, root / "videos")
        scene_file = project_dir / "scene.py"
        if not scene_file.is_file():
            raise FileNotFoundError(f"Scene file not found: {scene_file}")
        scene_names = declared_scene_names(scene_file)
        if not scene_names:
            raise ValueError(f"No Manim Scene subclasses found in {scene_file}")
        voiceover_enabled = uses_manim_voiceover(scene_file)
    except (FileNotFoundError, ImportError, OSError, ValueError) as error:
        print(f"render: error: {error}")
        return 1

    preset = selected_preset(args)
    quality_flag, _ = PRESETS[preset]
    command = [sys.executable, "-m", "manim", quality_flag]
    if args.preview:
        command.append("--preview")
    if voiceover_enabled:
        command.append("--disable_caching")
    command.extend([str(scene_file), *scene_names])

    environment = os.environ.copy()
    if args.voice_service:
        environment["MANIMA_VOICE_SERVICE"] = args.voice_service
    if args.voice:
        environment["MANIMA_VOICE"] = args.voice

    print(f"Project: {project_dir.name}")
    print(f"Scenes: {', '.join(scene_names)}")
    print(f"Resolution: {preset}")
    if voiceover_enabled:
        print("Voiceover: detected (Manim caching disabled)")
    result = subprocess.run(
        command,
        cwd=root,
        env=environment,
        check=False,
    )
    if result.returncode:
        return result.returncode

    try:
        outputs: list[Path] = []
        for scene_name in scene_names:
            outputs.extend(
                export_scene_assets(
                    root,
                    project_dir,
                    scene_file,
                    scene_name,
                    preset,
                    args.merge,
                    voiceover_enabled,
                )
            )
    except (
        FileNotFoundError,
        OSError,
        RuntimeError,
        subprocess.CalledProcessError,
    ) as error:
        print(f"render: export error: {error}")
        return 1

    print("Exported:")
    for output in outputs:
        print(f"  {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
