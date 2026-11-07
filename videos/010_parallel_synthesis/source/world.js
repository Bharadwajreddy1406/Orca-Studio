// The Three.js world on the shared stage: the developer's desk, headquarters, and three crime
// scenes (a database, a frontend screen, a network link) on three footprint trails. In the
// synthesis beat, three beams run from the scenes into one answer. Time alone sets every frame.
import { createStage } from "../reel/stage.js";
import { backOut, clamp01, mix, smooth, spring } from "../reel/motion.js";

export const LAYOUT = {
  deskX: -34,
  // The team and the detective stand in one evenly spaced row under the evidence board.
  row: [
    [-4.7, 5.8],
    [-1.55, 5.8],
    [1.6, 5.8],
  ],
  detective: [4.75, 5.8],
};
const SCENE_KEYS = ["db", "ui", "net"];

export function createWorld(container, beats) {
  const scenes = SCENE_KEYS.map((key) => beats.scenes[key]);
  // Each investigator stops in front of and beside the scene, so nothing hides behind them.
  const spots = scenes.map(([x, z], index) => [x + (index === 2 ? -2.3 : 2.3), z + 2.6]);
  const hq = [0, 6.2];

  /* ---------- the camera ---------- */

  const deskShot = { yaw: 0.04, pitch: 0.2, dist: 44, x: LAYOUT.deskX + 0.6, y: 2.5, z: 0 };
  const overview = { yaw: 0, pitch: 0.95, dist: 88, x: 0, y: 0, z: -1.6 };
  const sceneShot = ([x, z]) => ({ yaw: 0.05, pitch: 0.32, dist: 38, x: x + 1.0, y: 2.4, z: z + 1.6 });
  const hqShot = { yaw: 0, pitch: 0.16, dist: 80, x: 0, y: 5.2, z: 5.8 };
  const wideShot = { yaw: 0, pitch: 0.92, dist: 116, x: 0, y: 0, z: -5.4 };
  const shot = (t, d, v, e) => ({ t, d, v, e });
  const { start, hits } = beats;
  const keys = [
    shot(start[1] - 0.1, 0.6, { x: LAYOUT.deskX + 1.4, dist: 46 }),
    shot(start[2] - 0.35, 0.7, overview),
    shot(hits[0] - 0.75, 0.55, sceneShot(scenes[0])),
    shot(hits[1] - 0.65, 0.5, sceneShot(scenes[1])),
    shot(hits[2] - 0.75, 0.55, sceneShot(scenes[2])),
    shot(start[6] - 0.3, 0.6, overview),
    shot(beats.brings[1], 0.75, hqShot),
    shot(beats.parallel - 0.5, 0.8, wideShot),
    shot(start[11] - 0.25, 0.6, hqShot),
    shot(beats.case - 0.32, 0.32, { ...deskShot, x: LAYOUT.deskX + 1.4, dist: 54, y: 3.3 }),
  ];
  // Slow drifts on the long holds, so the shot never sits still.
  function adjust(pose, time) {
    const atBoard = smooth((time - beats.brings[1] - 0.6) / 0.6) * (1 - smooth((time - beats.parallel + 0.5) / 0.4));
    pose.yaw += 0.05 * Math.sin((time - beats.brings[1]) * 0.45) * atBoard;
    const wide = smooth((time - beats.parallel) / 0.8) * (1 - smooth((time - start[11] + 0.25) / 0.5));
    pose.yaw += 0.08 * (time - beats.parallel) * 0.12 * wide;
    const catchHold = smooth((time - start[11] + 0.2) / 0.5) * (1 - smooth((time - beats.case + 0.3) / 0.2));
    pose.dist -= 0.9 * Math.max(0, time - start[11]) * catchHold;
  }

  const stage = createStage(container, beats, { opening: deskShot, keys, adjust });
  const { THREE, scene, materials, block, popGroup } = stage;
  const tone = (color = 0xe8e0d8) => new THREE.MeshLambertMaterial({ color });

  /* ---------- the developer's desk ---------- */

  const desk = popGroup(LAYOUT.deskX, 0);
  desk.add(0.6, -0.4, 0, block(materials.ink, 5.4, 2.2, 2.4, 0, 1.1, 0), block(materials.bone, 5.8, 0.24, 2.8, 0, 2.32, 0));
  const screen = block(materials.bone, 2.6, 1.7, 0.12, 0, 0.85, 0);
  const screenFace = block(materials.ink, 2.3, 1.42, 0.05, 0, 0.85, 0.08, false);
  const laptop = new THREE.Group();
  laptop.position.set(0, 2.44, -0.5);
  laptop.rotation.x = -0.18;
  laptop.add(screen, screenFace);
  desk.add(1.1, -0.4, 0.07, block(materials.bone, 2.6, 0.12, 1.7, 0, 2.5, 0.3), laptop);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.6, 20), materials.accent);
  mug.position.y = 2.74;
  mug.castShadow = true;
  desk.add(-1.2, 0.2, 0.14, mug);

  /* ---------- headquarters: a flat ring the team leaves from ---------- */

  const base = popGroup(hq[0], hq[1]);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.08, 8, 64), materials.ink);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  base.add(0, 0, 0, ring);

  /* ---------- the three scenes ---------- */

  const sceneBases = [];
  const sceneProps = [];
  const pad = () => block(tone(), 4.2, 0.4, 3.6, 0, 0.2, 0);
  scenes.forEach(([x, z]) => {
    const group = popGroup(x, z);
    group.add(0, 0, 0, pad());
    sceneBases.push(group);
    sceneProps.push(popGroup(x, z));
  });

  // Database: three stacked disks; the top one, the slow query, pulses orange.
  const edgeOf = (mesh) => mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), materials.edge));
  const diskGeometry = new THREE.CylinderGeometry(1.15, 1.15, 0.9, 40);
  const slowDisk = tone();
  [0, 1, 2].forEach((level) => {
    const disk = new THREE.Mesh(diskGeometry, level === 2 ? slowDisk : tone());
    disk.position.y = 0.4 + 0.5 + level * 1.0;
    disk.castShadow = true;
    edgeOf(disk);
    sceneProps[0].add(0, 0, level * 0.1, disk);
  });

  // Frontend: a screen whose page blocks load in one by one.
  sceneProps[1].add(0, -0.3, 0, block(materials.ink, 0.4, 1.2, 0.4, 0, 1.0, 0), block(materials.ink, 1.8, 0.16, 1.0, 0, 0.48, 0));
  const monitor = new THREE.Group();
  monitor.add(block(materials.bone, 4.0, 2.7, 0.28, 0, 3.0, 0), block(materials.ink, 3.6, 2.3, 0.05, 0, 3.0, 0.16, false));
  sceneProps[1].add(0, -0.3, 0.06, monitor);
  const pageBlocks = [
    block(materials.bone, 3.2, 0.4, 0.06, 0, 3.86, 0.2, false),
    block(materials.bone, 1.4, 1.1, 0.06, -0.85, 2.96, 0.2, false),
    block(materials.bone, 1.5, 0.3, 0.06, 0.8, 3.3, 0.2, false),
    block(materials.bone, 1.5, 0.3, 0.06, 0.8, 2.82, 0.2, false),
    block(materials.accent, 0.9, 0.3, 0.06, 0.5, 2.25, 0.2, false),
  ];
  pageBlocks.forEach((piece) => monitor.add(piece));

  // Network: two masts with a cable between them; a packet rides the cable.
  [-1.4, 1.4].forEach((mastX, index) => {
    const mast = new THREE.Group();
    mast.add(block(materials.ink, 0.3, 3.8, 0.3, 0, 2.3, 0), block(materials.bone, 1.2, 0.18, 0.4, 0, 3.4, 0), block(materials.bone, 0.9, 0.18, 0.4, 0, 2.6, 0));
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 10), materials.accent);
    dish.position.y = 4.35;
    dish.castShadow = true;
    mast.add(dish);
    sceneProps[2].add(mastX, 0, index * 0.1, mast);
  });
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8), materials.ink);
  cable.rotation.z = Math.PI / 2;
  cable.position.y = 4.1;
  sceneProps[2].add(0, 0, 0.2, cable);
  const packet = block(materials.accent, 0.42, 0.42, 0.42, 0, 4.1, 0);
  sceneProps[2].add(0, 0, 0.25, packet);

  /* ---------- footprint trails, laid as the team runs out ---------- */

  const PRINTS = 13;
  const printGeometry = new THREE.BoxGeometry(0.34, 0.04, 0.2);
  const trails = spots.map((spot, index) => {
    const from = LAYOUT.row[index];
    const angle = Math.atan2(spot[0] - from[0], spot[1] - from[1]);
    return Array.from({ length: PRINTS }, (_, step) => {
      const u = (step + 0.6) / (PRINTS + 0.4);
      const side = step % 2 === 0 ? 0.22 : -0.22;
      const print = new THREE.Mesh(printGeometry, materials.ink);
      print.rotation.y = angle + Math.PI / 2;
      print.position.set(
        mix(from[0], spot[0], u) + Math.cos(angle) * side,
        0.03,
        mix(from[1], spot[1], u) - Math.sin(angle) * side,
      );
      scene.add(print);
      return { print, u };
    });
  });
  /** How far along its trail an investigator is: out after "once", home on "brings". */
  function legOf(index, time) {
    const out = smooth((time - beats.once) / 1.0);
    const home = smooth((time - beats.brings[index] + 0.45) / 0.9);
    return { out, home };
  }

  /* ---------- the synthesis: three beams converge on one answer ---------- */

  const beamGeometry = new THREE.CylinderGeometry(0.14, 0.14, 1, 10);
  beamGeometry.translate(0, 0.5, 0);
  const up = new THREE.Vector3(0, 1, 0);
  const answer = new THREE.Vector3(...beats.answerPoint);
  const beams = scenes.map(([x, z]) => {
    const beam = new THREE.Mesh(beamGeometry, materials.accent);
    const from = new THREE.Vector3(x, 3.4, z);
    const toward = answer.clone().sub(from);
    beam.position.copy(from);
    beam.quaternion.setFromUnitVectors(up, toward.clone().normalize());
    beam.castShadow = true;
    scene.add(beam);
    return { beam, length: toward.length() };
  });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(1.5, 0), materials.accent);
  gem.add(new THREE.LineSegments(new THREE.EdgesGeometry(gem.geometry), materials.edge));
  gem.castShadow = true;
  gem.position.copy(answer);
  scene.add(gem);

  const beamsGone = start[11] - 0.3;
  function drawSynthesis(time) {
    const leaving = 1 - spring((time - beamsGone) / 0.3);
    beams.forEach(({ beam, length }, index) => {
      const grow = smooth((time - beats.many - index * 0.12) / 0.9) * leaving;
      beam.visible = grow > 0.002;
      beam.scale.set(1, Math.max(0.0001, length * grow), 1);
    });
    const size = backOut((time - beats.one) / 0.35) * (1 + 0.35 * backOut((time - beats.stronger) / 0.3)) * leaving;
    gem.visible = size > 0.002;
    gem.scale.setScalar(Math.max(0.0001, size));
    gem.rotation.y = time * 1.4;
  }

  /* ---------- per frame ---------- */

  function draw(time) {
    desk.draw(time, 0.22, start[2] - 0.1, beats.case - 0.4);
    base.draw(time, beats.checks);
    sceneBases.forEach((group, index) => group.draw(time, beats.three + index * 0.09));
    sceneProps.forEach((group, index) => group.draw(time, beats.hits[index] - 0.12));

    // The slow query glows hard while it is examined, and again when it is named the cause.
    const examined = clamp01((time - beats.hits[0]) / 0.3) * (0.55 + 0.45 * Math.sin(time * 9));
    const named = smooth((time - beats.cause + 0.1) / 0.3);
    stage.glow(slowDisk, Math.max(time < start[6] ? examined : 0, named * (time < start[11] ? 1 : 0)));
    // Page blocks load in one after another, slowly.
    pageBlocks.forEach((piece, index) => {
      piece.visible = time >= beats.hits[1] + 0.15 + index * 0.18;
    });
    // The packet rides the cable, there and back.
    packet.position.x = 1.25 * Math.sin((time - beats.hits[2]) * 3.2);

    trails.forEach((prints, index) => {
      const { out } = legOf(index, time);
      prints.forEach(({ print, u }) => {
        const shown = clamp01((out - u) * 8);
        print.visible = shown > 0.01;
        print.scale.setScalar(Math.max(0.0001, shown));
      });
    });

    drawSynthesis(time);
    stage.drawChips(time);
    stage.render();
  }

  /** Where investigator `index` stands at `time`, and whether they are running. */
  function investigatorAt(index, time) {
    const { out, home } = legOf(index, time);
    const from = LAYOUT.row[index];
    const spot = spots[index];
    const x = mix(mix(from[0], spot[0], out), from[0], home);
    const z = mix(mix(from[1], spot[1], out), from[1], home);
    const running = (out > 0.02 && out < 0.98) || (home > 0.02 && home < 0.98);
    return { x, z, running };
  }

  return { stage, draw, investigatorAt, scenes, spots };
}
