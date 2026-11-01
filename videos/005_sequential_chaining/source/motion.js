// Time-only motion helpers. Nothing here keeps state between frames, so any seek is exact.

export const clamp01 = (value) => Math.min(1, Math.max(0, value));
export const mix = (from, to, amount) => from + (to - from) * amount;

export const smooth = (alpha) => {
  const t = clamp01(alpha);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

// Critically damped: leaves rest gently, arrives quickly, settles softly.
export const spring = (alpha) => {
  const frequency = 7;
  const response = (t) => 1 - (1 + frequency * t) * Math.exp(-frequency * t);
  return response(clamp01(alpha)) / response(1);
};

// Overshoots once and settles: for things that land with some weight.
export const backOut = (alpha) => {
  const t = clamp01(alpha) - 1;
  return 1 + 2.70158 * t * t * t + 1.70158 * t * t;
};

// A slab landing: falls under gravity, then two shrinking bounces.
export const bounceOut = (alpha) => {
  const t = clamp01(alpha);
  if (t < 0.6) return (t / 0.6) ** 2;
  if (t < 0.85) return 1 - 0.09 * Math.sin((Math.PI * (t - 0.6)) / 0.25);
  return 1 - 0.025 * Math.sin((Math.PI * (t - 0.85)) / 0.15);
};

/** Replay keyframes in order. Each key blends the running value towards its own targets. */
export function track(initial, keys, time) {
  const state = { ...initial };
  for (const key of keys) {
    if (time < key.t) break;
    const amount = (key.e || smooth)((time - key.t) / key.d);
    for (const name of Object.keys(key.v)) state[name] += (key.v[name] - state[name]) * amount;
  }
  return state;
}

export function seeded(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
