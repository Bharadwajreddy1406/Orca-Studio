// The choreography: the cast's acting, the timing bar, the cards and the pinned labels,
// all timed from window.REEL.beats.
import { createWorld, LAYOUT } from "./world.js";
import { createMember, POSES } from "./cast.js";
import { backOut, clamp01, mix, smooth } from "./motion.js";

const { beats } = window.REEL;
const { start, lane, done, replayDone, taskPixels } = beats;
const world = createWorld(document.getElementById("world"), beats);
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const FIGURE_UNITS = 5;

/* ---------- the cast ---------- */

const stage = $("#figures");
const antenna = { art: "antenna", on: "head" };
const traveler = createMember(stage, {
  seed: 7,
  startPose: "cheering",
  startExpression: "delighted",
  props: [
    { art: "backpack", on: "shoulder", upright: true },
    { art: "bucketHat", on: "head" },
    { art: "sweat", on: "head", from: beats.idea + 0.2, until: beats.ai },
    { art: "sigh", on: "head", from: beats.idea - 0.15, until: beats.idea + 1.1 },
    { art: "sweat", on: "head", from: beats.seqWords[2], until: beats.simultaneously },
    { art: "sunglasses", on: "head", from: beats.again + 0.25 },
    { art: "planCard", on: "wristR", upright: true, from: beats.again + 0.5 },
    { art: "hearts", on: "head", from: beats.again + 0.6 },
  ],
});
const ai = createMember(stage, {
  seed: 11,
  startExpression: "happy",
  props: [
    antenna,
    { art: "planCard", on: "wristR", upright: true, from: beats.ai + 1.0, until: beats.behind },
    { art: "bulb", on: "head", from: beats.simultaneously - 0.05, until: beats.behind + 0.3 },
    { art: "planCard", on: "wristR", upright: true, from: beats.planReady, until: beats.named + 0.5 },
  ],
});
const pilot = createMember(stage, {
  seed: 19,
  startExpression: "determined",
  props: [antenna, { art: "pilotCap", on: "head" }, { art: "paperPlane", on: "wristR", upright: true, scale: 1.2 }],
});
const bellhop = createMember(stage, {
  seed: 29,
  startExpression: "determined",
  props: [
    antenna,
    { art: "bellhopCap", on: "head" },
    { art: "suitcase", on: "wristL", upright: true, scale: 1.15 },
    { art: "hourglass", on: "head", from: beats.depend + 0.15, until: replayDone[0] },
  ],
});
const explorer = createMember(stage, {
  seed: 41,
  startExpression: "determined",
  props: [antenna, { art: "safariHat", on: "head" }, { art: "binoculars", on: "wristR", upright: true }],
});
const workers = [pilot, bellhop, explorer];

/* ---------- the traveler: excited, overwhelmed, bored, delighted, relaxed ---------- */

const trip = traveler.figure;
trip.say("delighted", { at: beats.goa });
trip.pose(POSES.slump, { at: beats.idea - 0.1, duration: 0.5, ease: "power2.inOut" });
trip.say("sad", { at: beats.idea - 0.1 });
trip.pose("thinking", { at: beats.taskWords[0] - 0.05, duration: 0.3 });
trip.say("confused", { at: beats.taskWords[0] });
trip.pose("shocked", { at: beats.taskWords[2] - 0.05, duration: 0.14, ease: "back.out(2)" });
trip.say("shocked", { at: beats.taskWords[2] });
trip.pose(POSES.slump, { at: beats.taskWords[2] + 0.9, duration: 0.4 });
trip.say("sad", { at: beats.taskWords[2] + 0.9 });
trip.pose("standing", { at: beats.ai - 0.15, duration: 0.25 });
trip.say("happy", { at: beats.ai });
trip.pose(POSES.handOver, { at: beats.ai + 0.35, duration: 0.3 });
trip.say("delighted", { at: beats.ai + 0.35 });
trip.pose(POSES.crossed, { at: beats.seqWords[0] - 0.2, duration: 0.3 });
trip.say("neutral", { at: beats.seqWords[0] });
// Foot tapping while the tasks crawl by, one after another.
for (let time = beats.seqWords[0] + 0.3, tap = 0; time < beats.simultaneously - 0.25; time += 0.25, tap += 1) {
  trip.pose(tap % 2 ? POSES.crossed : POSES.tapUp, { at: time, duration: 0.12, ease: "power2.out" });
}
trip.say("determined", { at: beats.seqWords[1] });
trip.say("sad", { at: beats.seqWords[2] });
trip.pose("shocked", { at: beats.simultaneously - 0.05, duration: 0.14, ease: "back.out(2)" });
trip.say("shocked", { at: beats.simultaneously - 0.05 });
trip.pose("cheering", { at: beats.simultaneously + 0.45, duration: 0.25, ease: "back.out(2)" });
trip.say("delighted", { at: beats.simultaneously + 0.45 });
trip.pose(POSES.showPlan, { at: beats.again, duration: 0.45, ease: "back.out(1.4)" });
trip.say("delighted", { at: beats.again });

/* ---------- the AI: eager, then struggling one task at a time, then the idea ---------- */

const bot = ai.figure;
bot.pose("presenting", { at: beats.ai, duration: 0.3, ease: "back.out(1.8)" });
bot.say("delighted", { at: beats.ai });
for (let time = beats.seqWords[0], swing = 0; time < beats.simultaneously - 0.1; time += 0.36, swing += 1) {
  bot.pose(swing % 2 ? POSES.work : POSES.workAlt, { at: time, duration: 0.3, ease: "sine.inOut" });
}
bot.say("determined", { at: beats.seqWords[0] });
bot.say("confused", { at: beats.seqWords[2] });
bot.pose("pointing_up", { at: beats.simultaneously, duration: 0.2, ease: "back.out(2)" });
bot.say("delighted", { at: beats.simultaneously });
bot.pose(POSES.dispatch, { at: beats.fanOut - 0.15, duration: 0.25, ease: "back.out(2)" });
bot.say("delighted", { at: beats.fanOut - 0.15 });
bot.pose("presenting", { at: beats.independent, duration: 0.3 });
bot.say("happy", { at: beats.independent });
bot.pose("cheering", { at: beats.planReady, duration: 0.25, ease: "back.out(2)" });
bot.say("delighted", { at: beats.planReady });
bot.pose("standing", { at: beats.named + 0.6, duration: 0.3 });
bot.pose("thinking", { at: beats.remember, duration: 0.3 });
bot.say("thinking", { at: beats.remember });
bot.pose("cheering", { at: beats.again + 0.2, duration: 0.25, ease: "back.out(2)" });
bot.say("delighted", { at: beats.again + 0.2 });

/* ---------- the three workers: they start together and each finishes on its own ---------- */

const WORK_POSES = [
  [POSES.work, POSES.workAlt],
  [POSES.work, POSES.workAlt],
  [POSES.lookOut, "standing"],
];
function workLoop(figure, index, from, until) {
  for (let time = from, swing = 0; time < until - 0.1; time += 0.34, swing += 1) {
    figure.pose(WORK_POSES[index][swing % 2], { at: time, duration: 0.28, ease: "sine.inOut" });
  }
}
workers.forEach((member, index) => {
  const figure = member.figure;
  figure.pose("standing", { at: 0 });
  figure.say("determined", { at: beats.workStart });
  workLoop(figure, index, beats.workStart, done[index]);
  figure.pose("cheering", { at: done[index], duration: 0.22, ease: "back.out(2)" });
  figure.say("delighted", { at: done[index] });
  figure.pose("presenting", { at: beats.together, duration: 0.3 });
  figure.pose("cheering", { at: beats.named, duration: 0.22, ease: "back.out(2)" });
  figure.pose("standing", { at: beats.named + 0.9, duration: 0.3 });
  figure.say("happy", { at: beats.named + 0.9 });
});
// The counter-example: hotels cannot start until the flight is known.
pilot.figure.say("determined", { at: beats.depend });
workLoop(pilot.figure, 0, beats.depend, replayDone[0]);
pilot.figure.pose("cheering", { at: replayDone[0], duration: 0.2, ease: "back.out(2)" });
explorer.figure.say("determined", { at: beats.depend });
workLoop(explorer.figure, 2, beats.depend, replayDone[2]);
explorer.figure.pose("standing", { at: replayDone[2], duration: 0.2 });
const hotels = bellhop.figure;
hotels.pose(POSES.crossed, { at: beats.depend, duration: 0.3 });
hotels.say("sad", { at: beats.depend });
for (let time = beats.depend + 0.35, tap = 0; time < replayDone[0] - 0.1; time += 0.25, tap += 1) {
  hotels.pose(tap % 2 ? POSES.crossed : POSES.tapUp, { at: time, duration: 0.12 });
}
hotels.say("determined", { at: replayDone[0] });
workLoop(hotels, 1, replayDone[0], replayDone[1]);
hotels.pose("standing", { at: replayDone[1], duration: 0.2 });

/* ---------- where everyone stands, and when they are on screen ---------- */

const inRange = (time, ranges) => ranges.some(([from, until]) => time >= from && time < until);

function placeMember(member, x, z, scale, time) {
  member.draw(time);
  const feet = world.toScreen(x, 0, z);
  // On the wide shots everyone is drawn a little larger, so faces still read.
  const wide = 1 + 0.5 * clamp01((world.poseAt(time).dist - 60) / 70);
  const size = (world.pixelsPerUnit(x, 0, z) * FIGURE_UNITS * scale * wide) / 100;
  member.group.setAttribute(
    "transform",
    `translate(${feet.x.toFixed(2)} ${feet.y.toFixed(2)}) scale(${Math.max(size, 0.0001).toFixed(4)})`,
  );
}

function show(member, visible, x, z, appearAt, time) {
  member.group.style.display = visible ? "" : "none";
  if (visible) placeMember(member, x, z, backOut((time - appearAt) / 0.3), time);
}

const beachX = LAYOUT.beachX;
function drawCast(time) {
  const onBeach = time < beats.behind + 0.4 || time >= beats.again - 0.25;
  show(traveler, onBeach, beachX - 1.7, 1.7, time < beats.behind ? 0.25 : beats.again - 0.25, time);

  let aiSpot = null;
  if (time >= beats.ai - 0.05 && time < beats.behind + 0.1) aiSpot = [beachX + 2.3, 1.9, beats.ai - 0.05];
  else if (inRange(time, [[beats.behind + 0.1, lane[0] - 0.3], [beats.independent - 0.15, beats.together - 0.3]])) {
    aiSpot = [LAYOUT.hub[0] - 3, LAYOUT.hub[1] + 1.3, time < lane[0] ? beats.behind + 0.1 : beats.independent - 0.15];
  } else if (inRange(time, [[beats.together - 0.3, beats.named - 0.35]])) {
    aiSpot = [LAYOUT.merge[0] - 3.6, LAYOUT.merge[1] + 1.2, beats.together - 0.3];
  } else if (inRange(time, [[beats.named - 0.35, beats.depend - 0.3]])) {
    aiSpot = [LAYOUT.hub[0] - 3, LAYOUT.hub[1] + 1.3, beats.named - 0.35];
  } else if (time >= beats.again - 0.25) aiSpot = [beachX + 2.5, 1.9, beats.again - 0.1];
  show(ai, aiSpot !== null, aiSpot?.[0] ?? 0, aiSpot?.[1] ?? 0, aiSpot?.[2] ?? 0, time);

  // On the close-up of the merge, the stations sit right under the camera, so the
  // workers step out of shot and pop back as the camera pulls away.
  const offMerge = !inRange(time, [[beats.together + 0.25, beats.named - 0.35]]);
  // On each station's close-up, only that station's worker is in shot.
  const closeUpOf = lane.findIndex((at, index) => time >= at - 0.3 && time < (lane[index + 1] ?? beats.independent) - 0.3);
  workers.forEach((member, index) => {
    const [x, z] = LAYOUT.stations[index];
    const framed = closeUpOf < 0 || closeUpOf === index;
    const visible = time >= beats.fanOut + 0.1 && time < beats.again - 0.45 && offMerge && framed;
    const appear = time < beats.together ? beats.fanOut + 0.1 + index * 0.04 : beats.named - 0.35;
    show(member, visible, x - 2.9, z + 0.6, appear, time);
  });
}

/* ---------- labels pinned to the world ---------- */

function pin(element, x, y, z, { opacity = 1, scale = null, baseUnits = 96 } = {}) {
  if (opacity <= 0.001) {
    element.style.opacity = "0";
    return;
  }
  const point = world.toScreen(x, y, z);
  const size = scale ?? world.pixelsPerUnit(x, y, z) / baseUnits;
  element.style.opacity = String(opacity);
  element.style.transform = `translate(${point.x.toFixed(2)}px, ${point.y.toFixed(2)}px) scale(${size.toFixed(3)})`;
}

const fade = (time, from, until, edge = 0.2) => smooth((time - from) / edge) * (1 - smooth((time - until) / edge));
const plinthIcons = $$(".plinth-icon");
const rings = $$(".ring");
const results = $$(".result");

/** How far each task has got: the main run, then the replay in the counter-example. */
function progress(index, time) {
  if (time >= beats.depend - 0.2) {
    const begins = index === 1 ? replayDone[0] : beats.depend;
    return clamp01((time - begins) / (replayDone[index] - begins));
  }
  return clamp01((time - beats.workStart) / (done[index] - beats.workStart));
}

function drawLabels(time) {
  pin($("#goa-sign"), beachX + 4.3, 2.3, -0.3, {
    opacity: fade(time, 0.75, beats.behind + 0.45, 0.25) + fade(time, beats.again, Infinity),
  });
  const shopOn = fade(time, beats.behind + 0.4, beats.again + 0.5);
  pin($("#hub-label"), LAYOUT.hub[0], 0.6, LAYOUT.hub[1] + 1.55, { opacity: shopOn, baseUnits: 60 });
  pin($("#merge-label"), LAYOUT.merge[0], 1.55, LAYOUT.merge[1], {
    opacity: fade(time, beats.together - 0.1, beats.compare - 0.1),
    baseUnits: 60,
  });
  const ringsOn = (time) =>
    fade(time, beats.workStart - 0.1, lane[0] - 0.35, 0.15) +
    fade(time, beats.independent, beats.together + 0.2, 0.2) +
    fade(time, beats.depend - 0.1, beats.again - 0.3, 0.2);
  LAYOUT.stations.forEach(([x, z], index) => {
    pin(plinthIcons[index], x, 0.6, z + 1.55, { opacity: shopOn, baseUnits: 70 });
    const amount = progress(index, time);
    const ring = rings[index];
    pin(ring, x, 4.2, z, { opacity: ringsOn(time), baseUnits: 70 });
    ring.querySelector(".ring-fill").setAttribute("stroke-dashoffset", (314.2 * (1 - amount)).toFixed(1));
    ring.querySelector(".ring-check").style.opacity = amount >= 1 ? "1" : "0";
    // Each finished result rides its chain down into the merge.
    const ride = smooth((time - beats.together - index * 0.06) / 0.75);
    pin(results[index], mix(x, LAYOUT.merge[0], ride), 2.6, mix(z, LAYOUT.merge[1], ride), {
      opacity: fade(time, beats.together - 0.15, beats.together + 0.7 + index * 0.06, 0.12),
      scale: Math.max(0.7, world.pixelsPerUnit(x, 2, z) / 70) * backOut((time - beats.together + 0.15) / 0.25),
    });
  });
}

/* ---------- the timing bar ---------- */

const bars = [0, 1, 2].map((index) => $(`#bar-${index}`));
const ghosts = [0, 1, 2].map((index) => $(`#ghost-${index}`));
const rowLabels = [0, 1, 2].map((index) => $(`#label-${index}`));
const orderLabel = $("#label-order");
const finish = $("#gantt-finish");
const saved = $("#gantt-saved");
const savedLabel = $("#gantt-saved-label");
const arrow = $("#gantt-arrow");
const gantt = $("#gantt");
const titles = {
  order: $("#title-order"),
  once: $("#title-once"),
  lanes: $("#title-lanes"),
  compare: $("#title-compare"),
  depend: $("#title-depend"),
};
const ROW = 54;
const BAR_LEFT = 130;
const before = [0, taskPixels[0], taskPixels[0] + taskPixels[1]];
const SUM = taskPixels[0] + taskPixels[1] + taskPixels[2];
const LONGEST = Math.max(...taskPixels);

function setBar(element, x, row, fill, width) {
  element.style.left = `${(BAR_LEFT + x).toFixed(1)}px`;
  element.style.top = `${(row * ROW).toFixed(1)}px`;
  element.style.width = `${(width * clamp01(fill)).toFixed(1)}px`;
  element.style.opacity = fill > 0 ? "1" : "0";
  element.firstElementChild && (element.firstElementChild.style.opacity = fill > 0 && fill < 1 ? "1" : "0");
}

function drawGantt(time) {
  const sequence = [beats.sequential - 0.1, beats.behind - 0.15];
  const lanes = [lane[0] - 0.35, beats.independent - 0.15];
  const compare = [beats.compare, beats.depend - 0.3];
  const depend = [beats.depend - 0.15, beats.again - 0.25];
  const opacity = [sequence, lanes, compare, depend].reduce((sum, [from, until]) => sum + fade(time, from, until, 0.2), 0);
  gantt.style.opacity = String(clamp01(opacity));
  gantt.style.transform = `translateY(${((1 - clamp01(opacity)) * 24).toFixed(1)}px)`;
  if (opacity <= 0.001) return;

  Object.values(titles).forEach((title) => (title.style.opacity = "0"));
  ghosts.forEach((ghost) => (ghost.style.opacity = "0"));
  rowLabels.forEach((label) => (label.style.opacity = "0"));
  [orderLabel, saved, savedLabel, arrow].forEach((element) => (element.style.opacity = "0"));
  gantt.style.height = "262px";

  if (time < beats.behind) {
    // One after another: each block waits for the one before it.
    const [s0, s1, s2] = beats.seqWords;
    const ends = [s1, s2, beats.simultaneously - 0.3];
    const begins = [s0, s1, s2];
    const regroup = smooth((time - beats.simultaneously) / 0.6);
    let reach = 0;
    bars.forEach((bar, index) => {
      const fill = clamp01((time - begins[index]) / (ends[index] - begins[index]));
      reach = Math.max(reach, before[index] + taskPixels[index] * fill);
      setBar(bar, mix(before[index], 0, regroup), mix(0, index, regroup), fill, taskPixels[index]);
      rowLabels[index].style.top = `${index * ROW}px`;
      rowLabels[index].style.opacity = String(regroup);
    });
    orderLabel.style.top = "0px";
    orderLabel.style.opacity = String(1 - regroup);
    titles.order.style.opacity = String(1 - regroup);
    titles.once.style.opacity = String(regroup);
    finish.style.opacity = reach > 0 ? "1" : "0";
    finish.style.left = `${(BAR_LEFT + mix(reach, LONGEST, regroup)).toFixed(1)}px`;
    return;
  }

  if (time < beats.compare) {
    // All three at once: they start together, and each finishes when it finishes.
    let reach = 0;
    bars.forEach((bar, index) => {
      const fill = progress(index, time);
      reach = Math.max(reach, taskPixels[index] * fill);
      setBar(bar, 0, index, fill, taskPixels[index]);
      rowLabels[index].style.top = `${index * ROW}px`;
      rowLabels[index].style.opacity = "1";
    });
    titles.lanes.style.opacity = "1";
    finish.style.opacity = reach > 0 ? "1" : "0";
    finish.style.left = `${(BAR_LEFT + reach).toFixed(1)}px`;
    return;
  }

  if (time < beats.depend - 0.2) {
    // Side by side: one by one takes the sum, in parallel only the longest.
    gantt.style.height = "400px";
    const speed = SUM / 1.2;
    ghosts.forEach((ghost, index) => {
      const fill = clamp01((time - beats.compare - 0.2 - before[index] / speed) / (taskPixels[index] / speed));
      setBar(ghost, before[index], 0, fill, taskPixels[index]);
    });
    bars.forEach((bar, index) => {
      const fill = clamp01((time - beats.compare - 0.2) / (taskPixels[index] / speed));
      setBar(bar, 0, index + 1, fill, taskPixels[index]);
      rowLabels[index].style.top = `${(index + 1) * ROW}px`;
      rowLabels[index].style.opacity = "1";
    });
    orderLabel.style.top = "0px";
    orderLabel.style.opacity = "1";
    titles.compare.style.opacity = "1";
    finish.style.opacity = "0";
    const markSaved = smooth((time - beats.saving + 0.1) / 0.35);
    saved.style.opacity = String(markSaved);
    saved.style.left = `${BAR_LEFT + LONGEST}px`;
    saved.style.top = "222px";
    saved.style.width = `${((SUM - LONGEST) * markSaved).toFixed(1)}px`;
    savedLabel.style.opacity = String(markSaved);
    savedLabel.style.left = `${BAR_LEFT + LONGEST}px`;
    savedLabel.style.width = `${SUM - LONGEST}px`;
    savedLabel.style.top = "234px";
    return;
  }

  // The catch: hotels must wait for the flight, so its bar starts where the flight ends.
  bars.forEach((bar, index) => {
    setBar(bar, index === 1 ? taskPixels[0] : 0, index, progress(index, time), taskPixels[index]);
    rowLabels[index].style.top = `${index * ROW}px`;
    rowLabels[index].style.opacity = "1";
  });
  titles.depend.style.opacity = "1";
  arrow.style.opacity = String(smooth((time - beats.depend - 0.1) / 0.3));
  arrow.style.left = `${BAR_LEFT + taskPixels[0] - 34}px`;
  arrow.style.top = "18px";
  const reach = Math.max(
    taskPixels[0] * progress(0, time),
    progress(1, time) > 0 ? taskPixels[0] + taskPixels[1] * progress(1, time) : 0,
    taskPixels[2] * progress(2, time),
  );
  finish.style.opacity = "1";
  finish.style.left = `${(BAR_LEFT + reach).toFixed(1)}px`;
}

/* ---------- what each station's card has found so far ---------- */

// Results arrive while the narration is on that station; its ring shows how far it has got.
const findings = [$$("#art-0 .flight"), $$("#art-1 .hotel"), $$("#art-2 .pin")];
function drawFindings(time) {
  findings.forEach((rows, station) => {
    rows.forEach((row, index) => {
      const at = lane[station] + 0.12 + index * 0.3;
      row.style.opacity = String(smooth((time - at) / 0.15));
      // The map's pins keep their SVG placement, so only the HTML rows slide in.
      if (station < 2) row.style.transform = `translateX(${((1 - backOut((time - at) / 0.3)) * -24).toFixed(1)}px)`;
    });
  });
  const budget = String(smooth((time - lane[1] - 1.0) / 0.2));
  $("#budget").style.opacity = budget;
  $("#budget-label").style.opacity = budget;
}

/* ---------- the master timeline ---------- */

export const timeline = gsap.timeline({ paused: true });
BrandKit.tornReveal(timeline, { top: "#sheet-top", bottom: "#sheet-bottom", at: 0.1 });
BrandKit.paperJump(timeline, {
  layers: ".paper-sheet",
  duration: beats.duration,
  accents: [beats.idea, beats.ai, beats.simultaneously, beats.behind, ...lane, ...done, beats.planReady, beats.named, beats.saving, beats.depend, beats.again, beats.endCard],
});

function showLine(id, from, to) {
  timeline.fromTo(id, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.34, ease: "power3.out" }, from);
  timeline.to(id, { y: -20, opacity: 0, duration: 0.2, ease: "power2.in" }, to - 0.2);
}
showLine("#line-goa", start[0] + 0.1, beats.idea - 0.1);
showLine("#line-start", beats.idea - 0.05, beats.cards);
showLine("#line-behind", beats.behind + 0.05, lane[0] - 0.4);
showLine("#line-wait", beats.wait - 0.25, start[9] - 0.05);
showLine("#line-together", start[9] + 0.05, beats.planReady - 0.15);
showLine("#line-named", beats.named - 0.1, beats.compare - 0.05);
showLine("#line-again", beats.again - 0.05, beats.endCard);

// The three jobs land on their words, then fly into the AI's hands.
const handOff = { x: 749, y: 950 };
[0, 1, 2].forEach((index) => {
  const card = `#task-${index}`;
  const left = 120 + index * 295 + 125;
  timeline.fromTo(card, { y: 50, scale: 0.6, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)" }, beats.taskWords[index] - 0.05);
  timeline.to(card, { x: handOff.x - left, y: handOff.y - 425, scale: 0.12, rotation: 12 - index * 12, duration: 0.55, ease: "power3.in" }, beats.ai + 0.4 + index * 0.06);
  timeline.to(card, { opacity: 0, duration: 0.06 }, beats.ai + 0.93 + index * 0.06);
});

// The station cards, one per close-up, sliding with each whip.
[0, 1, 2].forEach((index) => {
  const art = `#art-${index}`;
  timeline.fromTo(art, { x: 600, opacity: 1 }, { x: 0, opacity: 1, duration: 0.5, ease: "power4.out" }, lane[index] - 0.2);
  if (index < 2) timeline.to(art, { x: -1100, duration: 0.42, ease: "power3.in" }, lane[index + 1] - 0.3);
  else timeline.to(art, { y: -30, opacity: 0, duration: 0.3, ease: "power2.in" }, beats.independent - 0.15);
});

// The plan assembles on "plan", and returns with the traveler on the beach.
timeline.fromTo("#plan", { y: 200, scaleY: 0.1, opacity: 0 }, { y: 0, scaleY: 1, opacity: 1, duration: 0.42, ease: "back.out(1.5)" }, beats.planReady - 0.08);
timeline.fromTo("#plan .plan-row", { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.24, stagger: 0.1, ease: "power3.out" }, beats.planReady + 0.15);
timeline.to("#plan", { y: -30, opacity: 0, duration: 0.25, ease: "power2.in" }, beats.named - 0.3);

timeline.to("#world, #figures, #labels", { opacity: 0, duration: 0.2, ease: "power1.inOut" }, beats.endCard);
timeline.fromTo("#end-card", { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power1.inOut" }, beats.endCard);
timeline.from("#end-title", { y: 30, opacity: 0, duration: 0.42, ease: "power3.out" }, beats.endCard + 0.08);
const closerSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
closerSvg.setAttribute("viewBox", "0 0 1080 1920");
closerSvg.setAttribute("width", "1080");
closerSvg.setAttribute("height", "1920");
$("#end-stage").appendChild(closerSvg);
const closer = createMember(closerSvg, {
  seed: 23,
  startPose: "cheering",
  startExpression: "delighted",
  props: [{ art: "bucketHat", on: "head" }, { art: "sunglasses", on: "head" }, { art: "backpack", on: "shoulder", upright: true }],
});
closer.group.setAttribute("transform", "translate(540 1240) scale(4)");

/* ---------- time reaches everything through one setter, which runs on any seek ---------- */

function drawFrame(time) {
  world.applyCamera(world.poseAt(time));
  drawCast(time);
  drawLabels(time);
  drawGantt(time);
  drawFindings(time);
  closer.draw(time);
  world.draw(time);
}

let driverTime = 0;
const driver = {
  get time() {
    return driverTime;
  },
  set time(value) {
    driverTime = value;
    drawFrame(value);
  },
};
timeline.fromTo(driver, { time: 0 }, { time: beats.duration, duration: beats.duration, ease: "none", immediateRender: true }, 0);
timeline.set({}, {}, beats.duration);
drawFrame(0);
