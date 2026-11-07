"""Shared Reel mix: effects under the narration, then mastering to -14 LUFS.

Run with earshot's Python. A project's build_mix.py calls mix(Path(__file__).parent), and can
pass extra library sounds as {name: (file, seconds to its hit, seconds kept)} and extra bank
sounds as {name: (bank id, [options])}. Reads cues.json, writes assets/audio/soundtrack.wav.
"""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import soxr

ROOT = Path(__file__).resolve().parents[1]
LIBRARY = ROOT / "shared" / "sound_effects"
MASTER_SCRIPT = ROOT / ".claude" / "skills" / "real-sound" / "scripts" / "master.py"
RATE = 48000
TARGET_LUFS = "-14"
FADE_SECONDS = 0.05

# name: (library file, seconds to its hit, seconds kept). Cue times mark the hit, not the
# file's start, so a sound with a long wind-up still lands exactly on its word.
SHARED = {
    "tear": ("Swish - Shortnoise", 0.0, 0.6),
    "sad": ("Short - Sad Little Sonar", 0.24, 1.3),
    "idea": ("Retro - Magic Respawn", 0.18, 1.1),
    "whip": ("Short - Swish", 0.42, 0.56),
    "slide": ("Swish - Flicker Shoosh", 0.24, 0.8),
    "pop": ("Short - Ploppy Plop", 0.0, 0.21),
    "step": ("Punch - Sploop", 0.16, 0.47),
    "sparkle": ("Short - Digital Crystal", 0.06, 0.8),
    "arrive": ("Retro - Now You See It", 1.58, 1.95),
    "sweep": ("Swish - Nice And Clean", 1.12, 2.5),
    "buzz": ("Short - Digital Malfunction", 0.24, 0.9),
    "slam": ("Impact - Dubby Slam", 0.63, 2.0),
}
# The library has no ticks, small metal clinks, chimes or single notes, so these come from the bank.
BANK = {
    "clink": ("mallet/celesta", ["--pitch", "A6"]),
    "tick": ("pro_tap/soft", []),
    "ding0": ("pro_notify/ding_1822", []),
    "ding1": ("pro_notify/ding_2045", []),
    "ding2": ("pro_notify/ding_2296", []),
    "key": ("typing_key/light", []),
    "riser": ("riser/tension", []),
    "knock": ("knock/wood", []),
    "chord0": ("mallet/marimba", ["--pitch", "C5"]),
    "chord1": ("mallet/marimba", ["--pitch", "E5"]),
    "chord2": ("mallet/marimba", ["--pitch", "G5"]),
    "end": ("mallet/glock", ["--pitch", "C6"]),
}


def resampled(samples: np.ndarray, rate: int) -> np.ndarray:
    return samples if rate == RATE else soxr.resample(samples, rate, RATE)


def load_stereo(path: Path) -> np.ndarray:
    samples, rate = sf.read(path, always_2d=True, dtype="float64")
    if samples.shape[1] == 1:
        samples = np.repeat(samples, 2, axis=1)
    return resampled(samples[:, :2], rate)


def shared_effect(file: str, keep: float) -> np.ndarray:
    """A library sound, cut where it has died away, so a tail never sits on the next line."""
    samples = load_stereo(LIBRARY / f"{file}.wav")[: int(keep * RATE)]
    fade = min(int(FADE_SECONDS * RATE), len(samples))
    samples[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return samples


def bank_effect(name: str, sound: str, options: list[str], folder: Path) -> np.ndarray:
    target = folder / f"{name}.wav"
    if not target.exists():
        subprocess.run(
            [sys.executable, "-m", "earshot", "sfx", "render", sound, "-o", str(target)] + options,
            check=True,
            capture_output=True,
        )
    return load_stereo(target)


def mix(project: Path, extra_shared: dict | None = None, extra_bank: dict | None = None) -> None:
    shared = {**SHARED, **(extra_shared or {})}
    bank = {**BANK, **(extra_bank or {})}
    audio = project / "assets" / "audio"
    plan = json.loads((project / "cues.json").read_text(encoding="utf-8"))
    effects_dir = audio / "effects"
    effects_dir.mkdir(parents=True, exist_ok=True)

    leads = {name: entry[1] for name, entry in shared.items()}
    sounds = {name: shared_effect(file, keep) for name, (file, _, keep) in shared.items()}
    for name, (sound, options) in bank.items():
        sounds[name] = bank_effect(name, sound, options, effects_dir)
    sounds["voice"] = load_stereo(audio / "narration" / plan["take"])

    mix = np.zeros((int((plan["duration"] + 3) * RATE), 2))
    for cue in plan["cues"]:
        clip = sounds[cue["effect"]]
        begin = max(0, int((cue["t"] - leads.get(cue["effect"], 0)) * RATE))
        gain = 10 ** (cue["gain"] / 20)
        mix[begin : begin + len(clip)] += clip[: len(mix) - begin] * gain

    premaster = audio / "premaster.wav"
    soundtrack = audio / "soundtrack.wav"
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

