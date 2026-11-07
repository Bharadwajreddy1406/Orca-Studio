// The choreography: the planner, the AI and three worker bots acting every beat, the labels and
// output cards pinned to the tree, the level badges and the overhead gauge, all timed from
// window.REEL.beats.
import { driveFrames, fade, pinTo, showLine } from "../reel/stage.js";
import { POSES } from "../reel/cast.js";
import { frameReel } from "../reel/endcard.js";
import { backOut, clamp01, smooth } from "../reel/motion.js";
import { createWorld, LAYOUT, WORKER_OFFSET } from "./world.js";
import { createCostumed, wearLocal } from "./costumes.js";

const { beats } = window.REEL;
const { levelTwo, levelThree, levels } = beats;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const world = createWorld(document.getElementById("world"), beats);
const { stage } = world;

/* ---------- the cast ---------- */

const svg = $("#figures");
const planner = createCostumed(svg, {
  seed: 7,
  startExpression: "happy",
  props: [
    { art: "planCard", on: "wristL", upright: true, until: beats.party },
    { art: "sigh", on: "head", from: beats.where - 0.5, until: beats.begin + 0.2 },
    { art: "sweat", on: "head", from: beats.where - 0.2, until: beats.ai },
    { art: "sweat", on: "head", from: beats.managing - 0.1, until: beats.party },
    { art: "dizzy", on: "head", from: beats.managing + 0.1, until: beats.party - 0.05 },
    { art: "partyHat", on: "head", from: beats.party },
  ],
});
const ai = createCostumed(svg, {
  seed: 11,
  startExpression: "delighted",
  props: [
    { art: "antenna", on: "head" },
    { art: "bulb", on: "head", from: beats.ai - 0.05, until: beats.splits + 0.5 },
    { art: "dizzy", on: "head", from: beats.managing + 0.2, until: beats.party - 0.05 },
    { art: "partyHat", on: "head", from: beats.party + 0.05 },
  ],
});
const WORKER_PROPS = [
  [{ art: "chefHat", on: "head" }, { art: "planCard", on: "wristR", upright: true }],
  [{ art: "clipboard", on: "wristL", upright: true }],
  [{ art: "basket", on: "wristR", upright: true }],
];
const workers = WORKER_PROPS.map((costume, index) =>
  createCostumed(svg, {
    seed: 31 + index * 10,
    startExpression: "determined",
    props: [{ art: "antenna", on: "head" }, ...costume, { art: "partyHat", on: "head", from: beats.party + 0.08 * index }],
  }),
);

/* ---------- the planner: thrilled, then sighing, then rescued, then buried ---------- */

const plan = planner.figure;
plan.pose("cheering", { at: beats.planning - 0.05, duration: 0.25, ease: "back.out(2)" });
plan.say("delighted", { at: beats.planning - 0.05 });
plan.pose(POSES.showPlan, { at: beats.partyWord - 0.1, duration: 0.25, ease: "back.out(2)" });
plan.pose(POSES.slump, { at: beats.where - 0.5, duration: 0.45, ease: "power2.inOut" });
plan.say("sad", { at: beats.where - 0.5 });
plan.pose(POSES.lookOut, { at: beats.begin - 0.15, duration: 0.3 });
plan.say("confused", { at: beats.begin - 0.15 });
plan.pose("shocked", { at: beats.huge - 0.05, duration: 0.15, ease: "back.out(2)" });
plan.say("shocked", { at: beats.huge - 0.05 });
plan.pose(POSES.slump, { at: beats.task + 0.2, duration: 0.4, ease: "power2.inOut" });
plan.say("sad", { at: beats.task + 0.2 });
plan.pose("standing", { at: beats.ai, duration: 0.25 });
plan.say("happy", { at: beats.ai });
plan.pose("shocked", { at: beats.splits, duration: 0.12, ease: "back.out(2)" });
plan.say("shocked", { at: beats.splits });
plan.pose("cheering", { at: beats.three, duration: 0.22, ease: "back.out(2)" });
plan.say("delighted", { at: beats.three });
plan.pose("presenting", { at: levelTwo[0], duration: 0.25 });
plan.say("happy", { at: levelTwo[0] });
plan.pose("thinking", { at: beats.stop - 0.2, duration: 0.3 });
plan.say("thinking", { at: beats.stop - 0.2 });
plan.pose("pointing_up", { at: levels[0], duration: 0.22, ease: "back.out(2)" });
plan.say("delighted", { at: levels[0] });
plan.pose("cheering", { at: beats.named, duration: 0.22, ease: "back.out(2)" });
plan.pose("standing", { at: beats.remember, duration: 0.3 });
plan.say("happy", { at: beats.remember });
plan.pose("shocked", { at: beats.tooFar, duration: 0.15, ease: "back.out(2)" });
plan.say("shocked", { at: beats.tooFar });
plan.pose(POSES.strain(1), { at: beats.managing - 0.1, duration: 0.3, ease: "back.out(2)" });
plan.say("confused", { at: beats.managing - 0.1 });
plan.pose(POSES.strain(3), { at: beats.more, duration: 0.4, ease: "power2.in" });
plan.say("sad", { at: beats.more });
plan.pose("cheering", { at: beats.party - 0.05, duration: 0.22, ease: "back.out(2)" });
plan.say("delighted", { at: beats.party - 0.05 });

/* ---------- the AI: the idea, the split, and the warning ---------- */

const bot = ai.figure;
bot.pose("pointing_up", { at: beats.ai, duration: 0.22, ease: "back.out(2)" });
bot.pose(POSES.dispatch, { at: beats.splits, duration: 0.22, ease: "back.out(2)" });
bot.say("determined", { at: beats.splits });
levelTwo.forEach((landed, index) => {
  bot.pose(index % 2 ? "presenting" : "pointing", { at: landed - 0.1, duration: 0.2, ease: "back.out(2)" });
});
bot.say("happy", { at: levelTwo[0] });
bot.pose("pointing_up", { at: beats.stop - 0.15, duration: 0.2, ease: "back.out(2)" });
bot.say("determined", { at: beats.stop - 0.15 });
bot.pose(POSES.dispatch, { at: beats.foodSplits, duration: 0.22, ease: "back.out(2)" });
bot.pose("presenting", { at: levels[0], duration: 0.3 });
bot.say("happy", { at: levels[0] });
bot.pose("cheering", { at: beats.named, duration: 0.22, ease: "back.out(2)" });
bot.say("delighted", { at: beats.named });
bot.pose("thinking", { at: beats.remember, duration: 0.3 });
bot.say("thinking", { at: beats.remember });
bot.pose("shocked", { at: beats.tooFar + 0.1, duration: 0.15, ease: "back.out(2)" });
bot.say("shocked", { at: beats.tooFar + 0.1 });
bot.pose("shrugging", { at: beats.managing + 0.1, duration: 0.2 });
bot.say("confused", { at: beats.managing + 0.1 });
bot.pose("cheering", { at: beats.party, duration: 0.22, ease: "back.out(2)" });
bot.say("delighted", { at: beats.party });

/* ---------- the workers: one tiny job each, planned, checked, then swamped ---------- */

workers.forEach(({ figure }, index) => {
  const arrive = levelThree[index];
  figure.pose("cheering", { at: arrive, duration: 0.2, ease: "back.out(2)" });
  figure.say("delighted", { at: arrive });
  figure.pose(POSES.work, { at: arrive + 0.5, duration: 0.25 });
  figure.say("determined", { at: arrive + 0.5 });
  for (let time = beats.pieces + 0.2, stroke = index; time < beats.check - 0.1; time += 0.22, stroke += 1) {
    figure.pose(stroke % 2 ? POSES.writeUp : POSES.writeDown, { at: time, duration: 0.18, ease: "sine.inOut" });
  }
  const ticked = beats.check + index * 0.12;
  figure.pose("cheering", { at: ticked, duration: 0.2, ease: "back.out(2)" });
  figure.say("delighted", { at: ticked });
  figure.pose("standing", { at: beats.remember, duration: 0.3 });
  figure.say("happy", { at: beats.remember });
  figure.pose("shocked", { at: beats.tooFar + 0.1 + index * 0.08, duration: 0.15, ease: "back.out(2)" });
  figure.say("shocked", { at: beats.tooFar + 0.1 + index * 0.08 });
  figure.pose("shrugging", { at: beats.managing + index * 0.1, duration: 0.2 });
  figure.say("confused", { at: beats.managing + index * 0.1 });
  figure.pose("cheering", { at: beats.party + 0.05 * index, duration: 0.22, ease: "back.out(2)" });
  figure.say("delighted", { at: beats.party + 0.05 * index });
});

/* ---------- where everyone stands ---------- */

const PLANNER_SPOT = [LAYOUT.root[0] - 4.3, LAYOUT.root[1] + 3.7];
const AI_SPOT = [LAYOUT.root[0] + 4.3, LAYOUT.root[1] + 3.7];

/** Stand a member at world (x, y, z): y is the surface, so workers can stand on their plinths. */
function standOn(member, visible, x, y, z, appearAt, time, units = 5) {
  member.group.style.display = visible ? "" : "none";
  if (!visible) return;
  member.draw(time);
  const feet = stage.toScreen(x, y, z);
  const wide = 1 + 0.5 * clamp01((stage.poseAt(time).dist - 60) / 70);
  const size = (stage.pixelsPerUnit(x, y, z) * units * backOut((time - appearAt) / 0.3) * wide) / 100;
  member.group.setAttribute(
    "transform",
    `translate(${feet.x.toFixed(2)} ${feet.y.toFixed(2)}) scale(${Math.max(size, 0.0001).toFixed(4)})`,
  );
}

function drawCast(time) {
  // On the widest shots the planner and the AI are drawn a little larger, so their faces still read.
  const lead = 5 * (1 + 0.4 * clamp01((stage.poseAt(time).dist - 120) / 50));
  standOn(planner, time >= 0.35, PLANNER_SPOT[0], 0, PLANNER_SPOT[1], 0.35, time, lead);
  standOn(ai, time >= beats.ai - 0.1, AI_SPOT[0], 0, AI_SPOT[1], beats.ai - 0.1, time, lead);
  workers.forEach((worker, index) => {
    const [x, z] = LAYOUT.levelThree[index];
    const appear = levelThree[index] + 0.08;
    standOn(worker, time >= appear, x + WORKER_OFFSET[index], world.sizes.THREE.h, z + 0.2, appear, time, 3.6);
  });
}

/* ---------- labels, cards, ticks and level badges pinned to the tree ---------- */

const rootLabel = $("#label-root");
const twoLabels = $$(".level-two");
const cards = $$(".card");
const ticks = $$(".tick");
const badges = $$(".badge");
const levelWords = $$(".level-word");

function drawLabels(time) {
  const [rootX, rootZ] = LAYOUT.root;
  const boxScale = world.boxScaleAt(time);
  pinTo(stage, rootLabel, rootX, world.boxHeight * boxScale * 0.68, rootZ + (world.boxDepth * boxScale) / 2 + 0.05, {
    opacity: fade(time, 0.6, beats.endCard + 1, 0.25),
    scale: Math.max(0.62, stage.pixelsPerUnit(rootX, 1.8, rootZ) / 96) * boxScale * backOut((time - 0.6) / 0.35),
  });

  LAYOUT.levelTwo.forEach(([x, z], index) => {
    const size = Math.max(0.68, stage.pixelsPerUnit(x, 0.6, z) / 64);
    pinTo(stage, twoLabels[index], x, world.sizes.TWO.h + 0.05, z + 0.2, {
      opacity: fade(time, levelTwo[index] + 0.05, beats.endCard + 1, 0.15),
      scale: size * backOut((time - levelTwo[index] - 0.05) / 0.3),
    });
  });

  // Each output card hangs on the front of its plinth: while it is made, then while it is checked.
  LAYOUT.levelThree.forEach(([x, z], index) => {
    const front = z + world.sizes.THREE.d / 2 + 0.1;
    const shown = Math.max(fade(time, levelThree[index] + 0.1, levels[0] - 0.2, 0.2), fade(time, beats.pieces + 0.1, beats.named - 0.2, 0.2));
    const appear = time < levels[0] ? backOut((time - levelThree[index] - 0.1) / 0.3) : 1;
    // On "plan", every card gives a little hop: the plan is written.
    const hop = 1 + 0.08 * Math.exp(-Math.pow((time - beats.plan) / 0.15, 2));
    const size = (stage.pixelsPerUnit(x, 0.5, front) / 64) * appear * hop;
    pinTo(stage, cards[index], x, 1.0, front, { opacity: shown, scale: size });
    // The tick lands on the card's top-right corner on "check", one after another.
    const ticked = beats.check + index * 0.12;
    const corner = stage.toScreen(x, 1.0, front);
    const tickSize = size * backOut((time - ticked) / 0.25);
    ticks[index].style.opacity = String(time >= ticked ? shown : 0);
    ticks[index].style.transform = `translate(${(corner.x + 178 * size).toFixed(2)}px, ${(corner.y + 8 * size).toFixed(2)}px) scale(${Math.max(0.0001, tickSize).toFixed(3)})`;
  });

  // Level badges: one per row, from the pull back to the name.
  const rows = [
    [LAYOUT.root[0] - 7.2, LAYOUT.root[1]],
    [LAYOUT.levelTwo[0][0] - 3.1, LAYOUT.levelTwo[0][1]],
    [LAYOUT.levelThree[0][0] - 2.7, LAYOUT.levelThree[0][1]],
  ];
  rows.forEach(([x, z], index) => {
    const at = levels[index] - 0.05;
    badges[index].classList.toggle("hot", Math.abs(time - levels[index] - 0.2) < 0.45);
    pinTo(stage, badges[index], x, 0.2, z, {
      opacity: fade(time, at, beats.pieces - 0.2, 0.12),
      scale: Math.max(0.7, stage.pixelsPerUnit(x, 0, z) / 50) * backOut((time - at) / 0.3),
    });
  });
  levelWords.forEach((word, index) => {
    word.style.opacity = String(smooth((time - levels[index] + 0.08) / 0.15));
  });
}

/* ---------- the gauge: managing grows, doing barely moves ---------- */

const gauge = $("#gauge");
const managingBar = $("#meter-managing i");
const doingBar = $("#meter-doing i");
function drawGauge(time) {
  const shown = fade(time, beats.managing - 0.15, beats.party - 0.15, 0.2);
  gauge.style.opacity = String(shown);
  gauge.style.transform = `translateY(${((1 - shown) * 24).toFixed(1)}px)`;
  managingBar.style.width = `${(100 * smooth((time - beats.managing) / (beats.more - beats.managing + 0.3))).toFixed(1)}%`;
  doingBar.style.width = `${(14 * smooth((time - beats.doing + 0.1) / 0.4)).toFixed(1)}%`;
}

/* ---------- the master timeline ---------- */

export const timeline = gsap.timeline({ paused: true });
const closerProps = [{ art: "planCard", on: "wristL", upright: true }, { art: "partyHat", on: "head" }];
const closer = wearLocal(
  frameReel(timeline, beats, {
    accents: [beats.partyWord, beats.huge, beats.splits, ...levelTwo, beats.foodSplits, ...levelThree, ...levels, beats.check, beats.named, beats.tooFar, beats.managing, beats.party],
    closerProps,
  }),
  closerProps,
);

showLine(timeline, "#line-hook", beats.where - 0.05, beats.huge - 0.3);
showLine(timeline, "#line-levels", levels[0] - 0.1, beats.pieces - 0.05);
showLine(timeline, "#line-named", beats.named - 0.1, beats.remember - 0.05);
showLine(timeline, "#line-party", beats.party - 0.1, beats.endCard);

/* ---------- time reaches everything through one setter, which runs on any seek ---------- */

driveFrames(timeline, beats.duration, (time) => {
  stage.applyCamera(stage.poseAt(time));
  drawCast(time);
  drawLabels(time);
  drawGauge(time);
  closer.draw(time);
  world.draw(time);
});
