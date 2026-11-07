// The Three.js world: the developer's desk, and the feedback loop, an oval of chain between
// Write and Test that the code rides up and the error rides back down. Time alone sets it.
import * as THREE from "three";
import { backOut, bounceOut, clamp01, mix, seeded, smooth, spring, track } from "./motion.js";

const INK = 0x141210;
const ACCENT = 0xe8401a;
const BONE = 0xe8e0d8;

export const LAYOUT = {
  deskX: -30,
  // The loop is an oval, long axis toward the camera so it fills the portrait frame.
  radiusX: 4.6,
  radiusZ: 8.2,
  write: [0, 8.2],
  test: [0, -8.2],
};
const LINKS_PER_SIDE = 11;
const LINK_REST_STEP = 1.45;

/** A point on the loop. θ = 0 is Write, θ = π is Test; up the right side, back down the left. */
export function loopPoint(theta, lift = 0) {
  return [LAYOUT.radiusX * Math.sin(theta), lift, LAYOUT.radiusZ * Math.cos(theta)];
}

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

export function createWorld(container, beats, tokenAngle) {
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
      add(px, pz, delay, ...meshes) {
        const pivot = new THREE.Group();
        pivot.position.set(px, 0, pz);
        meshes.forEach((mesh) => pivot.add(mesh));
        root.add(pivot);
        parts.push({ pivot, delay });
        return pivot;
      },
      draw(time, shownAt, hiddenAt = Infinity) {
        const leaving = spring((time - hiddenAt) / 0.3);
        root.visible = time >= shownAt - 0.2 && leaving < 1;
        parts.forEach(({ pivot, delay }) => {
          const size = Math.max(0.0001, backOut((time - shownAt - delay) / 0.36) * (1 - leaving));
          pivot.scale.set(size, size, size);
        });
      },
    };
  }

  /* ---------- the developer's desk ---------- */

  const desk = popGroup(LAYOUT.deskX, 0);
  desk.add(1.4, -0.4, 0, block(inkMaterial, 5.4, 2.2, 2.4, 0, 1.1, 0), block(boneMaterial, 5.8, 0.24, 2.8, 0, 2.32, 0));
  const screen = block(boneMaterial, 2.6, 1.7, 0.12, 0, 0.85, 0);
  const screenFace = block(inkMaterial, 2.3, 1.42, 0.05, 0, 0.85, 0.08, false);
  const laptop = new THREE.Group();
  laptop.position.set(0, 2.44, -0.5);
  laptop.rotation.x = -0.18;
  laptop.add(screen, screenFace);
  desk.add(1.9, -0.4, 0.14, block(boneMaterial, 2.6, 0.12, 1.7, 0, 2.5, 0.3), laptop);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.6, 20), accentMaterial);
  mug.position.y = 2.74;
  mug.castShadow = true;
  desk.add(-0.4, 0.2, 0.24, mug);

  /* ---------- the loop: two plinths and the chain oval ---------- */

  const plinth = (material) => block(material, 4.2, 1.2, 3, 0, 0.6, 0);
  const loop = popGroup(0, 0);
  const writePlinth = plinth(new THREE.MeshLambertMaterial({ color: BONE }));
  const testPlinth = plinth(new THREE.MeshLambertMaterial({ color: BONE }));
  loop.add(LAYOUT.write[0], LAYOUT.write[1], 0, writePlinth);
  loop.add(LAYOUT.test[0], LAYOUT.test[1], 0.1, testPlinth);

  const linkGeometry = new THREE.TubeGeometry(stadiumCurve(), 56, 0.17, 10, true);
  const makeLinks = (count) =>
    Array.from({ length: count }, () => {
      const mesh = new THREE.Mesh(linkGeometry, new THREE.MeshPhongMaterial({ color: INK, specular: 0x6a6460, shininess: 55 }));
      mesh.castShadow = true;
      scene.add(mesh);
      return mesh;
    });
  // Out: Write to Test up the right side. Back: Test to Write down the left.
  const sides = [makeLinks(LINKS_PER_SIDE), makeLinks(LINKS_PER_SIDE)];
  const tangent = new THREE.Vector3();
  const axisX = new THREE.Vector3(1, 0, 0);
  const alignment = new THREE.Quaternion();
  const roll = new THREE.Quaternion();
  // The links stop short of the plinths, which sit on the loop at θ = 0 and π.
  const SIDE_SPAN = [0.36, Math.PI - 0.36];

  const wrapAngle = (angle) => ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  function drawLoop(time) {
    const token = wrapAngle(tokenAngle(time));
    const frantic = smooth((time - beats.endless) / 0.6) * (1 - smooth((time - beats.stop) / 0.2));
    const passed = Math.exp(-Math.pow((time - beats.pass) / 0.35, 2));
    sides.forEach((links, side) => {
      const formedAt = beats.loopForms + side * 0.35;
      const span = (SIDE_SPAN[1] - SIDE_SPAN[0]) / links.length;
      links.forEach((link, index) => {
        const form = spring((time - formedAt - index * 0.04) / 0.26);
        if (form <= 0.001) {
          link.visible = false;
          return;
        }
        link.visible = true;
        const theta = SIDE_SPAN[0] + (index + 0.5) * span + side * Math.PI;
        const [x, , z] = loopPoint(theta);
        link.position.set(x, 0.7 + (1 - form) * 2, z);
        tangent.set(LAYOUT.radiusX * Math.cos(theta), 0, -LAYOUT.radiusZ * Math.sin(theta)).normalize();
        alignment.setFromUnitVectors(axisX, tangent);
        roll.setFromAxisAngle(axisX, index % 2 === 0 ? Math.PI / 4 : -Math.PI / 4);
        link.quaternion.copy(alignment).multiply(roll);
        const step = Math.hypot(LAYOUT.radiusX, LAYOUT.radiusZ) * 0.72 * span;
        link.scale.set((step / LINK_REST_STEP) * form, 1.2 * form, 1.2 * form);
        // A glow travels with the card; errors heading back glow on the left side.
        const gap = Math.abs(((theta - token + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        const near = Math.exp(-Math.pow(gap / 0.45, 2)) * (time >= beats.firstRun ? 1 : 0);
        link.material.color.copy(scratchColor.copy(inkColor).lerp(accentColor, clamp01(Math.max(near, frantic, passed))));
      });
    });
    const failFlash = (at) => Math.exp(-Math.pow((time - at) / 0.25, 2));
    const testHot = Math.max(failFlash(beats.fails[0]), failFlash(beats.fails[1]), frantic * (0.5 + 0.5 * Math.sin(time * 30)));
    testPlinth.material.color.copy(scratchColor.copy(boneColor).lerp(accentColor, clamp01(testHot)));
    const fixFlash = Math.max(failFlash(beats.fixes[0]), failFlash(beats.fixes[1]), passed);
    writePlinth.material.color.copy(scratchColor.copy(boneColor).lerp(accentColor, clamp01(fixFlash)));
  }

  /* ---------- the stop sign ---------- */

  const stopSign = new THREE.Group();
  const octagon = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.3, 8), accentMaterial);
  octagon.rotation.set(Math.PI / 2, Math.PI / 8, 0);
  octagon.position.y = 5.2;
  octagon.castShadow = true;
  octagon.add(new THREE.LineSegments(new THREE.EdgesGeometry(octagon.geometry), inkEdge));
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 5.2, 12), inkMaterial);
  post.position.y = 2.6;
  post.castShadow = true;
  stopSign.add(octagon, post);
  scene.add(stopSign);
  function drawStop(time) {
    stopSign.visible = time >= beats.stop - 0.35;
    stopSign.position.set(0, (1 - bounceOut((time - beats.stop + 0.35) / 0.45)) * 18, 0);
    stopSign.rotation.y = 0;
  }

  /* ---------- flying chips ---------- */

  const CHIP_COUNT = 120;
  const chips = new THREE.InstancedMesh(unitBox, inkMaterial, CHIP_COUNT);
  chips.castShadow = true;
  chips.frustumCulled = false;
  scene.add(chips);
  const chipPlacement = new THREE.Object3D();
  const chipRandom = seeded(23);
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
        chipPlacement.position.set(burst.x + part.vx * age, Math.max(0.08, burst.y + part.vy * age - 15 * age * age), burst.z + part.vz * age);
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
  const OVERVIEW = { yaw: 0, pitch: 0.9, dist: 124, x: 0, y: -1.5, z: -3.4 };
  const shot = (t, d, pose, e) => ({ t, d, v: pose, e });
  const cameraKeys = [
    shot(beats.idea, 0.8, closeUp(LAYOUT.deskX + 0.4, 0, { dist: 50, y: 2.4 })),
    shot(beats.firstRun - 0.5, 0.9, OVERVIEW),
    shot(beats.limit - 0.2, 0.7, { ...OVERVIEW, dist: 120 }),
    shot(beats.stop - 0.1, 0.5, { ...OVERVIEW, dist: 104 }),
  ];
  const openingPose = closeUp(LAYOUT.deskX + 0.6, 0, { dist: 44, y: 2.5 });

  // During the endless loop, the camera is dragged round the loop, faster and faster.
  function spin(time) {
    if (time < beats.endless) return 0;
    const running = Math.min(time, beats.stop) - beats.endless;
    const settle = time > beats.stop ? backOut((time - beats.stop) / 0.5) : 0;
    const angle = 0.5 * running * running;
    return mix(angle, Math.round(angle / (Math.PI * 2)) * Math.PI * 2, settle);
  }

  // While the card rides the loop, the camera leans toward it so the shot keeps moving.
  function follow(time) {
    if (time < beats.firstRun - 0.4 || time > beats.limit) return [0, 0];
    const [x, , z] = loopPoint(tokenAngle(time));
    const amount = smooth((time - beats.firstRun + 0.4) / 0.6) * (1 - smooth((time - beats.limit + 0.3) / 0.4));
    return [x * 0.25 * amount, z * 0.32 * amount];
  }

  function poseAt(time) {
    const pose = track(openingPose, cameraKeys, time);
    const [leanX, leanZ] = follow(time);
    pose.x += leanX;
    pose.z += leanZ;
    pose.yaw += spin(time) + 0.007 * Math.sin(time * 0.71);
    pose.pitch += 0.004 * Math.sin(time * 0.53 + 1);
    for (const hit of beats.shakes) {
      const age = time - hit.t;
      if (age < 0 || age > 0.7) continue;
      const strength = hit.amount * (pose.dist / 47) * Math.exp(-7 * age);
      pose.x += strength * Math.sin(age * 57);
      pose.y += strength * Math.cos(age * 43);
    }
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
    desk.draw(time, 0.25, beats.firstRun + 0.3);
    loop.draw(time, beats.firstRun - 0.55);
    drawLoop(time);
    drawStop(time);
    drawChips(time);
    renderer.render(scene, camera);
  }

  return { draw, applyCamera, poseAt, toScreen, pixelsPerUnit, spin };
}
