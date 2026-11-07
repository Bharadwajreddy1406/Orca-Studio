// The Three.js world: the Goa beach, the workshop where one request fans out to three
// stations and back into one plan, the chains, the chips and the camera. Time alone sets it.
import * as THREE from "three";
import { backOut, clamp01, mix, seeded, smooth, spring, track } from "./motion.js";

const INK = 0x141210;
const ACCENT = 0xe8401a;
const BONE = 0xe8e0d8;

export const LAYOUT = {
  beachX: -34,
  hub: [0, 8],
  stations: [
    [-8, -6],
    [0, -6],
    [8, -6],
  ],
  merge: [0, -20],
};
const PLINTH = { width: 4, height: 1.2, depth: 3 };
const LINKS_PER_CHAIN = 6;
const LINK_REST_STEP = 1.45;

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
  const scratchColor = new THREE.Color();
  const accentColor = new THREE.Color(ACCENT);
  const inkColor = new THREE.Color(INK);
  const boneColor = new THREE.Color(BONE);

  const block = (material, width, height, depth, x, y, z, edges = true) => {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.scale.set(width, height, depth);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (edges) mesh.add(new THREE.LineSegments(unitEdges, inkEdge));
    return mesh;
  };

  /** Parts that pop up from the floor one after another, and can shrink away again. */
  function popGroup(x, z) {
    const root = new THREE.Group();
    root.position.set(x, 0, z);
    scene.add(root);
    const parts = [];
    return {
      root,
      add(px, pz, delay, ...meshes) {
        const pivot = new THREE.Group();
        pivot.position.set(px, 0, pz);
        meshes.forEach((mesh) => pivot.add(mesh));
        root.add(pivot);
        parts.push({ pivot, delay });
        return pivot;
      },
      draw(time, shownAt, hiddenAt = Infinity, returnAt = Infinity) {
        const back = time >= returnAt;
        const leaving = back ? 0 : spring((time - hiddenAt) / 0.3);
        const from = back ? returnAt : shownAt;
        root.visible = time >= from - 0.2 && leaving < 1;
        parts.forEach(({ pivot, delay }) => {
          const size = Math.max(0.0001, backOut((time - from - delay) / 0.36) * (1 - leaving));
          pivot.scale.set(size, size, size);
        });
      },
    };
  }

  /* ---------- the beach in Goa ---------- */

  const beach = popGroup(LAYOUT.beachX, 0);
  beach.add(0, 0, 0, block(boneMaterial, 11.4, 0.4, 6.4, 0, 0.2, 0));
  beach.add(0, -4.2, 0.08, block(inkMaterial, 11.4, 0.3, 2.4, 0, 0.15, 0));
  const waves = [];
  for (let wave = 0; wave < 3; wave += 1) {
    const mesh = block(boneMaterial, 1.6, 0.06, 0.12, 0, 0.34, 0, false);
    waves.push(mesh);
    beach.add(-3.6 + wave * 3.4, -4.4 + (wave % 2) * 0.7, 0.16 + wave * 0.04, mesh);
  }
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 20), accentMaterial);
  sunDisc.position.y = 5;
  beach.add(0.6, -6.5, 0.22, sunDisc);
  function palm(lean, height) {
    const tree = new THREE.Group();
    const segments = 7;
    for (let index = 0; index < segments; index += 1) {
      const piece = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, height / segments + 0.05, 10), inkMaterial);
      const along = (index + 0.5) / segments;
      piece.position.set(lean * along * along * 2.2, along * height, 0);
      piece.rotation.z = -lean * along * 0.9;
      piece.castShadow = true;
      tree.add(piece);
    }
    const top = new THREE.Vector3(lean * 2.2, height, 0);
    // Each frond arches up and out, then droops: three segments, each tipped further down.
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), inkMaterial);
    crown.position.copy(top);
    tree.add(crown);
    for (let leaf = 0; leaf < 8; leaf += 1) {
      const frond = new THREE.Group();
      frond.position.copy(top);
      frond.rotation.y = (leaf / 8) * Math.PI * 2 + 0.3;
      const tip = new THREE.Vector3();
      let pitch = 0.45;
      for (let segment = 0; segment < 3; segment += 1) {
        const length = 0.95 - segment * 0.12;
        const piece = new THREE.Mesh(unitBox, inkMaterial);
        piece.scale.set(length, 0.08, 0.8 - segment * 0.17);
        piece.rotation.z = pitch;
        piece.position.set(tip.x + Math.cos(pitch) * length * 0.5, tip.y + Math.sin(pitch) * length * 0.5, 0);
        piece.castShadow = true;
        frond.add(piece);
        tip.x += Math.cos(pitch) * length;
        tip.y += Math.sin(pitch) * length;
        pitch -= 0.5;
      }
      tree.add(frond);
    }
    return tree;
  }
  beach.add(-5.1, -2.2, 0.3, palm(0.5, 4.6));
  beach.add(5, -2.6, 0.38, palm(-0.4, 4));
  beach.add(4.3, -0.4, 0.46,
    block(inkMaterial, 0.18, 2.2, 0.18, 0, 1.1, -0.2),
    block(boneMaterial, 2.3, 1, 0.16, 0, 2.3, 0),
  );

  /* ---------- the workshop: hub, three stations, merge ---------- */

  const plinthAt = (x, z) => block(boneMaterial, PLINTH.width, PLINTH.height, PLINTH.depth, x, PLINTH.height / 2, z);
  const workshop = popGroup(0, 0);
  const hubPlinth = plinthAt(0, 0);
  workshop.add(LAYOUT.hub[0], LAYOUT.hub[1], 0, hubPlinth);
  const stationPlinths = LAYOUT.stations.map(([x, z], index) => {
    const mesh = block(new THREE.MeshLambertMaterial({ color: BONE }), PLINTH.width, PLINTH.height, PLINTH.depth, 0, PLINTH.height / 2, 0);
    workshop.add(x, z, 0.12 + index * 0.02, mesh);
    return mesh;
  });
  const merge = popGroup(LAYOUT.merge[0], LAYOUT.merge[1]);
  const mergePlinth = block(new THREE.MeshLambertMaterial({ color: BONE }), 5, 1.5, 3.4, 0, 0.75, 0);
  merge.add(0, 0, 0, mergePlinth);

  /* ---------- chain links ---------- */

  const linkGeometry = new THREE.TubeGeometry(stadiumCurve(), 56, 0.17, 10, true);
  const makeLinks = (count) =>
    Array.from({ length: count }, () => {
      const mesh = new THREE.Mesh(linkGeometry, new THREE.MeshPhongMaterial({ color: INK, specular: 0x6a6460, shininess: 55 }));
      mesh.castShadow = true;
      scene.add(mesh);
      return mesh;
    });
  const fanOut = [0, 1, 2].map(() => makeLinks(LINKS_PER_CHAIN));
  const fanIn = [0, 1, 2].map(() => makeLinks(LINKS_PER_CHAIN));
  const dependency = makeLinks(4);

  const direction = new THREE.Vector3();
  const axisX = new THREE.Vector3(1, 0, 0);
  const alignment = new THREE.Quaternion();
  const roll = new THREE.Quaternion();

  /** Lay links from A to B. Each slides out of the previous one as it forms. */
  function placeChain(links, from, to, { formedAt, gone = Infinity, stagger = 0.05, heat = 0, thick = 1, lift = 0, time }) {
    direction.set(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    const distance = direction.length();
    direction.normalize();
    alignment.setFromUnitVectors(axisX, direction);
    const step = distance / links.length;
    const fade = 1 - spring((time - gone) / 0.3);
    links.forEach((link, index) => {
      const form = spring((time - formedAt - index * stagger) / 0.26) * fade;
      if (form <= 0.001) {
        link.visible = false;
        return;
      }
      link.visible = true;
      const u = (index + 0.5 - (1 - form)) / links.length;
      link.position.set(
        from[0] + (to[0] - from[0]) * u,
        from[1] + (to[1] - from[1]) * u + Math.sin(Math.PI * u) * lift,
        from[2] + (to[2] - from[2]) * u,
      );
      roll.setFromAxisAngle(axisX, index % 2 === 0 ? Math.PI / 4 : -Math.PI / 4);
      link.quaternion.copy(alignment).multiply(roll);
      const across = thick * form;
      link.scale.set((step / LINK_REST_STEP) * form, across, across);
      const glow = typeof heat === "function" ? heat(index / links.length) : heat;
      link.material.color.copy(scratchColor.copy(inkColor).lerp(accentColor, clamp01(glow)));
    });
  }

  // A pulse that runs along a chain: u is 0 at the chain's start and 1 at its end.
  const pulseAt = (time, at, span = 0.5) => (u) => Math.exp(-Math.pow(((time - at) / span - u) * 3, 2));

  function drawChains(time) {
    const [hubX, hubZ] = LAYOUT.hub;
    const [mergeX, mergeZ] = LAYOUT.merge;
    LAYOUT.stations.forEach(([x, z], index) => {
      const outward = (u) =>
        Math.max(pulseAt(time, beats.fanOut, 0.45)(u), pulseAt(time, beats.named, 0.55)(u), pulseAt(time, beats.again, 0.45)(u));
      placeChain(fanOut[index], [hubX + (x - hubX) * 0.2, 0.75, hubZ - 1.5], [x, 0.75, z + 1.5], {
        formedAt: beats.fanOut,
        heat: outward,
        thick: 1.15,
        time,
      });
      const inward = (u) =>
        Math.max(pulseAt(time, beats.together, 0.5)(u), pulseAt(time, beats.named + 0.5, 0.55)(u), pulseAt(time, beats.again + 0.4, 0.45)(u));
      placeChain(fanIn[index], [x, 0.75, z - 1.5], [mergeX + (x - mergeX) * 0.25, 0.9, mergeZ + 1.7], {
        formedAt: beats.together - 0.1,
        heat: inward,
        thick: 1.15,
        time,
      });
    });
    // The counter-example: step 2 now needs step 1's output, so a hot link joins them.
    const [fromX, fromZ] = LAYOUT.stations[0];
    const [toX, toZ] = LAYOUT.stations[1];
    placeChain(dependency, [fromX + 2.1, 1.3, fromZ], [toX - 2.1, 1.3, toZ], {
      formedAt: beats.depend,
      gone: beats.again - 0.2,
      stagger: 0.07,
      heat: 1,
      thick: 1.3,
      lift: 0.9,
      time,
    });
  }

  function drawPlinths(time) {
    stationPlinths.forEach((plinth, index) => {
      const done = smooth((time - beats.done[index]) / 0.2) * (1 - smooth((time - beats.together - 0.6) / 0.4)) * 1.18;
      const pulse = Math.max(
        Math.exp(-Math.pow((time - beats.fanOut - 0.45) / 0.25, 2)),
        Math.exp(-Math.pow((time - beats.named - 0.5) / 0.3, 2)),
      );
      const blocked = index === 1 ? smooth((time - beats.depend) / 0.2) * (1 - smooth((time - beats.again + 0.2) / 0.3)) : 0;
      plinth.material.color.copy(scratchColor.copy(boneColor).lerp(accentColor, Math.max(done * 0.85, pulse, blocked)));
    });
    const mergeHot = Math.exp(-Math.pow((time - beats.planReady) / 0.3, 2));
    mergePlinth.material.color.copy(scratchColor.copy(boneColor).lerp(accentColor, mergeHot));
  }

  /* ---------- flying chips ---------- */

  const CHIP_COUNT = 120;
  const chips = new THREE.InstancedMesh(unitBox, inkMaterial, CHIP_COUNT);
  chips.castShadow = true;
  chips.frustumCulled = false;
  scene.add(chips);
  const chipPlacement = new THREE.Object3D();
  const chipRandom = seeded(17);
  const bursts = beats.bursts.map((burst) => ({
    ...burst,
    parts: Array.from({ length: burst.count }, () => ({
      vx: (chipRandom() - 0.5) * 12,
      vy: 5 + chipRandom() * 9,
      vz: (chipRandom() - 0.5) * 8,
      size: 0.08 + chipRandom() * 0.18,
      turn: chipRandom() * 12,
    })),
  }));
  function drawChips(time) {
    let used = 0;
    for (const burst of bursts) {
      const age = time - burst.t;
      if (age < 0 || age > 1.4) continue;
      for (const part of burst.parts) {
        if (used >= CHIP_COUNT) break;
        const fade = 1 - smooth((age - 0.9) / 0.5);
        chipPlacement.position.set(
          burst.x + part.vx * age,
          Math.max(0.08, burst.y + part.vy * age - 15 * age * age),
          burst.z + part.vz * age,
        );
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

  const closeUp = (x, z = 0, extra = {}) => ({ yaw: 0.04, pitch: 0.2, dist: 47, x, y: 2.3, z, ...extra });
  const STATION = (index) => ({ yaw: 0, pitch: 0.55, dist: 47, x: LAYOUT.stations[index][0], y: 3.2, z: LAYOUT.stations[index][1] });
  const MERGE = { yaw: 0, pitch: 0.55, dist: 50, x: LAYOUT.merge[0] - 0.6, y: 3.2, z: LAYOUT.merge[1] };
  const OVERVIEW = { yaw: 0, pitch: 0.86, dist: 140, x: 0, y: -0.5, z: -5.2 };
  // While the timing bar fills the top of the frame, frame only the hub and the stations.
  const LOWER = { yaw: 0, pitch: 0.86, dist: 150, x: 0, y: -1.5, z: -3.2 };
  // The catch: just steps 1 and 2, and the link that now makes one wait for the other.
  const DEPEND = { yaw: 0, pitch: 0.5, dist: 90, x: -4, y: 2.6, z: -6 };
  const shot = (t, d, pose, e) => ({ t, d, v: pose, e });
  const cameraKeys = [
    shot(beats.cards, 0.9, closeUp(LAYOUT.beachX, 0.6, { dist: 52, y: 2.8 })),
    shot(beats.sequential - 0.2, 0.8, closeUp(LAYOUT.beachX + 0.6, 0.6, { dist: 50, y: 2.2, pitch: 0.24 })),
    shot(beats.behind - 0.25, 1.15, { ...OVERVIEW, dist: 96, pitch: 0.7 }),
    ...[0, 1, 2].map((index) => shot(beats.lane[index] - 0.3, 0.6, STATION(index))),
    shot(beats.independent - 0.15, 1.1, OVERVIEW),
    shot(beats.together - 0.25, 0.8, MERGE),
    shot(beats.named - 0.35, 1.1, OVERVIEW),
    shot(beats.compare - 0.1, 0.8, LOWER),
    shot(beats.depend - 0.3, 0.7, DEPEND),
    shot(beats.again - 0.45, 0.6, closeUp(LAYOUT.beachX, 0.6, { dist: 50, y: 2.6 })),
  ];
  const openingPose = closeUp(LAYOUT.beachX, 0.6, { dist: 44, y: 2.6 });

  function poseAt(time) {
    const pose = track(openingPose, cameraKeys, time);
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
  function pixelsPerUnit(x, y, z) {
    const lower = toScreen(x, y, z);
    const upper = toScreen(x, y + 1, z);
    return Math.hypot(upper.x - lower.x, upper.y - lower.y);
  }

  function draw(time) {
    applyCamera(poseAt(time));
    beach.draw(time, 0.25, beats.behind + 0.6, beats.again - 0.2);
    waves.forEach((wave, index) => {
      wave.position.x = Math.sin(time * 0.9 + index * 2.1) * 0.35;
    });
    sunDisc.position.y = 5 + Math.sin(time * 0.8) * 0.08;
    workshop.draw(time, beats.behind + 0.15, beats.again + 0.6);
    merge.draw(time, beats.together - 0.35, beats.again + 0.6);
    drawPlinths(time);
    drawChains(time);
    drawChips(time);
    renderer.render(scene, camera);
  }

  return { draw, applyCamera, poseAt, toScreen, pixelsPerUnit };
}
