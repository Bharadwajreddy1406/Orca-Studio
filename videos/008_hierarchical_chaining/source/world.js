// The Three.js world: one giant gift box ("Birthday party") that splits into three plinths,
// Food splitting again into three smaller ones, joined by chains into a task tree. In the catch
// the tree over-splits into dozens of tiny pieces; at the party they clear and confetti flies.
// Time alone sets every frame.
import { createStage, THREE } from "../reel/stage.js";
import { backOut, clamp01, mix, seeded, smooth, spring } from "../reel/motion.js";

// Kept in step with ROOT, LEVEL_TWO and LEVEL_THREE in build_timeline.py.
export const LAYOUT = {
  root: [0, -11],
  box: [5.2, 3.6, 4.4],
  levelTwo: [[-6, -1.5], [0, -1.5], [6, -1.5]],
  levelThree: [[-5, 8], [0, 8], [5, 8]],
  levelFourZ: 12,
  levelFiveZ: 15.2,
};
const TWO = { w: 4.2, h: 1.2, d: 3 };
const THREE_SIZE = { w: 3.4, h: 1, d: 2.4 };
const FOUR = { w: 1.05, h: 0.5, d: 0.8 };
const FIVE = 0.36;
// Where each Level 3 chain meets its plinth, and where its worker stands, so neither hides the other.
export const CHAIN_END = [0.6, -0.7, -0.6];
export const WORKER_OFFSET = [-0.8, 0.85, 0.8];

const peak = (time, at, width) => Math.exp(-Math.pow((time - at) / width, 2));

export function createWorld(container, beats) {
  const { levelTwo, levelThree, levels } = beats;
  const [rootX, rootZ] = LAYOUT.root;

  /* ---------- camera ---------- */

  const shot = (t, d, v, e) => ({ t, d, v, e });
  // Low and close: the box looms over the planner.
  const opening = { yaw: 0.05, pitch: 0.12, dist: 60, x: rootX, y: 3.4, z: rootZ + 3.6 };
  const TREE_TOP = { yaw: 0, pitch: 0.8, dist: 92, x: 0, y: 0, z: -5.2 };
  const FOOD_DIVE = { yaw: 0.02, pitch: 0.72, dist: 82, x: 0, y: 0, z: 6.6 };
  const OVERVIEW = { yaw: 0, pitch: 0.98, dist: 122, x: 0, y: 0, z: 0.6 };
  const NAMED = { yaw: 0, pitch: 1.02, dist: 128, x: 0, y: 0, z: -0.1 };
  const SPRAWL = { yaw: 0, pitch: 1.06, dist: 185, x: 0, y: 0, z: 3.4 };
  const OVERWHELMED = { ...SPRAWL, dist: 178, z: 5.2 };
  const PARTY = { yaw: 0, pitch: 0.96, dist: 140, x: 0, y: 0, z: 0.8 };
  const keys = [
    shot(beats.huge - 0.25, 0.7, { dist: 57, pitch: 0.06, y: 3.6 }),
    shot(beats.splits - 0.05, 1.0, TREE_TOP),
    shot(beats.stop - 0.5, 1.0, { ...TREE_TOP, z: -3.8, dist: 86 }),
    shot(beats.foodAgain - 0.1, 0.9, FOOD_DIVE),
    shot(levels[0] - 0.3, 0.8, OVERVIEW),
    shot(beats.pieces - 0.15, 0.8, FOOD_DIVE),
    shot(beats.named - 0.4, 0.8, NAMED),
    shot(beats.tooFar - 0.3, 0.8, SPRAWL),
    shot(beats.managing - 0.3, beats.doing - beats.managing + 0.3, OVERWHELMED),
    shot(beats.letsParty - 0.1, 0.6, PARTY),
  ];
  // While the tree over-splits, the camera wobbles a little more each beat: things get out of hand.
  function adjust(pose, time) {
    const dizzy = smooth((time - beats.managing) / 0.6) * (1 - smooth((time - beats.party + 0.4) / 0.3));
    pose.yaw += dizzy * 0.05 * Math.sin(time * 5.1);
    pose.pitch += dizzy * 0.025 * Math.sin(time * 3.7 + 1);
  }
  const stage = createStage(container, beats, { opening, keys, adjust });
  const { scene, materials, block, plinth, glow, popGroup, makeLinks, placeChain, pulse } = stage;

  /* ---------- the giant gift box: "Birthday party" ---------- */

  const [boxW, boxH, boxD] = LAYOUT.box;
  const boxMaterial = new THREE.MeshLambertMaterial({ color: 0xe8e0d8 });
  const box = new THREE.Group();
  box.position.set(rootX, 0, rootZ);
  scene.add(box);
  const body = block(boxMaterial, boxW, boxH, boxD, 0, boxH / 2, 0);
  // A ribbon round the sides and across the top, in accent.
  const band = block(materials.accent, boxW + 0.04, boxH + 0.04, 0.62, 0, boxH / 2, 0, false);
  box.add(body, band);
  const lid = new THREE.Group();
  lid.position.set(0, boxH, 0);
  const lidSlab = block(boxMaterial, boxW + 0.36, 0.6, boxD + 0.36, 0, 0.3, 0);
  const lidBand = block(materials.accent, boxW + 0.4, 0.64, 0.62, 0, 0.3, 0, false);
  const lidBandAcross = block(materials.accent, 0.62, 0.64, boxD + 0.4, 0, 0.3, 0, false);
  lid.add(lidSlab, lidBand, lidBandAcross);
  const bowGeometry = new THREE.TorusGeometry(0.7, 0.22, 10, 24);
  [-1, 1].forEach((side) => {
    const loop = new THREE.Mesh(bowGeometry, materials.accent);
    loop.position.set(side * 0.66, 1.0, 0);
    loop.rotation.set(0, 0, side * 0.5);
    loop.castShadow = true;
    lid.add(loop);
  });
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), materials.accent);
  knot.position.set(0, 0.74, 0);
  lid.add(knot);
  box.add(lid);

  function boxScaleAt(time) {
    const swell = backOut((time - beats.huge + 0.05) / 0.4);
    const shrink = spring((time - beats.splits) / 0.5);
    return mix(1, mix(1.32, 1, shrink), time < beats.huge - 0.05 ? 0 : swell);
  }

  function drawBox(time) {
    const appear = backOut((time - 0.3) / 0.45);
    box.visible = time >= 0.2;
    const size = Math.max(0.0001, appear * boxScaleAt(time));
    // A nervous quiver while the planner stares at it.
    const quiver = (time > beats.huge && time < beats.splits ? 0.02 : 0) * Math.sin(time * 40);
    box.scale.set(size * (1 + quiver), size * (1 - quiver), size * (1 + quiver));
    // The lid blows off on "splits", spinning up and away: the big task is opened up.
    const flight = clamp01((time - beats.splits) / 0.8);
    lid.visible = flight < 1;
    lid.position.set(flight * 3.2, boxH + 13 * flight - 4 * flight * flight, -flight * 1.5);
    lid.rotation.set(0.6 * flight, 0, -2.4 * flight);
    lid.scale.setScalar(Math.max(0.0001, 1 - smooth((flight - 0.45) / 0.55)));
    // The box glows as Level 1 on "big", and as part of the whole chain on the name.
    glow(boxMaterial, peak(time, levels[0], 0.35) * 0.85 + peak(time, beats.named, 0.4) * 0.6);
  }

  /* ---------- level 2: Venue, Food, Decorations ---------- */

  const twoPlinths = levelTwo.map(() => plinth(TWO.w, TWO.h, TWO.d));
  const twoGroups = LAYOUT.levelTwo.map(([x, z], index) => {
    const group = popGroup(x, z);
    group.add(0, 0, 0, twoPlinths[index]);
    return group;
  });
  const rootToTwo = LAYOUT.levelTwo.map(() => makeLinks(5));

  /* ---------- level 3: Menu, Guests, Shopping list ---------- */

  const threePlinths = levelThree.map(() => plinth(THREE_SIZE.w, THREE_SIZE.h, THREE_SIZE.d));
  const threeGroups = LAYOUT.levelThree.map(([x, z], index) => {
    const group = popGroup(x, z);
    group.add(0, 0, 0, threePlinths[index]);
    return group;
  });
  const foodToThree = LAYOUT.levelThree.map(() => makeLinks(6));

  /* ---------- the over-split: levels 4 and 5, dozens of tiny pieces ---------- */

  const fourNodes = [];
  const fiveNodes = [];
  LAYOUT.levelThree.forEach(([x3], parent) => {
    [-1.45, 0, 1.45].forEach((offset, child) => {
      const x4 = x3 + offset;
      const order = parent * 3 + child;
      const mesh = block(materials.bone, FOUR.w, FOUR.h, FOUR.d, 0, FOUR.h / 2, 0);
      const group = popGroup(x4, LAYOUT.levelFourZ);
      group.add(0, 0, 0, mesh);
      fourNodes.push({ x: x4, parent, order, group, links: makeLinks(3) });
      [-0.48, 0, 0.48].forEach((offset5, grandchild) => {
        const cube = block(materials.bone, FIVE, FIVE, FIVE, 0, FIVE / 2, 0);
        const tiny = popGroup(x4 + offset5, LAYOUT.levelFiveZ);
        tiny.add(0, 0, 0, cube);
        fiveNodes.push({ x: x4 + offset5, parentX: x4, order: order * 3 + grandchild, group: tiny, links: makeLinks(3) });
      });
    });
  });
  const overGone = beats.party - 0.05;
  const fourAt = (order) => beats.tooFar + order * 0.05;
  const fiveAt = (order) => beats.far - 0.1 + order * 0.018;

  function drawTree(time) {
    const managing = smooth((time - beats.managing) / 0.3) * (1 - smooth((time - overGone) / 0.2));
    // Level 2: each plinth lands on its word, its chain sliding out of the box.
    LAYOUT.levelTwo.forEach(([x, z], index) => {
      twoGroups[index].draw(time, levelTwo[index]);
      const from = [rootX + (index - 1) * 1.3, 0.4, rootZ + boxD / 2];
      const to = [x, 0.5, z - TWO.d / 2];
      const formed = levelTwo[index] - 0.35;
      const heat = (u) =>
        Math.max(
          pulse(time, formed, 0.35)(u),
          pulse(time, levels[1] - 0.35, 0.35)(u),
          pulse(time, beats.named - 0.2, 0.5)(u),
          managing * flicker(time, index),
        );
      placeChain(rootToTwo[index], from, to, { formedAt: formed, stagger: 0.05, heat, time });
      const lit =
        peak(time, levelTwo[index], 0.22) +
        (index === 1 ? peak(time, beats.stop, 0.3) + peak(time, beats.foodSplits, 0.3) : 0) +
        peak(time, levels[1], 0.35) * 0.85 +
        peak(time, beats.named + 0.25, 0.4) * 0.6;
      glow(twoPlinths[index].material, lit);
    });
    // Level 3: Food splits again.
    LAYOUT.levelThree.forEach(([x, z], index) => {
      threeGroups[index].draw(time, levelThree[index]);
      const [foodX, foodZ] = LAYOUT.levelTwo[1];
      const from = [foodX + (index - 1) * 1.2, 0.35, foodZ + TWO.d / 2];
      const to = [x + CHAIN_END[index], 0.4, z - THREE_SIZE.d / 2];
      const formed = beats.foodSplits + index * 0.12;
      const heat = (u) =>
        Math.max(
          pulse(time, formed, 0.4)(u),
          pulse(time, levels[2] - 0.35, 0.35)(u),
          pulse(time, beats.named + 0.2, 0.5)(u),
          managing * flicker(time, index + 3),
        );
      placeChain(foodToThree[index], from, to, { formedAt: formed, stagger: 0.05, thick: 0.85, heat, time });
      const lit =
        peak(time, levelThree[index], 0.22) +
        peak(time, levels[2], 0.35) * 0.85 +
        peak(time, beats.check + index * 0.12, 0.25) * 0.8 +
        peak(time, beats.named + 0.55, 0.4) * 0.6;
      glow(threePlinths[index].material, lit);
    });
    // Levels 4 and 5 sprout on "split too far" and clear away for the party.
    fourNodes.forEach((node) => {
      const at = fourAt(node.order);
      node.group.draw(time, at, overGone + node.order * 0.01);
      const x3 = LAYOUT.levelThree[node.parent][0];
      placeChain(node.links, [x3 + (node.x - x3) * 0.35, 0.45, LAYOUT.levelThree[0][1] + THREE_SIZE.d / 2], [node.x, 0.3, LAYOUT.levelFourZ - FOUR.d / 2], {
        formedAt: at - 0.1,
        gone: overGone,
        stagger: 0.04,
        thick: 0.5,
        heat: () => managing * flicker(time, 10 + node.order),
        time,
      });
    });
    fiveNodes.forEach((node) => {
      const at = fiveAt(node.order);
      node.group.draw(time, at, overGone + 0.05);
      placeChain(node.links, [node.parentX + (node.x - node.parentX) * 0.3, 0.25, LAYOUT.levelFourZ + FOUR.d / 2], [node.x, 0.18, LAYOUT.levelFiveZ - FIVE / 2], {
        formedAt: at - 0.08,
        gone: overGone,
        stagger: 0.03,
        thick: 0.32,
        heat: () => managing * flicker(time, 40 + node.order),
        time,
      });
    });
  }

  // Coordination traffic: chains flash on and off, out of step with each other.
  function flicker(time, index) {
    const phase = Math.sin(time * (7 + (index % 5)) + index * 1.7);
    return phase > 0.55 ? 1 : 0;
  }

  /* ---------- the party: confetti in ink and accent, and balloons ---------- */

  const CONFETTI = 90;
  const confettiSources = [
    [rootX, 5.2, rootZ],
    ...LAYOUT.levelTwo.map(([x, z]) => [x, 1.6, z]),
    ...LAYOUT.levelThree.map(([x, z]) => [x, 1.4, z]),
  ];
  const paperBit = new THREE.PlaneGeometry(1, 0.55);
  const confettiSets = [materials.accent, materials.ink].map((material) => {
    const mesh = new THREE.InstancedMesh(paperBit, material.clone(), CONFETTI);
    mesh.material.side = THREE.DoubleSide;
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  });
  const random = seeded(71);
  const confettiParts = confettiSets.map(() =>
    Array.from({ length: CONFETTI }, (_, index) => ({
      source: confettiSources[index % confettiSources.length],
      delay: random() * 0.25,
      vx: (random() - 0.5) * 10,
      vy: 7 + random() * 9,
      vz: (random() - 0.5) * 7,
      spin: 4 + random() * 10,
      size: 0.3 + random() * 0.32,
    })),
  );
  const placement = new THREE.Object3D();
  function drawConfetti(time) {
    confettiSets.forEach((mesh, set) => {
      let used = 0;
      for (const part of confettiParts[set]) {
        const age = time - beats.party - part.delay;
        if (age < 0 || age > 3) continue;
        // Thrown up, then fluttering down slowly with air drag.
        const rise = Math.min(age, 0.45);
        const fall = Math.max(0, age - 0.45);
        const y = part.source[1] + part.vy * rise - 10 * rise * rise - 2.2 * fall;
        placement.position.set(
          part.source[0] + part.vx * (rise + fall * 0.15) + 0.4 * Math.sin(age * part.spin),
          Math.max(0.05, y),
          part.source[2] + part.vz * (rise + fall * 0.15),
        );
        placement.rotation.set(age * part.spin, age * part.spin * 0.7, age * 2);
        placement.scale.setScalar(part.size * (1 - smooth((age - 2.4) / 0.6)));
        placement.updateMatrix();
        mesh.setMatrixAt(used, placement.matrix);
        used += 1;
      }
      mesh.count = used;
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  const balloons = [-2.6, -0.9, 0.9, 2.6, 0].map((x, index) => {
    const group = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 18), index % 2 ? materials.ink : materials.accent);
    ball.scale.set(1, 1.18, 1);
    ball.position.y = 2.4;
    ball.castShadow = true;
    const tie = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.24, 10), ball.material);
    tie.position.y = 1.36;
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), materials.ink);
    string.position.y = 0.0;
    group.add(ball, tie, string);
    scene.add(group);
    return { group, x, delay: index * 0.07, sway: 1.2 + index * 0.37 };
  });
  function drawBalloons(time) {
    balloons.forEach((balloon) => {
      const age = time - beats.party - balloon.delay;
      balloon.group.visible = age > 0;
      if (age <= 0) return;
      const size = backOut(age / 0.35);
      balloon.group.scale.setScalar(Math.max(0.0001, size));
      balloon.group.position.set(
        rootX + balloon.x + 0.3 * Math.sin(age * balloon.sway),
        boxH + 0.6 + age * 2.4,
        rootZ + 0.4 * balloon.x,
      );
      balloon.group.rotation.z = 0.12 * Math.sin(age * balloon.sway + 1);
    });
  }

  function draw(time) {
    stage.applyCamera(stage.poseAt(time));
    drawBox(time);
    drawTree(time);
    stage.drawChips(time);
    drawConfetti(time);
    drawBalloons(time);
    stage.render();
  }

  return { stage, draw, boxScaleAt, boxHeight: boxH, boxDepth: boxD, sizes: { TWO, THREE: THREE_SIZE } };
}

