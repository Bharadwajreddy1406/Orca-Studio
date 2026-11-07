// The slide being refined. One builder makes every copy (the board and the four gallery cards),
// and paint(q) draws it at any quality q from 0 (v1, a mess) to 3 (v4, polished). Every element
// has a state per version; between versions it moves with a little overshoot, so each pass
// reads as the SAME slide changing, never a new one.
import { backOut, clamp01, mix, seeded, smooth } from "../reel/motion.js";

export const SLIDE_W = 520;
export const SLIDE_H = 390;

const random = seeded(91);
const jitter = (spread) => (random() - 0.5) * 2 * spread;

// Bullet rows after pass two.
const BULLET_TEXT = ["Sales +12%", "2 new clients", "Ships in May"];
const bulletY = (row) => 116 + row * 72;

/* Element states: [v1, v2, v3, v4]. x, y, w, h in slide pixels; r in degrees; o opacity; s scale. */
const box = (v1, v2, v3 = v2, v4 = v3) => [v1, v2, v3, v4];
const BOXES = [
  // The left panel (text).
  box({ x: 34, y: 58, w: 210, h: 150, r: -8, o: 1 }, { x: 20, y: 92, w: 252, h: 278, r: 0, o: 1 }),
  // The right panel (chart).
  box({ x: 196, y: 128, w: 236, h: 178, r: 9, o: 1 }, { x: 288, y: 92, w: 212, h: 278, r: 0, o: 1 }),
  // A stray box that becomes the rule under the title.
  box({ x: 310, y: 236, w: 150, h: 96, r: -13, o: 1 }, { x: 22, y: 78, w: 476, h: 0, r: 0, o: 1 }),
  // A stray box that merges into the chart panel and disappears.
  box({ x: 58, y: 242, w: 122, h: 112, r: 15, o: 1 }, { x: 288, y: 92, w: 212, h: 278, r: 0, o: 0 }),
];
// The wall of tiny text: scattered in v1, tidy but still a wall in v2, gone into bullets in v3.
const WALL = Array.from({ length: 10 }, (_, index) => {
  const row = Math.floor(index / 3.4);
  return box(
    { x: 24 + random() * 300, y: 62 + random() * 290, w: 110 + random() * 120, h: 7, r: jitter(18), o: 1 },
    { x: 38, y: 108 + index * 25, w: index % 3 === 2 ? 150 : 214 - (index % 2) * 18, h: 7, r: 0, o: 1 },
    { x: 66, y: bulletY(row) + 14, w: 0, h: 7, r: 0, o: 0 },
  );
});
const BULLETS = BULLET_TEXT.map((_, row) =>
  box({ x: 38, y: bulletY(row), r: 0, o: 0, s: 0.5 }, { x: 38, y: bulletY(row), r: 0, o: 0, s: 0.5 }, { x: 36, y: bulletY(row), r: 0, o: 1, s: 1 }),
);
const TITLE_MESSY = box({ x: 236, y: 22, r: 6, o: 1, s: 1 }, { x: 30, y: 26, r: 0, o: 0, s: 1.6 });
const TITLE = box({ x: 236, y: 16, r: 6, o: 0, s: 0.45 }, { x: 26, y: 14, r: 0, o: 1, s: 1 });
const CHART_MESSY = box({ x: 214, y: 160, r: -12, o: 1, s: 1 }, { x: 294, y: 140, r: 0, o: 1, s: 1 }, undefined, { x: 294, y: 150, r: 0, o: 0, s: 0.85 });

function blend(states, q, stagger = 0) {
  const index = Math.min(2, Math.max(0, Math.floor(q)));
  const from = states[index];
  const to = states[index + 1];
  const local = clamp01((q - index - stagger) / Math.max(0.0001, 1 - stagger));
  const amount = backOut(local);
  const out = {};
  for (const name of Object.keys(from)) {
    // Opacity and size fade smoothly; position overshoots, like a snap into place.
    const ease = name === "o" ? smooth(local) : amount;
    out[name] = mix(from[name], to[name] ?? from[name], ease);
  }
  return out;
}

function place(element, state, { size = true } = {}) {
  element.style.opacity = clamp01(state.o ?? 1).toFixed(3);
  element.style.transform = `translate(${state.x.toFixed(1)}px, ${state.y.toFixed(1)}px) rotate(${(state.r || 0).toFixed(2)}deg) scale(${(state.s ?? 1).toFixed(3)})`;
  if (size && state.w !== undefined) {
    element.style.width = `${Math.max(0, state.w).toFixed(1)}px`;
    element.style.height = `${Math.max(0, state.h).toFixed(1)}px`;
  }
}

const SPARKLE = '<svg viewBox="-10 -10 20 20"><path d="M0 -9 L2 -2 L9 0 L2 2 L0 9 L-2 2 L-9 0 L-2 -2 Z" /></svg>';

/** Build one slide inside `host` and return its painter. */
export function buildSlide(host) {
  const slide = document.createElement("div");
  slide.className = "slide";
  // The slide is a pictured object, its tiny text is texture, so the type floor does not apply.
  slide.setAttribute("data-layout-ignore", "");
  host.appendChild(slide);
  const make = (className, html = "") => {
    const element = document.createElement("div");
    element.className = className;
    element.innerHTML = html;
    slide.appendChild(element);
    return element;
  };

  const boxes = BOXES.map(() => make("s-box"));
  const wall = WALL.map(() => make("s-line"));
  const titleMessy = make("s-title-messy bp-code", "q3 updat FINAL (2).pptx");
  const title = make("s-title bp-headline", "Q3 Update");
  const underline = make("s-underline");
  const bullets = BULLET_TEXT.map((text) => make("s-bullet bp-caption", `<i></i>${text}`));
  const chartMessy = make(
    "s-chart-messy",
    `<svg viewBox="0 0 200 150" width="200" height="150">
      <path d="M4 120 L30 40 L52 98 L80 22 L104 130 L132 60 L160 104 L196 18" fill="none" stroke="var(--brand-ink)" stroke-width="3"/>
      <path d="M4 30 L36 118 L60 50 L92 112 L118 26 L150 128 L176 44 L196 96" fill="none" stroke="var(--brand-ink-soft)" stroke-width="3" stroke-dasharray="6 5"/>
      <path d="M4 80 L40 70 L70 140 L100 76 L128 92 L150 8 L196 130" fill="none" stroke="var(--brand-ink)" stroke-width="2"/>
      <circle cx="152" cy="70" r="26" fill="none" stroke="var(--brand-ink)" stroke-width="2.5"/>
      <path d="M152 70 L152 44 M152 70 L176 80 M152 70 L134 90" stroke="var(--brand-ink)" stroke-width="2"/>
    </svg>`,
  );
  const chart = make(
    "s-chart",
    `<svg viewBox="0 0 200 230" width="200" height="230">
      <path d="M10 196 L192 196" stroke="var(--brand-ink)" stroke-width="3"/>
      <rect class="bar" x="22" width="42" fill="var(--brand-ink-soft)"/>
      <rect class="bar" x="80" width="42" fill="var(--brand-ink)"/>
      <rect class="bar" x="138" width="42" fill="var(--brand-accent)" stroke="var(--brand-ink)" stroke-width="2.5"/>
      <text x="43" y="222" text-anchor="middle">Q1</text><text x="101" y="222" text-anchor="middle">Q2</text><text x="159" y="222" text-anchor="middle">Q3</text>
    </svg><div class="s-chart-label bp-headline">+12%</div>`,
  );
  const bars = Array.from(chart.querySelectorAll(".bar"));
  const chartLabel = chart.querySelector(".s-chart-label");
  const sparkles = [
    { x: 488, y: 18, size: 34 },
    { x: 14, y: 350, size: 26 },
    { x: 460, y: 56, size: 18 },
  ].map((spot) => {
    const element = make("s-sparkle", SPARKLE);
    element.style.left = `${spot.x - spot.size / 2}px`;
    element.style.top = `${spot.y - spot.size / 2}px`;
    element.style.width = `${spot.size}px`;
    element.style.height = `${spot.size}px`;
    return element;
  });

  /**
   * Draw the slide at quality q (0..3). `fuss` (0..1) adds the endless tiny tweaks of polishing
   * forever; `time` drives the sparkle twinkle and that fussing.
   */
  function paint(q, time = 0, fuss = 0) {
    boxes.forEach((element, index) => {
      const state = blend(BOXES[index], q, index * 0.06);
      place(element, state);
      // The title rule is a box squashed to zero height, drawn with a heavier top edge.
      element.style.borderWidth = index === 2 && q > 0.5 ? "3px 0 0 0" : "3px";
    });
    wall.forEach((element, index) => place(element, blend(WALL[index], q, (index % 4) * 0.08)));
    place(titleMessy, blend(TITLE_MESSY, q), { size: false });
    const titleState = blend(TITLE, q);
    titleState.x += fuss * 3 * Math.sin(time * 37);
    titleState.s *= 1 + fuss * 0.02 * Math.sin(time * 23);
    place(title, titleState, { size: false });
    bullets.forEach((element, row) => {
      const state = blend(BULLETS[row], q, row * 0.18);
      state.y += fuss * 2 * Math.sin(time * 29 + row);
      place(element, state, { size: false });
      element.classList.toggle("is-polished", q > 2.6);
    });
    place(chartMessy, blend(CHART_MESSY, q), { size: false });

    // Pass three: the clear example grows in bar by bar, then the polish lands.
    const example = clamp01(q - 2);
    const shown = smooth(example / 0.4);
    chart.style.opacity = shown.toFixed(3);
    chart.style.transform = "translate(294px, 106px)";
    const heights = [64, 102, 158];
    bars.forEach((bar, index) => {
      const grow = backOut((example - 0.1 - index * 0.14) / 0.45);
      const height = heights[index] * Math.max(0, grow) * (1 + fuss * 0.03 * Math.sin(time * 31 + index));
      bar.setAttribute("y", (196 - height).toFixed(1));
      bar.setAttribute("height", Math.max(0, height).toFixed(1));
    });
    chartLabel.style.opacity = smooth((example - 0.45) / 0.2).toFixed(3);

    const polish = smooth((q - 2.55) / 0.45);
    underline.style.opacity = polish.toFixed(3);
    underline.style.width = `${(178 * backOut((q - 2.55) / 0.45) * (1 + fuss * 0.06 * Math.sin(time * 41))).toFixed(1)}px`;
    slide.style.borderWidth = `${(5 + 2 * polish).toFixed(2)}px`;
    sparkles.forEach((element, index) => {
      const twinkle = 0.75 + 0.25 * Math.sin(time * 6 + index * 2.1) + fuss * 0.4 * Math.sin(time * 33 + index);
      const pop = backOut((q - 2.7 - index * 0.06) / 0.25);
      element.style.opacity = clamp01(pop * 2).toFixed(3);
      element.style.transform = `scale(${Math.max(0, pop * twinkle).toFixed(3)}) rotate(${(time * 40 * (index % 2 ? -1 : 1)).toFixed(1)}deg)`;
    });
  }

  return { slide, paint };
}
