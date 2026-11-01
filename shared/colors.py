"""Brand palette for Manim scenes, read from shared/brand/tokens.json.

Exactly three colors exist. Use `fill_opacity`, `stroke_opacity`, or `set_opacity` for
tints; never mix a new hex value.
"""

import json
from pathlib import Path

BRAND_DIR = Path(__file__).with_name("brand")
TOKENS = json.loads((BRAND_DIR / "tokens.json").read_text(encoding="utf-8"))

BACKGROUND: str = TOKENS["color"]["background"]
INK: str = TOKENS["color"]["ink"]
ACCENT: str = TOKENS["color"]["accent"]

INK_SOFT_OPACITY: float = TOKENS["opacity"]["ink_soft"]
INK_FAINT_OPACITY: float = TOKENS["opacity"]["ink_faint"]
SHADOW_OPACITY: float = TOKENS["opacity"]["shadow"]


def paper_path(variant: int = 1) -> Path:
    """Path of crumpled-paper variant 1, 2, or 3 (crumpled, folded, quiet)."""
    return BRAND_DIR / TOKENS["paper"][variant - 1]


def paper_background(variant: int = 1):
    """Full-frame paper mobject; call after `use_reel_canvas()` and add it first."""
    from manim import ImageMobject, config

    paper = ImageMobject(str(paper_path(variant)))
    paper.scale_to_fit_height(config.frame_height)
    if paper.width < config.frame_width:
        paper.scale_to_fit_width(config.frame_width)
    paper.set_z_index(-100)
    return paper
