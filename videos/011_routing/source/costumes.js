// Costume props and poses this Reel adds to the shared cast. reel/cast.js is copied fresh on
// every render, so new art lives here: dress() puts a stand-in prop through createMember, then
// swaps in this project's art, which then follows the same joints as the kit's own props.
import { createMember } from "../reel/cast.js";

const LINE = 'fill="none" stroke="var(--brand-ink)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"';
const SOLID = 'fill="var(--brand-ink)" stroke="var(--brand-ink)" stroke-width="2" stroke-linejoin="round"';
const PAPER = 'fill="var(--brand-background)" stroke="var(--brand-ink)" stroke-width="2.3" stroke-linejoin="round"';
const ACCENT = 'fill="var(--brand-accent)" stroke="var(--brand-ink)" stroke-width="1.6" stroke-linejoin="round"';

export const ART = {
  // A headset: the kit's headphones plus a microphone boom, for the AI on the phones.
  headset: `<path ${LINE} stroke-width="2.6" d="M-13 -2 C-14 -20 14 -20 13 -2"/><rect x="-16" y="-5" width="6" height="9" rx="2.5" ${ACCENT}/><rect x="10" y="-5" width="6" height="9" rx="2.5" ${ACCENT}/><path ${LINE} stroke-width="1.8" d="M13 3 C13 10 8 12 3 11"/><circle cx="2" cy="11" r="2.2" ${SOLID}/>`,
  // A phone held to the ear, drawn upright at the wrist.
  phone: `<rect x="-3.4" y="-9" width="6.8" height="14" rx="1.8" ${SOLID}/><rect x="-1.8" y="-6.5" width="3.6" height="7" rx="0.6" fill="var(--brand-background)"/>`,
  // A nurse's cap with an orange cross.
  nurseCap: `<path ${PAPER} d="M-10 -9.5 L-8 -19 L8 -19 L10 -9.5 Z"/><path fill="var(--brand-accent)" d="M-1.4 -17.6 L1.4 -17.6 L1.4 -15.6 L3.4 -15.6 L3.4 -12.8 L1.4 -12.8 L1.4 -10.8 L-1.4 -10.8 L-1.4 -12.8 L-3.4 -12.8 L-3.4 -15.6 L-1.4 -15.6 Z"/>`,
  // A clerk's green-shade visor, in ink.
  visor: `<path ${SOLID} d="M-12 -8 L12 -8 L19 -4 L-2 -4 Z"/><path ${LINE} stroke-width="1.6" d="M-12 -8 C-8 -11 8 -11 12 -8"/>`,
  // Laughing: motion strokes either side of the head.
  laugh: `<path ${LINE} stroke-width="2" d="M16 -16 L22 -20 M17 -9 L24 -9 M16 -2 L22 2 M-16 -16 L-22 -20 M-17 -9 L-24 -9 M-16 -2 L-22 2"/>`,
  // A ringing phone's sound waves beside the head.
  ring: `<path ${LINE} stroke-width="1.8" d="M20 -22 C24 -18 24 -12 20 -8 M25 -26 C31 -19 31 -11 25 -4"/>`,
  // Frustration: a scribble cloud above the head.
  scribble: `<path ${LINE} stroke-width="1.8" d="M-9 -34 C-12 -40 -4 -44 0 -40 C3 -46 12 -42 9 -36 C14 -33 9 -27 3 -30 C0 -26 -8 -27 -7 -31 C-12 -30 -12 -34 -9 -34 Z"/><path stroke="var(--brand-accent)" stroke-width="1.8" fill="none" stroke-linecap="round" d="M-4 -37 L4 -33 M4 -38 L-3 -33"/>`,
};

const STAND_IN = "glasses";

/** createMember, with this Reel's extra art allowed in `props`. */
export function dress(svg, options) {
  const props = options.props || [];
  const member = createMember(svg, { ...options, props: props.map((prop) => (ART[prop.art] ? { ...prop, art: STAND_IN } : prop)) });
  // The group holds the figure first, then the apron if any, then one node per prop, in order.
  const firstProp = 1 + (options.apron ? 1 : 0);
  props.forEach((prop, index) => {
    if (ART[prop.art]) member.group.children[firstProp + index].innerHTML = ART[prop.art];
  });
  return member;
}

// The kit's standing pose, the base for every pose below. Angles: 0 down, +90 screen right, 180 up.
const base = { lean: 0, headTilt: 0, shoulderLift: 0, look: 0, lift: 0, armLUpper: -24, armLLower: -13, armRUpper: 24, armRLower: 13, legLUpper: -13, legLLower: -8, legRUpper: 13, legRLower: 8, handL: "none", handR: "none" };

export const MORE_POSES = {
  // On the phone: the right hand at the ear, the left on the hip.
  onPhone: { ...base, headTilt: 6, armRUpper: 122, armRLower: 192, armLUpper: -30, armLLower: 40 },
  // On the phone and fretting: leaning, the free hand up.
  phoneFret: { ...base, lean: 3, headTilt: 10, shoulderLift: 1.5, armRUpper: 122, armRLower: 192, armLUpper: -70, armLLower: -150, handL: "open" },
  // On the phone and fed up: the free arm thrown down.
  phoneAngry: { ...base, lean: -4, headTilt: -6, shoulderLift: 2, armRUpper: 122, armRLower: 192, armLUpper: -52, armLLower: -20, handL: "open", legLUpper: -18, legRUpper: 18 },
  // On the phone and delighted: the free fist up.
  phoneCheer: { ...base, lift: 3, headTilt: -4, armRUpper: 122, armRLower: 192, armLUpper: -128, armLLower: -160, legLUpper: -14, legLLower: -20, legRUpper: 14, legRLower: 20 },
  // Holding its sides with laughter; `rock` bends it back and forth.
  laughA: { ...base, lean: -7, headTilt: -12, lift: 1.5, armLUpper: -30, armLLower: 60, armRUpper: 30, armRLower: -60 },
  laughB: { ...base, lean: 6, headTilt: 10, lift: 0, armLUpper: -34, armLLower: 64, armRUpper: 34, armRLower: -64, legLUpper: -16, legRUpper: 16 },
  // Reading a card through the magnifier held up to the right.
  scan: { ...base, lean: 3, look: 2, headTilt: 4, armRUpper: 112, armRLower: 150, armLUpper: -20, armLLower: 30 },
  // Waving the next caller in, from screen left toward screen right.
  waveIn: { ...base, look: 2, lean: 4, armRUpper: 100, armRLower: 130, handR: "open", armLUpper: -26, armLLower: -14 },
  waveOut: { ...base, look: 2, lean: 2, armRUpper: 80, armRLower: 60, handR: "open", armLUpper: -26, armLLower: -14 },
};
