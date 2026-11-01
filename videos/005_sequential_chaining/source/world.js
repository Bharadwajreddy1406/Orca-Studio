// The Three.js world: chain links, the coffee shop, the slabs, the chips and the camera.
// drawWorld(time) sets everything from time alone.
import * as THREE from "three";
import { backOut, bounceOut, clamp01, mix, seeded, smooth, spring, track } from "./motion.js";

const INK = 0x141210;
const ACCENT = 0xe8401a;
const BONE = 0xe8e0d8;

export const LAYOUT = {
  heroX: -52,
  shopX: -34,
  yardX: -17,
  stationX: [0, 16, 32, 48],
  stationZ: [3, -3, 3, -3],
};
const SLAB = { width: 8.6, height: 1.7, depth: 3 };
const PLINTH = { width: 5, height: 1.2, depth: 3 };
const HERO_LINKS = 8;
const CHAIN_LINKS = 7;
const LINK_REST_STEP = 1.45;
const OVERVIEW_SPREAD = 2.7;

function stadiumCurve() {
  const straight = 0.55;
  const radius = 0.42;
  const points = [];
  for (let index = 0; index < 28; index += 1) {
    const angle = (index / 28) * Math.PI * 2;
    const side = Math.cos(angle) >= 0 ? 1 : -1;
    points.push(new THREE.Vector3(Math.cos(angle) * radius + side * straight, Math.sin(angle) * radius, 0));
  }
  return new THREE.CatmullRomCurve3(points, true);
}

export function createWorld(container, beats) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(1080, 1920);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1080 / 1920, 1, 900);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfc6, 2.3));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 5;
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.ShadowMaterial({ opacity: 0.26 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const inkEdge = new THREE.LineBasicMaterial({ color: INK });
  const boneMaterial = new THREE.MeshLambertMaterial({ color: BONE });
  const inkMaterial = new THREE.MeshLambertMaterial({ color: INK });
  const accentMaterial = new THREE.MeshLambertMaterial({ color: ACCENT });
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const unitEdges = new THREE.EdgesGeometry(unitBox);

  const block = (material, width, height, depth, x, y, z) => {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.scale.set(width, height, depth);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.add(new THREE.LineSegments(unitEdges, inkEdge));
    return mesh;
  };

  /* ---------- chain links ---------- */

  const linkGeometry = new THREE.TubeGeometry(stadiumCurve(), 56, 0.17, 10, true);
  const makeLink = () => {
    const material = new THREE.MeshPhongMaterial({ color: INK, specular: 0x6a6460, shininess: 55 });
    const mesh = new THREE.Mesh(linkGeometry, material);
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
  };

  const heroLinks = Array.from({ length: HERO_LINKS }, makeLink);
  const chains = [0, 1, 2].map(() => Array.from({ length: CHAIN_LINKS }, makeLink));

  const direction = new THREE.Vector3();
  const axisX = new THREE.Vector3(1, 0, 0);
  const alignment = new THREE.Quaternion();
  const roll = new THREE.Quaternion();
  const scratchColor = new THREE.Color();
  const accentColor = new THREE.Color(ACCENT);
  const inkColor = new THREE.Color(INK);

  /** Lay links from A to B. Each slides out of the previous one as it forms. */
  function placeChain(links, from, to, { formedAt, stagger = 0.06, sag = 0, heat = 0, thick = 1, phase = 0, time }) {
    direction.set(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    const distance = direction.length();
    direction.normalize();
    alignment.setFromUnitVectors(axisX, direction);
    const step = distance / links.length;
    links.forEach((link, index) => {
      const form = spring((time - formedAt - index * stagger) / 0.26);
      if (form <= 0.001) {
        link.visible = false;
        return;
      }
      link.visible = true;
      const u = (index + 0.5 - (1 - form)) / links.length;
      const droop = sag * 4 * u * (1 - u);
      link.position.set(
        from[0] + (to[0] - from[0]) * u,
        Math.max(0.2, from[1] + (to[1] - from[1]) * u - droop),
        from[2] + (to[2] - from[2]) * u,
      );
      roll.setFromAxisAngle(axisX, (index % 2 === 0 ? Math.PI / 4 : -Math.PI / 4) + phase);
      link.quaternion.copy(alignment).multiply(roll);
      const across = thick * form;
      link.scale.set((step / LINK_REST_STEP) * form, across, across);
      const glow = typeof heat === "function" ? heat(index / links.length) : heat;
      link.material.color.copy(scratchColor.copy(inkColor).lerp(accentColor, clamp01(glow)));
    });
  }

  /* ---------- the coffee shop ---------- */

  const shopParts = [];
  const shopRoot = new THREE.Group();
  shopRoot.position.x = LAYOUT.shopX;
  scene.add(shopRoot);
  function shopPart(x, z, delay, ...meshes) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0, z);
    meshes.forEach((mesh) => pivot.add(mesh));
    shopRoot.add(pivot);
    shopParts.push({ pivot, delay });
    return pivot;
  }
  const windowPane = block(inkMaterial, 3.8, 2.8, 0.08, -0.9, 3.4, 0.3);
  shopPart(0, -3.2, 0,
    block(boneMaterial, 10.4, 6, 0.5, 0, 3, 0),
    windowPane,
    block(boneMaterial, 0.12, 2.8, 0.1, -0.9, 3.4, 0.36),
    block(boneMaterial, 3.8, 0.12, 0.1, -0.9, 3.4, 0.36),
    block(inkMaterial, 2.2, 4.6, 0.08, 3.1, 2.3, 0.3),
  );
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), accentMaterial);
  knob.position.set(2.4, 2.3, -2.8);
  shopRoot.add(knob);
  // The awning: stripes that tilt out from the wall and drop on one after another.
  for (let stripe = 0; stripe < 8; stripe += 1) {
    const mesh = block(stripe % 2 === 0 ? accentMaterial : boneMaterial, 1.3, 0.16, 2.3, 0, 5.5, 0);
    mesh.rotation.x = 0.55;
    shopPart(-4.55 + stripe * 1.3, -2.15, 0.12 + stripe * 0.035, mesh);
  }
  shopPart(1.3, -0.6, 0.35,
    block(inkMaterial, 6.6, 2.2, 1.8, 0, 1.1, 0),
    block(boneMaterial, 7, 0.22, 2.2, 0, 2.31, 0),
  );
  shopPart(-1, -0.7, 0.5,
    block(boneMaterial, 1.8, 1.5, 1, 0, 3.17, 0),
    block(inkMaterial, 1.5, 0.35, 0.8, 0, 3.8, 0.05),
    block(inkMaterial, 0.3, 0.5, 0.3, 0, 2.7, 0.55),
  );
  const cupBody = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.52, 1.5, 28), boneMaterial);
  cupBody.position.y = 3.17;
  cupBody.castShadow = true;
  cupBody.add(new THREE.LineSegments(new THREE.EdgesGeometry(cupBody.geometry, 40), inkEdge));
  const cupSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.67, 0.58, 0.55, 28), accentMaterial);
  cupSleeve.position.y = 3.13;
  const cupLid = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.18, 28), inkMaterial);
  cupLid.position.y = 4.0;
  shopPart(0.9, -0.6, 0.62, cupBody, cupSleeve, cupLid);

  /* ---------- slabs: the massive prompt, then the stairs, then the plinths ---------- */

  const slabs = [0, 1, 2, 3].map(() => {
    const material = new THREE.MeshLambertMaterial({ color: BONE });
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.add(new THREE.LineSegments(unitEdges, inkEdge));
    scene.add(mesh);
    return mesh;
  });

  /** 1 while the camera is on the wide shot, where the line opens into a wide S. */
  function overviewAmount(time) {
    return clamp01(
      smooth((time - beats.overview) / 1.2) * (1 - smooth((time - beats.junction) / 0.8)) +
        smooth((time - beats.benefits) / 0.8),
    );
  }

  /** Where a station is right now: steps 2 to 4 slide into a row for the parallel tease. */
  function stationAt(index, time) {
    const fan = smooth((time - beats.parallelMove) / 0.95);
    const x = LAYOUT.stationX[index];
    const z = LAYOUT.stationZ[index] * (1 + OVERVIEW_SPREAD * overviewAmount(time));
    if (index === 0 || fan <= 0) return [x, z];
    return [mix(x, 30, fan), mix(z, [0, -14, 0, 14][index], fan)];
  }

  /** How far a plinth has fallen: 0 upright, 1 flat, from the domino beat until the restore. */
  function toppleOf(index, time) {
    const fall = bounceOut((time - beats.topple[index]) / 0.42);
    const rise = spring((time - beats.restore[index]) / 0.42);
    return time < beats.topple[index] ? 0 : fall * (1 - rise);
  }

  function slabState(index, time, stackBase) {
    const landed = beats.slabs[index];
    const dropping = bounceOut((time - (landed - 0.3)) / 0.34);
    const stacked = {
      x: LAYOUT.yardX,
      y: stackBase + (index + 0.5) * SLAB.height + (1 - dropping) * 15,
      z: 1,
      width: SLAB.width,
      height: SLAB.height,
      depth: SLAB.depth,
    };
    const stairHeight = 1 + index * 1.05;
    const [stationX, stationZ] = stationAt(index, time);
    const free = track(
      { x: stacked.x, y: stacked.y, z: 1, width: SLAB.width, height: SLAB.height, depth: SLAB.depth },
      [
        {
          t: beats.broke + index * 0.05,
          d: 0.62,
          e: backOut,
          v: {
            x: LAYOUT.yardX - 3.75 + index * 2.5,
            y: stairHeight / 2,
            z: 0,
            width: 2.5,
            height: stairHeight,
            depth: 3,
          },
        },
        {
          t: beats.slabFlight[index],
          d: 0.58,
          e: smooth,
          v: {
            x: LAYOUT.stationX[index] + 1.8,
            y: PLINTH.height / 2,
            z: LAYOUT.stationZ[index] - 0.5,
            width: PLINTH.width,
            height: PLINTH.height,
            depth: PLINTH.depth,
          },
        },
      ],
      time,
    );
    const widened = clamp01((time - beats.slabFlight[index] - 0.58) / 0.01) * overviewAmount(time);
    if (time < beats.broke + index * 0.05) return { ...stacked, visible: time >= landed - 0.3, spin: 0, arc: 0 };
    const flight = clamp01((time - beats.slabFlight[index]) / 0.58);
    const burst = Math.sin(Math.PI * clamp01((time - beats.broke) / 0.62)) * 3.4 * (index - 1.5) * 0.5;
    return {
      ...free,
      x: free.x + burst + (flight >= 1 ? stationX - LAYOUT.stationX[index] : 0),
      z: flight >= 1 ? stationZ - 0.5 : free.z,
      depth: free.depth * (1 + widened * 1.1),
      visible: true,
      spin: Math.sin(Math.PI * clamp01((time - beats.broke) / 0.62)) * (index % 2 ? 0.28 : -0.28),
      arc: Math.sin(Math.PI * flight) * 7,
    };
  }

  /* ---------- flying chips ---------- */

  const CHIP_COUNT = 150;
  const chips = new THREE.InstancedMesh(unitBox, inkMaterial, CHIP_COUNT);
  chips.castShadow = true;
  chips.frustumCulled = false;
  scene.add(chips);
  const chipPlacement = new THREE.Object3D();
  const chipRandom = seeded(31);
  const bursts = beats.bursts.map((burst) => ({
    ...burst,
    parts: Array.from({ length: burst.count }, () => ({
      vx: (chipRandom() - 0.5) * 18,
      vy: 4 + chipRandom() * 11,
      vz: (chipRandom() - 0.5) * 10,
      size: 0.1 + chipRandom() * 0.24,
      turn: chipRandom() * 12,
      offset: chipRandom() * burst.spread - burst.spread / 2,
      height: chipRandom() * burst.tall,
    })),
  }));
  function drawChips(time) {
    let used = 0;
    for (const burst of bursts) {
      const age = time - burst.t;
      if (age < 0 || age > 1.6) continue;
      for (const part of burst.parts) {
        if (used >= CHIP_COUNT) break;
        const y = Math.max(0.08, burst.y + part.height + part.vy * age - 15 * age * age);
        const fade = 1 - smooth((age - 1.1) / 0.5);
        chipPlacement.position.set(burst.x + part.offset + part.vx * age, y, burst.z + part.vz * age);
        chipPlacement.rotation.set(part.turn * age, part.turn * age * 0.6, 0);
        chipPlacement.scale.setScalar(Math.max(0.0001, part.size * fade));
        chipPlacement.updateMatrix();
        chips.setMatrixAt(used, chipPlacement.matrix);
        used += 1;
      }
    }
    chips.count = used;
    chips.instanceMatrix.needsUpdate = true;
  }

  /* ---------- camera ---------- */

  const closeUp = (x, z = 0, extra = {}) => ({ yaw: 0.06, pitch: 0.2, dist: 47, x, y: 2.3, z, ...extra });
  const OVERVIEW = { yaw: -1.4, pitch: 0.72, dist: 226, x: 24, y: -2, z: 0 };
  const shot = (t, d, pose, e) => ({ t, d, v: pose, e });
  const cameraKeys = [
    shot(beats.shop - 0.28, 0.62, closeUp(LAYOUT.shopX)),
    // The camera eases back and across, making room for the phone beside the shop.
    shot(beats.instagram - 0.3, 0.7, closeUp(LAYOUT.shopX + 2, 0, { dist: 60, y: 2.9 })),
    shot(beats.massive - 0.28, 0.62, closeUp(LAYOUT.yardX, 1)),
    shot(beats.slabs[0] - 0.55, 0.7, { ...closeUp(LAYOUT.yardX, 1), dist: 64, y: 4.3, pitch: 0.16 }),
    shot(beats.smaller - 0.15, 0.7, { ...closeUp(LAYOUT.yardX, 0), dist: 58, y: 3.6 }),
    ...[0, 1, 2, 3].map((index) =>
      shot(beats.whip[index], 0.6, closeUp(LAYOUT.stationX[index], LAYOUT.stationZ[index])),
    ),
    shot(beats.overview, 1.5, OVERVIEW),
    shot(beats.junction, 1.05, { yaw: 0.04, pitch: 0.24, dist: 48, x: 26, y: 0.3, z: 0 }),
    shot(beats.benefits, 0.9, OVERVIEW),
    shot(beats.parallelMove, 1.1, { ...OVERVIEW, x: 17, dist: 196 }),
  ];
  const openingPose = closeUp(LAYOUT.heroX);

  function poseAt(time) {
    const pose = track(openingPose, cameraKeys, time);
    // A slow handheld float, so the frame is never dead still.
    pose.yaw += 0.007 * Math.sin(time * 0.71);
    pose.pitch += 0.004 * Math.sin(time * 0.53 + 1);
    let shakeX = 0;
    let shakeY = 0;
    for (const hit of beats.shakes) {
      const age = time - hit.t;
      if (age < 0 || age > 0.7) continue;
      const strength = hit.amount * (pose.dist / 47) * Math.exp(-7 * age);
      shakeX += strength * Math.sin(age * 57);
      shakeY += strength * Math.cos(age * 43);
    }
    pose.x += shakeX;
    pose.y += shakeY;
    return pose;
  }

  function applyCamera(pose) {
    camera.position.set(
      pose.x + Math.sin(pose.yaw) * Math.cos(pose.pitch) * pose.dist,
      pose.y + Math.sin(pose.pitch) * pose.dist,
      pose.z + Math.cos(pose.yaw) * Math.cos(pose.pitch) * pose.dist,
    );
    camera.lookAt(pose.x, pose.y, pose.z);
    camera.updateMatrixWorld();
    // The shadow frustum follows the shot, so close-ups keep crisp shadows.
    const reach = Math.max(16, pose.dist * 0.42);
    sun.target.position.set(pose.x, 0, pose.z);
    sun.position.set(pose.x - 14, 34, pose.z + 22);
    sun.target.updateMatrixWorld();
    Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 1, far: 320 });
    sun.shadow.camera.updateProjectionMatrix();
  }

  const projected = new THREE.Vector3();
  function toScreen(x, y, z) {
    projected.set(x, y, z).project(camera);
    return { x: (projected.x + 1) * 540, y: (1 - projected.y) * 960 };
  }
  /** Screen pixels per world unit at this point: how large a figure standing here should be. */
  function pixelsPerUnit(x, y, z) {
    const lower = toScreen(x, y, z);
    const upper = toScreen(x, y + 1, z);
    return Math.hypot(upper.x - lower.x, upper.y - lower.y);
  }

  /* ---------- one frame ---------- */

  function drawHeroChain(time) {
    const left = [LAYOUT.heroX - 4.6, 1.1, 0];
    const right = [LAYOUT.heroX + 4.6, 6.5, 0];
    const hidden = time > beats.massive;
    heroLinks.forEach((link) => {
      link.visible = !hidden;
    });
    if (hidden) return;
    const stagger = (beats.chaining - beats.heroStart) / HERO_LINKS;
    const sway = Math.sin(time * 1.4) * 0.12;
    placeChain(heroLinks, [left[0], left[1] + sway, 0], [right[0], right[1] - sway, 0], {
      formedAt: beats.heroStart,
      stagger,
      thick: 1.5,
      phase: time * 0.12,
      heat: (u) => (u > 0.8 ? 1 : 0),
      time,
    });
  }

  function drawShop(time) {
    const leaving = spring((time - beats.shopGone) / 0.3);
    shopRoot.visible = time >= beats.shop - 0.3 && leaving < 1;
    shopParts.forEach(({ pivot, delay }) => {
      const size = Math.max(0.0001, backOut((time - beats.shop + 0.15 - delay) / 0.36) * (1 - leaving));
      pivot.scale.set(size, size, size);
    });
    knob.scale.setScalar(Math.max(0.0001, spring((time - beats.shop - 0.3) / 0.3) * (1 - leaving)));
  }

  function drawSlabs(time, stackBase) {
    slabs.forEach((slab, index) => {
      const state = slabState(index, time, stackBase);
      slab.visible = state.visible;
      if (!state.visible) return;
      const fall = toppleOf(index, time);
      const lifted = index === 2 ? 1.6 * smooth((time - beats.improve) / 0.35) * (1 - smooth((time - beats.careful) / 0.4)) : 0;
      const height = state.height + lifted;
      // Tipping over the plinth's far edge, as a domino falls away from the one before it.
      const tipAngle = fall * 1.42;
      slab.rotation.set(0, 0, state.spin - tipAngle);
      slab.scale.set(state.width, height, state.depth);
      slab.position.set(
        state.x + fall * (state.width / 2 - 0.2),
        height / 2 + (state.y - state.height / 2) + state.arc - fall * (height / 2) + fall * Math.cos(tipAngle) * 0.3 + fall * (state.width / 2) * Math.sin(tipAngle) * 0.05,
        state.z,
      );
      const hot = index === 0 ? smooth((time - beats.mistake) / 0.12) * (1 - smooth((time - beats.restore[0]) / 0.3)) : clamp01(fall);
      const pulse = Math.exp(-Math.pow((time - beats.pulse[index]) / 0.28, 2));
      scratchColor.setHex(BONE).lerp(accentColor, Math.max(hot, pulse));
      slab.material.color.copy(scratchColor);
    });
  }

  function chainHeat(index, time) {
    const broken = time >= beats.topple[index + 1] ? 1 - smooth((time - beats.restore[index + 1]) / 0.3) : 0;
    const runner = (time - beats.pulseLink[index]) / 0.42;
    return (u) => {
      const wave = Math.exp(-Math.pow((runner - u) * 3.2, 2));
      return Math.max(broken, wave);
    };
  }

  function drawChains(time) {
    const thick = 1 + 0.9 * overviewAmount(time);
    const fan = smooth((time - beats.parallelMove) / 0.95);
    chains.forEach((links, index) => {
      const [fromX, fromZ] = stationAt(index, time);
      const [toX, toZ] = stationAt(index + 1, time);
      const [rootX, rootZ] = stationAt(0, time);
      // In the tease, every chain starts from step 1 instead of the previous step.
      const startX = mix(fromX + 4.3, rootX + 4.3, fan);
      const startZ = mix(fromZ - 0.5, rootZ - 0.5, fan);
      const falling = Math.max(toppleOf(index, time), toppleOf(index + 1, time));
      placeChain(links, [startX, 0.75, startZ], [toX - 0.7, 0.75, toZ - 0.5], {
        formedAt: beats.whip[index + 1],
        stagger: 0.055,
        sag: 0.25 + falling * 1.5,
        heat: chainHeat(index, time),
        thick,
        time,
      });
    });
  }

  function draw(time, stackBase) {
    applyCamera(poseAt(time));
    drawHeroChain(time);
    drawShop(time);
    drawSlabs(time, stackBase);
    drawChains(time);
    drawChips(time);
    renderer.render(scene, camera);
  }

  return { draw, applyCamera, poseAt, toScreen, pixelsPerUnit, stationAt, toppleOf, slabState, overviewAmount };
}
