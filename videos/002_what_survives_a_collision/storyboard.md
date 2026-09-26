# Storyboard: What Survives a Collision?

## Format and visual spine

- 9:16 vertical, approximately 64 seconds, one continuous Manim scene.
- Carts and track occupy the middle half of the frame. Momentum bars and
  equations use the upper third. Exact narration captions stay in the bottom
  safe zone.
- The \(+6\,\mathrm{kg\,m/s}\) total-momentum bar remains visible and unchanged
  from Beat 4 through Beat 8.

## Beat 1 — The invariant hook (0:00–0:04)

**Narration:** “In this collision, everything changes—except one invisible
total.”

**Visual:** A \(2\,\mathrm{kg}\) cart rushes right toward a stationary
\(1\,\mathrm{kg}\) cart. Freeze before impact and reveal “What survives the
collision?” above them.

**Animation:** `Create` the track and carts, use rapid `.animate` motion, then
pause sharply. `Write` the question. Freeze on “collision” and emphasize the
question on “total.”

**Boundary:** Soft transition; the question contracts into a small top title.

## Beat 2 — Momentum as mass × velocity (0:04–0:12)

**Narration:** “Momentum is mass times velocity. More mass or more speed means
more momentum, and direction gives it a sign.”

**Visual:** Focus on Cart 1. Its `2 kg` mass and rightward `3 m/s` arrow combine
into \(p=mv\), then into a rightward momentum bar of length six.

**Animation:** `Transform` visual copies of the mass and velocity into the
equation and momentum bar. `Indicate` mass and speed as they are named. Add the
positive sign on “sign.”

**Boundary:** Continuation; both carts remain frozen before impact.

## Beat 3 — Account for both carts before impact (0:12–0:21)

**Narration:** “Before impact, the two-kilogram cart moves right at three meters
per second. The one-kilogram cart is still.”

**Visual:** Above Cart 1 show \(2\times3=+6\). Above stationary Cart 2 show
\(1\times0=0\). Its velocity arrow collapses to a dot on “still.”

**Animation:** `Write` both products and transform their signed contributions
toward a combined total.

**Boundary:** Continuation.

## Beat 4 — State the pre-collision total (0:21–0:27)

**Narration:** “Together, their momentum is six kilogram-meters per second,
pointing to the right.”

**Visual:** Condense the two products into \((2)(3)+(1)(0)=6\). Lock a persistent
total bar labeled \(p_{\text{before}}=+6\,\mathrm{kg\,m/s}\) near the top.

**Animation:** Use `TransformMatchingTex`; `Circumscribe` the total. Lock the bar
on “six” and pulse its arrowhead on “right.”

**Boundary:** Continuation into impact.

## Beat 5 — The collision (0:27–0:34)

**Narration:** “They collide, stick together, and continue as three kilograms
moving at two meters per second.”

**Visual:** The carts close the gap, collide with a brief compression/impact
ripple, couple, and move right as one object. The total-momentum bar does not
change.

**Animation:** `.animate` the motion, use a restrained impact flash/wiggle, then
group the carts and reveal the new `2 m/s` arrow. Impact lands on “collide,” the
coupling on “together,” and the arrow on “two.”

**Boundary:** Continuation.

## Beat 6 — Recount after impact (0:34–0:42)

**Narration:** “Multiply again: three times two is six. The motion changed, but
the total momentum did not.”

**Visual:** Build \((2+1)(2)=6\). Grow a post-collision momentum bar to six and
align it exactly over the locked pre-collision bar.

**Animation:** `Write` the calculation, `Create` the post bar, and transform it
into alignment for the equality payoff. The bars coincide on “did not.”

**Boundary:** Soft transition; numerical labels prepare to become symbols.

## Beat 7 — Generalize the law (0:42–0:55)

**Narration:** “That is conservation of linear momentum. With no significant
outside push, total momentum before equals total momentum after.”

**Visual:** Morph the numerical equations into
\(m_1u_1+m_2u_2=m_1v_1+m_2v_2\), with \(u\) labeled “before” and \(v\) labeled
“after.” Show \(\sum p_{\text{before}}=\sum p_{\text{after}}\) above it and a
faint boundary around both carts.

**Animation:** `TransformMatchingTex` performs the generalization. `Create` the
system boundary on “outside”; emphasize the equals sign on “equals.”

**Boundary:** Continuation.

## Beat 8 — Correct the tempting shortcut (0:55–1:04)

**Narration:** “So m one v one equals m two v two can describe a special
balance. The general law preserves the total, including every velocity's
direction.”

**Visual:** Show \(m_1v_1=m_2v_2\) in the clear upper gap with “special case
only.” Dim it, then emphasize the sums, before/after labels, and signed direction
in the general equation. End on the coupled carts and unchanged \(+6\) bar.

**Animation:** `Write` the shortcut, `Indicate` its qualifier, then return focus
to the general equation and final visual. Hold for one second.

**Boundary:** Soft closing hold.

## Voiceover and captions

- `script.md` is the exact narration source.
- Each beat is one voiceover block controlled by its tracker duration. Visual
  landings use tracker-relative sequencing because the project's Edge TTS
  helper does not expose word-boundary data for bookmarks.
- On-screen captions mirror the narration exactly, and the render utility also
  exports the generated SRT.
