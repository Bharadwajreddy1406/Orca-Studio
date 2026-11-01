// The choreography: figures, labels and cards, all timed from window.REEL.beats.
import { createWorld, LAYOUT } from "./world.js";
import { createMember, POSES } from "./cast.js";
import { backOut, clamp01, mix, smooth, spring, track } from "./motion.js";

const { beats } = window.REEL;
const { start, whip, slabs, topple, restore, pulse } = beats;
const world = createWorld(document.getElementById("world"), beats);
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

/* ---------- the cast ---------- */

const stage = $("#figures");
const antenna = { art: "antenna", on: "head" };
const owner = createMember(stage, {
  seed: 5,
  startExpression: "happy",
  startPose: POSES.holdCup,
  apron: true,
  props: [
    { art: "flatCap", on: "head" },
    { art: "cup", on: "wristL", upright: true, scale: 1.05 },
  ],
});
const analyst = createMember(stage, {
  seed: 11,
  startExpression: "happy",
  props: [
    // The antenna springs back up once the stack has gone, and stays clear of its labels.
    { ...antenna, until: slabs[0] - 0.3 },
    { ...antenna, from: beats.broke },
    { art: "deerstalker", on: "head", from: whip[0] + 0.2 },
    { art: "magnifier", on: "wristR", from: whip[0] + 0.3 },
  ],
});
const planner = createMember(stage, {
  seed: 19,
  startExpression: "determined",
  props: [antenna, { art: "glasses", on: "head" }, { art: "clipboard", on: "wristL", upright: true }, { art: "pencil", on: "wristR", scale: 0.55 }],
});
const writer = createMember(stage, {
  seed: 29,
  startExpression: "thinking",
  props: [antenna, { art: "beret", on: "head" }, { art: "pencil", on: "wristR", scale: 1.25 }],
});
const inspector = createMember(stage, {
  seed: 41,
  startExpression: "determined",
  props: [antenna, { art: "hardHat", on: "head" }, { art: "stamp", on: "wristR", scale: 1.15 }],
});
const workers = [analyst, planner, writer, inspector];

/* ---------- the analyst is the AI: the hook, the massive prompt, then step 1 ---------- */

const ai = analyst.figure;
ai.pose("pointing_up", { at: beats.heroStart, duration: 0.3, ease: "back.out(1.6)" });
ai.say("delighted", { at: beats.chaining });
ai.pose("standing", { at: beats.massive - 0.3 });
ai.say("neutral", { at: beats.massive });
ai.say("confused", { at: slabs[0] });
slabs.forEach((landing, index) => {
  ai.pose(POSES.strain(index), { at: landing - 0.04, duration: 0.14, ease: "back.out(2)" });
});
ai.say("shocked", { at: slabs[3] });
ai.pose("cheering", { at: beats.broke + 0.05, duration: 0.3, ease: "back.out(1.8)" });
ai.say("delighted", { at: beats.broke + 0.05 });
ai.pose("presenting", { at: beats.smaller + 0.05, duration: 0.3 });
ai.say("happy", { at: beats.smaller + 0.05 });
ai.walk({ at: whip[0] - 0.1, until: whip[0] + 0.45, strideRate: 2.2 });
for (let time = start[4] + 0.05, swing = 0; time < whip[1] - 0.2; time += 0.42, swing += 1) {
  ai.pose(swing % 2 ? POSES.sweepIn : POSES.sweepOut, { at: time, duration: 0.36, ease: "sine.inOut" });
}
ai.say("thinking", { at: start[4] + 0.1 });
ai.say("delighted", { at: beats.audience });

const plan = planner.figure;
plan.pose("pointing", { at: whip[1] + 0.1, duration: 0.3 });
for (let time = start[5] + 0.3, swing = 0; time < whip[2] - 0.2; time += 0.3, swing += 1) {
  plan.pose(swing % 2 ? POSES.noteLow : POSES.noteHigh, { at: time, duration: 0.24, ease: "sine.inOut" });
}
plan.say("happy", { at: beats.outline });

const write = writer.figure;
write.pose("cheering", { at: beats.input, duration: 0.2, ease: "back.out(2)" });
write.say("delighted", { at: beats.input });
write.pose("standing", { at: beats.benefits, duration: 0.3 });
write.pose(POSES.writeUp, { at: whip[2] + 0.2, duration: 0.3 });
for (let time = start[6] + 0.1, swing = 0; time < whip[3] - 0.2; time += 0.2, swing += 1) {
  write.pose(swing % 2 ? POSES.writeUp : POSES.writeDown, { at: time, duration: 0.16, ease: "sine.inOut" });
}
write.say("delighted", { at: beats.caption });

const inspect = inspector.figure;
inspect.pose(POSES.stampUp, { at: beats.check - 0.75, duration: 0.45, ease: "power3.out" });
inspect.pose(POSES.stampDown, { at: beats.check - 0.07, duration: 0.08, ease: "power3.in" });
inspect.say("happy", { at: beats.check });
inspect.pose("standing", { at: beats.overview + 0.2, duration: 0.4 });

/* ---------- everyone: the overview, the pulse, the fall, the recovery, the tease ---------- */

workers.forEach((member, index) => {
  const figure = member.figure;
  if (index < 3) figure.pose("standing", { at: beats.overview, duration: 0.4 });
  figure.say("thinking", { at: beats.overview });
  figure.pose("cheering", { at: pulse[index], duration: 0.22, ease: "back.out(2)" });
  figure.say("delighted", { at: pulse[index] });
  figure.pose("standing", { at: pulse[index] + 0.9, duration: 0.3 });
  figure.say("happy", { at: beats.called });
  figure.pose("shocked", { at: topple[index] - 0.08, duration: 0.1, ease: "back.out(2)" });
  figure.say("shocked", { at: topple[index] - 0.08 });
  figure.pose("cheering", { at: restore[index] + 0.1, duration: 0.3, ease: "back.out(2)" });
  figure.say("delighted", { at: restore[index] + 0.1 });
  figure.walk({ at: beats.parallelMove, until: beats.parallelMove + 0.9, strideRate: 2 });
  figure.pose("presenting", { at: beats.parallelMove + 1, duration: 0.3 });
});
inspect.say("confused", { at: beats.mistake });
plan.say("confused", { at: beats.mistake });
write.say("confused", { at: beats.mistake });
ai.say("sad", { at: beats.mistake });

const shopFigure = owner.figure;
shopFigure.pose(POSES.raiseCup, { at: beats.coffeeShop, duration: 0.3, ease: "back.out(1.6)" });
shopFigure.say("delighted", { at: beats.coffeeShop });
shopFigure.pose("pointing", { at: beats.instagram - 0.05, duration: 0.25 });
shopFigure.pose(POSES.raiseCup, { at: beats.newCoffee, duration: 0.3, ease: "back.out(1.6)" });

/* ---------- where each figure stands ---------- */

function aiPlace(time) {
  const spot = track(
    { x: LAYOUT.heroX + 3.6, z: 1.4 },
    [
      { t: beats.shop, d: 0.01, v: { x: LAYOUT.yardX, z: 1 } },
      { t: beats.broke + 0.1, d: 0.5, e: spring, v: { x: LAYOUT.yardX - 5.6, z: 1.7 } },
    ],
    time,
  );
  return spot;
}

function workerPlace(index, time) {
  const [x, z] = world.stationAt(index, time);
  // On the wide shot each figure steps aside, so its plinth and number stay readable.
  return { x: x - 2.6, z: z + 1.5 + world.overviewAmount(time) * 4.5 };
}

function placeMember(member, x, z, heightUnits, scale, tilt, time) {
  member.draw(time);
  const feet = world.toScreen(x, 0, z);
  const pixels = world.pixelsPerUnit(x, 0, z);
  const size = (pixels * heightUnits * scale) / 100;
  member.group.setAttribute(
    "transform",
    `translate(${feet.x.toFixed(2)} ${feet.y.toFixed(2)}) rotate(${tilt.toFixed(2)}) scale(${Math.max(size, 0.0001).toFixed(4)})`,
  );
}

const FIGURE_UNITS = 5;

function drawCast(time) {
  const ownerVisible = time >= beats.shop - 0.1 && time < beats.shopGone;
  owner.group.style.display = ownerVisible ? "" : "none";
  if (ownerVisible) {
    placeMember(owner, LAYOUT.shopX - 3.7, 1.2, FIGURE_UNITS, backOut((time - beats.shop - 0.1) / 0.32), 0, time);
  }
  const grow = 1 + 0.8 * world.overviewAmount(time);
  workers.forEach((member, index) => {
    const fall = world.toppleOf(index, time);
    const tilt = fall * 78 * (index % 2 ? 1 : -1);
    if (index === 0) {
      const onStation = spring((time - whip[0] + 0.05) / 0.5);
      const before = aiPlace(time);
      const after = workerPlace(0, time);
      const hiddenInShop = time >= beats.shop - 0.02 && time < beats.massive - 0.28;
      member.group.style.display = hiddenInShop ? "none" : "";
      if (hiddenInShop) return;
      const appear = time < beats.shop ? backOut((time - beats.heroStart) / 0.3) : 1;
      placeMember(
        member,
        mix(before.x, after.x, onStation),
        mix(before.z, after.z, onStation),
        FIGURE_UNITS,
        appear * grow,
        tilt,
        time,
      );
      return;
    }
    const arrive = time - whip[index] - 0.3;
    member.group.style.display = arrive < 0 ? "none" : "";
    if (arrive < 0) return;
    const { x, z } = workerPlace(index, time);
    placeMember(member, x, z, FIGURE_UNITS, backOut(arrive / 0.32) * grow, tilt, time);
  });
}

/** The top of the AI's head and raised hands in world units, so the stack rests on them. */
function stackBase(time) {
  const joints = analyst.figure.poseAt(time);
  const shrink = FIGURE_UNITS / 100;
  const armLift = (angle, length) => Math.cos((angle * Math.PI) / 180) * length;
  const wrist = 29 - 3.5 - armLift(joints.armRUpper, 14.5) - armLift(joints.armRLower, 14);
  const headTop = 29 + 2.2 + 24;
  const hipDrop = Math.max(
    armLift(joints.legLUpper, 18.5) + armLift(joints.legLLower, 18.5),
    armLift(joints.legRUpper, 18.5) + armLift(joints.legRLower, 18.5),
  );
  return (hipDrop + Math.max(wrist, headTop)) * shrink;
}

/* ---------- labels that stay pinned to the world ---------- */

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

const slabLabels = $$(".slab-label");
const stepNumbers = $$(".step-number");
const ticks = $$(".tick");
const shopSign = $("#shop-sign");
const botName = $("#bot-name");
const bug = $("#bug");
const arrow = $("#arrow");
const xmark = $("#xmark");
const handoff = $("#handoff");
const handoffOutput = $("#handoff-output");
const handoffInput = $("#handoff-input");
const steamPaths = $$("#steam path");

function drawLabels(time, base) {
  const shopIn = spring((time - beats.shop - 0.15) / 0.3) * (1 - spring((time - beats.shopGone + 0.45) / 0.2));
  pin(shopSign, LAYOUT.shopX + 1.3, 1.1, 0.32, { opacity: shopIn });
  pin(botName, LAYOUT.yardX - 4.1, 1.2, 1, {
    opacity: smooth((time - beats.chatgpt) / 0.2) * (1 - smooth((time - beats.broke) / 0.15)),
    baseUnits: 70,
  });

  slabLabels.forEach((label, index) => {
    const state = world.slabState(index, time, base);
    const opacity = clamp01((time - slabs[index] + 0.06) / 0.08) * (1 - smooth((time - beats.broke) / 0.1));
    pin(label, state.x, state.y, state.z + 1.5, { opacity, baseUnits: 70 });
  });

  stepNumbers.forEach((number, index) => {
    const state = world.slabState(index, time, base);
    const appear = backOut((time - beats.broke - 0.45 - index * 0.08) / 0.25);
    const fall = world.toppleOf(index, time);
    const faceY = state.y + (time > beats.slabFlight[index] + 0.5 ? 0 : 0) + state.arc;
    const pixels = world.pixelsPerUnit(state.x, faceY, state.z);
    pin(number, state.x, faceY, state.z + state.depth / 2, {
      opacity: clamp01(appear) * (1 - fall),
      scale: Math.max(0.62, pixels / 96) * clamp01(appear),
    });
  });

  const clearOut = 1 - smooth((time - beats.careful) / 0.2);
  ticks.forEach((tick, index) => {
    const [x, z] = world.stationAt(index, time);
    const at = beats.manage + index * 0.07;
    pin(tick, x + 1.8, 5.2, z - 0.5, {
      opacity: clamp01((time - at) / 0.1) * clearOut * (1 - smooth((time - beats.debug) / 0.15)),
      scale: backOut((time - at) / 0.2) * 0.72,
    });
  });

  const [fromX, fromZ] = world.stationAt(1, time);
  const [toX, toZ] = world.stationAt(2, time);
  const bugWalk = clamp01((time - beats.debug + 0.25) / 0.5);
  const squash = smooth((time - beats.debug - 0.26) / 0.06);
  const bugPoint = world.toScreen(mix(fromX + 4, toX - 0.7, 0.35 + bugWalk * 0.3), 0.7, mix(fromZ, toZ, 0.5));
  bug.style.opacity = String(
    clamp01((time - beats.debug + 0.25) / 0.1) * (1 - smooth((time - beats.debug - 0.5) / 0.14)),
  );
  bug.style.transform = `translate(${bugPoint.x.toFixed(1)}px, ${bugPoint.y.toFixed(1)}px) rotate(${(70 + Math.sin(time * 40) * 7).toFixed(1)}deg) scale(${(0.82 * (1 + squash * 0.5)).toFixed(3)}, ${(0.82 * (1 - squash * 0.78)).toFixed(3)})`;

  const [liftX, liftZ] = world.stationAt(2, time);
  pin(arrow, liftX + 1.8, 7, liftZ - 0.5, {
    opacity: clamp01((time - beats.improve) / 0.1) * clearOut,
    scale: backOut((time - beats.improve) / 0.25),
  });

  const [firstX, firstZ] = world.stationAt(0, time);
  pin(xmark, firstX + 1.8, 2.6, firstZ - 0.5, {
    opacity: clamp01((time - beats.mistake) / 0.05) * (1 - smooth((time - restore[0]) / 0.14)),
    scale: backOut((time - beats.mistake) / 0.22) * 1.25,
  });

  // The card crosses the joint, and its tag flips as it goes over the link's midpoint.
  const crossing = smooth((time - beats.output) / Math.max(0.3, beats.input - beats.output));
  const flipped = time >= beats.input;
  handoffOutput.style.display = flipped ? "none" : "";
  handoffInput.style.display = flipped ? "" : "none";
  const flip = Math.abs(Math.cos(Math.PI * clamp01((time - beats.input + 0.08) / 0.16)));
  pin(handoff, mix(fromX + 4.3, toX - 0.7, 0.12 + crossing * 0.56), 2.5, mix(fromZ, toZ, 0.12 + crossing * 0.56), {
    opacity: clamp01((time - beats.output + 0.1) / 0.15) * (1 - smooth((time - beats.benefits) / 0.2)),
    scale: backOut((time - beats.output + 0.1) / 0.25),
  });
  handoff.style.transform += ` scaleX(${Math.max(flip, 0.04).toFixed(3)})`;

  const steam = shopIn * smooth((time - beats.shop - 0.7) / 0.4);
  const cup = world.toScreen(LAYOUT.shopX + 0.9, 4.15, -0.6);
  steamPaths.forEach((path, index) => {
    const offset = (index - 1) * 26;
    let line = "";
    for (let step = 0; step <= 12; step += 1) {
      const up = step * 13;
      const wave = Math.sin(step * 0.8 - time * 3.4 + index * 1.7) * (4 + step * 1.3);
      line += `${step ? "L" : "M"}${(cup.x + offset + wave).toFixed(1)} ${(cup.y - 8 - up).toFixed(1)}`;
    }
    path.setAttribute("d", line);
    path.setAttribute("opacity", String(steam));
  });
}

/* ---------- typed prompts ---------- */

const typed = [0, 1, 2, 3].map((index) => {
  const element = $(`#prompt-${index} .prompt-text`);
  const caret = document.createElement("span");
  caret.className = "prompt-caret";
  const words = document.createTextNode("");
  element.append(words, caret);
  return { words, caret, text: element.dataset.text, from: start[4 + index] + 0.05, until: index === 0 ? start[4] + 1.45 : start[4 + index] + 1.0 };
});
const chatText = $("#chat-text");
const chatCaret = document.createElement("span");
chatCaret.className = "prompt-caret";
const chatWords = document.createTextNode("");
chatText.append(chatWords, chatCaret);
typed.push({ words: chatWords, caret: chatCaret, text: chatText.dataset.text, from: beats.chatgpt + 0.2, until: slabs[0] - 0.1 });

function drawTyping(time) {
  typed.forEach(({ words, caret, text, from, until }) => {
    const count = Math.round(text.length * clamp01((time - from) / (until - from)));
    const shown = text.slice(0, count);
    if (words.data !== shown) words.data = shown;
    caret.style.visibility = time > until + 0.2 ? "hidden" : "";
  });
}

/* ---------- the master timeline ---------- */

export const timeline = gsap.timeline({ paused: true });
BrandKit.tornReveal(timeline, { top: "#sheet-top", bottom: "#sheet-bottom", at: 0.1 });
BrandKit.paperJump(timeline, {
  layers: ".paper-sheet",
  duration: beats.duration,
  accents: [beats.chaining, beats.shop, ...slabs, beats.broke, ...whip, beats.check, beats.overview, beats.output, beats.mistake, beats.entire, start[13], beats.parallel, beats.endCard],
});

function showLine(id, from, to) {
  timeline.fromTo(id, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.34, ease: "power3.out" }, from);
  timeline.to(id, { y: -20, opacity: 0, duration: 0.2, ease: "power2.in" }, to - 0.2);
}
showLine("#line-hook", start[0] + 0.1, beats.shop - 0.1);
showLine("#line-shop", beats.shop + 0.15, beats.massive - 0.1);
showLine("#line-massive", beats.massiveWord - 0.08, beats.broke);
showLine("#line-smaller", beats.smaller - 0.15, whip[0] + 0.05);
showLine("#line-notice", start[8] + 0.05, start[9]);
showLine("#line-builds", start[9] + 0.05, beats.called);
showLine("#line-name", beats.called + 0.2, beats.junction + 0.1);
showLine("#line-handoff", beats.output - 0.05, beats.benefits);
showLine("#line-mistake", beats.mistake - 0.2, start[13] - 0.05);
showLine("#line-again", start[13] + 0.05, start[14] - 0.02);
showLine("#line-next", start[14] + 0.05, beats.endCard);

timeline.fromTo("#chat-bar", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "back.out(1.6)" }, beats.chatgpt - 0.02);
timeline.to("#chat-bar", { y: -30, opacity: 0, duration: 0.18, ease: "power2.in" }, beats.broke - 0.05);

// The prompts and their output cards. Each card flies into the next prompt as its input chip.
const CHIP_FLIGHT = { x: -334, y: -222, scale: 0.17 };
[0, 1, 2, 3].forEach((index) => {
  const prompt = `#prompt-${index}`;
  timeline.fromTo(prompt, { x: 1100, opacity: 1 }, { x: 0, opacity: 1, duration: 0.5, ease: "power4.out" }, whip[index] + 0.12);
  if (index < 3) {
    timeline.to(prompt, { x: -1000, duration: 0.42, ease: "power3.in" }, whip[index + 1] + 0.02);
  } else {
    timeline.to(prompt, { y: -40, opacity: 0, duration: 0.32, ease: "power2.in" }, beats.overview);
  }
});
[1, 2, 3].forEach((index) => {
  timeline.fromTo(`#prompt-${index} .prompt-chip`, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.26, ease: "back.out(2.4)" }, whip[index] + 0.5);
});

beats.artLand.forEach((landing, index) => {
  const art = `#art-${index}`;
  timeline.fromTo(art, { y: 240, scaleY: 0.05, opacity: 0 }, { y: 0, scaleY: 1, opacity: 1, duration: 0.42, ease: "back.out(1.5)" }, landing - 0.06);
  if (index < 3) {
    timeline.to(art, { ...CHIP_FLIGHT, duration: 0.52, ease: "power3.inOut" }, whip[index + 1]);
    timeline.to(art, { opacity: 0, duration: 0.08 }, whip[index + 1] + 0.5);
  } else {
    timeline.to(art, { scale: 0.2, x: 40, y: 40, opacity: 0, duration: 0.5, ease: "power3.in" }, beats.overview);
  }
});

// What fills in on each card, on its word.
timeline.fromTo("#art-who", { opacity: 0 }, { opacity: 1, duration: 0.2 }, beats.audience + 0.2);
timeline.fromTo("#art-0 .tag", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.26, stagger: 0.14, ease: "back.out(2.2)" }, beats.selling);
// The outline fills in row by row, and its last row arrives on the word "outline".
const outlineStep = (beats.outline - beats.artLand[1] - 0.3) / 2;
timeline.fromTo("#art-1 .row", { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.24, stagger: outlineStep, ease: "power3.out" }, beats.artLand[1] + 0.3);
timeline.fromTo("#art-1 .row-bars", { scaleX: 0 }, { scaleX: 1, duration: 0.3, stagger: outlineStep, ease: "power2.out" }, beats.artLand[1] + 0.38);
// The caption writes itself a word at a time, finishing on the word "caption".
const captionWords = $$("#art-2 .quote span");
const captionStep = (beats.caption - beats.artLand[2] - 0.3) / (captionWords.length - 1);
timeline.fromTo(captionWords, { opacity: 0 }, { opacity: 1, duration: 0.1, stagger: captionStep }, beats.artLand[2] + 0.3);
timeline.fromTo("#art-2 .underline", { opacity: 0, scaleX: 0, transformOrigin: "0% 50%" }, { opacity: 1, scaleX: 1, duration: 0.3, ease: "power2.out" }, beats.caption + 0.3);
timeline.fromTo("#stamp", { scale: 2.4, opacity: 0, rotation: -18 }, { scale: 1, opacity: 1, rotation: -9, duration: 0.08, ease: "power4.in" }, beats.check - 0.05);

// The phone: an empty post at the start, and the finished post at the end.
timeline.fromTo("#phone", { y: 1400, opacity: 1 }, { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.3)" }, beats.instagram - 0.12);
timeline.to("#phone", { x: -1100, rotation: -6, duration: 0.5, ease: "power3.in" }, beats.massive - 0.28);
timeline.set("#phone", { x: -274, y: 1500, rotation: 0, scale: 1.26 }, start[13] - 0.1);
timeline.set("#post-empty", { opacity: 0 }, start[13] - 0.1);
timeline.set("#post-cup", { opacity: 1 }, start[13] - 0.1);
timeline.set("#post-lines", { opacity: 0 }, start[13] - 0.1);
timeline.set("#post-caption", { opacity: 1 }, start[13] - 0.1);
timeline.to("#phone", { y: -40, duration: 0.5, ease: "back.out(1.4)" }, start[13] + 0.05);
timeline.fromTo("#heart", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(3)" }, beats.you - 0.02);
timeline.to("#phone", { y: 1700, duration: 0.38, ease: "power3.in" }, start[14] - 0.12);

// The three benefits land on their words, each with the chain answering it.
[["#benefit-manage", beats.manage], ["#benefit-debug", beats.debug], ["#benefit-improve", beats.improve]].forEach(([id, at]) => {
  timeline.fromTo(id, { y: 40, scale: 0.7, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.26, ease: "back.out(2)" }, at - 0.04);
  timeline.to(id, { y: -20, opacity: 0, duration: 0.2, ease: "power2.in" }, beats.careful);
});

// The end card, and a closing figure with the same cup.
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
  props: [antenna],
});
closer.group.setAttribute("transform", "translate(540 1240) scale(4)");

// A small crowd for the audience card, drawn once.
$("#crowd").innerHTML = [
  { seed: 3, expression: "happy" },
  { seed: 8, expression: "delighted" },
  { seed: 14, expression: "happy" },
]
  .map((options) => BrandStickman.renderSvg({ pose: "standing", ...options }))
  .join("");
timeline.fromTo("#crowd svg", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.07, ease: "back.out(2)" }, beats.audience);

/* ---------- time reaches everything through one setter, which runs on any seek ---------- */

function drawFrame(time) {
  // The camera must be current before anything is projected.
  world.applyCamera(world.poseAt(time));
  const base = stackBase(time);
  drawCast(time);
  drawLabels(time, base);
  drawTyping(time);
  closer.draw(time);
  world.draw(time, base);
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
