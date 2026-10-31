"""Canvas and UI-safe area for Instagram Reels, in Manim scene units.

The frame is 9 x 16 units, so 1 unit is 120 px on a 1080 x 1920 Reel.
"""

from manim import config

FRAME_WIDTH = 9
FRAME_HEIGHT = 16

# Top 270 px: Reels header and camera icon.
SAFE_TOP = 5.75
# Bottom 670 px: username, caption, and audio credit.
SAFE_BOTTOM = -2.4
# Side 120 px: the like, comment, share, and save rail sits on the right. The
# left margin mirrors it so centered layouts stay centered.
SAFE_LEFT = -3.5
SAFE_RIGHT = 3.5


def use_reel_canvas() -> None:
    """Preserve the chosen quality preset while rotating its raster to portrait."""
    if config.pixel_width > config.pixel_height:
        config.pixel_width, config.pixel_height = (
            config.pixel_height,
            config.pixel_width,
        )
    config.frame_width = FRAME_WIDTH
    config.frame_height = FRAME_HEIGHT
