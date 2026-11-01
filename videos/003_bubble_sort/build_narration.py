"""Synthesize script.md with the project's voice, then time every word with WhisperX.

Run from the repository root: uv run python videos/003_bubble_sort/build_narration.py
Writes assets/audio/narration/line_NN.wav and timing.json, which the composition reads.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

from pydub import AudioSegment
from pydub.silence import detect_leading_silence

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from shared.machine import whisper_settings
from shared.voiceover import (
    KOKORO_SYNTHESIZER,
    kokoro_python,
    load_voiceover_config,
)

PROJECT = Path(__file__).parent
OUTPUT = PROJECT / "assets" / "audio" / "narration"
GAP_MS = 500
EDGE_KEEP_MS = 30


def normalized(text: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", text.casefold().replace("’", "'"))


def script_lines() -> list[str]:
    body = (PROJECT / "script.md").read_text(encoding="utf-8").splitlines()
    return [line.strip() for line in body if line.strip() and not line.startswith("#")]


def synthesize(line: str, voice: str, speed: float, target: Path) -> None:
    subprocess.run(
        [str(kokoro_python()), str(KOKORO_SYNTHESIZER), voice, str(speed), str(target)],
        input=line.encode("utf-8"),
        capture_output=True,
        check=True,
    )
    audio = AudioSegment.from_file(target)
    head = max(0, detect_leading_silence(audio, silence_threshold=-45) - EDGE_KEEP_MS)
    tail = max(
        0, detect_leading_silence(audio.reverse(), silence_threshold=-45) - EDGE_KEEP_MS
    )
    audio[head : len(audio) - tail].export(target, format="wav")


def main() -> None:
    config = load_voiceover_config(PROJECT / "voiceover.json")
    voice, speed = config["voice"], float(config["options"].get("speed", 1.0))
    OUTPUT.mkdir(parents=True, exist_ok=True)

    lines = script_lines()
    combined = AudioSegment.silent(duration=GAP_MS, frame_rate=24000)
    offsets = []
    durations = []
    for index, line in enumerate(lines):
        target = OUTPUT / f"line_{index:02d}.wav"
        synthesize(line, voice, speed, target)
        clip = AudioSegment.from_file(target)
        offsets.append(len(combined) / 1000)
        durations.append(len(clip) / 1000)
        combined += clip + AudioSegment.silent(duration=GAP_MS, frame_rate=24000)

    whisper = whisper_settings()
    combined_path = OUTPUT / "combined.wav"
    combined.export(combined_path, format="wav")
    subprocess.run(
        [
            "whisperx",
            str(combined_path),
            "--model",
            whisper["model"],
            "--language",
            "en",
            "--device",
            whisper["device"],
            "--compute_type",
            whisper["compute_type"],
            "--batch_size",
            str(whisper["batch_size"]),
            "--output_format",
            "json",
            "--output_dir",
            str(OUTPUT),
        ],
        capture_output=True,
        check=True,
    )
    words = json.loads((OUTPUT / "combined.json").read_text(encoding="utf-8"))[
        "word_segments"
    ]

    timing = []
    problems = []
    for index, line in enumerate(lines):
        start, end = offsets[index], offsets[index] + durations[index]
        heard = [
            {
                "word": word["word"],
                "start": round(word["start"] - start, 3),
                "end": round(word["end"] - start, 3),
            }
            for word in words
            if "start" in word and start - 0.2 <= word["start"] <= end + 0.2
        ]
        if normalized(" ".join(word["word"] for word in heard)) != normalized(line):
            problems.append((line, " ".join(word["word"] for word in heard)))
        timing.append(
            {
                "text": line,
                "file": f"line_{index:02d}.wav",
                "duration": durations[index],
                "words": heard,
            }
        )

    (PROJECT / "timing.json").write_text(
        json.dumps({"voice": voice, "speed": speed, "lines": timing}, indent=1),
        encoding="utf-8",
    )
    total = sum(durations)
    print(f"{voice} at speed {speed}: {len(lines)} lines, {total:.1f}s of speech")
    for entry in timing:
        print(f"  {entry['duration']:5.2f}s  {entry['text']}")
    print(f"transcript mismatches: {len(problems)}")
    for wanted, heard in problems:
        print(f"  wanted: {wanted}\n  heard:  {heard}")


if __name__ == "__main__":
    main()
