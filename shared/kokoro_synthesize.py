"""Synthesize one narration line with Kokoro, inside the separate Kokoro environment.

Usage: python kokoro_synthesize.py <voice> <speed> <output.wav>, text on stdin (UTF-8).

This file deliberately imports nothing from the repository: Kokoro's PyTorch stack
lives in its own environment so it never touches the project's `uv` environment.
"""

import sys

import numpy as np
import soundfile as sf
import torch
from kokoro import KPipeline

REPO_ID = "hexgrad/Kokoro-82M"
SAMPLE_RATE = 24000


def main() -> None:
    voice, speed, output_path = sys.argv[1], float(sys.argv[2]), sys.argv[3]
    text = sys.stdin.buffer.read().decode("utf-8")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    # The first letter of a Kokoro voice name is its language code.
    pipeline = KPipeline(lang_code=voice[0], repo_id=REPO_ID, device=device)
    chunks = [
        result.audio.numpy()
        for result in pipeline(text, voice=voice, speed=speed)
        if result.audio is not None
    ]
    if not chunks:
        raise SystemExit("Kokoro produced no audio for this text.")
    sf.write(output_path, np.concatenate(chunks), SAMPLE_RATE)


if __name__ == "__main__":
    main()
