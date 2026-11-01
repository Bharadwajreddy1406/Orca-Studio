"""`orca doctor` and `orca setup`: check a machine, then install only what it can run."""

from __future__ import annotations

import os
import platform
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from shared import machine

# Versions confirmed working together in this project.
PYTHON_VERSION = "3.12"
TORCH_VERSION = "2.8.0"
KOKORO_VERSION = "0.9.4"
MISAKI_VERSION = "0.9.4"
WHISPERX_VERSION = "3.8.6"
HYPERFRAMES_VERSION = "0.8.224"
SPACY_ENGLISH_MODEL = (
    "https://github.com/explosion/spacy-models/releases/download/"
    "en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl"
)
EARSHOT_TAG = "v0.4.0"
EARSHOT_REPOSITORY = "https://github.com/Leonxlnx/earshot.git"
CUDA_BACKEND = "cu126"
MINIMUM_CUDA = (12, 6)
MINIMUM_FREE_DISK_GB = 15
SMOKE_TEST_LINE = "Orca Studio is ready."


@dataclass
class Gpu:
    name: str
    total_gb: float
    free_gb: float
    driver: str
    cuda: tuple[int, int] | None

    @property
    def usable(self) -> bool:
        return self.cuda is not None and self.cuda >= MINIMUM_CUDA


def run_text(command: list[str]) -> str:
    try:
        return subprocess.run(
            command, capture_output=True, text=True, timeout=20, check=False
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return ""


def detect_gpu() -> Gpu | None:
    if not shutil.which("nvidia-smi"):
        return None
    query = "--query-gpu=name,memory.total,memory.free,driver_version"
    row = run_text(["nvidia-smi", query, "--format=csv,noheader,nounits"]).strip()
    if not row:
        return None
    name, total, free, driver = [
        part.strip() for part in row.splitlines()[0].split(",")
    ]
    version = re.search(r"CUDA Version:\s*(\d+)\.(\d+)", run_text(["nvidia-smi"]))
    return Gpu(
        name,
        float(total) / 1024,
        float(free) / 1024,
        driver,
        (int(version[1]), int(version[2])) if version else None,
    )


def recommended_whisper(gpu: Gpu | None) -> dict[str, object]:
    """Choose a model that fits, from peak VRAM measured on a 6 GB RTX 3050."""
    if gpu and gpu.usable and gpu.total_gb >= 3.5:
        return {
            "model": "large-v3-turbo",
            "device": "cuda",
            "compute_type": "int8",
            "batch_size": 4,
        }
    if gpu and gpu.usable and gpu.total_gb >= 2:
        return {
            "model": "small",
            "device": "cuda",
            "compute_type": "int8",
            "batch_size": 4,
        }
    return {"model": "small", "device": "cpu", "compute_type": "int8", "batch_size": 4}


def tool_rows() -> list[tuple[str, bool, str]]:
    def found(name: str) -> bool:
        return shutil.which(name) is not None

    return [
        ("uv", found("uv"), "Python environments (required)"),
        ("git", found("git"), "Fetching earshot (required for sound effects)"),
        ("ffmpeg", found("ffmpeg"), "Merging audio and video (required)"),
        ("ffprobe", found("ffprobe"), "Reading media files (required)"),
        ("node", found("node"), "Node 22+ for HyperFrames (required for Reels)"),
        ("hyperframes", found("hyperframes"), "Renders Reels"),
        (
            "three.js",
            (ROOT / "node_modules" / "three" / "build" / "three.module.js").is_file(),
            "3D scenes",
        ),
        ("kokoro", machine.kokoro_python_path().is_file(), "Local voices"),
        ("whisperx", found("whisperx"), "Word timings"),
        (
            "earshot",
            machine.earshot_python_path().is_file(),
            "Sound effects, mastering",
        ),
        ("yt-dlp", found("yt-dlp"), "Downloading reference videos (optional)"),
    ]


def free_disk_gb() -> float:
    return shutil.disk_usage(ROOT).free / 1024**3


def print_gpu(gpu: Gpu | None) -> None:
    print("GPU")
    if gpu is None:
        print("  No NVIDIA GPU found. Voices and word timings will run on the CPU.")
    else:
        cuda = ".".join(map(str, gpu.cuda)) if gpu.cuda else "unknown"
        print(
            f"  {gpu.name}: {gpu.total_gb:.1f} GB VRAM, {gpu.free_gb:.1f} GB free, "
            f"driver {gpu.driver}, CUDA {cuda}"
        )
        if not gpu.usable:
            needed = ".".join(map(str, MINIMUM_CUDA))
            print(
                f"  Needs CUDA {needed}+ to be used, so the CPU will be used instead."
            )
    whisper = recommended_whisper(gpu)
    print(
        f"  Recommended word timing: {whisper['model']} on {whisper['device']}. "
        f"Kokoro: {'GPU' if gpu and gpu.usable else 'CPU'}."
    )


def command_doctor(_: object = None, __: object = None) -> int:
    print(f"Orca Studio on {platform.system()} {platform.machine()}\n")
    print_gpu(detect_gpu())
    print("\nTools")
    for name, present, purpose in tool_rows():
        print(f"  {'ok     ' if present else 'MISSING'}  {name:<12} {purpose}")
    disk = free_disk_gb()
    warning = (
        "" if disk >= MINIMUM_FREE_DISK_GB else "  (low: setup can use about 15 GB)"
    )
    print(f"\nDisk: {disk:.1f} GB free{warning}")
    config = machine.load_config()
    print(f"Saved choices: {config if config else 'none yet. Run: orca setup'}")
    return 0


class Setup:
    def __init__(self, assume_yes: bool, dry_run: bool) -> None:
        self.assume_yes = assume_yes
        self.dry_run = dry_run
        self.failures: list[str] = []

    def ask(self, question: str, default: bool = True) -> bool:
        hint = "Y/n" if default else "y/N"
        if self.assume_yes or not sys.stdin.isatty() and self.dry_run:
            print(f"{question} [{hint}] {'yes' if default else 'no'}")
            return default
        try:
            answer = input(f"{question} [{hint}] ").strip().casefold()
        except EOFError:
            return default
        return default if not answer else answer.startswith("y")

    def choose(self, question: str, options: list[tuple[str, str]]) -> str:
        print(question)
        for index, (_, label) in enumerate(options, start=1):
            print(f"  {index}. {label}")
        if self.assume_yes or not sys.stdin.isatty() and self.dry_run:
            print(f"Choice [1] {options[0][0]}")
            return options[0][0]
        try:
            answer = input("Choice [1] ").strip()
        except EOFError:
            answer = ""
        if answer.isdigit() and 1 <= int(answer) <= len(options):
            return options[int(answer) - 1][0]
        return options[0][0]

    def run(self, label: str, command: list[str], cwd: Path = ROOT) -> bool:
        print(f"\n> {label}\n  {' '.join(command)}", flush=True)
        if self.dry_run:
            return True
        executable = machine.find_executable(command[0]) or command[0]
        environment = {**os.environ, "PYTHONIOENCODING": "utf-8"}
        result = subprocess.run(
            [executable, *command[1:]], cwd=cwd, env=environment, check=False
        )
        if result.returncode:
            print(f"  FAILED (exit {result.returncode})")
            self.failures.append(label)
            return False
        return True

    def install_kokoro(self, gpu: Gpu | None) -> None:
        environment = machine.kokoro_environment()
        python = str(machine.environment_python(environment))
        backend = CUDA_BACKEND if gpu and gpu.usable else "cpu"
        steps = [
            (
                "Create the Kokoro environment",
                [
                    "uv",
                    "venv",
                    "--allow-existing",
                    "--python",
                    PYTHON_VERSION,
                    str(environment),
                ],
            ),
            (
                f"Install PyTorch ({backend})",
                [
                    "uv",
                    "pip",
                    "install",
                    "--python",
                    python,
                    f"torch=={TORCH_VERSION}",
                    "--index-url",
                    f"https://download.pytorch.org/whl/{backend}",
                ],
            ),
            (
                "Install Kokoro",
                [
                    "uv",
                    "pip",
                    "install",
                    "--python",
                    python,
                    f"kokoro=={KOKORO_VERSION}",
                    f"misaki[en]=={MISAKI_VERSION}",
                    "soundfile",
                    # Kokoro would fetch this through pip, which uv environments lack.
                    SPACY_ENGLISH_MODEL,
                ],
            ),
        ]
        for label, command in steps:
            if not self.run(label, command):
                return
        with tempfile.TemporaryDirectory() as folder:
            sample = Path(folder) / "sample.wav"
            print(f"\n> Test a voice (first run downloads about 320 MB)\n  {python}")
            if self.dry_run:
                return
            result = subprocess.run(
                [
                    python,
                    str(ROOT / "shared" / "kokoro_synthesize.py"),
                    "af_heart",
                    "1.0",
                    str(sample),
                ],
                input=SMOKE_TEST_LINE.encode("utf-8"),
                capture_output=True,
                check=False,
            )
            if result.returncode or not sample.is_file():
                detail = result.stderr.decode("utf-8", errors="replace")[-800:]
                print(f"  FAILED: {detail}")
                self.failures.append("Test a voice")

    def install_whisperx(self, gpu: Gpu | None) -> None:
        backend = CUDA_BACKEND if gpu and gpu.usable else "cpu"
        self.run(
            "Install WhisperX",
            [
                "uv",
                "tool",
                "install",
                f"whisperx=={WHISPERX_VERSION}",
                "--python",
                PYTHON_VERSION,
                "--torch-backend",
                backend,
            ],
        )

    def install_video(self) -> None:
        self.run("Install project packages", ["uv", "sync"])
        self.run("Install Three.js", ["npm", "install", "--no-audit", "--no-fund"])
        self.run(
            "Install HyperFrames",
            ["npm", "install", "-g", f"hyperframes@{HYPERFRAMES_VERSION}"],
        )

    def install_earshot(self) -> None:
        source = machine.tools_home() / "skill-sources" / "earshot"
        home = machine.earshot_home()
        python = machine.environment_python(home / ".venv")
        if not source.is_dir():
            ok = self.run(
                "Fetch earshot",
                [
                    "git",
                    "clone",
                    "--depth",
                    "1",
                    "--branch",
                    EARSHOT_TAG,
                    EARSHOT_REPOSITORY,
                    str(source),
                ],
            )
            if not ok:
                return
        steps = [
            (
                "Create the earshot environment",
                [
                    "uv",
                    "venv",
                    "--allow-existing",
                    "--python",
                    PYTHON_VERSION,
                    str(home / ".venv"),
                ],
            ),
            (
                "Install earshot's CPU PyTorch",
                [
                    "uv",
                    "pip",
                    "install",
                    "--python",
                    str(python),
                    "torch",
                    "--index-url",
                    "https://download.pytorch.org/whl/cpu",
                ],
            ),
            (
                "Install earshot",
                [
                    "uv",
                    "pip",
                    "install",
                    "--python",
                    str(python),
                    "-e",
                    f"{source}[mcp]",
                ],
            ),
        ]
        for label, command in steps:
            if not self.run(label, command):
                return

    def write_launcher(self) -> None:
        folder = Path.home() / ".local" / "bin"
        if os.name == "nt":
            launcher = folder / "orca.cmd"
            text = f'@echo off\r\ncall "{ROOT / "orca.cmd"}" %*\r\n'
        else:
            launcher = folder / "orca"
            text = f'#!/bin/sh\nexec "{ROOT / "orca"}" "$@"\n'
        print(f"\n> Write the launcher\n  {launcher}")
        if self.dry_run:
            return
        folder.mkdir(parents=True, exist_ok=True)
        launcher.write_text(text, encoding="utf-8", newline="")
        if os.name != "nt":
            launcher.chmod(launcher.stat().st_mode | stat.S_IEXEC)
        directories = os.environ.get("PATH", "").split(os.pathsep)
        if str(folder) not in directories:
            print(f"  Add {folder} to your PATH so that `orca` works everywhere here.")


def command_setup(arguments: object, _: object = None) -> int:
    setup = Setup(
        getattr(arguments, "yes", False), getattr(arguments, "dry_run", False)
    )
    command_doctor()

    required = [
        name for name in ("uv", "git", "ffmpeg", "node") if not shutil.which(name)
    ]
    if required:
        print(f"\nInstall these first, then run setup again: {', '.join(required)}")
        return 1
    if free_disk_gb() < MINIMUM_FREE_DISK_GB:
        print("\nWarning: setup can use about 15 GB, and this disk is low.")

    gpu = detect_gpu()
    config = machine.load_config()
    print("\nOrca Studio setup\n")

    voice = setup.choose(
        "Which voice engine?",
        [
            (
                "kokoro",
                "Kokoro: free, runs on this computer, text stays private (recommended)",
            ),
            (
                "edge-tts",
                "Edge TTS: free and light, but sends narration text to Microsoft",
            ),
            ("skip", "Skip for now"),
        ],
    )
    present = {name: found for name, found, _ in tool_rows()}
    if voice == "kokoro":
        if present["kokoro"]:
            print("Kokoro is already installed.")
        elif setup.ask(
            f"Install Kokoro with {'GPU' if gpu and gpu.usable else 'CPU'} support?"
        ):
            setup.install_kokoro(gpu)
    if voice != "skip":
        config["tts"] = voice

    if present["whisperx"]:
        print("WhisperX is already installed.")
    elif setup.ask(
        "Install WhisperX for word timing, which lands visuals on spoken words?"
    ):
        setup.install_whisperx(gpu)
    config["whisper"] = recommended_whisper(gpu)

    if not (present["hyperframes"] and present["three.js"]) and setup.ask(
        "Install the video tools (HyperFrames, Three.js)?"
    ):
        setup.install_video()
    if present["earshot"]:
        print("Earshot is already installed.")
    elif setup.ask(
        "Install earshot for sound effects and mastering? It uses about 3 GB."
    ):
        setup.install_earshot()
    if not present["yt-dlp"] and setup.ask(
        "Install yt-dlp for downloading reference videos?", default=False
    ):
        setup.run("Install yt-dlp", ["uv", "tool", "install", "yt-dlp[default]"])

    config["hyperframes_telemetry"] = not setup.ask(
        "Turn off HyperFrames telemetry and auto-install for Orca renders?"
    )
    setup.write_launcher()

    if setup.dry_run:
        print("\nDry run: nothing was changed.")
        return 0
    machine.save_config(config)
    print(f"\nSaved your choices to {machine.CONFIG_PATH.name}")
    if setup.failures:
        print(f"These steps failed: {', '.join(setup.failures)}")
        print(
            "Fix the error above, then run `orca setup` again. Finished steps are kept."
        )
        return 1
    print("Setup finished. Check it with `orca doctor`, then try `orca list`.")
    return 0
