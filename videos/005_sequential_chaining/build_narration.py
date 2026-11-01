"""Time every word of the user's own recording with WhisperX. No voice is synthesized.

Run from the repository root: uv run python videos/005_sequential_chaining/build_narration.py
Reads script.md and assets/audio/recording/, and writes timing.json, whose times are
seconds into the recording. The audio itself is used unedited by build_mix.py.
"""

import difflib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from shared.machine import whisper_settings

PROJECT = Path(__file__).parent
RECORDING = PROJECT / "assets" / "audio" / "recording" / "005_seq chain audio-enhanced-v2.wav"
OUTPUT = PROJECT / "assets" / "audio" / "transcript"


def normalized(text: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", text.casefold().replace("’", "'"))


def script_lines() -> list[str]:
    body = (PROJECT / "script.md").read_text(encoding="utf-8").splitlines()
    return [line.strip() for line in body if line.strip() and not line.startswith("#")]


def transcribe() -> list[dict]:
    whisper = whisper_settings()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "whisperx",
            str(RECORDING),
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
    transcript = json.loads(
        (OUTPUT / f"{RECORDING.stem}.json").read_text(encoding="utf-8")
    )
    return [word for word in transcript["word_segments"] if "start" in word]


def main() -> None:
    lines = script_lines()
    heard = transcribe()
    heard_keys = ["".join(normalized(word["word"])) for word in heard]

    # Each script word takes the time of the heard word it aligns with.
    script_words = [(index, word) for index, line in enumerate(lines) for word in normalized(line)]
    matcher = difflib.SequenceMatcher(
        a=[word for _, word in script_words], b=heard_keys, autojunk=False
    )
    aligned = {}
    for block in matcher.get_matching_blocks():
        for offset in range(block.size):
            aligned[block.a + offset] = heard[block.b + offset]

    timing = [{"text": line, "words": []} for line in lines]
    missing = []
    for position, (index, word) in enumerate(script_words):
        match = aligned.get(position)
        if match is None:
            missing.append((lines[index], word))
            continue
        timing[index]["words"].append(
            {"word": word, "start": round(match["start"], 3), "end": round(match["end"], 3)}
        )
    for entry in timing:
        entry["start"] = entry["words"][0]["start"]
        entry["end"] = entry["words"][-1]["end"]

    (PROJECT / "timing.json").write_text(
        json.dumps({"source": RECORDING.name, "lines": timing}, indent=1),
        encoding="utf-8",
    )
    for entry in timing:
        print(f"  {entry['start']:6.2f} {entry['end']:6.2f}  {entry['text']}")
    print(f"script words not heard: {len(missing)}")
    for line, word in missing:
        print(f"  {word!r} in: {line}")
    print("heard but not in script:", " ".join(
        heard_keys[i] for i in range(len(heard)) if heard[i] not in aligned.values()
    ))


if __name__ == "__main__":
    main()
