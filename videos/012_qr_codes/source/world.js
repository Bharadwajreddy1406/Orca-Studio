// The Three.js world: a café menu on the table with a QR sticker on it. The sticker's modules
// are instanced tiles placed from a real V2-H encoding (qr.js), so every module that flips,
// drops, breaks or returns on screen is a real module of a code that decodes to the message.
// Time alone sets every frame.
import { createStage, fade } from "../reel/stage.js";
import { backOut, bounceOut, clamp01, mix, seeded, smooth, spring, track } from "../reel/motion.js";
import { QR } from "./qr.js";

const N = QR.size;
const MOD = 0.5; // world units per module
const HALF = (N - 1) / 2;
const QUIET = 4; // modules of quiet zone, as the standard asks
const STICKER_HALF = (N / 2 + QUIET) * MOD;
const SHEET_TOP = 0.06;
const STICKER_TOP = SHEET_TOP + 0.22;
const TILE_H = 0.22;
const TILE_Y = STICKER_TOP + TILE_H / 2;

/** World x, z of module (row, col), in the sticker's own frame. */
export const cell = (row, col) => [(col - HALF) * MOD, (row - HALF) * MOD];
/** World x, z of a grid corner coordinate (gc, gr run 0..N along the module edges). */
const gridPoint = (gc, gr) => [(gc - N / 2) * MOD, (gr - N / 2) * MOD];

const keyOf = (row, col) => row * N + col;
const inRegion = (cells) => new Set(cells.map(([row, col]) => keyOf(row, col)));

export function createWorld(container, beats) {
  const b = beats;
  const FRONT = { yaw: 0, pitch: 1.13, dist: 92, x: 0, y: 0, z: 0.3 };
  const shot = (t, d, v, e) => ({ t, d, v, e });
  const keys = [
    // The opening is already moving when the paper tears open.
    shot(0, 1.7, { yaw: -0.2, pitch: 0.98, dist: 70, x: 2.4, y: 0, z: -0.9 }),
    shot(1.5, 1.45, { yaw: -0.06, pitch: 1.02, dist: 60, x: 3.0, y: 0, z: -0.6 }),
    shot(b.smudged - 0.1, 0.32, { yaw: -0.12, pitch: 1.02, dist: 40, x: 3.6, z: 1.0 }, spring),
    shot(b.scratched - 0.1, 0.3, { yaw: 0.1, pitch: 1.06, dist: 42, x: 0.3, z: 1.2 }, spring),
    shot(b.torn - 0.12, 0.3, { yaw: 0.22, pitch: 0.96, dist: 48, x: 4.4, z: 5.8 }, spring),
    shot(b.ask - 0.35, 0.5, { yaw: -0.3, pitch: 0.86, dist: 88, x: -3.4, z: -0.6 }),
    shot(b.menu, 1.2, { yaw: -0.36, pitch: 0.82, dist: 82, x: -3.8, z: -0.8 }),
    shot(b.ugh - 0.05, 0.35, { yaw: -0.42, pitch: 0.72, dist: 80, x: -3.6, z: -2.6 }, spring),
    shot(b.what - 0.12, 0.45, { ...FRONT, dist: 98 }, spring),
    shot(b.just, 1.15, { ...FRONT, dist: 92 }),
    shot(b.anyway - 0.05, 0.25, { ...FRONT, dist: 88 }, backOut),
    shot(b.clearAt, 0.5, { ...FRONT, dist: 94, yaw: 0.06 }),
    shot(b.bits, 1.6, { ...FRONT, dist: 84, yaw: -0.08, x: 0.8 }),
    shot(b.three - 0.18, 0.4, { yaw: 0, pitch: 0.98, dist: 94, x: 0, y: 0, z: -0.2 }, spring),
    shot(b.and - 0.1, 0.5, { yaw: 0, pitch: 1.1, dist: 90, x: 0, y: 0, z: 0.2 }),
    shot(b.then - 0.12, 0.45, { yaw: 0.46, pitch: 0.82, dist: 84, x: 0, y: 0, z: -0.6 }, spring),
    shot(b.repair, 2.0, { yaw: 0.2, pitch: 0.92, dist: 82, x: 0, y: 0, z: -0.4 }),
    shot(b.now - 0.1, 0.4, { yaw: -0.08, pitch: 1.0, dist: 70, x: 0.0, y: 0, z: -0.6 }, spring),
    shot(b.splash - 0.04, 0.2, { yaw: -0.1, pitch: 1.04, dist: 62, x: 0.0, y: 0, z: -0.2 }, backOut),
    shot(b.gone - 0.2, 0.6, { yaw: -0.04, pitch: 1.06, dist: 68, x: 0, y: 0, z: -0.2 }),
    shot(b.scanner - 0.25, 0.45, FRONT, spring),
    shot(b.pops - 0.1, 0.3, { ...FRONT, dist: 88 }, backOut),
    shot(b.thats - 0.15, 0.5, { yaw: -0.55, pitch: 0.62, dist: 80, x: 0, y: 0, z: -1.2 }, spring),
    shot(b.reed, 2.4, { yaw: -0.2, pitch: 0.72, dist: 76, x: 0, y: 0, z: -1.2 }),
    shot(b.upTo - 0.2, 0.45, { yaw: 0, pitch: 1.2, dist: 134, x: 0, y: 0, z: 10.5 }, spring),
    shot(b.hide - 0.2, 0.4, FRONT, spring),
    shot(b.corner2 - 0.15, 0.35, { yaw: 0.06, pitch: 1.04, dist: 66, x: -2.6, y: 0, z: -2.0 }, spring),
    shot(b.no - 0.65, 0.4, FRONT, spring),
    shot(b.happy - 0.1, 0.5, { yaw: 0.3, pitch: 0.86, dist: 88, x: 0, y: 0, z: -0.8 }, spring),
    shot(b.scanning, 1.4, { yaw: 0.05, pitch: 0.95, dist: 90, x: 0, y: 0, z: -0.6 }),
  ];
  const stage = createStage(container, beats, { opening: { yaw: -0.6, pitch: 0.66, dist: 80, x: 4.5, y: 0, z: -1.6 }, keys });
  const { THREE, scene, materials, block } = stage;
  const bone = () => new THREE.MeshLambertMaterial({ color: 0xe8e0d8 });

  /* ---------- the menu sheet on the table ---------- */

  block(bone(), 22, SHEET_TOP, 31, 0, SHEET_TOP / 2, 4.5);
  // Lines of menu text below the sticker, and a title bar above it.
  const textLines = [
    [-5.2, 10.4, 7.5], [5.6, 10.4, 2.6], [-6.0, 11.6, 6.0], [5.6, 11.6, 2.6],
    [-4.6, 12.8, 8.8], [5.6, 12.8, 2.6], [-6.2, 14.0, 5.6], [5.6, 14.0, 2.6],
  ];
  for (const [x, z, width] of textLines) block(materials.ink, width, 0.03, 0.42, x + width / 2 - (x > 0 ? width / 2 : 0), SHEET_TOP + 0.015, z, false);
  block(materials.ink, 6.0, 0.03, 0.9, 0, SHEET_TOP + 0.015, -9.7, false);

  /* ---------- the QR sticker, with a corner that can tear off ---------- */

  const qrRoot = new THREE.Group();
  scene.add(qrRoot);

  // The tear runs diagonally through the quiet zone and steps around the torn modules.
  const jitter = seeded(7);
  const outer = [];
  for (let step = 0; step <= 4; step += 1) outer.push([29 - step + (step % 4 ? (jitter() - 0.5) * 0.5 : 0), 16 + step + (step % 4 ? (jitter() - 0.5) * 0.5 : 0)]);
  const stairs = [[24, 20], [24, 21], [23, 21], [23, 22], [22, 22], [22, 23], [21, 23], [21, 24], [20, 24], [20, 25]];
  const inner = [];
  for (let step = 1; step <= 4; step += 1) inner.push([20 - step + (step % 4 ? (jitter() - 0.5) * 0.5 : 0), 25 + step + (step % 4 ? (jitter() - 0.5) * 0.5 : 0)]);
  const tear = [...outer, ...stairs, ...inner]; // from the right edge (29,16) to the bottom edge (16,29)
  const lo = -QUIET;
  const hi = N + QUIET;

  function slab(points, material) {
    const shape = new THREE.Shape(points.map(([gc, gr]) => new THREE.Vector2(...gridPoint(gc, gr))));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: STICKER_TOP - SHEET_TOP, bevelEnabled: false });
    geometry.rotateX(Math.PI / 2);
    geometry.translate(0, STICKER_TOP, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 25), materials.edge));
    return mesh;
  }
  const stickerMaterial = bone();
  qrRoot.add(slab([[lo, lo], [hi, lo], ...tear, [lo, hi]], stickerMaterial));
  // The corner piece hinges on the middle of the tear.
  const hinge = gridPoint(22.5, 22.5);
  const piece = new THREE.Group();
  piece.position.set(hinge[0], STICKER_TOP, hinge[1]);
  const pieceSlab = slab([[hi, 16], [hi, hi], [16, hi], ...tear.slice().reverse()], bone());
  pieceSlab.position.set(-hinge[0], -STICKER_TOP, -hinge[1]);
  piece.add(pieceSlab);
  qrRoot.add(piece);
  const tearAxis = new THREE.Vector3(1, 0, -1).normalize();

  function placePiece(time) {
    // Ripped off on "torn", gone until the rewind, then snapped back.
    const away = time < b.clearAt ? smooth((time - b.torn + 0.02) / 0.55) : 1 - spring((time - b.clearAt) / 0.28);
    const lift = Math.sin(Math.min(1, away) * Math.PI * 0.5);
    piece.position.set(hinge[0] + away * 9, STICKER_TOP + lift * 5 + away * 2, hinge[1] + away * 7);
    piece.quaternion.setFromAxisAngle(tearAxis, -away * 2.4);
    piece.rotateY(away * 1.2);
    piece.visible = away < 0.995;
    piece.updateMatrix();
  }

  /* ---------- the modules ---------- */

  const modules = [];
  const torn = inRegion(QR.regions.torn);
  const splash = inRegion(QR.regions.splash);
  const random = seeded(41);
  for (let row = 0; row < N; row += 1) {
    for (let col = 0; col < N; col += 1) {
      if (QR.grid[row][col] !== "1") continue;
      const role = QR.role[row][col];
      const [x, z] = cell(row, col);
      let finder = -1;
      if (role === "F") finder = row < 8 && col < 8 ? 0 : row < 8 ? 1 : 2;
      modules.push({
        row, col, x, z, role, finder,
        bit: QR.bit[row][col],
        torn: torn.has(keyOf(row, col)),
        splash: splash.has(keyOf(row, col)),
        spin: (random() - 0.5) * 9,
        drift: [(random() - 0.5) * 3, (random() - 0.5) * 3],
      });
    }
  }
  const totalBits = QR.bit.flat().reduce((most, bit) => Math.max(most, bit), 0) + 1;
  const dataBits = QR.dataCodewords * 8;
  const splashCenter = cell(14, 12);

  const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(MOD * 0.94, TILE_H, MOD * 0.94), new THREE.MeshLambertMaterial({ color: 0xffffff }), modules.length);
  tiles.castShadow = true;
  tiles.receiveShadow = true;
  tiles.frustumCulled = false;
  qrRoot.add(tiles);
  const ink = new THREE.Color(0x141210);
  const accent = new THREE.Color(0xe8401a);
  const tint = new THREE.Color();
  const dummy = new THREE.Object3D();
  const pieceOffset = new THREE.Matrix4();
  const placed = new THREE.Matrix4();
  const flash = (time, at, width = 0.25) => Math.exp(-Math.pow((time - at) / width, 2));

  const sweepAt = (sweep, row) => mix(sweep[0], sweep[1], sweep[2] > 0 ? row / (N - 1) : 1 - row / (N - 1));

  /** When each module is rebuilt after the rewind, and from how high it drops (0 = it flips in). */
  function rebuildOf(m) {
    if (m.role === "D") return { at: mix(b.dataFrom, b.dataUntil, m.bit / dataBits), drop: 0 };
    if (m.role === "E" || m.role === "R") return { at: mix(b.ecFrom, b.ecUntil, (m.bit - dataBits) / (totalBits - dataBits)), drop: 3.2 };
    if (m.role === "F") return { at: [b.three, b.corner, b.squares2][m.finder] - 0.2, drop: 7 };
    if (m.role === "T") return { at: b.mark - 0.05 + ((m.row === 6 ? m.col : m.row) - 8) * 0.03, drop: 0 };
    if (m.role === "A") return { at: b.spot - 0.08, drop: 0 };
    return { at: b.spot + 0.1, drop: 0 }; // format information and the dark module
  }
  modules.forEach((m) => Object.assign(m, rebuildOf(m), { wipeAt: b.clearAt + 0.18 + ((m.row + m.col) / (2 * N)) * 0.28 }));

  /** Every module's state is a pure function of time: where it is, how big, how orange. */
  function moduleState(m, time) {
    // 1. The opening: the finished code, damaged. Torn modules ride on the corner piece.
    if (time < m.wipeAt) return { scale: 1, lift: 0, flip: 0, heat: 0, dx: 0, dz: 0, spinY: 0, torn: m.torn };
    // 2. The rewind: it flips away in a diagonal wave, and waits to be rebuilt.
    if (time < m.at) {
      const gone = smooth((time - m.wipeAt) / 0.18);
      if (gone >= 1) return null;
      return { scale: 1 - gone, lift: gone * 0.4, flip: gone * Math.PI * 0.8, heat: 0, dx: 0, dz: 0, spinY: 0, torn: false };
    }
    // 3. Rebuilt, each part of the code in its own beat.
    const age = time - m.at;
    let scale;
    let lift;
    let flip = 0;
    let heat = 0;
    let dx = 0;
    let dz = 0;
    let spinY = 0;
    if (m.drop > 0) {
      // Falls under gravity and lands with a little bounce.
      lift = m.drop * (1 - bounceOut(age / 0.22));
      scale = Math.min(1, 0.4 + age * 6);
    } else {
      // Flips over like a tile.
      const turn = backOut(age / 0.2);
      flip = (1 - turn) * Math.PI;
      scale = clamp01(0.35 + age * 5);
      lift = (1 - smooth(age / 0.2)) * 0.6;
    }
    // Finders land orange; repair data stays orange until it merges with the message.
    if (m.role === "F") heat = 1 - smooth((time - b.spot - 0.15) / 0.45) + flash(time, b.up, 0.22) * 0.9;
    if (m.role === "E" || m.role === "R") heat = 1 - smooth((time - b.mergeAt - ((m.bit - dataBits) / (totalBits - dataBits)) * 0.35) / 0.3);
    if (m.role === "D") heat = flash(time, m.at + 0.08, 0.1) * 0.8 + flash(time, b.computed + 0.1, 0.22) * 0.9;
    // 4. The splash: the chunk jitters, breaks away, and the scanner rebuilds it, orange first.
    if (m.splash && time >= b.splash) {
      const distance = Math.hypot(m.x - splashCenter[0], m.z - splashCenter[1]);
      const breakAt = b.chunk + distance * 0.06;
      const backAt = sweepAt(b.sweeps[2], m.row) + 0.04;
      if (time < breakAt) {
        dx = Math.sin(time * 70 + m.spin) * 0.05 * fade(time, b.splash, breakAt, 0.05);
      } else if (time < backAt) {
        const gone = spring((time - breakAt) / 0.35);
        if (gone >= 0.999) return null;
        lift += gone * 2.6;
        dx += m.drift[0] * gone;
        dz += m.drift[1] * gone;
        spinY = m.spin * gone;
        scale *= 1 - gone;
      } else {
        const back = backOut((time - backAt) / 0.22);
        const settle = smooth((time - b.link2 + 0.1) / 0.35);
        scale = clamp01(back);
        flip = (1 - back) * Math.PI;
        lift = 0.55 * (1 - settle);
        heat = Math.max(heat, 1 - settle);
      }
    }
    // "Thirty percent": the rebuilt chunk glows once more as the benefit is named.
    if (m.splash) heat = Math.max(heat, flash(time, b.thirty + 0.1, 0.3));
    // 5. The happy ending: a ripple out from the centre.
    const ripple = time - b.scanning - Math.hypot(m.x, m.z) * 0.035;
    if (ripple > 0 && ripple < 0.5) lift += Math.sin((ripple / 0.5) * Math.PI) * 0.7;
    return { scale, lift, flip, heat: clamp01(heat), dx, dz, spinY, torn: false };
  }

  function drawModules(time) {
    pieceOffset.makeTranslation(-hinge[0], -STICKER_TOP, -hinge[1]);
    modules.forEach((m, index) => {
      const state = moduleState(m, time);
      if (!state || state.scale <= 0.0005) {
        dummy.position.set(0, -50, 0);
        dummy.scale.setScalar(0.0001);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        tiles.setMatrixAt(index, dummy.matrix);
        return;
      }
      dummy.position.set(m.x + state.dx, TILE_Y + state.lift, m.z + state.dz);
      dummy.rotation.set(state.flip, state.spinY, 0);
      dummy.scale.set(state.scale, state.scale, state.scale);
      dummy.updateMatrix();
      if (state.torn) {
        placed.multiplyMatrices(piece.matrix, pieceOffset).multiply(dummy.matrix);
        tiles.setMatrixAt(index, placed);
      } else tiles.setMatrixAt(index, dummy.matrix);
      tint.copy(ink).lerp(accent, state.heat);
      tiles.setColorAt(index, tint);
    });
    tiles.instanceMatrix.needsUpdate = true;
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
  }

  /* ---------- stains: coffee on the sticker, translucent ink, never a new colour ---------- */

  function stainShape(radius, seed, wobble = 0.12) {
    const rand = seeded(seed);
    const phases = [rand() * 6, rand() * 6, rand() * 6];
    const points = [];
    for (let index = 0; index < 48; index += 1) {
      const angle = (index / 48) * Math.PI * 2;
      const r = radius * (1 + wobble * Math.sin(angle * 3 + phases[0]) + wobble * 0.6 * Math.sin(angle * 5 + phases[1]) + wobble * 0.3 * Math.sin(angle * 9 + phases[2]));
      points.push(new THREE.Vector2(Math.cos(angle) * r, Math.sin(angle) * r));
    }
    return new THREE.Shape(points);
  }
  function stain(radius, seed, opacity, y) {
    const group = new THREE.Group();
    const fill = new THREE.Mesh(new THREE.ShapeGeometry(stainShape(radius, seed)), new THREE.MeshBasicMaterial({ color: 0x141210, transparent: true, opacity, depthWrite: false }));
    fill.rotation.x = -Math.PI / 2;
    const ringShape = stainShape(radius * 1.02, seed);
    ringShape.holes.push(stainShape(radius * 0.86, seed));
    const ring = new THREE.Mesh(new THREE.ShapeGeometry(ringShape), new THREE.MeshBasicMaterial({ color: 0x141210, transparent: true, opacity: opacity * 0.9, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    group.add(fill, ring);
    group.position.y = y;
    group.renderOrder = 2;
    return { group, fill, ring, opacity };
  }
  const hookStain = stain(2.4 * MOD + 0.12, 3, 0.34, STICKER_TOP + 0.004);
  const stainCenter = cell(11.5, 19.5);
  hookStain.group.position.x = stainCenter[0];
  hookStain.group.position.z = stainCenter[1];
  qrRoot.add(hookStain.group);
  const splashStain = stain(3.8 * MOD + 0.1, 11, 0.4, STICKER_TOP + 0.006);
  splashStain.group.position.set(splashCenter[0], splashStain.group.position.y, splashCenter[1]);
  qrRoot.add(splashStain.group);

  function setStain(s, amount, opacityScale = 1) {
    s.group.visible = amount > 0.001;
    s.group.scale.set(Math.max(0.0001, amount), 1, Math.max(0.0001, amount));
    s.fill.material.opacity = s.opacity * opacityScale;
    s.ring.material.opacity = s.opacity * 0.9 * opacityScale;
  }

  // Scratches: two bone gouges cut across the tiles along the scratched modules.
  const scratchFrom = cell(9, 10);
  const scratchTo = cell(14, 15);
  const scratchLength = Math.hypot(scratchTo[0] - scratchFrom[0], scratchTo[1] - scratchFrom[1]) + 0.4;
  const scratchAngle = Math.atan2(scratchTo[1] - scratchFrom[1], scratchTo[0] - scratchFrom[0]);
  const scratches = [
    { width: 0.16, offset: 0 },
    { width: 0.07, offset: 0.17 },
  ].map(({ width, offset }) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.02, width), bone());
    const pivot = new THREE.Group();
    pivot.position.set(scratchFrom[0] - Math.sin(scratchAngle) * offset - Math.cos(scratchAngle) * 0.2, TILE_Y + TILE_H / 2 + 0.012, scratchFrom[1] + Math.cos(scratchAngle) * offset - Math.sin(scratchAngle) * 0.2);
    pivot.rotation.y = -scratchAngle;
    mesh.position.x = 0.5;
    pivot.add(mesh);
    qrRoot.add(pivot);
    return pivot;
  });

  /* ---------- the coffee cup that tips over ---------- */

  const cupGroup = new THREE.Group();
  const cupBase = [11.6, SHEET_TOP, -1.6];
  cupGroup.position.set(...cupBase);
  scene.add(cupGroup);
  const tipPivot = new THREE.Group();
  cupGroup.add(tipPivot);
  const cupScale = 1.45;
  const profile = [[0, 0], [0.82, 0], [0.9, 0.08], [1.08, 1.75], [1.16, 1.8], [1.02, 1.8], [0.86, 0.2], [0, 0.2]].map(([r, y]) => new THREE.Vector2(r * cupScale, y * cupScale));
  const cupGeometry = new THREE.LatheGeometry(profile, 40);
  const cup = new THREE.Mesh(cupGeometry, bone());
  cup.castShadow = true;
  cup.add(new THREE.LineSegments(new THREE.EdgesGeometry(cupGeometry, 35), materials.edge));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.035 * cupScale, 0.99 * cupScale, 0.32 * cupScale, 40, 1, true), materials.accent);
  band.position.y = 1.15 * cupScale;
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.98 * cupScale, 40), materials.ink);
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 1.55 * cupScale;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.42 * cupScale, 0.11 * cupScale, 10, 24, Math.PI * 1.2), bone());
  handle.rotation.z = -Math.PI * 0.6;
  handle.position.set(1.1 * cupScale, 1.0 * cupScale, 0);
  handle.castShadow = true;
  const cupBody = new THREE.Group();
  cupBody.add(cup, band, coffee, handle);
  cupBody.position.x = 0.9 * cupScale; // the tip pivot sits on the base's left edge
  cupBody.rotation.y = 0.5;
  tipPivot.position.x = -0.9 * cupScale;
  tipPivot.add(cupBody);
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(1.9 * cupScale, 1.5 * cupScale, 0.12, 40), bone());
  saucer.position.set(0.6, 0.06, 0.4);
  saucer.castShadow = true;
  saucer.receiveShadow = true;
  saucer.add(new THREE.LineSegments(new THREE.EdgesGeometry(saucer.geometry, 35), materials.edge));
  cupGroup.add(saucer);

  function drawCup(time) {
    const tip = bounceOut((time - b.spilled + 0.06) / 0.42);
    tipPivot.rotation.z = tip * 1.62;
    coffee.visible = tip < 0.3;
    const leave = spring((time - b.what + 0.25) / 0.3);
    cupGroup.scale.setScalar(Math.max(0.0001, 1 - leave));
    cupGroup.visible = leave < 1;
  }

  /* ---------- the service bell for "ask for a new menu" ---------- */

  const bellRoot = new THREE.Group();
  bellRoot.position.set(-11.6, SHEET_TOP - 0.06, 1.2);
  scene.add(bellRoot);
  const bellBase = block(materials.ink, 3.4, 0.4, 3.4, 0, 0.2, 0);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.45, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), bone());
  dome.position.y = 0.4;
  dome.castShadow = true;
  dome.add(new THREE.LineSegments(new THREE.EdgesGeometry(dome.geometry, 40), materials.edge));
  const plunger = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 12), materials.ink);
  stem.position.y = 0.25;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), materials.accent);
  knob.position.y = 0.55;
  plunger.add(stem, knob);
  plunger.position.y = 1.8;
  const bellBody = new THREE.Group();
  bellBody.add(bellBase, dome, plunger);
  bellRoot.add(bellBody);
  const rings = [b.ask, b.menu, b.ugh - 0.45];

  function drawBell(time) {
    const grow = backOut((time - b.ask + 0.3) / 0.3);
    const leave = spring((time - b.what + 0.2) / 0.3);
    const size = Math.max(0.0001, grow * (1 - leave));
    bellRoot.visible = time > b.ask - 0.35 && leave < 1;
    let press = 0;
    let wobble = 0;
    for (const at of rings) {
      press = Math.max(press, fade(time, at - 0.06, at + 0.04, 0.05));
      wobble += Math.exp(-Math.max(0, time - at) * 6) * (time > at ? Math.sin((time - at) * 40) : 0);
    }
    plunger.position.y = 1.8 - press * 0.3;
    bellBody.scale.set(size * (1 + wobble * 0.03), size * (1 - press * 0.05), size * (1 + wobble * 0.03));
    // "Ugh": the bell slumps over a little.
    bellBody.rotation.z = -0.22 * spring((time - b.ugh) / 0.35);
  }

  /* ---------- the scanner's sweep line ---------- */

  const sweepWidth = (N + 2) * MOD;
  const lineMesh = new THREE.Mesh(new THREE.BoxGeometry(sweepWidth, 0.06, 0.14), new THREE.MeshBasicMaterial({ color: 0xe8401a }));
  const trail = new THREE.Mesh(new THREE.PlaneGeometry(sweepWidth, 1.6), new THREE.MeshBasicMaterial({ color: 0xe8401a, transparent: true, opacity: 0.16, depthWrite: false }));
  trail.rotation.x = -Math.PI / 2;
  const sweepGroup = new THREE.Group();
  sweepGroup.add(lineMesh, trail);
  sweepGroup.position.y = TILE_Y + 0.5;
  qrRoot.add(sweepGroup);

  function drawSweep(time) {
    sweepGroup.visible = false;
    for (const [from, until, direction] of b.sweeps) {
      if (time < from - 0.05 || time > until + 0.08) continue;
      const amount = clamp01((time - from) / (until - from));
      const eased = smooth(amount) * 0.6 + amount * 0.4;
      const z = (direction > 0 ? mix(-1, 1, eased) : mix(1, -1, eased)) * (N / 2 + 0.6) * MOD;
      sweepGroup.visible = true;
      sweepGroup.position.z = z;
      trail.position.z = -direction * 0.8;
      const edge = Math.min(1, (time - from + 0.05) / 0.08, (until + 0.08 - time) / 0.08);
      sweepGroup.scale.set(1, 1, Math.max(0.0001, edge));
    }
  }

  /* ---------- the coffee drop that falls on "now", and lands on "splash" ---------- */

  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), materials.ink);
  drop.castShadow = true;
  qrRoot.add(drop);
  function drawDrop(time) {
    const fall = clamp01((time - b.now - 0.05) / (b.splash - b.now - 0.05));
    drop.visible = time > b.now && fall < 1;
    drop.position.set(splashCenter[0], STICKER_TOP + 0.5 + 16 * (1 - fall * fall), splashCenter[1]);
    drop.scale.set(1 - fall * 0.2, 1 + fall * 0.9, 1 - fall * 0.2);
  }

  /* ---------- the catch: a napkin over too much, a coaster over a finder ---------- */

  const napkin = block(bone(), 10.5, 0.07, 9.5, 0, 0, 0);
  const napkinGroup = new THREE.Group();
  napkinGroup.add(napkin);
  qrRoot.add(napkinGroup);
  // A fold line across the napkin.
  napkin.add(block(materials.ink, 1.0, 0.2, 0.01, 0, 0.5, 0.1, false));
  const coaster = new THREE.Group();
  const coasterDisc = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, 0.22, 48), bone());
  coasterDisc.castShadow = true;
  coasterDisc.add(new THREE.LineSegments(new THREE.EdgesGeometry(coasterDisc.geometry, 35), materials.edge));
  const coasterRing = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.3, 48), materials.accent);
  coasterRing.rotation.x = -Math.PI / 2;
  coasterRing.position.y = 0.115;
  coaster.add(coasterDisc, coasterRing);
  qrRoot.add(coaster);
  const finderCenter = cell(3, 3);

  function drawCatch(time) {
    const napIn = spring((time - b.hide + 0.05) / 0.3);
    const napOut = smooth((time - b.or + 0.05) / 0.3);
    const napX = mix(-20, -2.4, napIn) + napOut * -18;
    napkinGroup.visible = napIn > 0.001 && napOut < 1;
    napkinGroup.position.set(napX, TILE_Y + TILE_H / 2 + 0.05 + (1 - napIn) * 1.5, 1.0);
    napkinGroup.rotation.y = 0.18 + (1 - napIn) * 0.4 + Math.sin(time * 30) * 0.01 * fade(time, b.much - 0.05, b.much + 0.3, 0.05);
    // The coaster drops onto the top-left finder pattern, and flicks away on "happy".
    const drop = bounceOut((time - b.corner2 + 0.12) / 0.26);
    const flick = smooth((time - b.happy) / 0.4);
    coaster.visible = time > b.corner2 - 0.14 && flick < 1;
    coaster.position.set(finderCenter[0] - flick * 14, TILE_Y + TILE_H / 2 + 0.11 + (1 - drop) * 6 + flick * 1.5, finderCenter[1] - flick * 12);
    coaster.scale.setScalar(Math.max(0.0001, 1 - flick * 0.6));
    coaster.rotation.set(flick * 1.4, flick * 3, -flick * 1.2);
  }

  /* ---------- the code's own motion: the spin for "which way's up" and the happy spin ---------- */

  const spinKeys = [
    { t: b.and - 0.15, d: 0.3, v: { yaw: Math.PI * 1.5 }, e: smooth },
    { t: b.ways - 0.05, d: 0.32, v: { yaw: Math.PI * 2 }, e: backOut },
    { t: b.happy + 0.05, d: 0.7, v: { yaw: Math.PI * 4 }, e: (a) => smooth(a) },
  ];

  function draw(time) {
    qrRoot.rotation.y = track({ yaw: 0 }, spinKeys, time).yaw;
    qrRoot.position.y = 0.5 * Math.sin(Math.PI * clamp01((time - b.happy - 0.05) / 0.7));
    placePiece(time);
    drawModules(time);
    // The hook's damage: the stain spreads, smudges, then everything rewinds at the clear.
    const rewind = 1 - smooth((time - b.clearAt) / 0.25);
    const spread = backOut((time - b.spilled - 0.3) / 0.45);
    const smear = 1 + 0.18 * flash(time, b.smudged + 0.1, 0.2);
    setStain(hookStain, spread * smear * rewind);
    hookStain.group.scale.x *= 1 + 0.35 * smooth((time - b.smudged) / 0.25) * rewind;
    const splashSpread = backOut((time - b.splash) / 0.3);
    const splashFade = 1 - 0.55 * smooth((time - b.link2) / 0.4);
    const splashGone = 1 - smooth((time - b.thats + 0.1) / 0.3);
    setStain(splashStain, splashSpread * splashGone, splashFade);
    scratches.forEach((pivot, index) => {
      const grow = smooth((time - b.scratched + 0.03 - index * 0.06) / 0.16);
      pivot.visible = grow > 0.001 && rewind > 0.001;
      pivot.scale.set(Math.max(0.0001, grow * scratchLength * rewind), 1, 1);
    });
    drawCup(time);
    drawBell(time);
    drawSweep(time);
    drawCatch(time);
    drawDrop(time);
    stage.drawChips(time);
    stage.render();
  }

  /** Screen corners of the code area (one module outside it), for the viewfinder brackets. */
  const cornerPoint = new THREE.Vector3();
  function codeCorners() {
    qrRoot.updateMatrixWorld();
    const reach = (N / 2 + 1.2) * MOD;
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => {
      cornerPoint.set(sx * reach, TILE_Y + 0.12, sz * reach).applyMatrix4(qrRoot.matrixWorld);
      return stage.toScreen(cornerPoint.x, cornerPoint.y, cornerPoint.z);
    });
  }
  /** A point in the sticker's frame, on screen. */
  const localPoint = new THREE.Vector3();
  function stickerToScreen(x, y, z) {
    qrRoot.updateMatrixWorld();
    localPoint.set(x, y, z).applyMatrix4(qrRoot.matrixWorld);
    return stage.toScreen(localPoint.x, localPoint.y, localPoint.z);
  }

  return { stage, draw, codeCorners, stickerToScreen, STICKER_HALF, TILE_Y, MOD };
}
