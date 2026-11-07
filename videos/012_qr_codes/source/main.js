// The choreography: headlines, the link chip and its bits, the scanner's viewfinder, the
// check and cross badges, the level bars, all timed from window.REEL.beats. The world itself
// (the menu, the sticker and its modules) is in world.js.
import { fade, pinTo, showLine, driveFrames } from "../reel/stage.js";
import { frameReel } from "../reel/endcard.js";
import { backOut, clamp01, smooth } from "../reel/motion.js";
import { createWorld } from "./world.js";

const { beats: b } = window.REEL;
const $ = (selector) => document.querySelector(selector);

const world = createWorld(document.getElementById("world"), b);
const { stage } = world;

export const timeline = gsap.timeline({ paused: true });
frameReel(timeline, b, {
  accents: [b.spilled, b.smudged, b.scratched, b.torn, b.ugh, b.anyway, b.bits, b.three, b.up, b.repair, b.splash, b.chunk, b.pieces, b.pops, b.reed, b.thirty, b.corner2, b.no, b.scanning],
  fadeOut: "#world, #labels, #overlay, #scene .bp-safe",
});

/* ---------- headlines ---------- */

const pop = (id, at, until, from = 0.6) => {
  timeline.fromTo(id, { scale: from, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.26, ease: "back.out(2.4)" }, at);
  timeline.to(id, { y: -24, opacity: 0, duration: 0.16, ease: "power2.in" }, until - 0.16);
};

showLine(timeline, "#line-hook", b.start[0] - 0.05, b.smudged - 0.05);
// The pain: one stamp per word, slammed down.
[b.smudged, b.scratched, b.torn].forEach((at, index) => {
  timeline.fromTo(`#stamp-${index}`, { scale: 1.6, opacity: 0, rotation: index % 2 ? 4 : -4 }, { scale: 1, opacity: 1, rotation: index % 2 ? -2 : 2, duration: 0.2, ease: "back.out(2)" }, at - 0.04);
});
timeline.to("#stamps", { y: -30, opacity: 0, duration: 0.16, ease: "power2.in" }, b.ask - 0.22);
showLine(timeline, "#line-ask", b.ask - 0.08, b.what - 0.05);
pop("#line-ugh", b.ugh - 0.04, b.what - 0.05, 1.5);
showLine(timeline, "#line-anyway", b.scans - 0.12, b.clearAt + 0.05);

// The link chip: the result on "anyway", the input on "link", then it turns into bits.
const later = { immediateRender: false };
timeline.fromTo("#chip-in", { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.24, ease: "back.out(2.2)" }, b.anyway - 0.02);
timeline.fromTo("#chip-badge-in", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.22, ease: "back.out(2.6)" }, b.anyway + 0.06);
timeline.fromTo("#chip-badge-in", { scale: 1, opacity: 1 }, { scale: 0, opacity: 0, duration: 0.12, ...later }, b.clearAt - 0.05);
timeline.fromTo("#chip-in", { scale: 1 }, { scale: 1.12, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out", ...later }, b.link - 0.08);
timeline.fromTo("#chip-in", { scale: 1, opacity: 1, y: 0 }, { scale: 0.3, opacity: 0, y: 40, duration: 0.18, ease: "power2.in", ...later }, b.bits - 0.08);
timeline.fromTo("#bits", { opacity: 0 }, { opacity: 1, duration: 0.05 }, b.bits - 0.02);
timeline.fromTo("#bits .row span", { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.16, stagger: 0.08, ease: "back.out(2)" }, b.bits - 0.02);
timeline.fromTo("#bit-key", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.2, ease: "power3.out" }, b.black - 0.05);
timeline.to(["#bits", "#bit-key"], { opacity: 0, y: -20, duration: 0.16, ease: "power2.in" }, b.three - 0.2);

pop("#line-finder", b.three - 0.04, b.then - 0.04, 0.8);
showLine(timeline, "#line-repair", b.repair - 0.08, b.now - 0.05);
timeline.fromTo("#bytes", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.2, ease: "power3.out" }, b.computed - 0.05);
timeline.to("#bytes", { opacity: 0, y: -16, duration: 0.16, ease: "power2.in" }, b.now - 0.2);
pop("#line-splash", b.splash - 0.03, b.scanner - 0.05, 1.7);
pop("#line-hide", b.hide - 0.05, b.or - 0.02, 0.8);
pop("#line-corner", b.or - 0.02, b.no - 0.06, 0.8);
pop("#line-rebuilt", b.pieces - 0.06, b.pops - 0.05, 1.4);

// The link pops right back out of the repaired code.
timeline.fromTo("#chip-out", { scale: 0.3, opacity: 0, y: 260 }, { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: "back.out(2)" }, b.pops - 0.06);
timeline.fromTo("#chip-badge-out", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.22, ease: "back.out(2.6)" }, b.back - 0.05);
timeline.fromTo("#chip-out", { opacity: 1, y: 0 }, { opacity: 0, y: -24, duration: 0.16, ease: "power2.in", ...later }, b.thats - 0.2);

timeline.fromTo("#line-name", { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)" }, b.thats - 0.05);
timeline.to("#line-name", { y: -24, opacity: 0, duration: 0.16, ease: "power2.in" }, b.upTo - 0.25);

// "Up to thirty percent": the four levels rise, drawn to scale; H lands on "thirty".
showLine(timeline, "#line-thirty", b.upTo - 0.1, b.hide - 0.05);
timeline.fromTo("#levels", { opacity: 0 }, { opacity: 1, duration: 0.12 }, b.upTo - 0.1);
const levels = [7, 15, 25, 30];
levels.forEach((percent, index) => {
  const at = index < 3 ? b.upTo + 0.05 + index * 0.12 : b.thirty - 0.08;
  const height = (percent / 30) * 150;
  timeline.fromTo(`#level-${index} .bar`, { height, scaleY: 0 }, { height, scaleY: 1, duration: 0.28, ease: "back.out(1.8)" }, at);
  timeline.fromTo(`#level-${index} .pct`, { bottom: height + 14, opacity: 0, y: 20 }, { bottom: height + 14, opacity: 1, y: 0, duration: 0.2, ease: "power3.out" }, at + 0.12);
});
timeline.fromTo("#levels-note", { opacity: 0 }, { opacity: 1, duration: 0.2 }, b.thirty + 0.2);
timeline.to("#levels", { opacity: 0, y: 30, duration: 0.18, ease: "power2.in" }, b.hide - 0.2);

pop("#line-noscan", b.no - 0.04, b.happy - 0.04, 1.5);
pop("#line-happy", b.happy - 0.04, b.endCard + 0.1, 0.7);

/* ---------- the scanner's viewfinder, badges and the up arrow ---------- */

const brackets = [0, 1, 2, 3].map((index) => $(`#vf-${index}`));
const badge = $("#badge");
const badgeUse = $("#badge-use");
const arrow = $("#arrow-up");
// When the viewfinder is up: the first scan, the rebuild, the failed scan, the last scan.
const scans = [
  [b.what - 0.05, b.clearAt],
  [b.scanner - 0.15, b.thats - 0.15],
  [b.no - 0.75, b.happy - 0.1],
  [b.happy - 0.05, b.endCard + 0.2],
];

function drawViewfinder(time) {
  let shown = 0;
  let born = 0;
  for (const [from, until] of scans) {
    const amount = fade(time, from, until, 0.12);
    if (amount > shown) {
      shown = amount;
      born = from;
    }
  }
  const corners = world.codeCorners();
  // Brackets snap in from slightly outside, and shudder when the scan fails.
  const open = 1 + 0.25 * (1 - backOut((time - born) / 0.28));
  const shake = fade(time, b.no - 0.02, b.no + 0.4, 0.04) * Math.sin(time * 80) * 10;
  const cx = corners.reduce((sum, p) => sum + p.x, 0) / 4;
  const cy = corners.reduce((sum, p) => sum + p.y, 0) / 4;
  const points = corners.map((p) => ({ x: cx + (p.x - cx) * open + shake, y: cy + (p.y - cy) * open }));
  points.forEach((corner, index) => {
    const before = points[(index + 3) % 4];
    const after = points[(index + 1) % 4];
    const arm = 0.2;
    const a = { x: corner.x + (before.x - corner.x) * arm, y: corner.y + (before.y - corner.y) * arm };
    const c = { x: corner.x + (after.x - corner.x) * arm, y: corner.y + (after.y - corner.y) * arm };
    brackets[index].setAttribute("d", `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${corner.x.toFixed(1)} ${corner.y.toFixed(1)} L${c.x.toFixed(1)} ${c.y.toFixed(1)}`);
    brackets[index].style.opacity = String(shown);
  });

  // The verdict sits on the viewfinder's top-right corner: a check, or a cross.
  const verdicts = [
    { at: b.no, until: b.happy - 0.05, kind: "cross" },
    { at: b.scanning, until: b.endCard + 0.2, kind: "check" },
  ];
  const verdict = verdicts.find((v) => time >= v.at - 0.01 && time < v.until);
  if (verdict) {
    badgeUse.setAttribute("href", `#i-badge-${verdict.kind}`);
    const grow = backOut((time - verdict.at) / 0.24) * (1 - smooth((time - verdict.until + 0.15) / 0.15));
    badge.style.opacity = "1";
    const corner = points[1];
    badge.style.transform = `translate(${corner.x.toFixed(1)}px, ${corner.y.toFixed(1)}px) scale(${Math.max(0.0001, grow).toFixed(3)})`;
  } else badge.style.opacity = "0";

  // "Which way's up": an arrow over the code's top edge as it lands upright.
  const arrowIn = backOut((time - b.up + 0.06) / 0.25) * (1 - smooth((time - b.then + 0.2) / 0.15));
  const top = world.stickerToScreen(0, world.TILE_Y, -(12.5 + 0.8) * world.MOD);
  arrow.style.opacity = time > b.up - 0.07 && arrowIn > 0.001 ? "1" : "0";
  arrow.style.transform = `translate(${top.x.toFixed(1)}px, ${top.y.toFixed(1)}px) scale(${Math.max(0.0001, arrowIn).toFixed(3)})`;
}

function drawFrame(time) {
  stage.applyCamera(stage.poseAt(time));
  world.draw(time);
  drawViewfinder(time);
}
driveFrames(timeline, b.duration, drawFrame);
