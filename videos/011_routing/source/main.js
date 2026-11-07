// The choreography: the cast's acting, the request cards and their journeys, the pinned
// signs, and the headlines, all timed from window.REEL.beats.
import { fade, pinTo, standAt, showLine, driveFrames } from "../reel/stage.js";
import { POSES } from "../reel/cast.js";
import { frameReel } from "../reel/endcard.js";
import { backOut, clamp01, mix, smooth, spring } from "../reel/motion.js";
import { createWorld, LAYOUT, NODES } from "./world.js";
import { dress, MORE_POSES } from "./costumes.js";

const { beats } = window.REEL;
const $ = (selector) => document.querySelector(selector);

const world = createWorld(document.getElementById("world"), beats);
const { stage } = world;

/* ---------- the cast ---------- */

const figures = $("#figures");
const ai = dress(figures, {
  seed: 11,
  startExpression: "happy",
  props: [
    { art: "antenna", on: "head" },
    { art: "headset", on: "head" },
    { art: "ring", on: "head", from: beats.start[0], until: beats.ai + 0.4 },
    { art: "laugh", on: "head", from: beats.laugh, until: beats.not },
    { art: "bulb", on: "head", from: beats.first, until: beats.figures - 0.1 },
    { art: "magnifier", on: "wristR", upright: true, from: beats.figures - 0.15, until: beats.toScheduling - 0.1 },
    { art: "magnifier", on: "wristR", upright: true, from: beats.misreads - 0.45, until: beats.sends - 0.15 },
  ],
});
const callerA = dress(figures, {
  seed: 5,
  startPose: "standing",
  startExpression: "neutral",
  props: [
    { art: "phone", on: "wristR", upright: true },
    { art: "sweat", on: "head", from: beats.appointment + 0.2, until: beats.scheduling },
    { art: "hearts", on: "head", from: beats.scheduling + 0.08, until: beats.every },
  ],
});
const callerB = dress(figures, {
  seed: 19,
  startExpression: "neutral",
  props: [
    { art: "phone", on: "wristR", upright: true },
    { art: "flatCap", on: "head" },
    { art: "sweat", on: "head", from: beats.billingWord + 0.2, until: beats.billingDesk },
    { art: "hearts", on: "head", from: beats.billingDesk + 0.08, until: beats.every + 0.4 },
    { art: "scribble", on: "head", from: beats.wrong + 0.05, until: beats.please },
  ],
});
const callerC = dress(figures, {
  seed: 57,
  startPose: "standing",
  startExpression: "happy",
  props: [
    { art: "phone", on: "wristR", upright: true },
    { art: "bucketHat", on: "head" },
  ],
});
const nurse = dress(figures, {
  seed: 41,
  startExpression: "happy",
  props: [
    { art: "antenna", on: "head" },
    { art: "nurseCap", on: "head" },
    { art: "stamp", on: "wristR", upright: true },
  ],
});
const clerk = dress(figures, {
  seed: 33,
  startExpression: "happy",
  props: [
    { art: "antenna", on: "head" },
    { art: "visor", on: "head" },
    { art: "stamp", on: "wristL", upright: true },
  ],
});

const cheerPop = { duration: 0.22, ease: "back.out(2)" };

/* ---------- the AI router: answers, laughs, reads, switches, slips, and waves ---------- */

const bot = ai.figure;
bot.pose("presenting", { at: beats.ai - 0.1, duration: 0.25, ease: "back.out(2)" });
bot.say("delighted", { at: beats.ai - 0.1 });
bot.pose("standing", { at: beats.you, duration: 0.3 });
bot.say("happy", { at: beats.you });
bot.pose("pointing", { at: beats.same + 0.1, duration: 0.25 });
bot.say("determined", { at: beats.same + 0.1 });
bot.pose("shocked", { at: beats.both - 0.02, duration: 0.12, ease: "back.out(2)" });
bot.say("shocked", { at: beats.both - 0.02 });
for (let time = beats.laugh, swing = 0; time < beats.not - 0.1; time += 0.15, swing += 1) {
  bot.pose(swing % 2 ? MORE_POSES.laughB : MORE_POSES.laughA, { at: time, duration: 0.12, ease: "sine.inOut" });
}
bot.say("delighted", { at: beats.laugh });
bot.pose("shrugging", { at: beats.not, duration: 0.2, ease: "back.out(2)" });
bot.pose("pointing_up", { at: beats.first, duration: 0.22, ease: "back.out(2)" });
bot.say("determined", { at: beats.first });
bot.pose(MORE_POSES.scan, { at: beats.figures - 0.15, duration: 0.25 });
bot.say("thinking", { at: beats.figures - 0.15 });
bot.say("happy", { at: beats.tagA });
bot.say("delighted", { at: beats.tagB });
bot.pose("pointing", { at: beats.toScheduling - 0.1, duration: 0.2, ease: "back.out(2)" });
bot.say("determined", { at: beats.toScheduling - 0.1 });
bot.pose("standing", { at: beats.scheduling + 0.2, duration: 0.3 });
bot.say("happy", { at: beats.scheduling + 0.2 });
bot.pose("pointing", { at: beats.toBilling - 0.1, duration: 0.2, ease: "back.out(2)" });
bot.say("determined", { at: beats.toBilling - 0.1 });
bot.pose("standing", { at: beats.billingDesk + 0.2, duration: 0.3 });
bot.say("happy", { at: beats.billingDesk + 0.2 });
// The flurry: the AI works the switch for every card.
beats.flips
  .filter((flip) => flip.t > beats.every - 0.4 && flip.t < beats.road)
  .forEach((flip, index) => bot.pose(index % 2 ? POSES.work : POSES.workAlt, { at: flip.t - 0.04, duration: 0.1, ease: "sine.inOut" }));
bot.say("determined", { at: beats.every - 0.3 });
bot.pose("cheering", { at: beats.road, ...cheerPop });
bot.say("delighted", { at: beats.road });
bot.pose("presenting", { at: beats.rights[0] - 0.1, duration: 0.3 });
bot.say("happy", { at: beats.rights[0] - 0.1 });
bot.pose("pointing", { at: beats.rights[1] - 0.25, duration: 0.2, ease: "back.out(2)" });
bot.pose("cheering", { at: beats.rights[2] + 0.1, ...cheerPop });
bot.say("delighted", { at: beats.rights[2] + 0.1 });
bot.pose("standing", { at: beats.remember, duration: 0.3 });
bot.say("happy", { at: beats.remember });
bot.pose(MORE_POSES.scan, { at: beats.misreads - 0.45, duration: 0.25 });
bot.say("thinking", { at: beats.misreads - 0.45 });
bot.say("happy", { at: beats.misreads + 0.1 });
bot.pose("pointing", { at: beats.sends - 0.25, duration: 0.2, ease: "back.out(2)" });
bot.say("determined", { at: beats.sends - 0.25 });
bot.pose("shocked", { at: beats.wrong + 0.05, duration: 0.14, ease: "back.out(2)" });
bot.say("shocked", { at: beats.wrong + 0.05 });
bot.pose("shrugging", { at: beats.path + 0.1, duration: 0.25 });
bot.say("sad", { at: beats.path + 0.1 });
bot.pose(MORE_POSES.waveIn, { at: beats.next - 0.1, duration: 0.15 });
bot.pose(MORE_POSES.waveOut, { at: beats.next + 0.15, duration: 0.15 });
bot.pose(MORE_POSES.waveIn, { at: beats.next + 0.4, duration: 0.15 });
bot.say("delighted", { at: beats.next - 0.1 });
bot.pose("cheering", { at: beats.please, ...cheerPop });

/* ---------- the callers: waiting, jammed, served, and (once) misrouted ---------- */

function caller(figure, { appear, ask, served, cheerUntil }) {
  figure.pose(MORE_POSES.onPhone, { at: appear - 0.05, duration: 0.2 });
  figure.say("neutral", { at: appear });
  figure.pose(MORE_POSES.phoneFret, { at: ask, duration: 0.25 });
  figure.say("confused", { at: ask });
  figure.pose("shocked", { at: beats.both - 0.02, duration: 0.12, ease: "back.out(2)" });
  figure.say("shocked", { at: beats.both - 0.02 });
  figure.pose(MORE_POSES.phoneFret, { at: beats.not + 0.15, duration: 0.25 });
  figure.say("sad", { at: beats.not + 0.15 });
  figure.say("confused", { at: beats.first + 0.4 });
  figure.pose(MORE_POSES.phoneCheer, { at: served, ...cheerPop });
  figure.say("delighted", { at: served });
  figure.pose(MORE_POSES.onPhone, { at: cheerUntil, duration: 0.3 });
  figure.say("happy", { at: cheerUntil });
}
caller(callerA.figure, { appear: beats.you, ask: beats.appointment, served: beats.scheduling, cheerUntil: beats.every });
caller(callerB.figure, { appear: beats.someone, ask: beats.billingWord, served: beats.billingDesk, cheerUntil: beats.every + 0.3 });
// Caller B calls again, and this time the request is misread.
const b = callerB.figure;
b.pose(MORE_POSES.onPhone, { at: beats.remember, duration: 0.2 });
b.say("neutral", { at: beats.remember });
b.say("confused", { at: beats.misreads + 0.1 });
b.pose(MORE_POSES.phoneAngry, { at: beats.wrong + 0.05, duration: 0.18, ease: "back.out(2)" });
b.say("sad", { at: beats.wrong + 0.05 });
b.pose(MORE_POSES.phoneCheer, { at: beats.please + 0.05, ...cheerPop });
b.say("delighted", { at: beats.please + 0.05 });
callerA.figure.pose(MORE_POSES.phoneCheer, { at: beats.please, ...cheerPop });
callerA.figure.say("delighted", { at: beats.please });
callerC.figure.pose(MORE_POSES.onPhone, { at: beats.next, duration: 0.2 });
callerC.figure.pose(MORE_POSES.phoneCheer, { at: beats.please, ...cheerPop });
callerC.figure.say("delighted", { at: beats.please });

/* ---------- the specialists: stamp the right requests, puzzle over the wrong one ---------- */

function specialist(figure, side, flip) {
  const mine = beats.cards.filter((card) => card.path.some(([node]) => node === `desk${side}`));
  for (const card of mine) {
    const quick = card.small ? 0.12 : 0.28;
    figure.pose(POSES.stampUp, { at: card.stamp - quick - 0.1, duration: quick, flip });
    figure.say("determined", { at: card.stamp - quick - 0.1 });
    if (card.badge === "cross") continue;
    figure.pose(POSES.stampDown, { at: card.stamp - 0.06, duration: 0.08, ease: "power3.in", flip });
    figure.say("happy", { at: card.stamp });
    if (!card.small) {
      figure.pose("cheering", { at: card.stamp + 0.25, ...cheerPop, flip });
      figure.say("delighted", { at: card.stamp + 0.25 });
      figure.pose("standing", { at: card.stamp + 0.9, duration: 0.3, flip });
    } else {
      figure.pose("standing", { at: card.stamp + 0.16, duration: 0.1, flip });
    }
  }
  figure.pose("cheering", { at: beats.please + 0.05, ...cheerPop, flip });
  figure.say("delighted", { at: beats.please + 0.05 });
}
specialist(nurse.figure, "L", false);
specialist(clerk.figure, "R", true);
// The nurse gets a billing question: puzzled, then a shrug.
nurse.figure.pose("thinking", { at: beats.wrong + 0.05, duration: 0.2 });
nurse.figure.say("confused", { at: beats.wrong + 0.05 });
nurse.figure.pose("shrugging", { at: beats.path, duration: 0.2, ease: "back.out(2)" });
nurse.figure.say("confused", { at: beats.path });
clerk.figure.pose("cheering", { at: beats.road, ...cheerPop, flip: true });
clerk.figure.say("delighted", { at: beats.road });
clerk.figure.pose("standing", { at: beats.routing + 0.4, duration: 0.3, flip: true });

/* ---------- where everyone stands ---------- */

function drawCast(time) {
  standAt(stage, ai, time >= 0.3, LAYOUT.ai[0], LAYOUT.ai[1], 0.3, time);
  standAt(stage, callerA, time >= beats.you - 0.05, LAYOUT.callerA[0], LAYOUT.callerA[1], beats.you - 0.05, time);
  standAt(stage, callerB, time >= beats.someone - 0.05, LAYOUT.callerB[0], LAYOUT.callerB[1], beats.someone - 0.05, time);
  standAt(stage, callerC, time >= beats.next - 0.05, LAYOUT.callerC[0], LAYOUT.callerC[1], beats.next - 0.05, time);
  standAt(stage, nurse, time >= beats.first + 0.5, LAYOUT.nurse[0], LAYOUT.nurse[1], beats.first + 0.5, time);
  standAt(stage, clerk, time >= beats.first + 0.65, LAYOUT.clerk[0], LAYOUT.clerk[1], beats.first + 0.65, time);
}

/* ---------- the request cards ---------- */

const EASES = { s: smooth, l: (alpha) => clamp01(alpha), o: spring, b: backOut };
const ICONS = { appt: "#i-calendar", bill: "#i-receipt" };
const labels = $("#labels");

const cards = beats.cards.map((card) => {
  const element = document.createElement("div");
  element.className = `card ${card.kind}${card.small ? " small" : ""}`;
  element.innerHTML =
    `<svg class="icon"><use href="${ICONS[card.kind]}" /></svg>` +
    (card.tag ? `<div class="tag bp-caption">${card.tag}</div>` : "") +
    (card.badge ? `<svg class="badge ${card.badge}"><use href="#i-badge-${card.badge}" /></svg>` : "");
  labels.appendChild(element);
  return { ...card, element, tag: element.querySelector(".tag"), badge: element.querySelector(".badge") };
});

function cardPoint(card, time) {
  const path = card.path;
  if (time <= path[0][1]) return NODES[path[0][0]];
  for (let index = 1; index < path.length; index += 1) {
    const [node, at, ease] = path[index];
    if (time < at) {
      const [fromNode, fromAt] = path[index - 1];
      const amount = EASES[ease]((time - fromAt) / Math.max(0.01, at - fromAt));
      const from = NODES[fromNode];
      const to = NODES[node];
      return [0, 1, 2].map((axis) => mix(from[axis], to[axis], amount));
    }
  }
  return NODES[path[path.length - 1][0]];
}

function drawCards(time) {
  for (const card of cards) {
    const shown = time >= card.from - 0.01 && time < card.until;
    if (!shown) {
      card.element.style.opacity = "0";
      continue;
    }
    const [x, y, z] = cardPoint(card, time);
    let jitter = 0;
    if (card.jam) jitter = fade(time, card.jam[0], card.jam[1], 0.06) * Math.sin(time * 61 + (card.kind === "bill" ? 1.7 : 0));
    // Handled requests are filed away; the misrouted one stays on the wrong desk.
    const filedAt = card.badge === "cross" ? Infinity : card.stamp + (card.small ? 0.16 : 1.0);
    const filed = smooth((time - filedAt) / 0.22);
    const grow = backOut((time - card.from) / 0.28);
    const pulse = card.glow ? Math.exp(-Math.pow((time - card.glow) / 0.22, 2)) * 0.28 : 0;
    const size = Math.max(card.small ? 0.5 : 0.78, stage.pixelsPerUnit(x, y, z) / 64) * (card.small ? 0.78 : 1);
    pinTo(stage, card.element, x + jitter * 0.1, y, z, {
      opacity: 1 - filed,
      scale: Math.max(0.0001, size * grow * (1 - filed * 0.6) * (1 + pulse)),
    });
    card.element.style.rotate = `${(jitter * 7).toFixed(2)}deg`;
    if (card.tag) {
      const tagIn = backOut((time - card.tagAt) / 0.25);
      card.tag.style.opacity = time >= card.tagAt ? "1" : "0";
      card.tag.style.transform = `translateX(-50%) scale(${Math.max(0.0001, tagIn).toFixed(3)})`;
      card.tag.classList.toggle("wrong", Boolean(card.wrongTag) && time >= beats.wrong);
    }
    if (card.badge) {
      const badgeIn = backOut((time - card.stamp) / 0.25);
      card.badge.style.opacity = time >= card.stamp ? "1" : "0";
      card.badge.style.transform = `scale(${Math.max(0.0001, badgeIn).toFixed(3)})`;
    }
  }
}

/* ---------- signs and marks pinned to the world ---------- */

const signs = [
  { element: $("#sign-scheduling"), x: LAYOUT.deskL[0], z: LAYOUT.deskL[1] - 1.5, at: beats.first + 0.55 },
  { element: $("#sign-billing"), x: LAYOUT.deskR[0], z: LAYOUT.deskR[1] - 1.5, at: beats.first + 0.7 },
];
function drawMarks(time) {
  for (const sign of signs) {
    const scale = Math.max(0.8, stage.pixelsPerUnit(sign.x, 5.0, sign.z) / 70) * backOut((time - sign.at) / 0.3);
    pinTo(stage, sign.element, sign.x, 5.0, sign.z, { opacity: time >= sign.at ? 1 : 0, scale: Math.max(0.0001, scale) });
  }
  const reject = $("#reject");
  pinTo(stage, reject, NODES.slot[0], 3.2, NODES.slot[2], {
    opacity: fade(time, beats.not - 0.02, beats.first - 0.05, 0.1),
    scale: Math.max(0.0001, backOut((time - beats.not) / 0.25) * 1.15),
  });
}

/* ---------- the master timeline ---------- */

export const timeline = gsap.timeline({ paused: true });
const closer = frameReel(timeline, beats, {
  accents: [beats.ai, beats.appointment, beats.billingWord, beats.both, beats.not, beats.first, beats.scheduling, beats.billingDesk, beats.road, beats.routing, ...beats.rights, beats.misreads, beats.wrong, beats.please],
  closerProps: [{ art: "headphones", on: "head" }],
});

showLine(timeline, "#line-hook", beats.start[0], beats.you - 0.1);
showLine(timeline, "#line-same", beats.same - 0.05, beats.first - 0.1);
showLine(timeline, "#line-named", beats.routing - 0.35, beats.rights[0] - 0.12);
showLine(timeline, "#line-wrong", beats.wrong - 0.05, beats.next - 0.1);
showLine(timeline, "#line-next", beats.next - 0.05, beats.endCard);
// "Right request, right workflow, right specialist": one row on each word.
timeline.fromTo("#rights", { opacity: 0 }, { opacity: 1, duration: 0.15 }, beats.rights[0] - 0.3);
beats.rights.forEach((at, index) => {
  timeline.fromTo(`#right-${index}`, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.3, ease: "back.out(2)" }, at - 0.12);
});
timeline.to("#rights", { opacity: 0, y: -20, duration: 0.2, ease: "power2.in" }, beats.remember - 0.2);

function drawFrame(time) {
  stage.applyCamera(stage.poseAt(time));
  drawCast(time);
  drawCards(time);
  drawMarks(time);
  closer.draw(time);
  world.draw(time);
}
driveFrames(timeline, beats.duration, drawFrame);
