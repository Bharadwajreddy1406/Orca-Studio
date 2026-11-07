// The choreography: the cast's acting, the app, the findings cards, the evidence board and
// its comparison, all timed from window.REEL.beats and drawn from time alone.
import { fade, pinTo, standAt, showLine, driveFrames } from "../reel/stage.js";
import { createMember, POSES } from "../reel/cast.js";
import { frameReel } from "../reel/endcard.js";
import { backOut, clamp01, mix, smooth } from "../reel/motion.js";
import { createWorld, LAYOUT } from "./world.js";

const { beats } = window.REEL;
const { start, hits, brings } = beats;
const $ = (selector) => document.querySelector(selector);
const world = createWorld($("#world"), beats);
const stage = world.stage;

/* ---------- the cast ---------- */

const svg = $("#figures");
const developer = createMember(svg, {
  seed: 7,
  props: [
    { art: "sigh", on: "head", from: beats.slow - 0.15, until: beats.slow + 1.1 },
    { art: "sweat", on: "head", from: beats.slow, until: start[2] },
  ],
});
const detective = createMember(svg, {
  seed: 11,
  startExpression: "thinking",
  props: [
    { art: "antenna", on: "head" },
    { art: "deerstalker", on: "head" },
    { art: "magnifier", on: "wristR", until: beats.case - 0.35 },
    { art: "stamp", on: "wristR", from: beats.case - 0.35 },
  ],
});
const HATS = [
  [{ art: "hardHat", on: "head" }],
  [{ art: "beret", on: "head" }, { art: "glasses", on: "head" }],
  [{ art: "headphones", on: "head" }],
];
const team = HATS.map((hats, index) =>
  createMember(svg, {
    seed: 31 + index * 10,
    startExpression: "happy",
    props: [
      { art: "antenna", on: "head" },
      ...hats,
      { art: "clipboard", on: "wristL", upright: true, from: hits[index] + 0.1 },
      ...(index === 1 ? [{ art: "sweat", on: "head", from: beats.only + 0.1, until: beats.case }] : []),
    ],
  }),
);

/* ---------- the developer: typing, slumped, tapping a foot, then cheering ---------- */

const dev = developer.figure;
for (let time = 0.3, swing = 0; time < beats.slow - 0.15; time += 0.14, swing += 1) {
  dev.pose(swing % 2 ? POSES.work : POSES.workAlt, { at: time, duration: 0.1, ease: "sine.inOut" });
}
dev.say("determined", { at: 0.3 });
dev.say("confused", { at: beats.so });
dev.pose(POSES.slump, { at: beats.slow - 0.1, duration: 0.45, ease: "power2.inOut" });
dev.say("sad", { at: beats.slow - 0.1 });
for (let time = beats.slow + 0.65, swing = 0; time < start[1] - 0.05; time += 0.22, swing += 1) {
  dev.pose(swing % 2 ? POSES.crossed : POSES.tapUp, { at: time, duration: 0.1 });
}
dev.pose("standing", { at: start[1] + 0.05, duration: 0.2 });
dev.say("confused", { at: beats.problem });
dev.pose("shrugging", { at: beats.hiding, duration: 0.2, ease: "back.out(2)" });
dev.pose("shocked", { at: beats.case - 0.1, duration: 0.12 });
dev.say("shocked", { at: beats.case - 0.1 });
dev.pose("cheering", { at: beats.closed, duration: 0.22, ease: "back.out(2)" });
dev.say("delighted", { at: beats.closed });

/* ---------- the detective: peers, dispatches, weighs, names, warns, closes ---------- */

const boss = detective.figure;
const act = (figure, pose, expression, at, duration = 0.2) => {
  if (pose) figure.pose(pose, { at, duration, ease: "back.out(1.8)" });
  if (expression) figure.say(expression, { at });
};
act(boss, "thinking", "thinking", start[1]);
act(boss, "pointing", "determined", beats.problem);
act(boss, "thinking", "thinking", beats.hiding + 0.2);
act(boss, "standing", "happy", start[2] - 0.35, 0.1);
act(boss, "pointing_up", "determined", beats.three);
act(boss, POSES.dispatch, "determined", beats.once, 0.22);
act(boss, "thinking", "thinking", beats.once + 0.9, 0.3);
act(boss, "presenting", "happy", brings[0], 0.3);
act(boss, "shocked", "shocked", beats.dont, 0.14);
act(boss, "thinking", "confused", beats.dont + 0.35, 0.3);
act(boss, "pointing", "determined", beats.compares, 0.2);
act(boss, "thinking", "thinking", beats.finds, 0.25);
act(boss, "pointing_up", "delighted", beats.cause);
act(boss, "cheering", "delighted", beats.parallel);
act(boss, "presenting", "happy", beats.many, 0.3);
act(boss, "pointing_up", "determined", beats.one);
act(boss, "cheering", "delighted", beats.answer);
act(boss, "pointing_up", "determined", beats.remember, 0.25);
act(boss, "shocked", "shocked", beats.only, 0.14);
act(boss, "thinking", "confused", beats.good + 0.15, 0.25);
act(boss, "shrugging", "sad", beats.analyses, 0.25);
act(boss, POSES.stampUp, "determined", beats.case - 0.35, 0.15);
boss.pose(POSES.stampDown, { at: beats.case - 0.04, duration: 0.06, ease: "power3.in" });
act(boss, "cheering", "delighted", beats.closed + 0.1, 0.25);

/* ---------- the team: run out together, investigate, argue, accept ---------- */

team.forEach((member, index) => {
  const bot = member.figure;
  const hit = hits[index];
  act(bot, "standing", "happy", beats.angles);
  bot.walk({ at: beats.once, until: beats.once + 1.0, strideRate: 2.6 });
  bot.say("determined", { at: beats.once });
  for (let time = beats.once + 1.05, swing = 0; time < brings[index] - 0.5; time += 0.3, swing += 1) {
    if (time > hit - 0.05 && time < hit + 0.8) continue;
    bot.pose(swing % 2 ? POSES.work : POSES.workAlt, { at: time, duration: 0.15, ease: "sine.inOut" });
  }
  act(bot, "pointing", "delighted", hit, 0.18);
  bot.walk({ at: brings[index] - 0.45, until: brings[index] + 0.45, strideRate: 2.6 });
  act(bot, "presenting", "happy", brings[index] + 0.5, 0.25);
  // The argument: each one jabs at its own card, out of step with the others.
  for (let time = start[7] + index * 0.12, swing = 0; time < beats.compares - 0.2; time += 0.36, swing += 1) {
    bot.pose(swing % 2 ? "shrugging" : "pointing_up", { at: time, duration: 0.14, ease: "back.out(2)" });
  }
  bot.say("determined", { at: start[7] });
  act(bot, "thinking", "thinking", beats.compares + index * 0.1, 0.3);
  if (index === 0) act(bot, "cheering", "delighted", beats.cause);
  else act(bot, "shrugging", "happy", beats.cause + 0.1);
  act(bot, "standing", "happy", beats.parallel + 0.3, 0.3);
  act(bot, "pointing_up", "determined", beats.views + index * 0.08);
  act(bot, "cheering", "delighted", beats.answer + index * 0.05);
  act(bot, "standing", "neutral", start[11], 0.3);
  if (index === 1) {
    act(bot, "shocked", "shocked", beats.only, 0.14);
    act(bot, POSES.slump, "sad", beats.analyses, 0.35);
  } else {
    act(bot, "thinking", "confused", beats.good + index * 0.08, 0.25);
  }
});

const DESK_DEV = [LAYOUT.deskX - 2.6, 1.2];
const DESK_DETECTIVE = [LAYOUT.deskX + 3.3, 1.5];
function drawCast(time) {
  const atDesk = time < start[2] - 0.35 || time >= beats.case - 0.35;
  standAt(stage, developer, time < start[2] - 0.1 || time >= beats.case - 0.4, DESK_DEV[0], DESK_DEV[1], 0.25, time);
  if (atDesk) {
    const appear = time < start[2] ? start[1] : beats.case - 0.35;
    standAt(stage, detective, time >= start[1], DESK_DETECTIVE[0], DESK_DETECTIVE[1], appear, time);
  } else {
    // Out of shot while the camera visits the scenes; he would loom in the foreground.
    const touring = time > hits[0] - 0.55 && time < start[6] - 0.3;
    standAt(stage, detective, !touring, LAYOUT.detective[0], LAYOUT.detective[1], start[2] - 0.35, time);
  }
  team.forEach((member, index) => {
    const spot = world.investigatorAt(index, time);
    const shown = time >= beats.angles - 0.05 && time < beats.case - 0.35;
    standAt(stage, member, shown, spot.x, spot.z, beats.angles + index * 0.06, time);
  });
}

/* ---------- labels pinned to the world ---------- */

const sceneLabels = ["#label-db", "#label-ui", "#label-net"].map($);
const questions = [$("#q-0"), $("#q-1")];
const answerTag = $("#answer-tag");
function drawLabels(time) {
  const wide =
    fade(time, beats.three + 0.1, hits[0] - 0.75) + fade(time, beats.parallel - 0.2, start[11] - 0.3);
  world.scenes.forEach(([x, z], index) => {
    pinTo(stage, sceneLabels[index], x, 6.4, z, { opacity: clamp01(wide), scale: 0.85 * backOut((time - beats.three - index * 0.09) / 0.3) });
  });
  const puzzled = Math.max(fade(time, beats.dont + 0.1, beats.compares - 0.1), fade(time, beats.good + 0.15, beats.case - 0.4));
  const [bx, bz] = LAYOUT.detective;
  questions.forEach((mark, index) => {
    const bob = Math.sin(time * 7 + index * 2) * 0.12;
    pinTo(stage, mark, bx + (index ? 0.5 : -1.0), 6.0 + index * 0.5 + bob, bz, {
      opacity: puzzled,
      scale: 1.05 * backOut((time - beats.dont - 0.1 - index * 0.12) / 0.3),
    });
  });
  const [ax, ay, az] = beats.answerPoint;
  pinTo(stage, answerTag, ax, ay + 3.6, az, {
    opacity: fade(time, beats.one + 0.05, start[11] - 0.35, 0.15),
    scale: backOut((time - beats.one - 0.05) / 0.35) * (1 + 0.12 * backOut((time - beats.stronger) / 0.3)),
  });
}

/* ---------- the app: a crawling load, then an instant one ---------- */

const app = $("#app");
const appTimer = $("#app-timer");
const appWord = $("#app-word");
const appFill = $("#app-fill");
const spinner = $("#spinner");
const appDone = $("#app-done");
const LOAD_STARTS = 0.9;
const SLOW_LOAD = 3.1; // seconds: 2.4 + 0.3 + 0.4, the three findings in series
const FAST_LOAD = 0.7; // seconds: the same page with the slow query fixed
function drawApp(time) {
  const shown = fade(time, 0.7, start[1] - 0.1) + fade(time, beats.case - 0.3, beats.endCard);
  app.style.opacity = String(clamp01(shown));
  app.style.transform = `translateY(${((1 - clamp01(shown)) * 24).toFixed(1)}px)`;
  if (shown <= 0.001) return;
  const fixed = time >= beats.case - 0.3;
  let seconds;
  let progress;
  if (fixed) {
    seconds = Math.min(FAST_LOAD, Math.max(0, time - beats.case + 0.1));
    progress = seconds / FAST_LOAD;
  } else {
    seconds = Math.min(SLOW_LOAD, Math.max(0, time - LOAD_STARTS));
    // The bar stalls and lurches, as a slow page does.
    const u = seconds / SLOW_LOAD;
    progress = u < 0.85 ? 0.12 * u + 0.04 * Math.sin(u * 20) ** 2 : mix(0.13, 1, smooth((u - 0.85) / 0.15));
  }
  const loaded = progress >= 0.999;
  appTimer.textContent = `${seconds.toFixed(1)} s`;
  appWord.textContent = loaded ? (fixed ? "Fast again" : "Finally…") : "Loading…";
  appFill.style.width = `${(clamp01(progress) * 100).toFixed(1)}%`;
  appFill.className = fixed ? "done" : "";
  spinner.style.display = loaded && fixed ? "none" : "";
  appDone.style.display = loaded && fixed ? "" : "none";
  spinner.style.transform = `rotate(${((time * 300) % 360).toFixed(1)}deg)`;
}

/* ---------- the findings cards and the evidence board ---------- */

const board = $("#board");
const cards = [0, 1, 2].map((index) => $(`#card-${index}`));
const claims = cards.map((card) => card.querySelector(".card-claim"));
const bars = [0, 1, 2].map((index) => $(`#bar-${index}`));
const clashes = [$("#clash-0"), $("#clash-1")];
const verdict = $("#verdict");
const boardTitle = $("#board-title");
const verdictText = $("#verdict-text");
const verdictUse = $("#verdict-use");
const uiValue = $("#ui-value");
const smudge = $("#smudge");
const SLOTS = [260, 540, 820];
const SLOT_Y = 515;
const FLIGHT = 0.5;
const BAR_HEIGHT = 168;
const MEASURED = [2.4, 0.3, 0.4];
const SMUDGED = 9.0; // the frontend's bad reading in the catch

function boardShown(time) {
  return clamp01(fade(time, brings[0] - 0.15, beats.parallel - 0.4) + fade(time, start[11] - 0.05, beats.case - 0.3, 0.15));
}

function drawBoard(time) {
  const shown = boardShown(time);
  board.style.opacity = String(shown);
  board.style.transform = `translateY(${((1 - shown) * 20).toFixed(1)}px)`;

  const wrong = time >= beats.good + 0.15 && time < beats.case;
  const values = MEASURED.slice();
  const smudgedBy = smooth((time - beats.good) / 0.4) * (time < beats.case ? 1 : 0);
  values[1] = mix(MEASURED[1], SMUDGED, smudgedBy);
  const largest = Math.max(...values);
  const winner = wrong ? 1 : 0;
  const decided = time >= beats.cause - 0.05;

  cards.forEach((card, index) => {
    const popAt = hits[index] + 0.35;
    const flyAt = brings[index] - 0.05;
    const [sx, sz] = world.scenes[index];
    const pinned = stage.toScreen(sx, 6.6, sz);
    const pinnedScale = (stage.pixelsPerUnit(sx, 6.6, sz) / 96) * 0.8;
    let x;
    let y;
    let scale;
    let opacity;
    if (time < flyAt) {
      x = pinned.x;
      y = pinned.y;
      scale = pinnedScale * backOut((time - popAt) / 0.3);
      opacity = time >= popAt ? 1 : 0;
    } else {
      const u = smooth((time - flyAt) / FLIGHT);
      x = mix(pinned.x, SLOTS[index], u);
      y = mix(pinned.y, SLOT_Y, u) - Math.sin(Math.PI * u) * 160;
      scale = mix(pinnedScale, 1, u);
      opacity = u < 1 ? 1 : shown;
    }
    // In the argument the cards shake against each other.
    const arguing = fade(time, beats.dont - 0.05, beats.compares - 0.2, 0.1);
    const tilt = arguing * 3.2 * Math.sin(time * 26 + index * 2.1);
    const dim = decided && index !== winner ? 0.42 : 1;
    card.style.opacity = String(opacity * mix(1, dim, smooth((time - beats.cause) / 0.3)));
    card.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${tilt.toFixed(2)}deg) scale(${Math.max(scale, 0.0001).toFixed(3)})`;
    card.classList.toggle("hot", decided && index === winner && !wrong);

    claims[index].style.opacity = String(smooth((time - start[7] - index * 0.12) / 0.2));

    const grow = smooth((time - beats.compares - 0.1 - index * 0.2) / 0.35);
    bars[index].style.height = `${((values[index] / largest) * BAR_HEIGHT * grow).toFixed(1)}px`;
    bars[index].className = `bar${decided && index === 0 && !wrong ? " hot" : ""}`;
    bars[index].style.opacity = String(decided && index !== winner ? 0.45 : 1);
  });

  clashes.forEach((clash, index) => {
    const on = fade(time, beats.dont - 0.05 + index * 0.1, beats.compares - 0.2, 0.08) * shown;
    clash.style.opacity = String(on);
    clash.style.transform = `scale(${(0.9 + 0.15 * Math.sin(time * 30 + index)).toFixed(3)})`;
  });

  const verdictOn = smooth((time - beats.cause + 0.05) / 0.2);
  verdict.style.opacity = String(verdictOn);
  boardTitle.style.opacity = String(1 - verdictOn);
  verdict.className = wrong ? "wrong" : "";
  verdictText.textContent = wrong ? "Most likely: the frontend" : "Most likely: slow query";
  verdictUse.setAttribute("href", wrong ? "#i-cross" : "#i-check");

  smudge.style.opacity = String(time >= beats.only && time < beats.case ? 0.92 : 0);
  smudge.style.transform = `scale(${backOut((time - beats.only) / 0.2).toFixed(3)})`;
  uiValue.textContent = time >= beats.good && time < beats.case ? `${SMUDGED.toFixed(1)} s` : "0.3 s";
}

/* ---------- the master timeline ---------- */

export const timeline = gsap.timeline({ paused: true });
const closer = frameReel(timeline, beats, {
  accents: [beats.slow, start[2], ...hits, brings[1], beats.dont, beats.cause, beats.parallel, beats.one, beats.only, beats.case],
  closerProps: [{ art: "deerstalker", on: "head" }, { art: "magnifier", on: "wristR" }],
});
showLine(timeline, "#line-hiding", start[1] + 0.05, start[2] - 0.3);
showLine(timeline, "#line-named", beats.parallel - 0.15, start[11] - 0.3);
timeline.fromTo("#stamp", { opacity: 0, scale: 2.6, rotation: -16 }, { opacity: 1, scale: 1, rotation: -7, duration: 0.16, ease: "power3.in" }, beats.case - 0.16);
timeline.to("#stamp", { opacity: 0, duration: 0.2 }, beats.endCard - 0.05);

function drawFrame(time) {
  stage.applyCamera(stage.poseAt(time));
  drawCast(time);
  drawLabels(time);
  drawApp(time);
  drawBoard(time);
  closer.draw(time);
  world.draw(time);
}
driveFrames(timeline, beats.duration, drawFrame);
