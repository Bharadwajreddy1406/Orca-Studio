// The choreography: the cast's acting, the console, the card riding the loop, and the
// pinned labels, all timed from window.REEL.beats.
import { createWorld, LAYOUT, loopPoint } from "./world.js";
import { createMember, POSES } from "./cast.js";
import { backOut, clamp01, smooth, track } from "./motion.js";

const { beats } = window.REEL;
const { start, fails, fixes } = beats;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const FIGURE_UNITS = 5;

/** The card's angle round the loop. In the runaway loop it accelerates without end. */
const tokenKeys = beats.tokenKeys.map((key) => ({ t: key.t, d: key.d, v: { angle: key.to }, e: smooth }));
function tokenAngle(time) {
  let angle = track({ angle: 0 }, tokenKeys, time).angle;
  if (time > beats.endless) {
    const running = Math.min(time, beats.stop) - beats.endless;
    angle += 10 * running * running;
  }
  return angle;
}
const world = createWorld(document.getElementById("world"), beats, tokenAngle);

/* ---------- the cast ---------- */

const stage = $("#figures");
const developer = createMember(stage, {
  seed: 7,
  startExpression: "neutral",
  props: [
    { art: "headphones", on: "head" },
    { art: "sweat", on: "head", from: beats.broken, until: start[2] },
    { art: "sigh", on: "head", from: beats.broken - 0.2, until: beats.broken + 1.0 },
  ],
});
const ai = createMember(stage, {
  seed: 11,
  startExpression: "happy",
  props: [
    { art: "antenna", on: "head" },
    { art: "bulb", on: "head", from: beats.tested - 0.05, until: start[3] },
    { art: "dizzy", on: "head", from: beats.endless + 0.4, until: beats.stop },
  ],
});
const tester = createMember(stage, {
  seed: 41,
  startExpression: "determined",
  props: [
    { art: "antenna", on: "head" },
    { art: "goggles", on: "head" },
    { art: "clipboard", on: "wristL", upright: true },
    { art: "dizzy", on: "head", from: beats.endless + 0.5, until: beats.stop },
  ],
});

/* ---------- the developer: stuck, frantic, then hopeful ---------- */

const dev = developer.figure;
dev.pose(POSES.work, { at: 0.3, duration: 0.3 });
dev.say("determined", { at: 0.3 });
dev.pose(POSES.slump, { at: beats.broken - 0.1, duration: 0.4, ease: "power2.inOut" });
dev.say("sad", { at: beats.broken - 0.1 });
for (let time = beats.stuck, swing = 0; time < start[2] - 0.1; time += 0.13, swing += 1) {
  dev.pose(swing % 2 ? POSES.work : POSES.workAlt, { at: time, duration: 0.1, ease: "sine.inOut" });
}
dev.say("confused", { at: beats.stuck });
dev.pose("standing", { at: start[2], duration: 0.25 });
dev.say("happy", { at: start[2] + 0.2 });
dev.pose("cheering", { at: beats.tested, duration: 0.22, ease: "back.out(2)" });
dev.say("delighted", { at: beats.tested });

/* ---------- the AI: eager, crushed, fixing, proud, dizzy, laughing ---------- */

const bot = ai.figure;
bot.pose("pointing_up", { at: start[2] + 0.1, duration: 0.22, ease: "back.out(2)" });
bot.say("delighted", { at: start[2] + 0.1 });
bot.pose(POSES.dispatch, { at: beats.firstRun, duration: 0.25, ease: "back.out(2)" });
bot.say("determined", { at: beats.firstRun });
fails.forEach((failed, index) => {
  bot.pose("shocked", { at: failed, duration: 0.12, ease: "back.out(2)" });
  bot.say("shocked", { at: failed });
  bot.pose("thinking", { at: failed + 0.4, duration: 0.25 });
  bot.say("thinking", { at: failed + 0.4 });
  bot.pose(POSES.work, { at: fixes[index] - 0.2, duration: 0.15 });
  bot.pose("pointing_up", { at: fixes[index], duration: 0.16, ease: "back.out(2)" });
  bot.say("determined", { at: fixes[index] });
});
bot.pose("cheering", { at: beats.pass, duration: 0.22, ease: "back.out(2)" });
bot.say("delighted", { at: beats.pass });
bot.pose("standing", { at: beats.limit + 0.2, duration: 0.3 });
bot.say("happy", { at: beats.limit + 0.2 });
bot.pose("cheering", { at: beats.named, duration: 0.22, ease: "back.out(2)" });
bot.pose("presenting", { at: beats.learns, duration: 0.3 });
bot.pose("shocked", { at: beats.endless + 0.3, duration: 0.15, ease: "back.out(2)" });
bot.say("confused", { at: beats.endless + 0.4 });
bot.pose("shrugging", { at: beats.forever, duration: 0.2 });
bot.say("shocked", { at: beats.forever });
bot.pose("cheering", { at: beats.stop + 0.25, duration: 0.25, ease: "back.out(2)" });
bot.say("delighted", { at: beats.stop + 0.25 });

/* ---------- the tester: checks, shakes their head, then celebrates ---------- */

const test = tester.figure;
test.pose(POSES.work, { at: beats.firstRun + 0.3, duration: 0.3 });
fails.forEach((failed) => {
  test.pose("shrugging", { at: failed, duration: 0.18, ease: "back.out(2)" });
  test.say("sad", { at: failed });
  test.pose(POSES.work, { at: failed + 0.9, duration: 0.3 });
  test.say("determined", { at: failed + 0.9 });
});
test.pose("cheering", { at: beats.pass, duration: 0.22, ease: "back.out(2)" });
test.say("delighted", { at: beats.pass });
test.pose("standing", { at: beats.limit + 0.3, duration: 0.3 });
test.pose("shocked", { at: beats.endless + 0.4, duration: 0.15, ease: "back.out(2)" });
test.say("confused", { at: beats.endless + 0.5 });
test.pose("cheering", { at: beats.stop + 0.3, duration: 0.25, ease: "back.out(2)" });
test.say("delighted", { at: beats.stop + 0.3 });

/* ---------- where everyone stands ---------- */

function placeMember(member, x, z, scale, time) {
  member.draw(time);
  const feet = world.toScreen(x, 0, z);
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

function drawCast(time) {
  const atDesk = time < beats.firstRun - 0.3;
  show(developer, atDesk, LAYOUT.deskX - 2.6, 1.2, 0.25, time);
  if (atDesk) show(ai, time >= start[2], LAYOUT.deskX + 4.6, 1.4, start[2], time);
  else show(ai, time >= beats.loopForms, LAYOUT.write[0] - 3.4, LAYOUT.write[1] + 1.4, beats.loopForms, time);
  show(tester, time >= beats.loopForms + 0.15, LAYOUT.test[0] - 3.4, LAYOUT.test[1] + 1.4, beats.loopForms + 0.15, time);
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

const token = $("#token");
function drawLabels(time) {
  const loopOn = fade(time, beats.loopForms + 0.2, beats.endCard + 1);
  pin($("#label-write"), LAYOUT.write[0], 0.6, LAYOUT.write[1] + 1.55, { opacity: loopOn, baseUnits: 50 });
  pin($("#label-test"), LAYOUT.test[0], 0.6, LAYOUT.test[1] + 1.55, { opacity: loopOn, baseUnits: 50 });

  const angle = tokenAngle(time);
  const [x, , z] = loopPoint(angle);
  const heading = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const returning = heading > Math.PI + 0.05 && heading < Math.PI * 2 - 0.05;
  token.className = `bp-code ${returning ? "error" : "code"}`;
  token.textContent = returning ? "error" : "{ }";
  pin(token, x, 2.1, z, {
    opacity: fade(time, beats.firstRun - 0.1, beats.stop + 0.4, 0.15),
    scale: Math.max(0.6, world.pixelsPerUnit(x, 2, z) / 60) * backOut((time - beats.firstRun + 0.1) / 0.25),
  });

  const failShown = Math.max(...fails.map((failed) => fade(time, failed - 0.02, failed + 0.85, 0.1)));
  pin($("#verdict-fail"), LAYOUT.test[0] + 1.8, 3.8, LAYOUT.test[1], {
    opacity: failShown,
    scale: backOut((time - fails[time >= fails[1] - 0.05 ? 1 : 0] + 0.02) / 0.22) * 1.1,
  });
  pin($("#verdict-pass"), LAYOUT.test[0] + 1.8, 3.8, LAYOUT.test[1], {
    opacity: fade(time, beats.pass - 0.02, beats.learns, 0.1),
    scale: backOut((time - beats.pass) / 0.25) * 1.2,
  });
  pin($("#stop-word"), 0, 5.2, 0.25, { opacity: time >= beats.stop - 0.35 ? 1 : 0, baseUnits: 40 });
}

/* ---------- the console: the code, the test, the attempts, the limit ---------- */

const consoleBox = $("#console");
const attemptNumber = $("#attempt");
const pips = $$("#pips i");
const pipsBox = $("#pips");
const op = $("#op");
const got = $("#got");
const mark = $("#mark");
const markUse = $("#mark-use");
const code = $("#code");
const result = $("#result");
const log = $("#log");
const logRows = $$(".log-row");
const bug = $("#bug");
const OPERATORS = ["-", "*", "+"];
const RESULTS = ["-1", "6", "5"];
const LIMIT = 5;

function attemptAt(time) {
  if (time > beats.endless) {
    const running = Math.min(time, beats.stop) - beats.endless;
    return Math.floor(3 * Math.exp(running * 2.4));
  }
  return time < fixes[0] ? 1 : time < fixes[1] ? 2 : 3;
}

function drawConsole(time) {
  const shown =
    fade(time, 0.95, start[2] - 0.1) +
    fade(time, beats.firstRun - 0.1, beats.named - 0.25) +
    fade(time, beats.learns - 0.05, beats.stop - 0.05);
  consoleBox.style.opacity = String(clamp01(shown));
  consoleBox.style.transform = `translateY(${((1 - clamp01(shown)) * 24).toFixed(1)}px)`;
  if (shown <= 0.001) return;

  const attempt = attemptAt(time);
  attemptNumber.textContent = String(attempt);
  const index = Math.min(attempt, 3) - 1;
  op.textContent = OPERATORS[index];
  const failedNow = fails.findIndex((failed, at) => time >= failed && time < fixes[at]);
  const passedNow = time >= beats.pass;
  op.className = failedNow >= 0 ? "bad" : passedNow ? "good" : "";
  if (failedNow >= 0) {
    got.textContent = RESULTS[failedNow];
    mark.style.opacity = "1";
    mark.style.color = "var(--brand-ink)";
    markUse.setAttribute("href", "#i-cross");
  } else if (passedNow && time < beats.endless) {
    got.textContent = "5";
    mark.style.opacity = "1";
    mark.style.color = "var(--brand-accent)";
    markUse.setAttribute("href", "#i-check");
  } else {
    got.textContent = "?";
    mark.style.opacity = "0";
  }

  // The limit appears with the words "stopping limit", and the runaway loop blows past it.
  pipsBox.style.opacity = String(smooth((time - beats.limitWord + 0.1) / 0.25));
  pips.forEach((pip, pipIndex) => {
    pip.className = attempt > LIMIT ? "over" : pipIndex < attempt ? "on" : "";
  });

  const logging = time >= beats.learns - 0.05 && time < beats.endless;
  code.style.display = logging ? "none" : "";
  result.style.display = logging ? "none" : "";
  log.style.display = logging ? "block" : "none";
  logRows.forEach((row, rowIndex) => {
    const at = beats.learns + 0.1 + rowIndex * 0.3;
    row.style.opacity = String(smooth((time - at) / 0.15));
    row.style.transform = `translateX(${((1 - backOut((time - at) / 0.3)) * -24).toFixed(1)}px)`;
  });

  // The bug crawls along the broken line while the developer struggles.
  const crawl = clamp01((time - 1.1) / 4);
  bug.style.opacity = String(fade(time, 1.1, start[2] - 0.2, 0.15));
  bug.style.left = `${(480 + crawl * 180).toFixed(1)}px`;
  bug.style.top = `${(96 + Math.sin(time * 9) * 3).toFixed(1)}px`;
  bug.style.transform = `rotate(${(90 + Math.sin(time * 14) * 10).toFixed(1)}deg)`;
}

/* ---------- the master timeline ---------- */

export const timeline = gsap.timeline({ paused: true });
BrandKit.tornReveal(timeline, { top: "#sheet-top", bottom: "#sheet-bottom", at: 0.1 });
BrandKit.paperJump(timeline, {
  layers: ".paper-sheet",
  duration: beats.duration,
  accents: [beats.broken, beats.tested, beats.firstRun, ...fails, ...fixes, beats.pass, beats.named, beats.endless, beats.stop, beats.endCard],
});

function showLine(id, from, to) {
  timeline.fromTo(id, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power3.out" }, from);
  timeline.to(id, { y: -20, opacity: 0, duration: 0.2, ease: "power2.in" }, to - 0.2);
}
showLine("#line-idea", start[2] + 0.05, start[3] - 0.25);
showLine("#line-named", beats.named - 0.1, beats.learns - 0.05);
showLine("#line-stop", beats.stop + 0.05, beats.endCard);

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
  props: [{ art: "headphones", on: "head" }],
});
closer.group.setAttribute("transform", "translate(540 1240) scale(4)");

/* ---------- time reaches everything through one setter, which runs on any seek ---------- */

function drawFrame(time) {
  world.applyCamera(world.poseAt(time));
  drawCast(time);
  drawLabels(time);
  drawConsole(time);
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
