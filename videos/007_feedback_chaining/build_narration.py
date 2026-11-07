"""Voice script.md with ElevenLabs in one request, then time every word with WhisperX.

Run from the repository root: uv run python videos/007_feedback_chaining/build_narration.py
Writes assets/audio/narration/take_<hash>.wav, a tightened copy with the pauses between
lines shortened, and timing.json, whose times are seconds into the tightened take. The API key is read from ELEVEN_LABS_API_KEY in the environment or the repository's
.env, and is never written anywhere.

Credits are limited, so the API is called only when no take exists for this exact text,
voice and settings. Rebuilding, re-timing or re-rendering never spends credits.
"""

import difflib
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from shared.machine import whisper_settings
from shared.voiceover import load_voiceover_config

PROJECT = Path(__file__).parent
OUTPUT = PROJECT / "assets" / "audio" / "narration"
MAX_CHARACTERS = 1400
# Pauses between lines are cut to this; pauses inside a line are the voice's own and stay.
LINE_GAP_SECONDS = 0.28
LEAD_IN_SECONDS = 0.06
TAIL_SECONDS = 0.14
TAG = re.compile(r"\[[^\]]+\]\s*")


def normalized(text: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", text.casefold().replace("’", "'"))


def script_lines() -> list[str]:
    body = (PROJECT / "script.md").read_text(encoding="utf-8")
    body = re.sub(r"<!--.*?-->", "", body, flags=re.DOTALL)
    return [line.strip() for line in body.splitlines() if line.strip() and not line.startswith("#")]


def api_key() -> str:
    key = os.environ.get("ELEVEN_LABS_API_KEY")
    env_file = ROOT / ".env"
    if not key and env_file.is_file():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            name, _, value = line.partition("=")
            if name.strip() == "ELEVEN_LABS_API_KEY":
                key = value.strip().strip('"').strip("'")
    if not key:
        raise SystemExit("ELEVEN_LABS_API_KEY is not set in the environment or .env.")
    return key


def synthesize(text: str, options: dict, target: Path) -> None:
    """One paid request. Fails loudly rather than retrying, so a problem never spends twice."""
    if len(text) > MAX_CHARACTERS:
        raise SystemExit(f"Script is {len(text)} characters, over the {MAX_CHARACTERS} safety cap.")
    request = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{options['voice_id']}?output_format=mp3_44100_128",
        data=json.dumps(
            {
                "text": text,
                "model_id": options["model_id"],
                "voice_settings": {"stability": options["stability"]},
            }
        ).encode("utf-8"),
        headers={"xi-api-key": api_key(), "Content-Type": "application/json", "Accept": "audio/mpeg"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=300) as response:
            target.write_bytes(response.read())
    except urllib.error.HTTPError as error:
        raise SystemExit(f"ElevenLabs refused the request ({error.code}): {error.read().decode()[:400]}")


def transcribe(take: Path) -> list[dict]:
    whisper = whisper_settings()
    subprocess.run(
        [
            "whisperx", str(take),
            "--model", whisper["model"],
            "--language", "en",
            "--device", whisper["device"],
            "--compute_type", whisper["compute_type"],
            "--batch_size", str(whisper["batch_size"]),
            "--output_format", "json",
            "--output_dir", str(OUTPUT),
        ],
        capture_output=True,
        check=True,
    )
    transcript = json.loads((OUTPUT / f"{take.stem}.json").read_text(encoding="utf-8"))
    return [word for word in transcript["word_segments"] if "start" in word]


def tighten(take: Path, timing: list[dict]) -> Path:
    """Rejoin the lines with short, even gaps, and move every word time to match."""
    from pydub import AudioSegment

    audio = AudioSegment.from_file(take)
    out = AudioSegment.silent(duration=0, frame_rate=audio.frame_rate)
    for index, entry in enumerate(timing):
        # A line's audio runs from just before its first word to just before the next line.
        begin = max(0.0, entry["start"] - LEAD_IN_SECONDS)
        following = timing[index + 1]["start"] - LEAD_IN_SECONDS if index + 1 < len(timing) else len(audio) / 1000
        finish = min(entry["end"] + TAIL_SECONDS, following)
        shift = len(out) / 1000 - begin
        out += audio[int(begin * 1000) : int(finish * 1000)]
        if index + 1 < len(timing):
            out += AudioSegment.silent(duration=int(LINE_GAP_SECONDS * 1000), frame_rate=audio.frame_rate)
        for word in entry["words"]:
            word["start"] = round(word["start"] + shift, 3)
            word["end"] = round(word["end"] + shift, 3)
        entry["start"] = entry["words"][0]["start"]
        entry["end"] = entry["words"][-1]["end"]
    target = take.with_name(f"{take.stem}_tight.wav")
    out.export(target, format="wav")
    print(f"tightened {len(audio) / 1000:.2f}s to {len(out) / 1000:.2f}s")
    return target


def main() -> None:
    config = load_voiceover_config(PROJECT / "voiceover.json")
    options = config["options"]
    performed = script_lines()
    spoken = [TAG.sub("", line).strip() for line in performed]
    text = "\n\n".join(performed)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    fingerprint = hashlib.sha256(
        json.dumps([text, options["voice_id"], options["model_id"], options["stability"]]).encode()
    ).hexdigest()[:12]
    mp3 = OUTPUT / f"take_{fingerprint}.mp3"
    take = OUTPUT / f"take_{fingerprint}.wav"
    if mp3.exists():
        print(f"take {mp3.name} exists: no credits spent")
    else:
        print(f"requesting one take: {len(text)} characters with {config['voice']} on {options['model_id']}")
        synthesize(text, options, mp3)
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(mp3), "-ar", "48000", "-ac", "2", str(take)],
        check=True,
    )

    heard = transcribe(take)
    heard_keys = ["".join(normalized(word["word"])) for word in heard]
    script_words = [(index, word) for index, line in enumerate(spoken) for word in normalized(line)]
    matcher = difflib.SequenceMatcher(a=[word for _, word in script_words], b=heard_keys, autojunk=False)
    aligned = {}
    for block in matcher.get_matching_blocks():
        for offset in range(block.size):
            aligned[block.a + offset] = heard[block.b + offset]

    timing = [{"text": line, "words": []} for line in spoken]
    missing = []
    for position, (index, word) in enumerate(script_words):
        match = aligned.get(position)
        if match is None:
            missing.append((spoken[index], word))
            continue
        timing[index]["words"].append(
            {"word": word, "start": round(match["start"], 3), "end": round(match["end"], 3)}
        )
    for entry in timing:
        entry["start"] = entry["words"][0]["start"]
        entry["end"] = entry["words"][-1]["end"]
    tight = tighten(take, timing)

    (PROJECT / "timing.json").write_text(
        json.dumps({"take": tight.name, "voice": config["voice"], "lines": timing}, indent=1),
        encoding="utf-8",
    )
    for entry in timing:
        print(f"  {entry['start']:6.2f} {entry['end']:6.2f}  {entry['text']}")
    print(f"script words not heard: {len(missing)}")
    for line, word in missing:
        print(f"  {word!r} in: {line}")
    unmatched = [heard_keys[i] for i in range(len(heard)) if heard[i] not in aligned.values()]
    print("heard but not in script:", " ".join(unmatched) or "none")


if __name__ == "__main__":
    main()
