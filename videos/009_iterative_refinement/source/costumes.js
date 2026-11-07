// Costume this Reel adds on top of reel/cast.js, which has no tie or polishing rag. The kit's
// COSTUME table is private, so these props are drawn here, following the same joints.
import { backOut, clamp01 } from "../reel/motion.js";

const { BONES } = window.BrandStickman;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const LINE = 'fill="none" stroke="var(--brand-ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const PAPER = 'fill="var(--brand-background)" stroke="var(--brand-ink)" stroke-width="2" stroke-linejoin="round"';
const ACCENT = 'fill="var(--brand-accent)" stroke="var(--brand-ink)" stroke-width="1.5" stroke-linejoin="round"';

const ART = {
  // A tie hanging from the collar, drawn down the torso.
  tie: `<path ${ACCENT} d="M-2.6 0 L2.6 0 L1.6 3.4 L-1.6 3.4 Z"/><path ${ACCENT} d="M-1.6 3.4 L1.6 3.4 L3.4 17 L0 21 L-3.4 17 Z"/>`,
  // A folded polishing rag in the hand.
  rag: `<path ${PAPER} d="M-7 -4 C-3 -7 4 -6 8 -3 L6 7 C2 9 -4 8 -8 6 Z"/><path ${LINE} stroke-width="1.4" d="M-5 0 C-1 -2 3 -1 6 1"/>`,
  // A slide clicker held in the hand, for the confident presenter.
  clicker: `<rect x="-3" y="-7" width="6" height="12" rx="2" fill="var(--brand-ink)"/><circle cx="0" cy="-3.5" r="1.4" fill="var(--brand-accent)"/>`,
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;
const limbEnd = ([x, y], angle, length) => [x + Math.sin(toRadians(angle)) * length, y + Math.cos(toRadians(angle)) * length];

// The same solve as reel/cast.js: shoulders and wrists, with the feet planted at the origin.
function jointsOf(pose) {
  const lean = toRadians(pose.lean);
  const shoulder = [Math.sin(lean) * BONES.torso, -Math.cos(lean) * BONES.torso];
  const armRoot = [shoulder[0] - Math.sin(lean) * BONES.shoulderDrop, shoulder[1] + Math.cos(lean) * BONES.shoulderDrop - pose.shoulderLift];
  const wristL = limbEnd(limbEnd(armRoot, pose.armLUpper, BONES.upperArm), pose.armLLower, BONES.forearm);
  const wristR = limbEnd(limbEnd(armRoot, pose.armRUpper, BONES.upperArm), pose.armRLower, BONES.forearm);
  const ankleL = limbEnd(limbEnd([0, 0], pose.legLUpper, BONES.thigh), pose.legLLower, BONES.shin);
  const ankleR = limbEnd(limbEnd([0, 0], pose.legRUpper, BONES.thigh), pose.legRLower, BONES.shin);
  const shift = -Math.max(ankleL[1], ankleR[1]) - 0.8 - pose.lift;
  const planted = ([x, y]) => [x, y + shift];
  return { collar: planted(armRoot), wristL: planted(wristL), wristR: planted(wristR) };
}

/** Add props to a kit member: [{ art, on: "collar" | "wristL" | "wristR", from, until }]. */
export function dress(member, props) {
  const worn = props.map((prop) => {
    const node = document.createElementNS(SVG_NAMESPACE, "g");
    node.innerHTML = ART[prop.art];
    member.group.appendChild(node);
    return { ...prop, node };
  });
  const draw = member.draw;
  member.draw = (time) => {
    draw(time);
    const pose = member.figure.poseAt(time);
    const joints = jointsOf(pose);
    for (const prop of worn) {
      const shown = time >= (prop.from ?? -Infinity) && time < (prop.until ?? Infinity);
      if (!shown) {
        prop.node.setAttribute("display", "none");
        continue;
      }
      prop.node.removeAttribute("display");
      const appear = prop.from === undefined ? 1 : clamp01(backOut((time - prop.from) / 0.28));
      const [x, y] = joints[prop.on];
      const angle = prop.on === "collar" ? pose.lean : 0;
      prop.node.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(2)}) scale(${appear})`);
    }
  };
  return member;
}
