// The series' opening and closing: the torn orange reveal, stop-motion paper, and the
// Follow for more end card with a cheering figure. The matching markup is in README.md.
import { createMember } from "./cast.js";

/**
 * Open and close a Reel. `beats` needs `duration` and `endCard`. `accents` are the key moments
 * the paper jumps on. `closerProps` dress the end-card figure, e.g. [{ art: "headphones", on: "head" }].
 */
export function frameReel(timeline, beats, { accents = [], closerProps = [], fadeOut = "#world, #figures, #labels" } = {}) {
  BrandKit.tornReveal(timeline, { top: "#sheet-top", bottom: "#sheet-bottom", at: 0.1 });
  BrandKit.paperJump(timeline, { layers: ".paper-sheet", duration: beats.duration, accents: [...accents, beats.endCard] });

  timeline.to(fadeOut, { opacity: 0, duration: 0.2, ease: "power1.inOut" }, beats.endCard);
  timeline.fromTo("#end-card", { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power1.inOut" }, beats.endCard);
  timeline.from("#end-title", { y: 30, opacity: 0, duration: 0.42, ease: "power3.out" }, beats.endCard + 0.08);

  const closerSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  closerSvg.setAttribute("viewBox", "0 0 1080 1920");
  closerSvg.setAttribute("width", "1080");
  closerSvg.setAttribute("height", "1920");
  document.querySelector("#end-stage").appendChild(closerSvg);
  const closer = createMember(closerSvg, { seed: 23, startPose: "cheering", startExpression: "delighted", props: closerProps });
  closer.group.setAttribute("transform", "translate(540 1240) scale(4)");
  return closer;
}
