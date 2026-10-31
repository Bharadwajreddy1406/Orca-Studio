from __future__ import annotations

import math
import random
import wave
from collections.abc import Callable
from pathlib import Path

import manimpango
import numpy as np
from manim import (
    DOWN,
    MEDIUM,
    RIGHT,
    ULTRABOLD,
    UP,
    Animation,
    Create,
    FadeIn,
    FadeOut,
    FadeTransform,
    LaggedStart,
    Line,
    ManimColor,
    Rectangle,
    RoundedRectangle,
    Text,
    Transform,
    UpdateFromAlphaFunc,
    VGroup,
    interpolate_color,
    rate_functions,
)
from manim_voiceover import VoiceoverScene
from pydub import AudioSegment

from shared.instagram_reel import (
    SAFE_LEFT,
    SAFE_RIGHT,
    SAFE_TOP,
    use_reel_canvas,
)
from shared.voiceover import create_speech_service

use_reel_canvas()

FONT_DIRECTORY = Path(__file__).with_name("assets") / "fonts"
FONT_FAMILY = "Manrope"
TEXT_LAYOUT_SCALE = 6
manimpango.register_font(str(FONT_DIRECTORY / "Manrope-ExtraBold.ttf"))
manimpango.register_font(str(FONT_DIRECTORY / "Manrope-Medium.ttf"))

BACKGROUND = "#030407"
IDLE_COLOR = "#155859"
COMPARE_COLOR = "#3CC8C2"
SWAP_COLOR = "#F4F7F2"
SORTED_COLOR = "#D4FF24"
TEXT_COLOR = "#F4F7F2"
MUTED_COLOR = "#8CA6A5"
PANEL_COLOR = "#0B1B1C"

START_VALUES = (5, 3, 8, 1, 4, 10, 2, 7, 9, 6)
TARGET_DURATION = 30.0
MINIMUM_FINAL_HOLD = 1.0

# Vertical layout, top to bottom, inside the Reels safe area.
HEADLINE_Y = SAFE_TOP - 0.68
READOUT_Y = 3.88
CHIP_Y = 3.14
WINDOW_TOP = 2.8
BASELINE = -1.95
RULE_Y = BASELINE - 0.17

SLOT_PITCH = (SAFE_RIGHT - SAFE_LEFT) / len(START_VALUES)
BAR_WIDTH = 0.54
UNIT_HEIGHT = 0.4
SLOT_X = [SAFE_LEFT + SLOT_PITCH * (slot + 0.5) for slot in range(len(START_VALUES))]

TRANSITION_TIME = 0.42
WAVE_LIFT = 0.16
NOTE_GAIN = -20
SOUND_EFFECTS_DIRECTORY = Path(__file__).parents[2] / "shared" / "sound_effects"
EFFECT_FADE_OUT_MS = 80
# Source, kept start and end in seconds, and gain in dB. Each trim places the
# sound's hit right after its start, so it can land on the frame it belongs to.
SOUND_EFFECTS = {
    "condense": ("Short - Swish", 0.3, 1.0, -14),
    "lock": ("Punch - Pop", 0.09, 0.75, -12),
    "finish": ("Short - Digital Crystal", 0.0, 1.05, -13),
    "impact": ("Impact - Lightweight", 0.66, 2.1, -9),
}
# C major pentatonic: any two values sound consonant together.
VALUE_PITCHES_HZ = (
    261.63,
    293.66,
    329.63,
    392.00,
    440.00,
    523.25,
    587.33,
    659.25,
    783.99,
    880.00,
)


def spring(damping: float, frequency: float = 9.0) -> Callable[[float], float]:
    """Return the step response of a spring, the motion curve iOS is built on.

    It leaves rest gently, arrives quickly, and spends its final moments settling,
    so nothing ever starts or stops abruptly. Damping below 1 adds a slight overshoot.
    """

    def response(time: float) -> float:
        if damping >= 1:
            decay = math.exp(-frequency * time)
            return 1 - (1 + frequency * time) * decay
        damped = frequency * math.sqrt(1 - damping**2)
        decay = math.exp(-damping * frequency * time)
        return 1 - decay * (
            math.cos(damped * time)
            + damping * frequency / damped * math.sin(damped * time)
        )

    end_value = response(1.0)
    return lambda alpha: response(alpha) / end_value


SMOOTH_SPRING = spring(damping=1.0)
BOUNCY_SPRING = spring(damping=0.8)


def manrope_text(text: str, font_size: float, color: str, weight: str) -> Text:
    # Pango rounds glyph spacing at small sizes, so lay out large and scale down.
    return Text(
        text,
        font=FONT_FAMILY,
        weight=weight,
        font_size=font_size * TEXT_LAYOUT_SCALE,
        color=color,
    ).scale(1 / TEXT_LAYOUT_SCALE)


def display_text(text: str, font_size: float, color: str = TEXT_COLOR) -> Text:
    return manrope_text(text, font_size, color, ULTRABOLD)


def body_text(text: str, font_size: float, color: str = MUTED_COLOR) -> Text:
    return manrope_text(text, font_size, color, MEDIUM)


class ValueBar(VGroup):
    """A labeled bar standing on the floor, with a faint reflection beneath it."""

    def __init__(self, value: int) -> None:
        super().__init__()
        self.value = value
        height = value * UNIT_HEIGHT

        self.body = RoundedRectangle(
            width=BAR_WIDTH,
            height=height,
            corner_radius=min(0.12, height / 2),
            stroke_width=0,
            fill_color=IDLE_COLOR,
            fill_opacity=1,
        ).move_to(UP * (BASELINE + height / 2))

        self.number = display_text(str(value), font_size=30)
        self.number.next_to(self.body, UP, buff=0.1)

        # The reflection only occupies the zone covered by Instagram's UI, so it
        # adds depth without ever carrying information.
        slice_height = min(height, 1.0) / 5
        self.reflection = VGroup(
            *[
                Rectangle(
                    width=BAR_WIDTH,
                    height=slice_height,
                    stroke_width=0,
                    fill_color=IDLE_COLOR,
                    fill_opacity=0.3 * (1 - step / 5),
                ).move_to(UP * (BASELINE - slice_height * (step + 0.5) - 0.02))
                for step in range(5)
            ]
        )

        self.add(self.reflection, self.body, self.number)
        # The shorter bar is drawn in front so both stay visible while crossing.
        self.set_z_index(20 - value)

    def paint(self, color: str) -> ValueBar:
        self.body.set_fill(color)
        self.reflection.set_fill(color)
        return self


class BubbleSortReel(VoiceoverScene):
    """Run bubble sort on ten bars, slowly once, then at full speed."""

    def construct(self) -> None:
        self.camera.background_color = BACKGROUND
        self.set_speech_service(
            create_speech_service(Path(__file__).with_name("voiceover.json"))
        )
        self.audio_directory = Path(__file__).with_name("assets") / "audio"
        self.write_note_files()
        self.trim_sound_effects()

        self.bars = [ValueBar(value) for value in START_VALUES]
        for slot, bar in enumerate(self.bars):
            bar.set_x(SLOT_X[slot])

        self.headline = None
        self.chip_pill = None
        self.chip_label = None
        self.sorted_rule = None
        self.sorted_label = None
        self.pass_number = 1
        self.comparisons = 0
        self.swaps = 0

        self.show_hook()
        self.introduce_bubble_sort()
        self.teach_the_rule()
        self.carry_the_largest_to_the_end()
        self.run_faster_passes()
        self.exit_early()
        self.show_the_cost()
        self.close()

    def show_hook(self) -> None:
        """Beat 1: a restless crowd of bars, on screen from the very first frame."""
        narration = "How do computers sort millions of numbers?"

        self.floor = Line(
            [SAFE_LEFT, BASELINE, 0],
            [SAFE_RIGHT, BASELINE, 0],
            color=IDLE_COLOR,
            stroke_width=2,
        )
        crowd_generator = random.Random(7)
        crowd_count = 80
        crowd_pitch = (SAFE_RIGHT - SAFE_LEFT) / crowd_count
        crowd_slots = [
            SAFE_LEFT + crowd_pitch * (slot + 0.5) for slot in range(crowd_count)
        ]
        self.crowd = VGroup(
            *[
                self.make_crowd_bar(crowd_generator.uniform(0.25, 4.3), slot_x)
                for slot_x in crowd_slots
            ]
        )
        self.headline = self.make_headline(
            ["How do computers sort", "millions of numbers?"],
            (TEXT_COLOR, SORTED_COLOR),
        )
        self.add(self.floor, self.crowd, self.headline)

        with self.voiceover(text=narration) as tracker:
            shuffle_rounds = 2
            for _ in range(shuffle_rounds):
                targets = crowd_generator.sample(crowd_slots, crowd_count)
                # A small stagger lets the rearrangement ripple instead of jump.
                self.play(
                    LaggedStart(
                        *[
                            crowd_bar.animate(rate_func=SMOOTH_SPRING).set_x(target)
                            for crowd_bar, target in zip(
                                self.crowd, targets, strict=True
                            )
                        ],
                        lag_ratio=0.006,
                    ),
                    run_time=tracker.duration / shuffle_rounds,
                )

    def introduce_bubble_sort(self) -> None:
        """Beat 2: the crowd condenses into ten bars, and the first pair lights up."""
        narration = "Let's start simple: Bubble Sort."

        # Each bar absorbs the thin bars standing nearest to it.
        crowd_by_x = sorted(self.crowd, key=lambda crowd_bar: crowd_bar.get_x())
        bodies = [bar.body.copy() for bar in self.bars]
        cluster_size = len(crowd_by_x) // len(self.bars)
        condense = [
            Transform(crowd_bar, bodies[index // cluster_size])
            for index, crowd_bar in enumerate(crowd_by_x)
        ]

        self.window = self.make_window(pair_slot=0)

        with self.voiceover(text=narration) as tracker:
            self.add_effect("condense")
            self.glide(
                *condense,
                *self.headline_change(["Bubble Sort"], (SORTED_COLOR,)),
                run_time=max(0.7, tracker.duration * 0.5),
            )
            # The stagger registered each thin bar with the scene individually.
            self.remove(self.crowd, *self.crowd)
            self.add(*self.bars)
            self.glide(
                *[FadeIn(bar.number, shift=DOWN * 0.08) for bar in self.bars],
                *[FadeIn(bar.reflection) for bar in self.bars],
                FadeIn(self.window, scale=0.96),
                self.bars[0].animate.paint(COMPARE_COLOR),
                self.bars[1].animate.paint(COMPARE_COLOR),
                run_time=0.55,
            )

    def teach_the_rule(self) -> None:
        """Beats 3-4: the two possible outcomes of one comparison."""
        self.readout = self.make_readout()

        narration = "Compare neighbours. Left one bigger? Swap."
        with self.voiceover(text=narration) as tracker:
            self.compare_step(
                0,
                tracker.duration * 0.58,
                tracker.duration * 0.38,
                chip_mode="explain",
                with_look=[
                    FadeIn(self.readout, shift=DOWN * 0.08),
                    *self.headline_change(["Left one bigger?", "Swap."]),
                ],
            )

        narration = "If not, leave them."
        with self.voiceover(text=narration) as tracker:
            self.compare_step(
                1,
                tracker.duration * 0.42,
                tracker.duration * 0.5,
                chip_mode="explain",
                with_look=self.headline_change(["Already in order?", "Leave them."]),
            )

    def carry_the_largest_to_the_end(self) -> None:
        """Beat 5: the 8 is carried, the 10 takes over, and the 10 locks at the end."""
        narration = "The biggest gets carried to the end, and locks."
        remaining_slots = (2, 3, 4, 5, 6, 7, 8)
        with self.voiceover(text=narration) as tracker:
            step_time = tracker.duration * 0.8 / len(remaining_slots)
            for slot in remaining_slots:
                self.compare_step(
                    slot,
                    step_time * 0.42,
                    step_time * 0.58,
                    chip_mode="verdict",
                    with_look=(
                        self.headline_change(
                            ["Step right, repeat.", "The biggest gets carried."]
                        )
                        if slot == remaining_slots[0]
                        else ()
                    ),
                )
            self.lock_bar(
                9,
                run_time=0.48,
                with_lock=[
                    *self.hide_chip(),
                    *self.headline_change(
                        ["The biggest", "locks at the end"],
                        (TEXT_COLOR, SORTED_COLOR),
                    ),
                ],
            )

    def run_faster_passes(self) -> None:
        """Beat 6: the same rule, accelerating, while the sorted suffix grows."""
        narration = "Repeat on what's left."
        pass_step_times = {2: 0.13, 3: 0.1, 4: 0.08, 5: 0.07}
        with self.voiceover(text=narration):
            for pass_number, step_time in pass_step_times.items():
                swaps_in_pass = self.run_pass(
                    pass_number,
                    step_time,
                    with_look=(
                        self.headline_change(["Repeat on", "what's left"])
                        if pass_number == 2
                        else []
                    ),
                )
                assert swaps_in_pass > 0
                self.lock_bar(len(self.bars) - pass_number, run_time=0.15)

    def exit_early(self) -> None:
        """Beat 7: a whole pass without a swap proves the array is sorted."""
        narration = "No swaps? It's sorted."
        with self.voiceover(text=narration) as tracker:
            swaps_in_pass = self.run_pass(
                6,
                tracker.duration * 0.5 / 4,
                chip_mode="verdict",
                with_look=self.headline_change(
                    ["No swaps in a pass?", "It's sorted."],
                    (TEXT_COLOR, SORTED_COLOR),
                ),
            )
            assert swaps_in_pass == 0
            assert [bar.value for bar in self.bars] == sorted(START_VALUES)
            self.sweep_sorted_wave()

    def show_the_cost(self) -> None:
        """Beat 8: the catch, which answers the hook's question about millions."""
        problem_narration = (
            "But there's one problem: Bubble Sort is terrible at sorting huge datasets."
        )
        cost_narration = (
            "A million numbers could take five hundred billion comparisons."
        )
        assert (self.pass_number, self.comparisons, self.swaps) == (6, 39, 18)

        small_run = VGroup(
            body_text("10 numbers", font_size=30),
            display_text(f"{self.comparisons} comparisons", font_size=42),
        ).arrange(DOWN, buff=0.14)
        huge_run = VGroup(
            body_text("1 million numbers", font_size=30),
            display_text("≈ 500 billion", font_size=68, color=SORTED_COLOR),
            body_text("comparisons, worst case", font_size=28, color=TEXT_COLOR),
        ).arrange(DOWN, buff=0.14)
        self.cost_block = VGroup(small_run, huge_run).arrange(DOWN, buff=0.34)
        self.cost_block.move_to(UP * 2.62)
        self.fit_to_width(self.cost_block, SAFE_RIGHT - SAFE_LEFT)

        self.array_stage = VGroup(*self.bars, self.floor)
        with self.voiceover(text=problem_narration) as tracker:
            self.glide(
                FadeOut(self.readout),
                FadeOut(self.sorted_rule),
                FadeOut(self.sorted_label),
                *self.headline_change(
                    ["But there's one problem:", "huge datasets"],
                    (TEXT_COLOR, SORTED_COLOR),
                ),
                self.array_stage.animate.scale(
                    0.6, about_point=np.array([0, BASELINE, 0])
                ),
                run_time=tracker.duration * 0.42,
            )
            self.glide(
                FadeIn(small_run, shift=UP * 0.12, scale=0.96),
                run_time=tracker.duration * 0.4,
            )

        with self.voiceover(text=cost_narration) as tracker:
            self.add_effect("impact")
            self.glide(
                FadeIn(huge_run, shift=UP * 0.14, scale=0.94),
                run_time=tracker.duration * 0.45,
            )

    def close(self) -> None:
        """Beat 9: hand the question to the comments, above the complexity facts."""
        narration = "Know a faster algorithm? Tell me in the comments!"
        closing_lines = [
            self.make_closing_line(["Know a faster algorithm?"], TEXT_COLOR),
            self.make_closing_line(["Tell me in the comments!"], SORTED_COLOR),
        ]
        closing_block = VGroup(*closing_lines).arrange(DOWN, buff=0.16)
        closing_block.move_to(UP * (SAFE_TOP - 0.1 - closing_block.height / 2))
        self.fit_to_width(closing_block, SAFE_RIGHT - SAFE_LEFT)

        complexity_grid = self.make_complexity_grid()
        complexity_grid.next_to(closing_block, DOWN, buff=0.4)

        with self.voiceover(text=narration) as tracker:
            self.glide(
                FadeOut(self.headline, scale=0.97),
                FadeOut(self.cost_block, scale=0.97),
                run_time=0.3,
            )
            self.glide(
                FadeIn(closing_lines[0], shift=UP * 0.12, scale=0.97),
                run_time=tracker.duration * 0.42,
            )
            self.play(
                FadeIn(
                    closing_lines[1],
                    shift=UP * 0.12,
                    scale=0.97,
                    rate_func=SMOOTH_SPRING,
                ),
                LaggedStart(
                    *[
                        FadeIn(
                            cell,
                            shift=UP * 0.12,
                            scale=0.97,
                            rate_func=SMOOTH_SPRING,
                        )
                        for cell in complexity_grid
                    ],
                    lag_ratio=0.22,
                ),
                run_time=tracker.duration * 0.5,
            )

        # The last beat absorbs the remainder, so the Reel lands on its target length.
        self.wait(max(MINIMUM_FINAL_HOLD, TARGET_DURATION - self.renderer.time))

    def compare_step(
        self,
        pair_slot: int,
        look_time: float,
        act_time: float,
        chip_mode: str | None = None,
        with_look: list[Animation] | tuple[Animation, ...] = (),
    ) -> bool:
        """Compare one adjacent pair, swap it if needed, and report whether it swapped.

        chip_mode "explain" says Compare, then the verdict; "verdict" goes straight
        to the verdict; None runs silently for the fast passes.
        """
        left_bar = self.bars[pair_slot]
        right_bar = self.bars[pair_slot + 1]
        should_swap = left_bar.value > right_bar.value
        relation = ">" if should_swap else "<"
        outcome = "Swap" if should_swap else "Keep"

        self.comparisons += 1
        self.update_readout()
        self.add_note(max(left_bar.value, right_bar.value))

        window_x = (SLOT_X[pair_slot] + SLOT_X[pair_slot + 1]) / 2
        look_animations = [
            self.window.animate.set_x(window_x).set_stroke(COMPARE_COLOR),
            left_bar.animate.paint(COMPARE_COLOR),
            right_bar.animate.paint(COMPARE_COLOR),
            *with_look,
        ]
        if pair_slot > 0:
            look_animations.append(self.bars[pair_slot - 1].animate.paint(IDLE_COLOR))

        verdict = f"{left_bar.value} {relation} {right_bar.value}"
        if chip_mode == "explain":
            look_animations += self.chip_change("Compare", COMPARE_COLOR, window_x)
        elif chip_mode == "verdict":
            look_animations += self.chip_change(
                verdict, self.verdict_color(should_swap), window_x
            )
        # A headline change needs room to breathe even inside a very fast step.
        if with_look:
            look_time = max(look_time, TRANSITION_TIME)
        self.glide(*look_animations, run_time=look_time)

        act_animations = []
        if chip_mode == "explain":
            act_animations += self.chip_change(
                f"{verdict} · {outcome}", self.verdict_color(should_swap), window_x
            )

        if should_swap:
            self.swaps += 1
            self.update_readout()
            self.bars[pair_slot] = right_bar
            self.bars[pair_slot + 1] = left_bar
            act_animations += [
                self.window.animate.set_stroke(SWAP_COLOR),
                left_bar.animate.set_x(SLOT_X[pair_slot + 1]).paint(SWAP_COLOR),
                right_bar.animate.set_x(SLOT_X[pair_slot]).paint(SWAP_COLOR),
            ]

        if act_animations and act_time > 0:
            self.glide(*act_animations, run_time=act_time, rate_func=BOUNCY_SPRING)
        elif act_time > 0:
            self.wait(act_time)
        return should_swap

    def run_pass(
        self,
        pass_number: int,
        step_time: float,
        chip_mode: str | None = None,
        with_look: list[Animation] | tuple[Animation, ...] = (),
    ) -> int:
        """Run one full pass over the unsorted prefix and return its swap count."""
        self.pass_number = pass_number
        self.update_readout()
        last_pair_slot = len(self.bars) - pass_number - 1
        swaps_in_pass = 0
        for pair_slot in range(last_pair_slot + 1):
            will_swap = self.bars[pair_slot].value > self.bars[pair_slot + 1].value
            swaps_in_pass += self.compare_step(
                pair_slot,
                step_time * (0.42 if will_swap else 0.8),
                step_time * (0.58 if will_swap else 0.0),
                chip_mode,
                with_look=with_look if pair_slot == 0 else (),
            )
        return swaps_in_pass

    def lock_bar(
        self,
        slot: int,
        run_time: float,
        with_lock: list[Animation] | tuple[Animation, ...] = (),
    ) -> None:
        """Light the bar that just reached its final place and extend the sorted rule."""
        locked_bar = self.bars[slot]
        rule_start = [SLOT_X[slot] - BAR_WIDTH / 2, RULE_Y, 0]
        rule_end = [SLOT_X[-1] + BAR_WIDTH / 2, RULE_Y, 0]
        self.add_effect("lock")

        animations = [
            locked_bar.animate.paint(SORTED_COLOR),
            self.bars[slot - 1].animate.paint(IDLE_COLOR),
            self.make_glow(locked_bar),
            *with_lock,
        ]
        if self.sorted_rule is None:
            self.sorted_rule = Line(rule_start, rule_end, color=SORTED_COLOR)
            self.sorted_rule.set_stroke(width=5)
            self.sorted_label = display_text("SORTED", 22, SORTED_COLOR)
            self.sorted_label.next_to(self.sorted_rule, DOWN, buff=0.07)
            self.sorted_label.align_to(self.sorted_rule, RIGHT)
            animations += [Create(self.sorted_rule), FadeIn(self.sorted_label)]
        else:
            animations.append(
                self.sorted_rule.animate.put_start_and_end_on(rule_start, rule_end)
            )
        self.glide(*animations, run_time=run_time)

    def sweep_sorted_wave(self) -> None:
        """Lift and light the finished array left to right over a rising scale."""
        step_time = 0.085
        lift_time = 0.52
        for slot, bar in enumerate(self.bars):
            self.add_note(bar.value, gain=NOTE_GAIN + 5, time_offset=slot * step_time)
        # The last bar reaches the top of its lift as the shimmer enters.
        self.add_effect(
            "finish", time_offset=step_time * (len(self.bars) - 1) + lift_time / 2
        )

        rule_start = [SLOT_X[0] - BAR_WIDTH / 2, RULE_Y, 0]
        rule_end = [SLOT_X[-1] + BAR_WIDTH / 2, RULE_Y, 0]
        self.play(
            *self.hide_chip(),
            FadeOut(self.window, scale=0.97),
            self.sorted_rule.animate(rate_func=SMOOTH_SPRING).put_start_and_end_on(
                rule_start, rule_end
            ),
            LaggedStart(
                *[self.make_wave_step(bar) for bar in self.bars],
                lag_ratio=step_time / lift_time,
            ),
            run_time=lift_time + step_time * (len(self.bars) - 1),
        )

    def make_wave_step(self, bar: ValueBar) -> UpdateFromAlphaFunc:
        start_color = ManimColor(bar.body.get_fill_color())
        body_y = bar.body.get_y()
        number_y = bar.number.get_y()

        def update(_, alpha: float) -> None:
            lift = WAVE_LIFT * math.sin(math.pi * alpha)
            bar.paint(
                interpolate_color(
                    start_color, ManimColor(SORTED_COLOR), min(1, alpha * 2)
                )
            )
            bar.body.set_y(body_y + lift)
            bar.number.set_y(number_y + lift)

        return UpdateFromAlphaFunc(bar, update, rate_func=rate_functions.linear)

    def make_glow(self, bar: ValueBar) -> FadeOut:
        """Return a soft halo that swells behind a bar as it locks into place."""
        halo = bar.body.copy().set_fill(SORTED_COLOR, opacity=0.5).set_z_index(3)
        return FadeOut(halo, scale=1.2)

    def glide(
        self,
        *animations: Animation,
        run_time: float,
        rate_func: Callable[[float], float] = SMOOTH_SPRING,
    ) -> None:
        self.play(*animations, run_time=run_time, rate_func=rate_func)

    def headline_change(
        self,
        lines: list[str],
        colors: tuple[str, ...] | None = None,
    ) -> list[Animation]:
        """Return the animations that lift the old headline out and the new one in."""
        new_headline = self.make_headline(lines, colors)
        animations = [
            FadeOut(self.headline, shift=UP * 0.14, scale=0.98),
            FadeIn(new_headline, shift=UP * 0.14, scale=0.98),
        ]
        self.headline = new_headline
        return animations

    def chip_change(self, label: str, color: str, center_x: float) -> list[Animation]:
        """Return the animations that morph the pill, Dynamic Island style.

        The pill's shape flows to fit its new width while the label crossfades, since
        morphing the glyphs themselves would garble the verdict mid-way.
        """
        new_pill, new_label = self.make_chip(label, color, center_x)
        if self.chip_pill is None:
            self.chip_pill, self.chip_label = new_pill, new_label
            return [FadeIn(new_pill, scale=0.9), FadeIn(new_label, scale=0.9)]
        old_label = self.chip_label
        self.chip_label = new_label
        return [
            Transform(self.chip_pill, new_pill),
            FadeTransform(old_label, new_label, stretch=False),
        ]

    def hide_chip(self) -> list[Animation]:
        animations = [
            FadeOut(self.chip_pill, scale=0.9),
            FadeOut(self.chip_label, scale=0.9),
        ]
        self.chip_pill = None
        self.chip_label = None
        return animations

    @staticmethod
    def verdict_color(should_swap: bool) -> str:
        return SWAP_COLOR if should_swap else IDLE_COLOR

    def update_readout(self) -> None:
        """Refresh the live counters without spending any animation time."""
        for cell, value in zip(
            self.readout_values,
            (self.pass_number, self.comparisons, self.swaps),
            strict=True,
        ):
            cell.become(self.make_readout_value(value).move_to(cell.get_center()))

    def add_note(
        self,
        value: int,
        gain: float = NOTE_GAIN,
        time_offset: float = 0.0,
    ) -> None:
        self.add_sound(
            str(self.audio_directory / f"note_{value:02d}.wav"),
            time_offset=time_offset,
            gain=gain,
        )

    def add_effect(self, name: str, time_offset: float = 0.0) -> None:
        self.add_sound(
            str(self.audio_directory / f"effect_{name}.wav"),
            time_offset=time_offset,
            gain=SOUND_EFFECTS[name][3],
        )

    def trim_sound_effects(self) -> None:
        """Cut this video's copies of the effects, leaving the shared originals as is."""
        for name, (source, start, end, _) in SOUND_EFFECTS.items():
            effect = AudioSegment.from_file(SOUND_EFFECTS_DIRECTORY / f"{source}.wav")
            trimmed = effect[int(start * 1000) : int(end * 1000)]
            trimmed.fade_out(EFFECT_FADE_OUT_MS).export(
                self.audio_directory / f"effect_{name}.wav", format="wav"
            )

    def write_note_files(self) -> None:
        """Generate one soft plucked note for each bar value."""
        self.audio_directory.mkdir(parents=True, exist_ok=True)
        sample_rate = 44100
        duration = 0.32
        times = np.arange(int(sample_rate * duration)) / sample_rate
        envelope = np.minimum(times / 0.004, 1.0) * np.exp(-times * 13)

        for value, frequency in enumerate(VALUE_PITCHES_HZ, start=1):
            note_path = self.audio_directory / f"note_{value:02d}.wav"
            if note_path.exists():
                continue
            tone = np.sin(2 * np.pi * frequency * times)
            tone += 0.25 * np.sin(2 * np.pi * 2 * frequency * times)
            samples = (tone * envelope / 1.25 * 32000).astype(np.int16)
            with wave.open(str(note_path), "wb") as note_file:
                note_file.setnchannels(1)
                note_file.setsampwidth(2)
                note_file.setframerate(sample_rate)
                note_file.writeframes(samples.tobytes())

    def make_crowd_bar(self, height: float, slot_x: float) -> Rectangle:
        return Rectangle(
            width=0.058,
            height=height,
            stroke_width=0,
            fill_color=IDLE_COLOR,
            fill_opacity=1,
        ).move_to([slot_x, BASELINE + height / 2, 0])

    def make_headline(
        self,
        lines: list[str],
        colors: tuple[str, ...] | None = None,
    ) -> VGroup:
        line_colors = colors or (TEXT_COLOR,) * len(lines)
        headline = VGroup(
            *[
                display_text(line, 43, color)
                for line, color in zip(lines, line_colors, strict=True)
            ]
        ).arrange(DOWN, buff=0.14)
        self.fit_to_width(headline, SAFE_RIGHT - SAFE_LEFT)
        return headline.move_to(UP * HEADLINE_Y)

    def make_closing_line(self, lines: list[str], color: str) -> VGroup:
        return VGroup(*[display_text(line, 42, color) for line in lines]).arrange(
            DOWN, buff=0.08
        )

    def make_window(self, pair_slot: int) -> RoundedRectangle:
        """Frame one adjacent pair with a frosted panel: all the algorithm can see."""
        height = WINDOW_TOP - BASELINE + 0.1
        window = RoundedRectangle(
            width=SLOT_PITCH * 2 - 0.02,
            height=height,
            corner_radius=0.22,
            stroke_width=2.5,
            stroke_color=COMPARE_COLOR,
            fill_color=COMPARE_COLOR,
            fill_opacity=0.1,
        )
        window.move_to(
            [
                (SLOT_X[pair_slot] + SLOT_X[pair_slot + 1]) / 2,
                BASELINE - 0.1 + height / 2,
                0,
            ]
        )
        # Behind the bars, so the panel reads as glass the bars stand in front of.
        return window.set_z_index(5)

    def make_chip(
        self, label: str, color: str, center_x: float
    ) -> tuple[RoundedRectangle, Text]:
        """Build the verdict pill, kept inside the safe side margins."""
        label_color = TEXT_COLOR if color == IDLE_COLOR else BACKGROUND
        text = display_text(label, 28, label_color)
        pill = RoundedRectangle(
            width=text.width + 0.46,
            height=0.56,
            corner_radius=0.28,
            stroke_width=0,
            fill_color=color,
            fill_opacity=1,
        )
        half_width = pill.width / 2
        chip_x = min(max(center_x, SAFE_LEFT + half_width), SAFE_RIGHT - half_width)
        pill.move_to([chip_x, CHIP_Y, 0]).set_z_index(50)
        text.move_to(pill).set_z_index(51)
        return pill, text

    def make_readout(self) -> VGroup:
        """Build the experiment's live pass, comparison, and swap counters."""
        self.readout_values = []
        cells = []
        for label, center_x in (
            ("PASS", -2.4),
            ("COMPARISONS", 0.0),
            ("SWAPS", 2.4),
        ):
            value_text = self.make_readout_value(0).move_to(
                [center_x, READOUT_Y + 0.15, 0]
            )
            label_text = body_text(label, font_size=19)
            label_text.move_to([center_x, READOUT_Y - 0.21, 0])
            self.readout_values.append(value_text)
            cells.append(VGroup(value_text, label_text))
        readout = VGroup(*cells)
        self.update_readout()
        return readout

    def make_readout_value(self, value: int) -> Text:
        return display_text(str(value), font_size=38)

    def make_complexity_grid(self) -> VGroup:
        """Lay out the four complexity facts in a two-by-two grid."""
        facts = (
            ("Best, early exit", "O(n)", SORTED_COLOR),
            ("Average", "O(n²)", TEXT_COLOR),
            ("Worst", "O(n²)", TEXT_COLOR),
            ("Extra space", "O(1)", SORTED_COLOR),
        )
        cells = []
        for label, complexity, color in facts:
            panel = RoundedRectangle(
                width=3.4,
                height=1.0,
                corner_radius=0.22,
                stroke_width=1,
                stroke_color=IDLE_COLOR,
                fill_color=PANEL_COLOR,
                fill_opacity=1,
            )
            label_text = body_text(label, font_size=22)
            complexity_text = display_text(complexity, 36, color)
            content = VGroup(label_text, complexity_text).arrange(DOWN, buff=0.09)
            cells.append(VGroup(panel, content.move_to(panel)))
        return VGroup(*cells).arrange_in_grid(rows=2, cols=2, buff=0.14)

    @staticmethod
    def fit_to_width(mobject, maximum_width: float) -> None:
        """Scale a mobject down only when it exceeds the supplied width."""
        if mobject.width > maximum_width:
            mobject.scale_to_fit_width(maximum_width)
