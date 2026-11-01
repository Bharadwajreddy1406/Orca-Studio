"""Render the sound effects, mix them under the narration, and master the soundtrack.

Run with earshot's Python, from the repository root:
  <earshot venv>/Scripts/python.exe videos/003_bubble_sort/build_mix.py
Reads cues.json from build_timeline.py. Writes assets/audio/soundtrack.wav.
"""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import soxr

PROJECT = Path(__file__).parent
AUDIO = PROJECT / "assets" / "audio"
ROOT = PROJECT.parents[1]
MASTER_SCRIPT = ROOT / ".claude" / "skills" / "real-sound" / "scripts" / "master.py"
RATE = 48000
TARGET_LUFS = "-14"

# Each effect comes from earshot's shipped bank, rendered once and then reused.
BANK = {
    "intro": ("whoosh_fast/crisp", ["--dur", "0.6", "--apex", "0.32"]),
    "dive": ("swish/soft", ["--dur", "1.1", "--apex", "0.5"]),
    "lock": ("knock/wood", []),
    "impact": ("cut_hit/punch", []),
    "end": ("mallet/glock", ["--pitch", "C6"]),
}
NOTE_SOUND = "mallet/marimba"


def render_bank(sound: str, target: Path, options: list[str]) -> None:
    if target.exists():
        return
    subprocess.run(
        [sys.executable, "-m", "earshot", "sfx", "render", sound, "-o", str(target)]
        + options,
        check=True,
        capture_output=True,
    )


def load(path: Path) -> np.ndarray:
    samples, rate = sf.read(path, always_2d=True, dtype="float64")
    mono = samples.mean(axis=1)
    return mono if rate == RATE else soxr.resample(mono, rate, RATE)


def main() -> None:
    plan = json.loads((PROJECT / "cues.json").read_text(encoding="utf-8"))
    effects_dir = AUDIO / "effects"
    effects_dir.mkdir(parents=True, exist_ok=True)

    for name, (sound, options) in BANK.items():
        render_bank(sound, effects_dir / f"{name}.wav", options)
    sounds = {name: load(effects_dir / f"{name}.wav") for name in BANK}

    mix = np.zeros(int((plan["duration"] + 1) * RATE))
    for cue in plan["cues"]:
        if cue["effect"] == "voice":
            clip = load(AUDIO / "narration" / cue["file"])
            gain = 1.0
        elif cue["effect"] == "note":
            target = effects_dir / f"note_{cue['note']}.wav"
            render_bank(NOTE_SOUND, target, ["--pitch", cue["note"]])
            clip = load(target)
            gain = 10 ** (cue["gain"] / 20)
        else:
            clip = sounds[cue["effect"]]
            gain = 10 ** (cue["gain"] / 20)
        start = int(cue["t"] * RATE)
        mix[start : start + len(clip)] += clip * gain

    premaster = AUDIO / "premaster.wav"
    soundtrack = AUDIO / "soundtrack.wav"
    length = int(plan["duration"] * RATE)
    sf.write(premaster, mix[:length], RATE, subtype="FLOAT")
    subprocess.run(
        [
            sys.executable,
            "-I",
            str(MASTER_SCRIPT),
            str(premaster),
            str(soundtrack),
            f"--lufs={TARGET_LUFS}",
        ],
        check=True,
    )
    print(f"wrote {soundtrack}")


if __name__ == "__main__":
    main()
