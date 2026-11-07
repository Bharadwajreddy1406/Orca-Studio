// The choreography: one slide improved pass by pass. The cast's acting, the board and its
// quality meter, the four versions side by side, and the catch, all timed from window.REEL.beats.
import { fade, pinTo, standAt, showLine, driveFrames } from "../reel/stage.js";
import { createMember, POSES } from "../reel/cast.js";
import { frameReel } from "../reel/endcard.js";
import { backOut, clamp01, mix, smooth, spring, track } from "../reel/motion.js";
import { createWorld, LAYOUT } from "./world.js";
import { buildSlide } from "./slide.js";
import { dress } from "./costumes.js";

const { beats } = window.REEL;
const { start, passes, gates } = beats;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const { stage, draw: drawWorld, cartX, cartSpeed } = createWorld($("#world"), beats);
const canvas = $("#world canvas");
const BOARD_Y = beats.boardY;
// Figures stand a little smaller than the kit's 5 units, so heads clear the board.
const FIGURE_UNITS = 4.4;

/* ---------- the slide's quality, version and meter reading ---------- */

const linear = (alpha) => clamp01(alpha);
const qualityKeys = [
  { t: beats.fix - 0.02, d: 0.55, v: { q: 1 }, e: linear },
  { t: beats.simplify - 0.02, d: 0.65, v: { q: 2 }, e: linear },
  { t: beats.sharper - 0.04, d: 0.8, v: { q: 2.55 }, e: linear },
  { t: beats.polished - 0.06, d: 0.5, v: { q: 3 }, e: linear },
];
const slideQuality = (time) => track({ q: 0 }, qualityKeys, time).q;

// The meter reads 16, 42, 64, then 86 of 100: each pass beats the last, with smaller gains.
const READINGS = [0.16, 0.42, 0.64, 0.86];
const TARGET = 0.8;
const meterKeys = [
  { t: beats.fix + 0.05, d: 0.5, v: { m: READINGS[1] }, e: backOut },
  { t: beats.simplify + 0.1, d: 0.5, v: { m: READINGS[2] }, e: backOut },
  { t: beats.polished, d: 0.5, v: { m: READINGS[3] }, e: backOut },
];
// Past good enough, every extra pass adds less and less, and never reaches the top.
const fussing = (time) => smooth((time - beats.orWord) / 0.4) * (1 - smooth((time - beats.go + 0.4) / 0.2));
function meterAt(time) {
  let reading = track({ m: READINGS[0] }, meterKeys, time).m;
  if (time > beats.orWord && time < beats.go - 0.2) reading += 0.1 * (1 - Math.exp(-(time - beats.orWord) * 1.4));
  return reading;
}
function versionAt(time) {
  if (time > beats.orWord + 0.15 && time < beats.go - 0.2) {
    const run = (time - beats.orWord - 0.15) / (beats.go - 0.35 - beats.orWord);
    return 5 + Math.floor(44 * run * run);
  }
  if (time < beats.fix + 0.15) return 1;
  if (time < beats.simplify + 0.15) return 2;
  if (time < beats.polished + 0.05) return 3;
  return 4;
}

/* ---------- the cast ---------- */

const figures = $("#figures");
const presenter = dress(
  createMember(figures, {
    seed: 7,
    startExpression: "confused",
    props: [
      { art: "sweat", on: "head", from: 1.0, until: beats.whatIf },
      { art: "sigh", on: "head", from: beats.meh - 0.1, until: beats.meh + 1.0 },
      { art: "hearts", on: "head", from: beats.meeting, until: beats.endCard + 1 },
    ],
  }),
  [
    { art: "tie", on: "collar" },
    { art: "clicker", on: "wristR", from: beats.go - 0.1 },
  ],
);
const bot = dress(
  createMember(figures, {
    seed: 11,
    startExpression: "determined",
    props: [
      { art: "antenna", on: "head" },
      { art: "bulb", on: "head", from: beats.whatIf - 0.05, until: passes[0] },
      { art: "pencil", on: "wristR", from: passes[0], until: passes[2] + 0.3 },
      { art: "sweat", on: "head", from: beats.polish, until: beats.go },
      { art: "dizzy", on: "head", from: beats.forever - 0.1, until: beats.go },
    ],
  }),
  [{ art: "rag", on: "wristR", from: passes[2] + 0.3 }],
);
const audience = [31, 37].map((seed, index) =>
  createMember(figures, {
    seed,
    startExpression: "neutral",
    props: index === 0 ? [{ art: "glasses", on: "head" }] : [{ art: "beret", on: "head" }],
  }),
);

/* ---------- the presenter: nervous, desperate, hopeful, then confident ---------- */

const host = presenter.figure;
host.pose("thinking", { at: 0.7, duration: 0.35 });
host.pose("pointing", { at: beats.slides0 - 0.1, duration: 0.3 });
host.say("sad", { at: beats.slides0 });
host.pose(POSES.slump, { at: beats.meh - 0.1, duration: 0.35, ease: "power2.inOut" });
host.pose(POSES.handOver, { at: beats.startOver, duration: 0.3, ease: "back.out(2)" });
host.say("determined", { at: beats.startOver });
host.pose("shocked", { at: beats.noWay, duration: 0.14, ease: "back.out(2)" });
host.say("shocked", { at: beats.noWay });
host.pose("standing", { at: beats.whatIf, duration: 0.3 });
host.say("happy", { at: beats.whatIf + 0.2 });
host.pose("cheering", { at: beats.onePass, duration: 0.22, ease: "back.out(2)" });
host.say("delighted", { at: beats.onePass });
host.pose("presenting", { at: beats.go, duration: 0.25, ease: "back.out(2)" });
host.say("determined", { at: beats.go });
host.pose("pointing", { at: beats.nail, duration: 0.18, ease: "back.out(2)" });
host.say("happy", { at: beats.nail });
host.pose("cheering", { at: beats.meeting + 0.1, duration: 0.22, ease: "back.out(2)" });
host.say("delighted", { at: beats.meeting + 0.1 });

/* ---------- the AI: blocks the restart, then refines the same slide, pass after pass ---------- */

const ai = bot.figure;
ai.pose(POSES.dispatch, { at: beats.noWay, duration: 0.16, ease: "back.out(2)" });
ai.say("determined", { at: beats.noWay });
ai.pose("pointing_up", { at: beats.whatIf, duration: 0.22, ease: "back.out(2)" });
ai.say("delighted", { at: beats.whatIf });
beats.cartKeys.slice(0, 3).forEach((key) => {
  ai.walk({ at: key.t, until: key.t + key.d, strideRate: 2.2, blend: 0.12 });
  ai.say("determined", { at: key.t });
});
// Pass one and two: quick pencil strokes on the action word, then a proud point.
for (const [action, done] of [
  [beats.fix, beats.structure],
  [beats.simplify, beats.words],
]) {
  ai.pose(POSES.writeUp, { at: action - 0.22, duration: 0.12 });
  ai.pose(POSES.writeDown, { at: action, duration: 0.1 });
  ai.pose(POSES.writeUp, { at: action + 0.16, duration: 0.1 });
  ai.pose(POSES.writeDown, { at: action + 0.3, duration: 0.1 });
  ai.pose("pointing_up", { at: done, duration: 0.2, ease: "back.out(2)" });
  ai.say("happy", { at: done });
}
// Pass three: the example, then a polish with the rag.
ai.pose(POSES.work, { at: beats.sharper - 0.1, duration: 0.15 });
ai.pose(POSES.workAlt, { at: beats.examples, duration: 0.15 });
for (let at = beats.polished - 0.1, swing = 0; at < beats.slides - 0.1; at += 0.16, swing += 1) {
  ai.pose(swing % 2 ? POSES.sweepIn : POSES.sweepOut, { at, duration: 0.12, ease: "sine.inOut" });
}
ai.pose("cheering", { at: beats.slides, duration: 0.22, ease: "back.out(2)" });
ai.say("delighted", { at: beats.slides });
ai.pose("presenting", { at: beats.named, duration: 0.3 });
ai.pose("standing", { at: beats.until, duration: 0.3 });
ai.say("happy", { at: beats.until });
ai.pose("pointing_up", { at: beats.goodEnough, duration: 0.2, ease: "back.out(2)" });
ai.say("delighted", { at: beats.goodEnough });
ai.pose("thinking", { at: beats.decide, duration: 0.25 });
ai.say("thinking", { at: beats.decide });
// Without a stop rule: polishing that speeds up and never ends.
for (let at = beats.orWord, gap = 0.2, swing = 0; at < beats.go - 0.3; at += gap, swing += 1, gap = Math.max(0.07, gap * 0.9)) {
  ai.pose(swing % 2 ? POSES.sweepIn : POSES.sweepOut, { at, duration: gap * 0.8, ease: "sine.inOut" });
}
ai.say("determined", { at: beats.orWord });
ai.say("confused", { at: beats.forever - 0.1 });

const crowd = audience.map((member) => member.figure);
crowd.forEach((fan, index) => {
  fan.say("happy", { at: beats.nail });
  fan.pose("cheering", { at: beats.meeting + index * 0.08, duration: 0.22, ease: "back.out(2)" });
  fan.say("delighted", { at: beats.meeting + index * 0.08 });
});

/* ---------- where everyone stands ---------- */

const galleryOn = (time) => smooth((time - beats.every - 0.1) / 0.3) * (1 - smooth((time - beats.named + 0.35) / 0.3));
const units = { units: FIGURE_UNITS };

function drawCast(time) {
  const hidden = galleryOn(time) > 0.5;
  const atCorner = time < passes[0] + 0.6 || time >= beats.go - 0.15;
  standAt(stage, presenter, atCorner && !hidden, -3.35, 1.0, 0.3, time, units);
  const botX = time < passes[0] ? 3.2 : cartX(time) + 3.6;
  const botShown = time >= beats.noWay - 0.05 && time < beats.go + 0.1 && !hidden;
  standAt(stage, bot, botShown, botX, 1.4, beats.noWay - 0.05, time, units);
  audience.forEach((member, index) => {
    const at = beats.go + 0.05 + index * 0.12;
    standAt(stage, member, time >= at, 2.7 + index * 1.55, 1.9, at, time, { units: 3.7 });
  });
}

/* ---------- the board, the meter and the signs ---------- */

const board = $("#board");
const mainSlide = buildSlide(board);
board.insertBefore(mainSlide.slide, board.firstChild);
const versionText = $("#vtag-text");
const versionCheck = $("#vtag svg");
const scan = $("#scan");
const crumple = $("#crumple");
const meh = $("#meh");
const meter = $("#meter");
const meterFill = $("#meter-fill");
const target = $("#target");
const targetLine = $("#target-line");
const targetCheck = $("#target-check");
const signs = $$(".gate-sign");
const binCross = $("#bin-cross");
const actions = [beats.fix, beats.simplify, beats.sharper, beats.polished];

function boardCenter(time) {
  // "Start over?": the slide crumples toward the bin, and springs back on "No way".
  const crumpled = smooth((time - beats.startOver) / 0.8) * (1 - spring((time - beats.noWay) / 0.4));
  const x = cartX(time);
  return {
    crumpled,
    x: mix(x, LAYOUT.bin[0], crumpled * 0.7),
    y: mix(BOARD_Y, 2.6, crumpled * 0.7),
    z: mix(0, LAYOUT.bin[1], crumpled * 0.7),
  };
}

function drawBoard(time) {
  const { crumpled, x, y, z } = boardCenter(time);
  const point = stage.toScreen(x, y, z);
  const size = (stage.pixelsPerUnit(x, y, z) / 96) * (1 - 0.74 * crumpled) * backOut((time - 0.35) / 0.4);
  const leave = galleryOn(time);
  board.style.opacity = String(clamp01(1 - leave * 1.4) * smooth((time - 0.3) / 0.15));
  board.style.transform = `translate(${point.x.toFixed(2)}px, ${point.y.toFixed(2)}px) rotate(${(26 * crumpled).toFixed(2)}deg) scale(${Math.max(size, 0.0001).toFixed(4)})`;

  const fuss = fussing(time);
  mainSlide.paint(slideQuality(time), time, fuss);
  crumple.style.opacity = clamp01(crumpled * 1.6).toFixed(3);

  const version = versionAt(time);
  versionText.textContent = `v${version}`;
  versionCheck.style.display = time >= beats.go ? "block" : "none";

  // A scanning bar sweeps the slide as each pass works on it.
  let sweep = -1;
  for (const at of actions) {
    const run = (time - at + 0.08) / 0.5;
    if (run >= 0 && run <= 1) sweep = run;
  }
  scan.style.opacity = sweep < 0 ? "0" : String(Math.sin(Math.PI * sweep).toFixed(3));
  scan.style.transform = `translateY(${(clamp01(sweep) * 380).toFixed(1)}px)`;

  const stamped = backOut((time - beats.meh + 0.04) / 0.22) * (1 - smooth((time - beats.startOver - 0.15) / 0.2));
  meh.style.opacity = clamp01(stamped * 3).toFixed(3);
  meh.style.transform = `rotate(-11deg) scale(${(Math.max(0, stamped) * (1 + 0.6 * (1 - clamp01((time - beats.meh) / 0.22)))).toFixed(3)})`;

  // The meter rides at the slide's right edge.
  const meterShown = fade(time, beats.passWord - 0.05, beats.every + 0.15) + fade(time, beats.until + 0.25, beats.go - 0.3);
  pinTo(stage, meter, cartX(time) + 3.25, BOARD_Y, 0, { opacity: clamp01(meterShown) });
  const reading = meterAt(time);
  meterFill.style.height = `${(clamp01(reading) * 100).toFixed(2)}%`;
  meterFill.style.background = reading >= TARGET - 0.002 && time >= beats.goodEnough ? "var(--brand-accent)" : "var(--brand-ink)";

  // The good-enough line: set on "good enough", made firm on "decide", gone on "or".
  const lineIn = backOut((time - beats.goodEnough + 0.05) / 0.3);
  const lineOut = smooth((time - beats.orWord) / 0.3);
  target.style.top = `${((1 - TARGET) * 390).toFixed(1)}px`;
  target.style.opacity = clamp01(Math.min(1, lineIn * 2) * (1 - lineOut)).toFixed(3);
  const firm = smooth((time - beats.decide) / 0.2);
  targetLine.style.background = firm > 0.5 ? "var(--brand-accent)" : "var(--brand-ink)";
  targetLine.style.transform = `scaleX(${clamp01(lineIn).toFixed(3)}) scaleY(${(1 + firm * 0.5 + 0.4 * Math.exp(-Math.pow((time - beats.decide) / 0.2, 2))).toFixed(3)})`;
  const checked = backOut((time - beats.goodEnough - 0.25) / 0.25);
  targetCheck.style.opacity = clamp01(checked * 2 * (1 - lineOut)).toFixed(3);
  targetCheck.style.transform = `scale(${Math.max(0, checked).toFixed(3)})`;

  // A sign over each gate: shown while the cart is near it, and on the wide shot.
  const wide = smooth((time - beats.named + 0.3) / 0.4) * (1 - smooth((time - beats.until) / 0.4));
  signs.forEach((sign, index) => {
    const gate = gates[index];
    const near = 1 - smooth((Math.abs(cartX(time) - gate) - 3) / 2);
    const exists = smooth((time - passes[index] + 0.1) / 0.3);
    const shown = exists * Math.max(near * (1 - wide), wide) * (1 - galleryOn(time));
    const pulse = 1 + 0.12 * Math.exp(-Math.pow((time - [beats.small, beats.focused, beats.passesWord][index]) / 0.18, 2));
    const scale = Math.max(0.72, stage.pixelsPerUnit(gate, LAYOUT.lintelY, LAYOUT.gateZ) / 96) * pulse;
    pinTo(stage, sign, gate, LAYOUT.lintelY, LAYOUT.gateZ + 0.4, { opacity: shown, scale });
  });

  const crossed = backOut((time - beats.noWay) / 0.25);
  pinTo(stage, binCross, LAYOUT.bin[0], 3.4, LAYOUT.bin[1], {
    opacity: fade(time, beats.noWay - 0.02, beats.whatIf + 0.4, 0.1),
    scale: Math.max(0, crossed) * 1.1,
  });
}

/* ---------- every version, side by side ---------- */

const gallery = $("#gallery");
const SLOTS = [
  [330, 520],
  [750, 520],
  [330, 900],
  [750, 900],
];
const CARD_SCALE = 0.68;
const cardTimes = [beats.every, beats.version, beats.version + 0.3, beats.beatsWord];
const cards = SLOTS.map((_, index) => {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `<div class="card-slide"></div><div class="card-tag"><b class="bp-code">v${index + 1}</b><span class="card-bar"><i></i></span></div>`;
  gallery.appendChild(card);
  const painter = buildSlide(card.querySelector(".card-slide"));
  return { card, painter, slideHost: card.querySelector(".card-slide"), tag: card.querySelector(".card-tag"), bar: card.querySelector(".card-bar i") };
});

function drawGallery(time) {
  const leaving = smooth((time - beats.named + 0.4) / 0.3);
  const origin = stage.toScreen(cartX(time), BOARD_Y, 0);
  const originScale = stage.pixelsPerUnit(cartX(time), BOARD_Y, 0) / 96;
  cards.forEach(({ card, painter, slideHost, tag, bar }, index) => {
    const at = cardTimes[index];
    if (time < at - 0.01 || leaving >= 1) {
      card.style.opacity = "0";
      return;
    }
    const flight = spring((time - at) / 0.45);
    const [slotX, slotY] = SLOTS[index];
    const x = mix(origin.x, slotX, flight);
    const y = mix(origin.y, slotY, flight);
    const best = index === 3 && time >= beats.beatsWord + 0.1;
    const lift = best ? backOut((time - beats.beatsWord - 0.1) / 0.3) * 0.05 : 0;
    const scale = mix(originScale, CARD_SCALE, flight) * (1 + lift) * (1 - 0.3 * leaving);
    card.style.opacity = String(1 - leaving);
    card.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    slideHost.style.transform = `scale(${scale.toFixed(4)})`;
    tag.style.opacity = smooth((time - at - 0.3) / 0.2).toFixed(3);
    tag.style.transform = `translateY(${((1 - flight) * 30).toFixed(1)}px)`;
    bar.style.width = `${(READINGS[index] * 100 * smooth((time - at - 0.35) / 0.4)).toFixed(1)}%`;
    card.classList.toggle("is-best", best);
    painter.paint(index, time, 0);
  });
}

/* ---------- the master timeline ---------- */

export const timeline = gsap.timeline({ paused: true });
const closer = frameReel(timeline, beats, {
  accents: [beats.meh, beats.noWay, beats.fix, beats.simplify, beats.polished, beats.every, beats.iterative, beats.goodEnough, beats.orWord, beats.go],
  closerProps: [{ art: "antenna", on: "head" }],
  fadeOut: "#world, #figures, #labels, #boards, #gallery",
});

showLine(timeline, "#line-hook", 0.75, beats.startOver - 0.05);
showLine(timeline, "#line-pass", beats.onePass - 0.05, passes[0] + 0.15);
showLine(timeline, "#line-named", beats.iterative - 0.1, beats.until);
showLine(timeline, "#line-go", beats.go + 0.05, beats.endCard);

/* ---------- time reaches everything through one setter, which runs on any seek ---------- */

function drawFrame(time) {
  stage.applyCamera(stage.poseAt(time));
  const dim = galleryOn(time);
  if (canvas) canvas.style.opacity = String(1 - 0.85 * dim);
  drawCast(time);
  drawBoard(time);
  drawGallery(time);
  closer.draw(time);
  drawWorld(time);
}

driveFrames(timeline, beats.duration, drawFrame);
