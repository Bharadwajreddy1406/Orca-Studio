"""Generate the brand's original crumpled-paper backgrounds. Nothing is sampled from stock.

Usage:
    uv run --no-project --with numpy --with scipy --with pillow python ^
        shared/brand/tools/generate_paper.py [output_dir] [name_filter]

The model imitates how paper actually crumples: the sheet breaks into nearly flat facets
of several sizes, meeting at sharp ridge and valley creases, lit from one low direction,
with fiber grain on top. Seeds are fixed, so reruns reproduce the same files.
"""

import json
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

BRAND_DIR = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = 1080, 1920
# Light comes from the upper left at a low angle, as in a desk-lamp photo of paper.
LIGHT_DIRECTION = np.array([-0.62, -0.78])
DOME_FLATNESS = 3.0


@dataclass(frozen=True)
class FacetLevel:
    spacing: float  # typical facet size, in pixels
    steepness: float  # largest facet tilt; larger means harder creases


@dataclass(frozen=True)
class PaperRecipe:
    file_name: str
    seed: int
    levels: tuple[FacetLevel, ...]
    shade_amount: float
    fold_lines: int = 0


RECIPES = (
    PaperRecipe(
        "paper_01_crumpled.webp",
        seed=1406,
        levels=(FacetLevel(260, 0.8), FacetLevel(110, 0.55), FacetLevel(44, 0.22)),
        shade_amount=0.040,
    ),
    PaperRecipe(
        "paper_02_folded.webp",
        seed=2718,
        levels=(FacetLevel(380, 0.8), FacetLevel(150, 0.45), FacetLevel(56, 0.15)),
        shade_amount=0.036,
        fold_lines=2,
    ),
    PaperRecipe(
        "paper_03_quiet.webp",
        seed=3141,
        levels=(FacetLevel(300, 0.8), FacetLevel(120, 0.5), FacetLevel(48, 0.15)),
        shade_amount=0.020,
    ),
)


def smooth_noise(rng: np.random.Generator, sigma: float) -> np.ndarray:
    """Unit-variance Gaussian-filtered noise; coarse fields are upsampled for speed."""
    if sigma >= 8:
        step = int(sigma / 2)
        coarse = rng.standard_normal((HEIGHT // step + 3, WIDTH // step + 3))
        coarse = ndi.gaussian_filter(coarse, sigma / step, mode="wrap")
        zoomed = ndi.zoom(coarse, step, order=3)[:HEIGHT, :WIDTH]
    else:
        zoomed = ndi.gaussian_filter(
            rng.standard_normal((HEIGHT, WIDTH)), sigma, mode="wrap"
        )
    return zoomed / zoomed.std()


def facet_level(
    warped_x: np.ndarray,
    warped_y: np.ndarray,
    rng: np.random.Generator,
    level: FacetLevel,
) -> np.ndarray:
    """One scale of facets: the upper envelope of many slightly domed, randomly tilted planes.

    Each site owns the region where its plane is highest, so the sheet splits into
    nearly flat polygons whose shared edges are sharp creases, as in crumpled paper.
    """
    spacing = level.spacing
    envelope = np.full(warped_x.shape, -np.inf, dtype=np.float32)
    step = HEIGHT // warped_x.shape[0]
    # A flat dome makes big, nearly planar facets. A site's plane can only win within
    # 2 * tilt * DOME_FLATNESS * spacing of it, so that is how far each site is drawn.
    reach = (2 * level.steepness * DOME_FLATNESS + 1.5) * spacing
    for site_y in np.arange(-spacing, HEIGHT + spacing, spacing):
        for site_x in np.arange(-spacing, WIDTH + spacing, spacing):
            center = np.array([site_x, site_y]) + rng.uniform(-0.5, 0.5, 2) * spacing
            tilt_angle = rng.uniform(0, 2 * np.pi)
            tilt = rng.uniform(0.15, 1.0) * level.steepness
            slope = np.array([np.cos(tilt_angle), np.sin(tilt_angle)]) * tilt
            x_start = int(max(center[0] - reach, 0)) // step
            x_end = int(min(center[0] + reach, WIDTH)) // step
            y_start = int(max(center[1] - reach, 0)) // step
            y_end = int(min(center[1] + reach, HEIGHT)) // step
            if x_end <= x_start or y_end <= y_start:
                continue
            offset_x = warped_x[y_start:y_end, x_start:x_end] - center[0]
            offset_y = warped_y[y_start:y_end, x_start:x_end] - center[1]
            plane = slope[0] * offset_x + slope[1] * offset_y
            dome = (offset_x**2 + offset_y**2) / (2 * DOME_FLATNESS * spacing)
            region = envelope[y_start:y_end, x_start:x_end]
            np.maximum(region, plane - dome, out=region)
    # Remove the dome's average offset so levels add without a bias.
    return envelope - envelope.mean()


def crumple_height(rng: np.random.Generator, recipe: PaperRecipe) -> np.ndarray:
    """Height field of a crumpled sheet, in pixels."""
    grid_y, grid_x = np.mgrid[0:HEIGHT, 0:WIDTH].astype(np.float32)
    # Creases are never ruler straight, so bend the whole coordinate system a little.
    warped_x = grid_x + smooth_noise(rng, 90).astype(np.float32) * 14
    warped_y = grid_y + smooth_noise(rng, 90).astype(np.float32) * 14
    warped_x += smooth_noise(rng, 10).astype(np.float32) * 1.2
    warped_y += smooth_noise(rng, 10).astype(np.float32) * 1.2

    height = np.zeros((HEIGHT, WIDTH), dtype=np.float32)
    for level in recipe.levels:
        if level.spacing >= 80:
            # Large facets are computed every second pixel and upsampled: four times
            # faster, and only a pixel softer, which the shading blur hides anyway.
            coarse = facet_level(warped_x[::2, ::2], warped_y[::2, ::2], rng, level)
            coarse = ndi.zoom(coarse, 2, order=1, grid_mode=True, mode="nearest")
            ridges = coarse[:HEIGHT, :WIDTH]
            coarse = facet_level(warped_x[::2, ::2], warped_y[::2, ::2], rng, level)
            valleys = ndi.zoom(coarse, 2, order=1, grid_mode=True, mode="nearest")[
                :HEIGHT, :WIDTH
            ]
        else:
            ridges = facet_level(warped_x, warped_y, rng, level)
            valleys = facet_level(warped_x, warped_y, rng, level)
        # An upper envelope only makes ridges; subtracting a second one adds valleys.
        height += 0.5 * (ridges - valleys)

    # Long hard folds, as if the sheet had been folded once before being crumpled.
    for _ in range(recipe.fold_lines):
        origin = rng.uniform([0, 0], [WIDTH, HEIGHT])
        angle = rng.uniform(0, np.pi)
        direction = np.array([np.cos(angle), np.sin(angle)])
        distance = (warped_x - origin[0]) * -direction[1] + (
            warped_y - origin[1]
        ) * direction[0]
        height += rng.choice([-1.0, 1.0]) * 0.12 * np.abs(distance).astype(np.float32)
    return height


def shade_from_height(
    height: np.ndarray, recipe: PaperRecipe, rng: np.random.Generator
) -> np.ndarray:
    """Multiplicative shading (around 1.0) from relief, ambient occlusion, and grain."""
    gradient_y, gradient_x = np.gradient(ndi.gaussian_filter(height, 0.8))
    relief = gradient_x * LIGHT_DIRECTION[0] + gradient_y * LIGHT_DIRECTION[1]
    relief = relief / relief.std()
    # A compressive curve keeps the sharpest folds from reading as drawn black lines.
    relief = np.tanh(relief * 0.45) / 0.45

    # Valleys collect soft shadow over a wider radius than the folds themselves.
    occlusion = ndi.gaussian_filter(height, 26) - ndi.gaussian_filter(height, 3)
    occlusion = np.tanh(occlusion / occlusion.std() * 0.7)

    # Stressed fibers whiten slightly along the hardest creases.
    curvature = np.abs(ndi.laplace(ndi.gaussian_filter(height, 0.9)))
    whitened = np.clip(curvature / np.quantile(curvature, 0.998), 0, 1) ** 2

    relief_shading = (
        relief * recipe.shade_amount - occlusion * recipe.shade_amount * 0.35
    )
    # Big soft light-and-shadow areas would sit behind text as blotches; flatten most of
    # the broadest variation and keep the creases.
    relief_shading -= 0.65 * ndi.gaussian_filter(relief_shading, 90)
    # Shadows are compressed more than highlights, so accent text keeps its contrast
    # where it crosses a crease.
    relief_shading = np.where(relief_shading < 0, relief_shading * 0.6, relief_shading)
    fine_fibers = (
        smooth_noise(rng, 0.7) * 0.0075 + rng.standard_normal(height.shape) * 0.0055
    )
    long_fibers = ndi.gaussian_filter(rng.standard_normal(height.shape), (0.6, 2.6))
    long_fibers = long_fibers / long_fibers.std() * 0.0055
    mottling = smooth_noise(rng, 180) * 0.0060 + smooth_noise(rng, 22) * 0.0030
    shade = 1 + relief_shading + whitened * 0.012 + fine_fibers + long_fibers + mottling
    return shade / shade.mean()


def build_paper(recipe: PaperRecipe, bone: np.ndarray) -> np.ndarray:
    rng = np.random.default_rng(recipe.seed)
    height = crumple_height(rng, recipe)
    shade = shade_from_height(height, recipe, rng)
    return np.clip(np.rint(bone * shade[..., None]), 0, 255).astype(np.uint8)


def main() -> None:
    output_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else BRAND_DIR / "paper"
    output_dir.mkdir(parents=True, exist_ok=True)
    tokens = json.loads((BRAND_DIR / "tokens.json").read_text(encoding="utf-8"))
    bone_hex = tokens["color"]["background"].lstrip("#")
    bone = np.array(
        [int(bone_hex[index : index + 2], 16) for index in (0, 2, 4)], dtype=float
    )
    only = sys.argv[2] if len(sys.argv) > 2 else ""
    for recipe in RECIPES:
        if only not in recipe.file_name:
            continue
        pixels = build_paper(recipe, bone)
        path = output_dir / recipe.file_name
        # Lossy WebP at quality 100 keeps the fine grain that lower settings smooth away.
        Image.fromarray(pixels).save(path, quality=100, method=6)
        luminance = pixels.mean(axis=2)
        low, high = np.percentile(luminance, [2, 98])
        print(
            f"{path.name}: {path.stat().st_size / 1e6:.2f} MB, mean RGB "
            f"{pixels.reshape(-1, 3).mean(axis=0).round(1)}, p2 {low:.0f}, p98 {high:.0f}"
        )


if __name__ == "__main__":
    main()
