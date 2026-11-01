"""Cut the brand's static font instances from the official OFL variable fonts.

Usage:
    uv run --no-project --with fonttools python shared/brand/tools/make_fonts.py <dl_dir>

<dl_dir> holds the unmodified Google Fonts files:
    SourceSerif4[opsz,wght].ttf   (github.com/google/fonts/tree/main/ofl/sourceserif4)
    JetBrainsMono[wght].ttf       (github.com/google/fonts/tree/main/ofl/jetbrainsmono)

Static cuts exist because Windows Pango cannot select variable-font instances, and
because each cut needing only one family name makes the Manim string unambiguous.
Neither upstream license declares a Reserved Font Name, so modified instances are allowed.
"""

import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

FONTS_DIR = Path(__file__).resolve().parents[1] / "fonts"

CUTS = [
    (
        "SourceSerif4[opsz,wght].ttf",
        {"opsz": 60, "wght": 700},
        "Source Serif 4 Display",
        700,
        FONTS_DIR / "source-serif-4" / "SourceSerif4Display-Bold.ttf",
    ),
    (
        "SourceSerif4[opsz,wght].ttf",
        {"opsz": 20, "wght": 500},
        "Source Serif 4 Caption",
        500,
        FONTS_DIR / "source-serif-4" / "SourceSerif4Caption-Medium.ttf",
    ),
    (
        "JetBrainsMono[wght].ttf",
        {"wght": 500},
        "JetBrains Mono Code",
        500,
        FONTS_DIR / "jetbrains-mono" / "JetBrainsMonoCode-Medium.ttf",
    ),
]


def rename(font: TTFont, family: str, weight: int) -> None:
    """Give the cut a single family with a Regular style, so no weight lookup can miss."""
    name_table = font["name"]
    # Drop typographic and variable-instance names so only one family survives.
    for name_id in (16, 17, 21, 22, 25):
        name_table.removeNames(nameID=name_id)
    postscript = family.replace(" ", "") + "-Regular"
    for name_id, value in (
        (1, family),
        (2, "Regular"),
        (3, f"BradAndPrad;{postscript}"),
        (4, family),
        (6, postscript),
    ):
        name_table.removeNames(nameID=name_id)
        name_table.setName(value, name_id, 3, 1, 0x409)
        name_table.setName(value, name_id, 1, 0, 0)
    font["OS/2"].usWeightClass = weight
    # REGULAR bit set, BOLD and ITALIC bits clear: the family has exactly one face.
    font["OS/2"].fsSelection = (font["OS/2"].fsSelection & ~0b100001) | 0b1000000
    font["head"].macStyle = 0


def main() -> None:
    source_dir = Path(sys.argv[1])
    for source, axes, family, weight, output in CUTS:
        font = TTFont(source_dir / source)
        static = instancer.instantiateVariableFont(font, axes, inplace=False)
        if "STAT" in static:
            del static["STAT"]
        if family == "JetBrains Mono Code" and "GSUB" in static:
            # Code ligatures redraw != and -> misleadingly, and their 'calt' substitutions
            # make Manim's Text raise, because glyphs stop matching characters one to one.
            del static["GSUB"]
        rename(static, family, weight)
        output.parent.mkdir(parents=True, exist_ok=True)
        static.save(output)
        print(output.name, output.stat().st_size)


if __name__ == "__main__":
    main()
