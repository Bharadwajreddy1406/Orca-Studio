from __future__ import annotations

import textwrap
from pathlib import Path

from manim import (
    BLACK,
    BLUE_A,
    BLUE_C,
    DOWN,
    GREEN_C,
    GREY_B,
    GREY_C,
    LEFT,
    ORANGE,
    RED_C,
    RIGHT,
    UP,
    WHITE,
    YELLOW,
    Arrow,
    Circle,
    Circumscribe,
    Create,
    DashedVMobject,
    Dot,
    FadeIn,
    FadeOut,
    Flash,
    GrowArrow,
    Indicate,
    Line,
    MathTex,
    Paragraph,
    ReplacementTransform,
    RoundedRectangle,
    SurroundingRectangle,
    Text,
    Transform,
    TransformMatchingTex,
    VGroup,
    Wiggle,
    Write,
    config,
)
from manim_voiceover import VoiceoverScene

from shared.voiceover import create_speech_service

# Preserve the chosen quality preset while rotating its raster into portrait.
if config.pixel_width > config.pixel_height:
    config.pixel_width, config.pixel_height = (
        config.pixel_height,
        config.pixel_width,
    )
config.frame_width = 9
config.frame_height = 16


class LinearMomentumCollision(VoiceoverScene):
    """Show total linear momentum surviving a perfectly inelastic collision."""

    BACKGROUND = "#10131A"
    CART_ONE_COLOR = BLUE_C
    CART_TWO_COLOR = ORANGE
    MOMENTUM_COLOR = YELLOW
    BEFORE_COLOR = BLUE_A
    AFTER_COLOR = GREEN_C
    MUTED_COLOR = GREY_B

    def construct(self) -> None:
        self.camera.background_color = self.BACKGROUND
        self.set_speech_service(
            create_speech_service(Path(__file__).with_name("voiceover.json"))
        )
        self.current_caption = None

        state = self.show_invariant_hook()
        self.define_momentum(state)
        self.account_for_both_carts(state)
        self.lock_pre_collision_total(state)
        self.animate_collision(state)
        self.recount_after_collision(state)
        self.generalize_conservation_law(state)
        self.correct_shortcut_and_close(state)

    def show_invariant_hook(self) -> dict[str, object]:
        """Beat 1: freeze the carts just before impact and pose the question."""
        narration = (
            "In this collision, everything changes—except one invisible total."
        )
        self.set_caption(narration)

        track = Line(
            LEFT * 4.15,
            RIGHT * 4.15,
            color=self.MUTED_COLOR,
            stroke_width=5,
        ).shift(DOWN * 1.55)
        track_ticks = VGroup(
            *[
                Line(DOWN * 0.12, UP * 0.12, color=GREY_C, stroke_width=2).move_to(
                    track.point_from_proportion(step / 8)
                )
                for step in range(9)
            ]
        )

        cart_one = self.make_cart("2 kg", 2.15, self.CART_ONE_COLOR)
        cart_one["group"].move_to(LEFT * 3.15 + DOWN * 0.82)
        cart_two = self.make_cart("1 kg", 1.65, self.CART_TWO_COLOR)
        cart_two["group"].move_to(RIGHT * 1.8 + DOWN * 0.82)

        velocity_one = self.make_velocity_indicator("3 m/s", self.CART_ONE_COLOR)
        velocity_one.next_to(cart_one["group"], UP, buff=0.28)
        velocity_two = self.make_stationary_indicator()
        velocity_two.next_to(cart_two["group"], UP, buff=0.3)

        question = Text(
            "What survives\nthe collision?",
            font_size=51,
            line_spacing=0.82,
            weight="MEDIUM",
        ).move_to(UP * 5.35)

        with self.voiceover(text=narration) as tracker:
            self.play(
                Create(track),
                Create(track_ticks),
                FadeIn(cart_one["group"], shift=RIGHT * 0.25),
                FadeIn(cart_two["group"]),
                FadeIn(velocity_one),
                FadeIn(velocity_two),
                run_time=tracker.duration * 0.28,
            )
            self.play(
                cart_one["group"].animate.shift(RIGHT * 1.12),
                velocity_one.animate.shift(RIGHT * 1.12),
                Write(question),
                run_time=tracker.duration * 0.62,
            )

        return {
            "track": track,
            "track_ticks": track_ticks,
            "cart_one": cart_one,
            "cart_two": cart_two,
            "velocity_one": velocity_one,
            "velocity_two": velocity_two,
            "question": question,
        }

    def define_momentum(self, state: dict[str, object]) -> None:
        """Beat 2: connect mass and velocity to a signed momentum bar."""
        narration = (
            "Momentum is mass times velocity. More mass or more speed means more "
            "momentum, and direction gives it a sign."
        )
        self.set_caption(narration)

        title = Text(
            "WHAT SURVIVES A COLLISION?",
            font_size=27,
            color=GREY_B,
            weight="MEDIUM",
        ).to_edge(UP, buff=0.38)
        momentum_definition = MathTex(
            "p", "=", "m", r"\times", "v", font_size=61
        ).move_to(UP * 4.55)
        momentum_definition[0].set_color(self.MOMENTUM_COLOR)
        momentum_definition[2].set_color(self.CART_ONE_COLOR)
        momentum_definition[4].set_color(self.CART_ONE_COLOR)

        cart_one = state["cart_one"]
        velocity_one = state["velocity_one"]
        momentum_bar = self.make_momentum_bar(
            r"p_1=+6\ \mathrm{kg\,m/s}",
            y_position=2.95,
            color=self.MOMENTUM_COLOR,
        )

        with self.voiceover(text=narration) as tracker:
            self.play(
                Transform(state["question"], title),
                FadeIn(momentum_definition, shift=UP * 0.18),
                Indicate(cart_one["mass_label"], color=self.CART_ONE_COLOR),
                run_time=tracker.duration * 0.31,
            )
            self.play(
                Indicate(velocity_one, color=self.CART_ONE_COLOR),
                run_time=tracker.duration * 0.18,
            )
            self.play(
                GrowArrow(momentum_bar["arrow"]),
                Write(momentum_bar["label"]),
                run_time=tracker.duration * 0.38,
            )

        state["title"] = state["question"]
        state["momentum_definition"] = momentum_definition
        state["momentum_bar"] = momentum_bar["group"]

    def account_for_both_carts(self, state: dict[str, object]) -> None:
        """Beat 3: compute each cart's signed momentum before impact."""
        narration = (
            "Before impact, the two-kilogram cart moves right at three meters per "
            "second. The one-kilogram cart is still."
        )
        self.set_caption(narration)

        cart_one = state["cart_one"]
        cart_two = state["cart_two"]
        product_one = MathTex(
            r"2\times3=+6", font_size=38, color=self.CART_ONE_COLOR
        ).next_to(cart_one["group"], UP, buff=1.05)
        product_two = MathTex(
            r"1\times0=0", font_size=38, color=self.CART_TWO_COLOR
        ).next_to(cart_two["group"], UP, buff=1.05)

        with self.voiceover(text=narration) as tracker:
            self.play(
                FadeOut(state["momentum_definition"]),
                Write(product_one),
                Indicate(state["velocity_one"], color=self.CART_ONE_COLOR),
                run_time=tracker.duration * 0.48,
            )
            self.play(
                Write(product_two),
                state["velocity_two"].animate.scale(0.2),
                Indicate(cart_two["mass_label"], color=self.CART_TWO_COLOR),
                run_time=tracker.duration * 0.4,
            )

        state["product_one"] = product_one
        state["product_two"] = product_two

    def lock_pre_collision_total(self, state: dict[str, object]) -> None:
        """Beat 4: combine the signed contributions and lock the invariant bar."""
        caption = (
            "Together, their momentum is six kilogram-meters per second, pointing "
            "to the right."
        )
        self.set_caption(caption)
        narration = caption

        numerical_before = MathTex(
            r"(2)(3)+(1)(0)=6",
            font_size=44,
            color=self.BEFORE_COLOR,
        ).move_to(UP * 4.6)
        total = self.make_momentum_bar(
            r"p_{\mathrm{before}}=+6\ \mathrm{kg\,m/s}",
            y_position=3.15,
            color=self.MOMENTUM_COLOR,
        )

        with self.voiceover(text=narration) as tracker:
            self.play(
                TransformMatchingTex(
                    VGroup(state["product_one"], state["product_two"]),
                    numerical_before,
                ),
                ReplacementTransform(state["momentum_bar"], total["group"]),
                run_time=tracker.duration * 0.62,
            )
            self.play(
                Circumscribe(numerical_before, color=self.MOMENTUM_COLOR),
                run_time=tracker.duration * 0.18,
            )
            self.play(
                Indicate(total["arrow"], color=WHITE),
                run_time=tracker.duration * 0.12,
            )

        state["numerical_before"] = numerical_before
        state["total_bar"] = total["group"]
        state["total_arrow"] = total["arrow"]

    def animate_collision(self, state: dict[str, object]) -> None:
        """Beat 5: collide, couple, and continue without changing the total bar."""
        caption = (
            "They collide, stick together, and continue as three kilograms moving "
            "at two meters per second."
        )
        self.set_caption(caption)
        narration = caption

        cart_one = state["cart_one"]
        cart_two = state["cart_two"]
        velocity_one = state["velocity_one"]
        velocity_two = state["velocity_two"]

        contact_point = RIGHT * 0.9 + DOWN * 0.82
        coupler = RoundedRectangle(
            width=0.22,
            height=0.34,
            corner_radius=0.05,
            color=WHITE,
            fill_color=WHITE,
            fill_opacity=0.7,
            stroke_width=1.5,
        ).move_to(contact_point)
        after_velocity = self.make_velocity_indicator("2 m/s", self.AFTER_COLOR)
        after_velocity.move_to(UP * 0.35 + RIGHT * 0.6)

        with self.voiceover(text=narration) as tracker:
            self.play(
                cart_one["group"].animate.shift(RIGHT * 1.8),
                velocity_one.animate.shift(RIGHT * 1.8),
                run_time=tracker.duration * 0.28,
            )
            self.play(
                Flash(contact_point, color=WHITE, line_length=0.45),
                Wiggle(cart_one["body"], scale_value=1.05),
                Wiggle(cart_two["body"], scale_value=1.05),
                run_time=tracker.duration * 0.12,
            )
            self.play(
                FadeOut(velocity_one),
                FadeOut(velocity_two),
                FadeIn(coupler),
                run_time=tracker.duration * 0.13,
            )

            coupled_carts = VGroup(
                cart_one["group"], cart_two["group"], coupler
            )
            self.play(
                coupled_carts.animate.shift(RIGHT * 0.55),
                run_time=tracker.duration * 0.15,
            )
            self.play(
                FadeIn(after_velocity, shift=RIGHT * 0.2),
                run_time=tracker.duration * 0.12,
            )

        state["coupled_carts"] = coupled_carts
        state["after_velocity"] = after_velocity

    def recount_after_collision(self, state: dict[str, object]) -> None:
        """Beat 6: recompute momentum and align the after bar with the before bar."""
        caption = (
            "Multiply again: three times two is six. The motion changed, but the "
            "total momentum did not."
        )
        self.set_caption(caption)
        narration = caption

        numerical_after = MathTex(
            r"(2+1)(2)=6",
            font_size=44,
            color=self.AFTER_COLOR,
        ).move_to(UP * 1.75)
        post = self.make_momentum_bar(
            r"p_{\mathrm{after}}=+6\ \mathrm{kg\,m/s}",
            y_position=2.55,
            color=self.AFTER_COLOR,
        )

        with self.voiceover(text=narration) as tracker:
            self.play(
                Write(numerical_after),
                run_time=tracker.duration * 0.34,
            )
            self.play(
                GrowArrow(post["arrow"]),
                Write(post["label"]),
                run_time=tracker.duration * 0.31,
            )
            self.play(
                post["group"].animate.move_to(state["total_bar"]),
                run_time=tracker.duration * 0.16,
            )
            self.play(
                FadeOut(post["group"]),
                Indicate(state["total_bar"], color=WHITE),
                run_time=tracker.duration * 0.12,
            )

        state["numerical_after"] = numerical_after

    def generalize_conservation_law(self, state: dict[str, object]) -> None:
        """Beat 7: transform the numerical equality into the general law."""
        caption = (
            "That is conservation of linear momentum. With no significant outside "
            "push, total momentum before equals total momentum after."
        )
        self.set_caption(caption)
        narration = caption

        numerical_balance = MathTex(
            r"(2)(3)+(1)(0)",
            "=",
            r"(2+1)(2)",
            font_size=39,
        ).move_to(UP * 1.65)
        numerical_balance[0].set_color(self.BEFORE_COLOR)
        numerical_balance[1].set_color(self.MOMENTUM_COLOR)
        numerical_balance[2].set_color(self.AFTER_COLOR)

        momentum_sum = MathTex(
            r"\sum p_{\mathrm{before}}",
            "=",
            r"\sum p_{\mathrm{after}}",
            font_size=42,
        ).move_to(UP * 2.05)
        momentum_sum[0].set_color(self.BEFORE_COLOR)
        momentum_sum[1].set_color(self.MOMENTUM_COLOR)
        momentum_sum[2].set_color(self.AFTER_COLOR)

        general_law = MathTex(
            r"m_1u_1+m_2u_2",
            "=",
            r"m_1v_1+m_2v_2",
            font_size=38,
        ).move_to(UP * 0.85)
        general_law[0].set_color(self.BEFORE_COLOR)
        general_law[1].set_color(self.MOMENTUM_COLOR)
        general_law[2].set_color(self.AFTER_COLOR)
        self.fit_to_width(general_law, 8.1)

        time_labels = MathTex(
            r"u:\ \text{before}\qquad v:\ \text{after}",
            font_size=31,
            color=GREY_B,
        ).move_to(DOWN * 0.1)

        self.play(
            state["track"].animate.shift(DOWN * 1.0),
            state["track_ticks"].animate.shift(DOWN * 1.0),
            state["coupled_carts"].animate.shift(DOWN * 1.0),
            state["after_velocity"].animate.shift(DOWN * 1.0),
            run_time=0.5,
        )
        system_outline = DashedVMobject(
            SurroundingRectangle(
                VGroup(state["coupled_carts"], state["after_velocity"]),
                buff=0.32,
                corner_radius=0.18,
                color=GREY_C,
                stroke_width=2,
            ),
            num_dashes=34,
        )
        system_label = Text(
            "closed system",
            font_size=23,
            color=GREY_B,
        ).next_to(system_outline, DOWN, buff=0.12)

        with self.voiceover(text=narration) as tracker:
            self.play(
                ReplacementTransform(
                    VGroup(
                        state["numerical_before"], state["numerical_after"]
                    ),
                    numerical_balance,
                ),
                run_time=tracker.duration * 0.2,
            )
            self.play(
                TransformMatchingTex(numerical_balance, momentum_sum),
                run_time=tracker.duration * 0.24,
            )
            self.play(
                Create(system_outline),
                FadeIn(system_label),
                run_time=tracker.duration * 0.14,
            )
            self.play(
                Write(general_law),
                FadeIn(time_labels, shift=UP * 0.1),
                run_time=tracker.duration * 0.25,
            )
            self.play(
                Indicate(momentum_sum[1], color=WHITE),
                Indicate(general_law[1], color=WHITE),
                run_time=tracker.duration * 0.1,
            )

        state["momentum_sum"] = momentum_sum
        state["general_law"] = general_law
        state["time_labels"] = time_labels
        state["system_outline"] = system_outline
        state["system_label"] = system_label

    def correct_shortcut_and_close(self, state: dict[str, object]) -> None:
        """Beat 8: label the tempting equality as special, then return to the sum."""
        caption = (
            "So m one v one equals m two v two can describe a special balance. The "
            "general law preserves the total, including every velocity's direction."
        )
        self.set_caption(caption)
        narration = caption

        shortcut = MathTex(
            r"m_1v_1=m_2v_2",
            font_size=39,
            color=RED_C,
        ).move_to(UP * 4.85)
        qualifier = Text(
            "SPECIAL CASE ONLY",
            font_size=22,
            color=RED_C,
            weight="MEDIUM",
        ).next_to(shortcut, DOWN, buff=0.15)

        with self.voiceover(text=narration) as tracker:
            self.play(
                Write(shortcut),
                run_time=tracker.duration * 0.28,
            )
            self.play(
                FadeIn(qualifier, shift=UP * 0.08),
                Circumscribe(shortcut, color=RED_C),
                run_time=tracker.duration * 0.18,
            )
            self.play(
                shortcut.animate.set_opacity(0.28),
                qualifier.animate.set_opacity(0.28),
                run_time=tracker.duration * 0.12,
            )
            self.play(
                Indicate(state["momentum_sum"], color=self.MOMENTUM_COLOR),
                Indicate(state["general_law"], color=self.MOMENTUM_COLOR),
                run_time=tracker.duration * 0.18,
            )
            self.play(
                Indicate(state["after_velocity"], color=self.AFTER_COLOR),
                Indicate(state["total_arrow"], color=WHITE),
                run_time=tracker.duration * 0.12,
            )

        self.wait(1)

    def make_cart(self, mass: str, width: float, color) -> dict[str, object]:
        """Create a compact labeled cart with wheels and a front bumper."""
        body = RoundedRectangle(
            width=width,
            height=0.9,
            corner_radius=0.16,
            color=color,
            fill_color=color,
            fill_opacity=0.28,
            stroke_width=4,
        )
        wheels = VGroup(
            Circle(
                radius=0.17,
                color=GREY_C,
                fill_color=BLACK,
                fill_opacity=1,
                stroke_width=3,
            ).move_to(body.get_bottom() + LEFT * width * 0.31),
            Circle(
                radius=0.17,
                color=GREY_C,
                fill_color=BLACK,
                fill_opacity=1,
                stroke_width=3,
            ).move_to(body.get_bottom() + RIGHT * width * 0.31),
        )
        mass_label = Text(mass, font_size=30, weight="MEDIUM").move_to(body)
        bumper = Line(
            body.get_right() + UP * 0.22,
            body.get_right() + DOWN * 0.22,
            color=WHITE,
            stroke_width=4,
        )
        return {
            "group": VGroup(body, wheels, mass_label, bumper),
            "body": body,
            "mass_label": mass_label,
        }

    def make_velocity_indicator(self, label: str, color) -> VGroup:
        """Create a rightward velocity arrow with a compact label."""
        arrow = Arrow(
            LEFT * 0.9,
            RIGHT * 0.9,
            buff=0,
            color=color,
            stroke_width=5,
            max_tip_length_to_length_ratio=0.2,
        )
        text = Text(label, font_size=25, color=color).next_to(arrow, UP, buff=0.08)
        return VGroup(arrow, text)

    def make_stationary_indicator(self) -> VGroup:
        """Create the zero-velocity marker used by the stationary cart."""
        dot = Dot(radius=0.08, color=self.CART_TWO_COLOR)
        label = Text(
            "0 m/s", font_size=25, color=self.CART_TWO_COLOR
        ).next_to(dot, UP, buff=0.08)
        return VGroup(dot, label)

    def make_momentum_bar(
        self,
        label: str,
        y_position: float,
        color,
    ) -> dict[str, object]:
        """Create a fixed-length rightward bar representing +6 momentum units."""
        arrow = Arrow(
            LEFT * 2.75,
            RIGHT * 2.75,
            buff=0,
            color=color,
            stroke_width=8,
            max_tip_length_to_length_ratio=0.12,
        ).move_to(UP * y_position)
        bar_label = MathTex(label, font_size=30, color=color).next_to(
            arrow, UP, buff=0.14
        )
        return {
            "arrow": arrow,
            "label": bar_label,
            "group": VGroup(arrow, bar_label),
        }

    def set_caption(self, text: str) -> None:
        """Replace the persistent lower-safe-zone caption without adding timing."""
        if self.current_caption is not None:
            self.remove(self.current_caption)

        lines = textwrap.wrap(text, width=43, break_long_words=False)
        caption_text = Paragraph(
            *lines,
            alignment="center",
            font_size=27,
            line_spacing=0.68,
            color=WHITE,
        )
        self.fit_to_width(caption_text, 7.75)
        caption_box = SurroundingRectangle(
            caption_text,
            buff=0.22,
            corner_radius=0.14,
            color=GREY_C,
            stroke_opacity=0.45,
            stroke_width=1.5,
            fill_color=BLACK,
            fill_opacity=0.72,
        )
        caption = VGroup(caption_box, caption_text).to_edge(DOWN, buff=0.42)
        caption.set_z_index(20)
        self.add(caption)
        self.current_caption = caption

    @staticmethod
    def fit_to_width(mobject, maximum_width: float) -> None:
        """Scale a mobject down only when it exceeds the supplied width."""
        if mobject.width > maximum_width:
            mobject.scale_to_fit_width(maximum_width)
