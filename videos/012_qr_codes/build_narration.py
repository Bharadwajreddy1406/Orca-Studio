"""Voice script.md with ElevenLabs in one cached request, then time every word.

Run from the repository root: uv run python videos/012_qr_codes/build_narration.py
The shared code is shared/reel_narration.py.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from shared.reel_narration import build

if __name__ == "__main__":
    build(Path(__file__).parent)
