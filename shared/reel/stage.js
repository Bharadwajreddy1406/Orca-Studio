// The shared Reel stage: renderer, lights, floor, blocks, chain links, flying chips, the camera
// rig and the DOM helpers every Reel in this series uses. A project's world.js builds its own
// sets on top of it. Everything is a pure function of time, so any seek draws the same frame.
import * as THREE from "three";
import { backOut, clamp01, seeded, smooth, spring, track } from "./motion.js";

export { THREE };
export const COLORS = { ink: 0x141210, accent: 0xe8401a, bone: 0xe8e0d8 };
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

/**
 * Build the stage. `beats.bursts` ({t, x, y, z, count}) and `beats.shakes` ({t, amount}) are
 * optional. `camera.opening` is the first pose and `camera.keys` the shots after it, as
 * {t, d, v: pose, e}. A pose is {yaw, pitch, dist, x, y, z}: the camera orbits the look point.
 */
export function createStage(container, beats, { opening, keys = [], adjust = null } = {}) {
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

  const inkEdge = new THREE.LineBasicMaterial({ color: COLORS.ink });
  const materials = {
    bone: new THREE.MeshLambertMaterial({ color: COLORS.bone }),
    ink: new THREE.MeshLambertMaterial({ color: COLORS.ink }),
    accent: new THREE.MeshLambertMaterial({ color: COLORS.accent }),
    edge: inkEdge,
  };
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const unitEdges = new THREE.EdgesGeometry(unitBox);
  const scratch = new THREE.Color();
  const tint = {
    ink: new THREE.Color(COLORS.ink),
    bone: new THREE.Color(COLORS.bone),
    accent: new THREE.Color(COLORS.accent),
  };

  /** A box with ink edges. Pass its own material to recolor it later. */
  function block(material, width, height, depth, x, y, z, edges = true) {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.scale.set(width, height, depth);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (edges) mesh.add(new THREE.LineSegments(unitEdges, inkEdge));
    return mesh;
  }
  /** A bone plinth with its own material, so it can glow on its own. */
  const plinth = (width = 4.2, height = 1.2, depth = 3) =>
    block(new THREE.MeshLambertMaterial({ color: COLORS.bone }), width, height, depth, 0, height / 2, 0);

  /** Blend a material from bone (or ink) toward accent: 0 is the base color, 1 is accent. */
  function glow(material, amount, base = "bone") {
    material.color.copy(scratch.copy(tint[base]).lerp(tint.accent, clamp01(amount)));
  }

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

  /* ---------- chain links ---------- */

  const linkGeometry = new THREE.TubeGeometry(stadiumCurve(), 56, 0.17, 10, true);
  function makeLinks(count) {
    return Array.from({ length: count }, () => {
      const mesh = new THREE.Mesh(linkGeometry, new THREE.MeshPhongMaterial({ color: COLORS.ink, specular: 0x6a6460, shininess: 55 }));
      mesh.castShadow = true;
      scene.add(mesh);
      return mesh;
    });
  }
  const direction = new THREE.Vector3();
  const axisX = new THREE.Vector3(1, 0, 0);
  const alignment = new THREE.Quaternion();
  const roll = new THREE.Quaternion();
  /**
   * Lay links from A to B. Each slides out of the previous one as it forms at `formedAt`, and
   * they all shrink away at `gone`. `heat` is 0..1, or a function of u (0 at A, 1 at B).
   */
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
      const amount = typeof heat === "function" ? heat(u) : heat;
      link.material.color.copy(scratch.copy(tint.ink).lerp(tint.accent, clamp01(amount)));
    });
  }
  /** A pulse that runs along a chain from A (u = 0) to B (u = 1), starting at `at`. */
  const pulse = (time, at, span = 0.5) => (u) => Math.exp(-Math.pow(((time - at) / span - u) * 3, 2));

  /* ---------- flying chips ---------- */

  const CHIP_COUNT = 160;
  const chips = new THREE.InstancedMesh(unitBox, materials.ink, CHIP_COUNT);
  chips.castShadow = true;
  chips.frustumCulled = false;
  scene.add(chips);
  const chipPlacement = new THREE.Object3D();
  const chipRandom = seeded(29);
  const bursts = (beats.bursts || []).map((burst) => ({
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

  /** A shot at `x, z`: a slight downward angle, about 96 px per unit at the look point. */
  const closeUp = (x, z = 0, extra = {}) => ({ yaw: 0.04, pitch: 0.2, dist: 47, x, y: 2.3, z, ...extra });

  function poseAt(time) {
    const pose = track(opening, keys, time);
    if (adjust) adjust(pose, time);
    pose.yaw += 0.007 * Math.sin(time * 0.71);
    pose.pitch += 0.004 * Math.sin(time * 0.53 + 1);
    for (const hit of beats.shakes || []) {
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
  function pixelsPerUnit(x, y, z) {
    const lower = toScreen(x, y, z);
    const upper = toScreen(x, y + 1, z);
    return Math.hypot(upper.x - lower.x, upper.y - lower.y);
  }

  return {
    THREE,
    scene,
    materials,
    block,
    plinth,
    glow,
    popGroup,
    makeLinks,
    placeChain,
    pulse,
    drawChips,
    closeUp,
    poseAt,
    applyCamera,
    toScreen,
    pixelsPerUnit,
    render: () => renderer.render(scene, camera),
  };
}

/* ---------- DOM helpers shared by every Reel ---------- */

/** 0 before `from`, 1 between, 0 after `until`, with soft edges. */
export const fade = (time, from, until, edge = 0.2) => smooth((time - from) / edge) * (1 - smooth((time - until) / edge));

/** Pin an absolutely positioned element to a world point, scaled with distance. */
export function pinTo(stage, element, x, y, z, { opacity = 1, scale = null, baseUnits = 96 } = {}) {
  if (opacity <= 0.001) {
    element.style.opacity = "0";
    return;
  }
  const point = stage.toScreen(x, y, z);
  const size = scale ?? stage.pixelsPerUnit(x, y, z) / baseUnits;
  element.style.opacity = String(opacity);
  element.style.transform = `translate(${point.x.toFixed(2)}px, ${point.y.toFixed(2)}px) scale(${size.toFixed(3)})`;
}

/**
 * Stand a cast member on the floor at world (x, z). Figures are 5 units tall, drawn a little
 * larger on wide shots so faces still read. `appearAt` pops the figure in.
 */
export function standAt(stage, member, visible, x, z, appearAt, time, { units = 5 } = {}) {
  member.group.style.display = visible ? "" : "none";
  if (!visible) return;
  member.draw(time);
  const feet = stage.toScreen(x, 0, z);
  const wide = 1 + 0.5 * clamp01((stage.poseAt(time).dist - 60) / 70);
  const size = (stage.pixelsPerUnit(x, 0, z) * units * backOut((time - appearAt) / 0.3) * wide) / 100;
  member.group.setAttribute(
    "transform",
    `translate(${feet.x.toFixed(2)} ${feet.y.toFixed(2)}) scale(${Math.max(size, 0.0001).toFixed(4)})`,
  );
}

/** A headline rising in at `from` and leaving at `to`. */
export function showLine(timeline, id, from, to) {
  timeline.fromTo(id, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power3.out" }, from);
  timeline.to(id, { y: -20, opacity: 0, duration: 0.2, ease: "power2.in" }, to - 0.2);
}

/**
 * Drive `draw(time)` from the timeline through a setter, which runs on every seek, even with
 * callbacks suppressed. Call last, after every other tween is on the timeline.
 */
export function driveFrames(timeline, duration, draw) {
  let driverTime = 0;
  const driver = {
    get time() {
      return driverTime;
    },
    set time(value) {
      driverTime = value;
      draw(value);
    },
  };
  timeline.fromTo(driver, { time: 0 }, { time: duration, duration, ease: "none", immediateRender: true }, 0);
  timeline.set({}, {}, duration);
  draw(0);
}
