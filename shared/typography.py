"""Brand text for Manim scenes, with no silent font fallback.

Windows Pango finds a registered font only by its exact family name and falls back
with nothing more than a log line when the name misses. The brand fonts are single-face
families, so `font=<family>` with the default weight is the one string that has to work,
and `brand_text` checks that it really changed the outlines before anything is drawn.
"""

from functools import cache
from pathlib import Path

import manimpango
from manim import Text

from shared.colors import ACCENT, BRAND_DIR, INK, TOKENS

# Pango rounds glyph positions to its pixel grid, which shows as uneven kerning at
# small sizes. Laying out at 6x and scaling down removes that.
TEXT_LAYOUT_SCALE = 6

DISPLAY_FAMILY: str = TOKENS["font"]["display"]["family"]
CAPTION_FAMILY: str = TOKENS["font"]["caption"]["family"]
CODE_FAMILY: str = TOKENS["font"]["code"]["family"]

_FALLBACK_PROBE_FAMILY = "No Such Family Brand Probe"
_PROBE_TEXT = "Kubernetes 10 > 3"


class BrandFontError(RuntimeError):
    """A brand font was requested but Pango would have drawn a fallback instead."""


@cache
def register_brand_fonts() -> tuple[str, ...]:
    """Register every brand font file with Pango once per process."""
    for font in TOKENS["font"].values():
        font_path = Path(BRAND_DIR / font["file"])
        if not font_path.exists():
            raise BrandFontError(f"Missing font file: {font_path}")
        if not manimpango.register_font(str(font_path)):
            raise BrandFontError(f"Pango refused to register: {font_path}")
    return tuple(manimpango.list_fonts())


@cache
def verify_family(family: str) -> None:
    """Raise unless Pango lays out `family` differently from its fallback font."""
    if family not in register_brand_fonts():
        raise BrandFontError(f"Pango cannot see family {family!r} after registration")
    requested = Text(_PROBE_TEXT, font=family, font_size=48 * TEXT_LAYOUT_SCALE)
    # A family that cannot exist shows what Pango draws when a lookup misses.
    fallback = Text(
        _PROBE_TEXT, font=_FALLBACK_PROBE_FAMILY, font_size=48 * TEXT_LAYOUT_SCALE
    )
    if abs(requested.width - fallback.width) < 1e-3:
        raise BrandFontError(f"Family {family!r} resolved to Pango's fallback font")


def brand_text(
    text: str,
    family: str,
    font_size: float,
    color: str = INK,
    accent: str | None = None,
    **text_options,
) -> Text:
    """Text in a brand family, optionally with one substring in the accent color."""
    verify_family(family)
    if accent is not None:
        if accent not in text:
            raise ValueError(f"Accent {accent!r} does not occur in {text!r}")
        text_options.setdefault("t2c", {accent: ACCENT})
        # Coloring works per glyph, so ligatures would shift the colored range.
        text_options.setdefault("disable_ligatures", True)
    return Text(
        text,
        font=family,
        font_size=font_size * TEXT_LAYOUT_SCALE,
        color=color,
        **text_options,
    ).scale(1 / TEXT_LAYOUT_SCALE)


def headline(
    text: str,
    font_size: float = 48,
    color: str = INK,
    accent: str | None = None,
    **text_options,
) -> Text:
    """Display serif, for titles and large statements."""
    return brand_text(text, DISPLAY_FAMILY, font_size, color, accent, **text_options)


def caption(
    text: str,
    font_size: float = 24,
    color: str = INK,
    accent: str | None = None,
    **text_options,
) -> Text:
    """Caption serif, for labels and on-screen sentences."""
    return brand_text(text, CAPTION_FAMILY, font_size, color, accent, **text_options)


def code(text: str, font_size: float = 20, color: str = INK, **text_options) -> Text:
    """Monospace, for code and commands only."""
    text_options.setdefault("disable_ligatures", True)
    return brand_text(text, CODE_FAMILY, font_size, color, **text_options)
