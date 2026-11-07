// The Three.js world: the hospital help desk where the AI router stands, the inlet road the
// requests ride in on, the railway-style switch, and the two chain roads that fork from it to
// the Scheduling desk and the Billing desk. Time alone sets every frame.
import { createStage, fade } from "../reel/stage.js";
import { backOut, clamp01, track } from "../reel/motion.js";

/** World positions shared with main.js. The fork runs away from the camera. */
export const LAYOUT = {
  router: [0, 0],
  ai: [-5.6, 0.4],
  callerA: [-3.4, 6.9],
  callerB: [3.4, 6.9],
  callerC: [1.9, 8.2],
  deskL: [-6.2, -7.4],
  deskR: [6.2, -7.4],
  nurse: [-9.5, -6.6],
  clerk: [9.5, -6.6],
};

/** Named points a request card travels between: [x, y, z]. */
export const NODES = {
  callerA: [-3.4, 6.6, 6.9],
  callerB: [3.4, 6.6, 6.9],
  inlet: [0, 1.8, 5.8],
  slot: [0, 2.0, 0.5],
  slotA: [-0.22, 1.85, 0.5],
  slotB: [0.22, 1.95, 0.55],
  hoverA: [-2.0, 3.6, 0.4],
  hoverB: [2.0, 3.6, 0.4],
  hoverC: [0, 3.7, 0.4],
  forkL: [-1.5, 1.8, -1.9],
  roadL: [-4.5, 1.8, -5.4],
  deskL: [-6.2, 3.1, -7.0],
  forkR: [1.5, 1.8, -1.9],
  roadR: [4.5, 1.8, -5.4],
  deskR: [6.2, 3.1, -7.0],
};

const ROADS = {
  inlet: { from: [0, 0.45, 6.0], to: [0, 0.45, 1.9] },
  L: { from: [-1.35, 0.45, -1.7], to: [-4.7, 0.45, -5.8] },
  R: { from: [1.35, 0.45, -1.7], to: [4.7, 0.45, -5.8] },
};

/** Where the road ride of each card starts and ends, read from its path. */
function ridesOf(cards) {
  const rides = { inlet: [], L: [], R: [] };
  for (const card of cards) {
    card.path.forEach(([node, time], index) => {
      const before = card.path[index - 1];
      if (node === "forkL" || node === "forkR") {
        const side = node.slice(-1);
        const land = card.path[index + 2][1];
        rides[side].push({ at: time, span: Math.max(0.2, land - time) });
      }
      if (node.startsWith("slot") || node.startsWith("hover")) {
        if (before && before[0] === "inlet") rides.inlet.push({ at: before[1], span: Math.max(0.2, time - before[1]) });
      }
    });
  }
  return rides;
}

export function createWorld(container, beats) {
  const closeUpRouter = { yaw: 0.05, pitch: 0.26, dist: 46, x: -2.5, y: 2.6, z: 0.4 };
  const CALLERS = { yaw: 0, pitch: 0.42, dist: 68, x: -0.8, y: 2.4, z: 3.4 };
  const OVERVIEW = { yaw: 0, pitch: 0.9, dist: 116, x: 0, y: -3.4, z: -4.5 };
  const MEDIUM = { yaw: 0, pitch: 0.72, dist: 86, x: -0.4, y: 0.6, z: -0.6 };
  const shot = (t, d, v, e) => ({ t, d, v, e });
  const keys = [
    shot(beats.you - 0.35, 0.8, CALLERS),
    shot(beats.same - 0.1, 0.7, { ...CALLERS, dist: 62, x: -0.6, z: 2.6, y: 2.8 }),
    shot(beats.first - 0.15, 0.8, OVERVIEW),
    shot(beats.figures - 0.3, 0.7, MEDIUM),
    shot(beats.toScheduling - 0.4, 0.6, OVERVIEW),
    shot(beats.routing - 0.3, 0.6, { ...OVERVIEW, dist: 120 }),
    shot(beats.remember - 0.1, 0.8, { ...MEDIUM, x: 0.2 }),
    shot(beats.sends - 0.35, 0.8, OVERVIEW),
  ];
  // While each first request rides its road, the camera leans after it.
  const adjust = (pose, time) => {
    pose.x += -1.6 * fade(time, beats.toScheduling - 0.2, beats.toBilling - 0.4, 0.6);
    pose.x += 1.6 * fade(time, beats.toBilling - 0.2, beats.every - 0.3, 0.6);
  };
  const stage = createStage(container, beats, { opening: closeUpRouter, keys, adjust });
  const { THREE, scene, materials, block, popGroup } = stage;

  /* ---------- the help desk where the AI router stands ---------- */

  const routerTop = new THREE.MeshLambertMaterial({ color: 0xe8e0d8 });
  const router = popGroup(LAYOUT.router[0], LAYOUT.router[1]);
  const deskBody = block(routerTop, 4.4, 1.3, 3.0, 0, 0.65, 0);
  // The hospital cross on the front face.
  const crossBar = block(materials.accent, 1.1, 0.3, 0.08, 0, 0.66, 1.52, false);
  const crossPost = block(materials.accent, 0.3, 1.1, 0.08, 0, 0.66, 1.52, false);
  // The one slot every request is pushed through before the fork exists.
  const slot = block(materials.ink, 1.3, 0.06, 0.36, 0, 1.31, 0.6, false);
  router.add(0, 0, 0, deskBody, crossBar, crossPost, slot);

  // The switch: an arrow on a pivot that turns to face the chosen road.
  const switchPivot = new THREE.Group();
  switchPivot.position.set(0, 1.42, -0.55);
  const switchShaft = block(materials.ink, 0.34, 0.24, 1.5, 0, 0, -0.6);
  const switchTip = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.8, 18), materials.accent);
  switchTip.rotation.x = -Math.PI / 2;
  switchTip.position.set(0, 0, -1.7);
  switchTip.castShadow = true;
  const switchHub = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 20), materials.ink);
  switchHub.castShadow = true;
  switchPivot.add(switchShaft, switchTip, switchHub);
  const switchGroup = popGroup(0, 0);
  switchGroup.add(0, 0, 0, switchPivot);

  const flipKeys = beats.flips.map((flip) => ({ t: flip.t, d: 0.18, v: { angle: flip.side * -0.62 }, e: backOut }));
  const switchAngle = (time) => track({ angle: 0 }, flipKeys, time).angle;

  /* ---------- the specialist desks, each with its signpost ---------- */

  function buildDesk(x, z) {
    const group = popGroup(x, z);
    const top = new THREE.MeshLambertMaterial({ color: 0xe8e0d8 });
    group.add(0, 0, 0, block(materials.ink, 3.6, 1.9, 2.0, 0, 0.95, 0), block(top, 4.1, 0.22, 2.4, 0, 2.0, 0));
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.8, 10), materials.ink);
    post.position.set(0, 2.4, 0);
    post.castShadow = true;
    group.add(0, -1.5, 0.12, post);
    return { group, top };
  }
  const scheduling = buildDesk(LAYOUT.deskL[0], LAYOUT.deskL[1]);
  const billing = buildDesk(LAYOUT.deskR[0], LAYOUT.deskR[1]);

  // Scheduling: a wall calendar with an orange header and one booked day.
  const calendar = new THREE.Group();
  calendar.add(block(new THREE.MeshLambertMaterial({ color: 0xe8e0d8 }), 2.0, 1.8, 0.14, 0, 0, 0));
  calendar.add(block(materials.accent, 2.0, 0.42, 0.18, 0, 0.7, 0.02));
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const booked = row === 1 && column === 2;
      calendar.add(block(booked ? materials.accent : materials.ink, 0.26, 0.22, 0.06, -0.6 + column * 0.4, 0.2 - row * 0.36, 0.09, false));
    }
  }
  calendar.position.set(0.6, 3.05, -0.55);
  scheduling.group.add(0, 0, 0.2, calendar);

  // Billing: a calculator and a stack of ledgers with an orange bookmark.
  const calculator = new THREE.Group();
  calculator.add(block(materials.ink, 1.3, 0.28, 1.6, 0, 0, 0));
  calculator.add(block(new THREE.MeshLambertMaterial({ color: 0xe8e0d8 }), 1.0, 0.06, 0.34, 0, 0.16, -0.5, false));
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const equals = row === 2 && column === 2;
      calculator.add(block(equals ? materials.accent : new THREE.MeshLambertMaterial({ color: 0xe8e0d8 }), 0.24, 0.06, 0.2, -0.34 + column * 0.34, 0.16, -0.05 + row * 0.3, false));
    }
  }
  calculator.position.set(0.9, 2.25, 0.2);
  calculator.rotation.y = -0.2;
  billing.group.add(0, 0, 0.2, calculator);
  const ledgers = new THREE.Group();
  for (let index = 0; index < 3; index += 1) {
    const ledger = block(index === 1 ? materials.ink : new THREE.MeshLambertMaterial({ color: 0xe8e0d8 }), 1.3, 0.24, 1.0, 0, 0.12 + index * 0.25, 0);
    ledger.rotation.y = (index - 1) * 0.12;
    ledgers.add(ledger);
  }
  ledgers.add(block(materials.accent, 0.16, 0.04, 0.5, 0.3, 0.76, 0.5, false));
  ledgers.position.set(-0.9, 2.1, -0.2);
  billing.group.add(0, 0, 0.3, ledgers);

  /* ---------- the chain roads ---------- */

  const links = { inlet: stage.makeLinks(8), L: stage.makeLinks(10), R: stage.makeLinks(10) };
  const rides = ridesOf(beats.cards);
  const formed = { inlet: beats.same - 0.45, L: beats.first + 0.1, R: beats.first + 0.32 };

  function roadHeat(name, time) {
    const passes = rides[name].map((ride) => stage.pulse(time, ride.at, ride.span));
    // On "right road" both roads light up; on "workflow" the scheduling road does.
    const flash =
      name === "inlet" ? 0 : Math.exp(-Math.pow((time - beats.road - 0.1) / 0.35, 2)) * 0.9 +
      (name === "L" ? Math.exp(-Math.pow((time - beats.rights[1] - 0.35) / 0.5, 2)) * 0.7 : 0);
    const wrongPath = name === "L" ? fade(time, beats.wrong - 0.05, beats.next, 0.15) * (0.55 + 0.45 * Math.sin(time * 18)) : 0;
    return (u) => clamp01(Math.max(flash, wrongPath, ...passes.map((heat) => heat(u))));
  }

  function drawRoads(time) {
    for (const name of Object.keys(links)) {
      const { from, to } = ROADS[name];
      stage.placeChain(links[name], from, to, { formedAt: formed[name], heat: roadHeat(name, time), thick: 1.15, time });
    }
  }

  /* ---------- glows on key moments ---------- */

  const flash = (time, at, width = 0.3) => Math.exp(-Math.pow((time - at) / width, 2));
  function drawGlows(time) {
    const routerHot = Math.max(flash(time, beats.not, 0.25), flash(time, beats.both, 0.18) * 0.6, flash(time, beats.routing + 0.1, 0.4));
    stage.glow(routerTop, routerHot);
    const stamps = (side) =>
      beats.cards.filter((card) => card.path.some(([node]) => node === `desk${side}`) && !card.small).map((card) => card.stamp);
    const leftHot = Math.max(0, ...stamps("L").map((at) => flash(time, at + 0.05, 0.3)));
    const rightHot = Math.max(0, ...stamps("R").map((at) => flash(time, at + 0.05, 0.3)));
    stage.glow(scheduling.top, leftHot);
    stage.glow(billing.top, rightHot);
  }

  function draw(time) {
    router.draw(time, 0.25);
    switchGroup.draw(time, beats.first + 0.25);
    // The jammed slot shudders while both requests are stuck in it.
    const jam = fade(time, beats.both - 0.05, beats.not, 0.08);
    router.root.position.x = jam * 0.08 * Math.sin(time * 70);
    const angle = switchAngle(time);
    switchPivot.rotation.y = angle;
    slot.visible = time < beats.first + 0.3;
    scheduling.group.draw(time, beats.first + 0.45);
    billing.group.draw(time, beats.first + 0.6);
    drawRoads(time);
    drawGlows(time);
    stage.drawChips(time);
    stage.render();
  }

  return { stage, draw, switchAngle };
}

