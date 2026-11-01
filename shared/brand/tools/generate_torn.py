"""Generate the original torn orange sheets for the channel's signature reveal.

Usage:
    uv run --no-project --with numpy --with scipy --with pillow python ^
        shared/brand/tools/generate_torn.py [output_dir]

Writes torn_top.webp and torn_bottom.webp: two transparent sheets that share one tear
curve, so placed together they cover the frame and pulled apart they rip open. The raw
torn core is the bone color and the shadow is the ink color at reduced opacity; no other
color is introduced. Each seam sits TEAR_OFFSET pixels from the sheet's inner image edge.
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, str(Path(__file__).resolve().parent))
import generate_paper as paper

BRAND_DIR = Path(__file__).resolve().parents[1]
SUPERSAMPLE = 2
WIDTH, HEIGHT = 1080 * SUPERSAMPLE, 1200 * SUPERSAMPLE
SEED = 8128
# Distance from the sheet's far edge to the seam. brand.css places sheets using these.
TOP_SHEET_SEAM_Y = 1000 * SUPERSAMPLE
BOTTOM_SHEET_SEAM_Y = 200 * SUPERSAMPLE
SHADOW_OPACITY = 0.30


def hex_to_rgb(color: str) -> np.ndarray:
    value = color.lstrip("#")
    return np.array(
        [int(value[index : index + 2], 16) for index in (0, 2, 4)], dtype=np.float32
    )


def noise_1d(rng: np.random.Generator, length: int, sigma: float) -> np.ndarray:
    field = ndi.gaussian_filter1d(rng.standard_normal(length), sigma, mode="wrap")
    return field / field.std()


def noise_2d(
    rng: np.random.Generator, sigma: float | tuple[float, float]
) -> np.ndarray:
    field = ndi.gaussian_filter(
        rng.standard_normal((HEIGHT, WIDTH)).astype(np.float32), sigma
    )
    return field / field.std()


def tear_curve(rng: np.random.Generator) -> np.ndarray:
    """Vertical seam offset per column: broad drift, ragged steps, and fine fraying."""
    scale = SUPERSAMPLE
    return (
        noise_1d(rng, WIDTH, 170 * scale) * 26 * scale
        + noise_1d(rng, WIDTH, 44 * scale) * 11 * scale
        + noise_1d(rng, WIDTH, 11 * scale) * 4.5 * scale
        + noise_1d(rng, WIDTH, 2.5 * scale) * 1.6 * scale
    )


def sheet_surface(accent: np.ndarray, seed: int) -> np.ndarray:
    """Orange paper with the same faceted crumple model as the bone backgrounds."""
    recipe = paper.PaperRecipe(
        "",
        seed=seed,
        levels=(
            paper.FacetLevel(300, 0.8),
            paper.FacetLevel(120, 0.5),
            paper.FacetLevel(48, 0.18),
        ),
        shade_amount=0.045,
    )
    rng = np.random.default_rng(seed)
    shade = paper.shade_from_height(paper.crumple_height(rng, recipe), recipe, rng)
    shade = ndi.zoom(shade[: HEIGHT // SUPERSAMPLE], SUPERSAMPLE, order=1)[
        :HEIGHT, :WIDTH
    ]
    return accent * shade[..., None].astype(np.float32)


def build_sheet(
    curve: np.ndarray,
    seam_y: int,
    direction: int,
    accent: np.ndarray,
    bone: np.ndarray,
    ink: np.ndarray,
    rng: np.random.Generator,
) -> Image.Image:
    """`direction` is +1 when the sheet lies above the seam, -1 when it lies below."""
    scale = SUPERSAMPLE
    grid_y = np.arange(HEIGHT, dtype=np.float32)[:, None]
    # Positive outside the sheet, negative inside; the 2D term frays the outline.
    fray = (
        noise_2d(rng, 1.2 * scale) * 1.1 * scale
        + noise_2d(rng, (1.0 * scale, 2.2 * scale)) * 1.4 * scale
    )
    distance = (grid_y - (seam_y + curve[None, :])) * direction + fray

    # The raw core: where the paper's coloured face tore away and left pale fibers.
    band = (
        15 + noise_1d(rng, WIDTH, 60 * scale) * 7 + noise_1d(rng, WIDTH, 12 * scale) * 4
    )
    band = np.clip(band, 5, 40) * scale
    core_fray = (
        noise_2d(rng, (1.0 * scale, 2.6 * scale)) * 2.6 * scale
        + noise_2d(rng, 1.4) * 1.5 * scale
    )
    core_distance = distance + band[None, :] + core_fray

    surface = sheet_surface(accent, SEED + direction)
    # The sheet's face curls up slightly at the tear, catching a soft shadow beside it.
    lip = np.exp(-((np.clip(-core_distance, 0, None) / (11 * scale)) ** 2))
    surface = surface * (1 - lip[..., None] * 0.16) + ink * lip[..., None] * 0.04

    fiber_shade = (
        1
        + noise_2d(rng, (0.9 * scale, 2.0 * scale)) * 0.022
        + noise_2d(rng, 0.9) * 0.018
    )
    # The core falls away toward the outer edge, so it darkens slightly there.
    core_depth = np.clip(1 + distance / band[None, :], 0, 1)
    core = bone * (fiber_shade * (1.0 - core_depth * 0.09))[..., None]

    in_core = np.clip(0.5 + core_distance / (1.2 * scale), 0, 1)[..., None]
    sheet_rgb = surface * (1 - in_core) + core * in_core
    sheet_alpha = np.clip(0.5 - distance / (1.0 * scale), 0, 1)

    # Soft contact shadow cast past the seam, built from the sheet's own silhouette.
    shadow = ndi.gaussian_filter(sheet_alpha, 11 * scale)
    shadow = ndi.shift(shadow, (direction * 8 * scale, 0), order=1, mode="nearest")
    shadow_alpha = shadow * SHADOW_OPACITY * (1 - sheet_alpha)

    alpha = sheet_alpha + shadow_alpha
    safe_alpha = np.maximum(alpha, 1e-4)[..., None]
    rgb = (
        sheet_rgb * sheet_alpha[..., None] + ink * shadow_alpha[..., None]
    ) / safe_alpha
    rgba = np.dstack([np.clip(rgb, 0, 255), np.clip(alpha, 0, 1) * 255]).astype(
        np.uint8
    )
    # Downsampling premultiplied pixels keeps ink from fringing at the alpha edge.
    image = Image.fromarray(rgba).convert("RGBa")
    return image.resize((WIDTH // scale, HEIGHT // scale), Image.LANCZOS).convert(
        "RGBA"
    )


def main() -> None:
    output_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else BRAND_DIR / "torn"
    output_dir.mkdir(parents=True, exist_ok=True)
    tokens = json.loads((BRAND_DIR / "tokens.json").read_text(encoding="utf-8"))
    accent = hex_to_rgb(tokens["color"]["accent"])
    bone = hex_to_rgb(tokens["color"]["background"])
    ink = hex_to_rgb(tokens["color"]["ink"])
    rng = np.random.default_rng(SEED)
    curve = tear_curve(rng)
    sheets = {
        "torn_top.webp": build_sheet(
            curve, TOP_SHEET_SEAM_Y, 1, accent, bone, ink, rng
        ),
        "torn_bottom.webp": build_sheet(
            curve, BOTTOM_SHEET_SEAM_Y, -1, accent, bone, ink, rng
        ),
    }
    for name, image in sheets.items():
        path = output_dir / name
        image.save(path, quality=92, alpha_quality=95, method=6, exact=False)
        print(name, image.size, f"{path.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
