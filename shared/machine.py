"""Where this machine's tools live, and the choices `orca setup` saved for it.

Standard library only, so the command line can import it before anything is installed.
"""

from __future__ import annotations

import json
import os
import shutil
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "orca.local.json"
DEFAULT_WHISPER = {
    "model": "large-v3-turbo",
    "device": "cuda",
    "compute_type": "int8",
    "batch_size": 4,
}


def find_executable(name: str) -> str | None:
    """Locate a command, preferring what Windows can launch directly.

    npm installs an extensionless shell script beside its `.cmd` launcher, and
    `shutil.which` can return that script, which fails with WinError 193.
    """
    if os.name == "nt":
        for extension in (".exe", ".cmd", ".bat"):
            found = shutil.which(name + extension)
            if found:
                return found
    return shutil.which(name)


def data_home() -> Path:
    """Return the per-user folder that holds tools too heavy for the repository."""
    if os.name == "nt":
        return Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    return Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))


def tools_home() -> Path:
    return data_home() / "orca-studio-tools"


def environment_python(environment: Path) -> Path:
    if os.name == "nt":
        return environment / "Scripts" / "python.exe"
    return environment / "bin" / "python"


def kokoro_environment() -> Path:
    return data_home() / "kokoro-tts"


def kokoro_python_path() -> Path:
    configured = os.getenv("ORCA_KOKORO_PYTHON")
    return Path(configured) if configured else environment_python(kokoro_environment())


def earshot_home() -> Path:
    return tools_home() / "earshot"


def earshot_python_path() -> Path:
    configured = os.getenv("ORCA_EARSHOT_PYTHON")
    return (
        Path(configured) if configured else environment_python(earshot_home() / ".venv")
    )


def load_config() -> dict[str, Any]:
    """Return the saved machine choices, or nothing if setup has not run here."""
    if not CONFIG_PATH.is_file():
        return {}
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def save_config(config: dict[str, Any]) -> None:
    CONFIG_PATH.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")


def whisper_settings() -> dict[str, Any]:
    return {**DEFAULT_WHISPER, **load_config().get("whisper", {})}
