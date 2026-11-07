"""Mix the effects under the narration and master the soundtrack.

Run with earshot's Python, from the repository root:
  <earshot venv>/Scripts/python.exe videos/012_qr_codes/build_mix.py
The shared code and effect tables are in shared/reel_mix.py; pass extras to mix() if needed.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from shared.reel_mix import mix

if __name__ == "__main__":
    mix(Path(__file__).parent)
