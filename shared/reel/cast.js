// The Reel's cast: brand stick figures, each wearing costume that follows its joints.
import { backOut, clamp01 } from "./motion.js";

const { BONES } = window.BrandStickman;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const LINE = 'fill="none" stroke="var(--brand-ink)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"';
const SOLID = 'fill="var(--brand-ink)" stroke="var(--brand-ink)" stroke-width="2" stroke-linejoin="round"';
const PAPER = 'fill="var(--brand-background)" stroke="var(--brand-ink)" stroke-width="2.3" stroke-linejoin="round"';
const ACCENT = 'fill="var(--brand-accent)" stroke="var(--brand-ink)" stroke-width="1.6" stroke-linejoin="round"';

const toRadians = (degrees) => (degrees * Math.PI) / 180;
const limbEnd = ([x, y], angle, length) => [
  x + Math.sin(toRadians(angle)) * length,
  y + Math.cos(toRadians(angle)) * length,
];

// The kit's own proportions and rules, solved here for the head, torso and wrists.
function jointsOf(pose) {
  const lean = toRadians(pose.lean);
  const shoulder = [Math.sin(lean) * BONES.torso, -Math.cos(lean) * BONES.torso];
  const armRoot = [
    shoulder[0] - Math.sin(lean) * BONES.shoulderDrop,
    shoulder[1] + Math.cos(lean) * BONES.shoulderDrop - pose.shoulderLift,
  ];
  const reach = BONES.neck + BONES.headRadius;
  const neckAngle = toRadians(pose.lean + pose.headTilt * 0.4);
  const head = [shoulder[0] + Math.sin(neckAngle) * reach, shoulder[1] - Math.cos(neckAngle) * reach];
  const wristL = limbEnd(limbEnd(armRoot, pose.armLUpper, BONES.upperArm), pose.armLLower, BONES.forearm);
  const wristR = limbEnd(limbEnd(armRoot, pose.armRUpper, BONES.upperArm), pose.armRLower, BONES.forearm);
  const ankleL = limbEnd(limbEnd([0, 0], pose.legLUpper, BONES.thigh), pose.legLLower, BONES.shin);
  const ankleR = limbEnd(limbEnd([0, 0], pose.legRUpper, BONES.thigh), pose.legRLower, BONES.shin);
  const shift = -Math.max(ankleL[1], ankleR[1]) - 0.8 - pose.lift;
  const planted = ([x, y]) => [x, y + shift];
  return {
    hip: planted([0, 0]),
    shoulder: planted(shoulder),
    head: planted(head),
    wristL: planted(wristL),
    wristR: planted(wristR),
  };
}

// Props are drawn in figure units with the wrist or head at the origin.
const COSTUME = {
  antenna: `<path ${LINE} d="M0 -12 L0 -21"/><circle cx="0" cy="-23" r="2.6" ${ACCENT}/><rect x="-14.6" y="-3" width="3" height="6" ${SOLID}/><rect x="11.6" y="-3" width="3" height="6" ${SOLID}/>`,
  flatCap: `<path ${SOLID} d="M-12 -7 C-11 -16 8 -17 12 -7 L19 -5 C16 -3 -2 -4 -12 -7 Z"/>`,
  deerstalker: `<path ${PAPER} d="M-11 -7 C-10 -17 10 -17 11 -7 Z"/><path ${SOLID} d="M-11 -7 L-17 -4 L-9 -4 Z M11 -7 L17 -4 L9 -4 Z"/><path ${LINE} d="M0 -14 L0 -17"/>`,
  beret: `<ellipse cx="1" cy="-11" rx="14" ry="5" ${SOLID}/><path ${LINE} d="M1 -16 L2 -19"/>`,
  hardHat: `<path ${ACCENT} d="M-11 -8 C-11 -19 11 -19 11 -8 Z"/><path ${SOLID} d="M-14 -8 L14 -8 L14 -6 L-14 -6 Z"/>`,
  glasses: `<circle cx="-4" cy="-2" r="3" fill="none" stroke="var(--brand-ink)" stroke-width="1"/><circle cx="4" cy="-2" r="3" fill="none" stroke="var(--brand-ink)" stroke-width="1"/><path d="M-1 -2 L1 -2" stroke="var(--brand-ink)" stroke-width="1"/>`,
  cup: `<path ${PAPER} d="M-5.4 -13 L5.4 -13 L3.8 3 L-3.8 3 Z"/><path ${ACCENT} d="M-4.9 -8 L4.9 -8 L4.3 -2 L-4.3 -2 Z"/><path ${SOLID} d="M-6.2 -15.5 L6.2 -15.5 L5.6 -13 L-5.6 -13 Z"/>`,
  magnifier: `<path ${LINE} stroke-width="3" d="M0 0 L0 10"/><circle cx="0" cy="18" r="8" ${PAPER}/><path ${LINE} d="M-3.5 15 C-2 13 0 13 1 13.5"/>`,
  clipboard: `<rect x="-8" y="-11" width="16" height="21" rx="1" ${PAPER}/><rect x="-3.5" y="-13" width="7" height="3.5" ${SOLID}/><path ${LINE} d="M-5 -5 L5 -5 M-5 -1 L5 -1 M-5 3 L2 3"/>`,
  pencil: `<path ${ACCENT} d="M-2.2 -10 L2.2 -10 L2.2 14 L-2.2 14 Z"/><path ${PAPER} d="M-2.2 14 L2.2 14 L0 21 Z"/><path ${SOLID} d="M-2.2 -13 L2.2 -13 L2.2 -10 L-2.2 -10 Z"/>`,
  stamp: `<circle cx="0" cy="-2" r="3.5" ${SOLID}/><path ${LINE} stroke-width="3" d="M0 0 L0 9"/><rect x="-8" y="9" width="16" height="4.5" ${SOLID}/><rect x="-8" y="13.5" width="16" height="2" fill="var(--brand-accent)"/>`,
  bucketHat: `<path ${SOLID} d="M-16 -6 L16 -6 L11 -10 C9 -19 -9 -19 -11 -10 Z"/>`,
  sunglasses: `<rect x="-8.5" y="-5" width="7" height="5" rx="1.8" ${SOLID}/><rect x="1.5" y="-5" width="7" height="5" rx="1.8" ${SOLID}/><path ${LINE} stroke-width="1.4" d="M-1.5 -3.5 L1.5 -3.5"/>`,
  backpack: `<rect x="-13" y="3" width="9" height="17" rx="3" ${ACCENT}/><path ${LINE} stroke-width="1.6" d="M-4 4 L1 3 M-4 17 L1 18"/>`,
  pilotCap: `<path ${SOLID} d="M-12 -8 C-12 -18 12 -18 12 -8 Z"/><path ${SOLID} d="M-2 -8 L17 -6.5 L15.5 -4.5 L-2 -6 Z"/><circle cx="0" cy="-13" r="2.2" fill="var(--brand-accent)"/>`,
  bellhopCap: `<rect x="-8.5" y="-20" width="17" height="9" rx="1" ${ACCENT}/><path ${LINE} d="M-8.5 -11 L8.5 -11"/>`,
  safariHat: `<path ${PAPER} d="M-18 -8 C-10 -11 10 -11 18 -8 L11 -9.5 C10 -20 -10 -20 -11 -9.5 Z"/><path ${SOLID} d="M-11 -10 L11 -10 L11 -12.5 L-11 -12.5 Z"/>`,
  paperPlane: `<path ${PAPER} d="M-11 -7 L15 0 L-11 7 L-5 0 Z"/><path ${LINE} stroke-width="1.6" d="M-5 0 L15 0"/>`,
  suitcase: `<path ${LINE} stroke-width="2" d="M-3 4 L-3 0 L3 0 L3 4"/><rect x="-9" y="4" width="18" height="13" rx="2" ${ACCENT}/><path ${LINE} stroke-width="1.6" d="M-9 10 L9 10"/>`,
  binoculars: `<rect x="-7" y="-5" width="6" height="10" rx="2.5" ${SOLID}/><rect x="1" y="-5" width="6" height="10" rx="2.5" ${SOLID}/><path ${LINE} d="M-1 -1 L1 -1"/>`,
  planCard: `<rect x="-8" y="-12" width="16" height="20" rx="1" ${PAPER}/><path ${LINE} stroke-width="1.6" d="M-5 -7 L5 -7 M-5 -3 L5 -3 M-5 1 L2 1"/><circle cx="4" cy="4.5" r="2" fill="var(--brand-accent)"/>`,
  // Emotion marks, drawn above or beside the head.
  bulb: `<path ${LINE} d="M0 -44 L0 -48 M10 -39 L13 -42 M-10 -39 L-13 -42"/><circle cx="0" cy="-34" r="6.5" ${ACCENT}/><rect x="-3" y="-28" width="6" height="4" ${SOLID}/>`,
  sweat: `<path ${PAPER} stroke-width="1.6" d="M15 -12 C12.5 -7 12.5 -3.5 15.5 -3.5 C18.5 -3.5 18.5 -7 15 -12 Z"/>`,
  sigh: `<path ${LINE} stroke-width="1.8" d="M13 7 C16 5 18 8 21 6 C24 8 26 5 29 7 M15 11 C18 9 21 12 24 10"/>`,
  hearts: `<path fill="var(--brand-accent)" stroke="var(--brand-ink)" stroke-width="1.2" d="M-12 -30 C-17 -34 -17 -39 -13 -40 C-11 -40.5 -10 -39 -9.5 -38 C-9 -39 -8 -40.5 -6 -40 C-2 -39 -2 -34 -7 -30 L-9.5 -27.5 Z M10 -36 C6 -39 6 -43 9 -44 C10.5 -44.5 11.5 -43.2 12 -42.4 C12.5 -43.2 13.5 -44.5 15 -44 C18 -43 18 -39 14 -36 L12 -34 Z"/>`,
  hourglass: `<g transform="translate(0 -36)"><path ${PAPER} d="M-6 -8 L6 -8 L1 0 L6 8 L-6 8 L-1 0 Z"/><path d="M-3.5 5.5 L3.5 5.5 L0 1.5 Z" fill="var(--brand-accent)"/><path ${LINE} d="M-8 -8 L8 -8 M-8 8 L8 8"/></g>`,
  headphones: `<path ${LINE} stroke-width="2.6" d="M-13 -2 C-14 -20 14 -20 13 -2"/><rect x="-16" y="-5" width="6" height="9" rx="2.5" ${ACCENT}/><rect x="10" y="-5" width="6" height="9" rx="2.5" ${ACCENT}/>`,
  goggles: `<rect x="-10" y="-6" width="20" height="7" rx="3.5" ${PAPER}/><path ${LINE} stroke-width="1.4" d="M0 -6 L0 1 M-13 -3 L-10 -3 M10 -3 L13 -3"/>`,
  dizzy: `<path ${LINE} stroke-width="1.8" d="M0 -36 C4 -36 4 -31 0 -31 C-6 -31 -6 -39 0 -39 C8 -39 8 -28 0 -28 C-9 -28 -10 -41 0 -42"/>`,
};

/**
 * One member: a figure at feet origin, plus props.
 * props: [{ art, on: "head" | "wristL" | "wristR", upright, from, until }]
 * `from` makes a prop pop on at that time, `until` removes it.
 */
export function createMember(parentSvg, { seed, startPose = "standing", startExpression = "neutral", props = [], apron = false }) {
  const group = document.createElementNS(SVG_NAMESPACE, "g");
  parentSvg.appendChild(group);
  const figure = window.BrandStickman.create(group, {
    x: 0,
    y: 0,
    height: 100,
    seed,
    startPose,
    startExpression,
  });
  const apronPath = document.createElementNS(SVG_NAMESPACE, "path");
  if (apron) {
    apronPath.setAttribute("fill", "var(--brand-background)");
    apronPath.setAttribute("stroke", "var(--brand-ink)");
    apronPath.setAttribute("stroke-width", "2.2");
    apronPath.setAttribute("stroke-linejoin", "round");
    group.appendChild(apronPath);
  }
  const worn = props.map((prop) => {
    const node = document.createElementNS(SVG_NAMESPACE, "g");
    node.innerHTML = COSTUME[prop.art];
    group.appendChild(node);
    return { ...prop, node };
  });

  return {
    figure,
    group,
    /** Draw the figure and its props for this time. Pure in `time`. */
    draw(time) {
      figure.seek(time);
      const pose = figure.poseAt(time);
      const joints = jointsOf(pose);
      if (apron) {
        const [hipX, hipY] = joints.hip;
        const [topX, topY] = joints.shoulder;
        const midX = (hipX + topX) / 2;
        apronPath.setAttribute(
          "d",
          `M${topX - 4} ${topY + 6} L${topX + 4} ${topY + 6} L${midX + 8} ${hipY + 5} L${midX - 8} ${hipY + 5} Z`,
        );
      }
      // Props redraw six times a second with a tiny tilt, in step with the figure's line boil.
      const boil = Math.sin(Math.floor(time * 6) * 12.9898) * 0.8;
      for (const prop of worn) {
        const appear = prop.from === undefined ? 1 : backOut((time - prop.from) / 0.28);
        const gone = prop.until !== undefined && time >= prop.until;
        if (appear <= 0 || gone || time < (prop.from ?? -Infinity)) {
          prop.node.setAttribute("display", "none");
          continue;
        }
        prop.node.removeAttribute("display");
        const [x, y] = joints[prop.on];
        let angle = boil;
        if (prop.on === "head") {
          angle += pose.lean + pose.headTilt * 0.6;
        } else if (!prop.upright) {
          angle -= prop.on === "wristR" ? pose.armRLower : pose.armLLower;
        }
        prop.node.setAttribute(
          "transform",
          `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(2)}) scale(${clamp01(appear) * (prop.scale || 1)})`,
        );
      }
    },
  };
}

// Hand-made poses. Angles are the kit's: 0 is down, +90 screen right, 180 up.
const base = { lean: 0, headTilt: 0, shoulderLift: 0, look: 0, lift: 0, armLUpper: -24, armLLower: -13, armRUpper: 24, armRLower: 13, legLUpper: -13, legLLower: -8, legRUpper: 13, legRLower: 8, handL: "none", handR: "none" };

export const POSES = {
  // Holding a load overhead; `sink` from 0 to 3 is how far the knees have buckled.
  strain: (sink) => ({
    ...base,
    headTilt: 4 + sink * 3,
    armLUpper: -160,
    armLLower: -176,
    armRUpper: 160,
    armRLower: 176,
    legLUpper: -24 - sink * 13,
    legLLower: 6 + sink * 11,
    legRUpper: 24 + sink * 13,
    legRLower: -6 - sink * 11,
    look: sink > 1 ? -1 : 0,
  }),
  sweepOut: { ...base, lean: 6, look: 2, armRUpper: 74, armRLower: 84, legRUpper: 18 },
  sweepIn: { ...base, lean: 2, look: 2, headTilt: 5, armRUpper: 92, armRLower: 118, legRUpper: 18 },
  noteHigh: { ...base, look: 2, headTilt: 7, armLUpper: 34, armLLower: 96, armRUpper: 40, armRLower: 124 },
  noteLow: { ...base, look: 2, headTilt: 10, armLUpper: 34, armLLower: 96, armRUpper: 56, armRLower: 104 },
  writeUp: { ...base, lean: 4, look: 2, armRUpper: 56, armRLower: 128, armLUpper: -30, armLLower: -8 },
  writeDown: { ...base, lean: 8, look: 2, armRUpper: 78, armRLower: 92, armLUpper: -30, armLLower: -8 },
  stampUp: { ...base, lean: -3, look: 2, armRUpper: 120, armRLower: 172, legLUpper: -16, legRUpper: 16 },
  stampDown: { ...base, lean: 10, look: 2, headTilt: 6, armRUpper: 72, armRLower: 58, legLUpper: -18, legRUpper: 22 },
  holdCup: { ...base, look: 1, headTilt: 3, armLUpper: -34, armLLower: 88, armRUpper: 24, armRLower: 12 },
  raiseCup: { ...base, look: 1, lift: 1.5, headTilt: 3, armLUpper: -66, armLLower: 120, armRUpper: 28, armRLower: 12 },
  slump: { ...base, lean: 4, headTilt: 15, shoulderLift: -2, look: 0, armLUpper: -7, armLLower: -3, armRUpper: 7, armRLower: 3, legLUpper: -9, legRUpper: 9 },
  crossed: { ...base, headTilt: -4, armLUpper: 26, armLLower: 104, armRUpper: -26, armRLower: -104 },
  tapUp: { ...base, headTilt: -4, armLUpper: 26, armLLower: 104, armRUpper: -26, armRLower: -104, legRUpper: 26, legRLower: 8 },
  handOver: { ...base, lean: 4, look: 2, armLUpper: 64, armLLower: 84, armRUpper: 76, armRLower: 92, handR: "open", handL: "open" },
  dispatch: { ...base, lift: 2, armLUpper: -112, armLLower: -98, armRUpper: 112, armRLower: 98, handL: "open", handR: "open" },
  work: { ...base, lean: 5, look: 2, headTilt: 6, armRUpper: 62, armRLower: 104, armLUpper: 40, armLLower: 96 },
  workAlt: { ...base, lean: 7, look: 2, headTilt: 9, armRUpper: 74, armRLower: 86, armLUpper: 46, armLLower: 112 },
  lookOut: { ...base, lean: -2, look: 2, headTilt: -6, armRUpper: 118, armRLower: 150, armLUpper: -100, armLLower: -150 },
  showPlan: { ...base, lift: 2, headTilt: -5, armRUpper: 128, armRLower: 158, armLUpper: -122, armLLower: -150, legLUpper: -16, legLLower: -22, legRUpper: 14, legRLower: 20 },
  lounge: { ...base, lean: -6, headTilt: -8, armLUpper: -150, armLLower: 40, armRUpper: 150, armRLower: -40, legLUpper: -10, legLLower: -4, legRUpper: 28, legRLower: -30 },
};
