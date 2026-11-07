// The Three.js world: a rail with the slide's cart, the meeting corner with its waste bin, and
// three refinement gates the cart rides through, one per pass. Time alone sets every frame.
import { createStage } from "../reel/stage.js";
import { backOut, clamp01, mix, smooth, spring, track } from "../reel/motion.js";

export const LAYOUT = {
  rail: [-3, 35],
  bin: [4.9, 1.3],
  gateHalf: 5.0,
  gateZ: -1.6,
  lintelY: 9.35,
};

export function createWorld(container, beats) {
  const { gates } = beats;
  const cartKeys = beats.cartKeys.map((key) => ({ t: key.t, d: key.d, v: { x: key.to }, e: smooth }));
  const cartX = (time) => track({ x: 0 }, cartKeys, time).x;
  // How fast the cart is moving, for the bot's walk and the wheels.
  const cartSpeed = (time) => (cartX(time + 0.02) - cartX(time - 0.02)) / 0.04;

  /* ---------- camera ---------- */
  // Every pose carries f: how much the shot follows the cart. x is an offset when f is 1.
  const CLOSE = { yaw: 0.04, pitch: 0.2, dist: 47, x: 0, y: 3.05, z: 0, f: 1 };
  const WIDE = { yaw: 0.5, pitch: 0.5, dist: 140, x: 22.5, y: 1.2, z: -1, f: 0 };
  const shot = (t, d, pose, e) => ({ t, d, v: pose, e });
  const keys = [
    shot(0.3, 3.2, { ...CLOSE }),
    shot(beats.startOver, 0.6, { ...CLOSE, x: 1.0 }),
    shot(beats.noWay + 0.35, 0.7, { ...CLOSE }),
    shot(beats.named - 0.45, 0.95, WIDE),
    shot(beats.until - 0.1, 0.75, { ...CLOSE, x: 1.7, f: 1 }),
    shot(beats.orWord, 1.1, { ...CLOSE, x: 1.7, dist: 43 }),
    shot(beats.go - 0.32, 0.5, { ...CLOSE, x: 1.25, dist: 58, y: 3.6, yaw: 0.02 }),
  ];
  const opening = { ...CLOSE, dist: 53, y: 3.4 };
  const adjust = (pose, time) => {
    pose.x += cartX(time) * pose.f;
  };
  const stage = createStage(container, beats, { opening, keys, adjust });
  const { THREE, scene, materials, block, popGroup, glow } = stage;

  /* ---------- the rail ---------- */

  const [railStart, railEnd] = LAYOUT.rail;
  const railLength = railEnd - railStart;
  const railCenter = (railStart + railEnd) / 2;
  scene.add(block(materials.ink, railLength, 0.14, 0.16, railCenter, 0.13, 0.62, false));
  scene.add(block(materials.ink, railLength, 0.14, 0.16, railCenter, 0.13, -0.62, false));
  for (let x = railStart + 0.4; x < railEnd; x += 1.35) scene.add(block(materials.bone, 0.42, 0.08, 1.9, x, 0.04, 0));

  /* ---------- the cart that carries the slide ---------- */

  const cart = new THREE.Group();
  scene.add(cart);
  cart.add(block(materials.bone, 3.0, 0.5, 1.5, 0, 0.72, 0));
  cart.add(block(materials.ink, 0.28, 3.6, 0.28, 0, 2.75, 0));
  cart.add(block(materials.ink, 2.6, 0.2, 0.34, 0, 4.42, 0));
  const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.18, 20);
  const wheels = [];
  for (const wx of [-1.05, 1.05]) {
    for (const wz of [-0.62, 0.62]) {
      const wheel = new THREE.Mesh(wheelGeometry, materials.ink);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.42, wz);
      wheel.castShadow = true;
      // A bone spoke, so the wheels visibly turn.
      const spoke = block(materials.bone, 0.08, 0.2, 0.46, 0, 0, 0, false);
      wheel.add(spoke);
      cart.add(wheel);
      wheels.push(wheel);
    }
  }

  /* ---------- the meeting corner: a waste bin with past restarts beside it ---------- */

  const corner = popGroup(LAYOUT.bin[0], LAYOUT.bin[1]);
  const binMaterial = new THREE.MeshLambertMaterial({ color: 0xe8e0d8, side: THREE.DoubleSide });
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.66, 1.8, 28, 1, true), binMaterial);
  bin.position.y = 0.9;
  bin.castShadow = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.07, 8, 32), materials.ink);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.8;
  const binBottom = new THREE.Mesh(new THREE.CircleGeometry(0.66, 28), materials.ink);
  binBottom.rotation.x = -Math.PI / 2;
  binBottom.position.y = 0.02;
  corner.add(0, 0, 0, bin, rim, binBottom);
  const ballGeometry = new THREE.IcosahedronGeometry(0.42, 0);
  const balls = [
    [-1.3, 0.5, 0.06],
    [1.15, 0.7, 0.12],
    [-0.7, 1.3, 0.18],
  ];
  balls.forEach(([bx, bz, delay]) => {
    const ball = new THREE.Mesh(ballGeometry, materials.bone);
    ball.position.y = 0.38;
    ball.rotation.set(bx * 3, bz * 2, 0.4);
    ball.castShadow = true;
    ball.add(new THREE.LineSegments(new THREE.EdgesGeometry(ballGeometry), materials.edge));
    corner.add(bx, bz, delay, ball);
  });

  /* ---------- the three gates ---------- */

  const lintels = [];
  const gateGroups = gates.map((gx, index) => {
    const group = popGroup(gx, LAYOUT.gateZ);
    const half = LAYOUT.gateHalf;
    const height = LAYOUT.lintelY;
    group.add(-half, 0, 0, block(materials.ink, 0.34, height, 0.34, 0, height / 2, 0), block(materials.bone, 1.1, 0.4, 1.1, 0, 0.2, 0));
    group.add(half, 0, 0.05, block(materials.ink, 0.34, height, 0.34, 0, height / 2, 0), block(materials.bone, 1.1, 0.4, 1.1, 0, 0.2, 0));
    const lintelMaterial = new THREE.MeshLambertMaterial({ color: 0xe8e0d8 });
    lintels.push(lintelMaterial);
    group.add(0, 0, 0.1, block(lintelMaterial, half * 2 + 0.6, 0.7, 0.6, 0, height, 0));
    return { group, shownAt: beats.passes[index] - 0.35 };
  });

  // The gates flash on their pass's action word, and pulse in turn on "small, focused passes".
  const actionWords = [beats.fix, beats.simplify, beats.polished];
  const pulseWords = [beats.small, beats.focused, beats.passesWord];
  const flash = (time, at, span = 0.3) => Math.exp(-Math.pow((time - at) / span, 2));

  function draw(time) {
    stage.applyCamera(stage.poseAt(time));
    const x = cartX(time);
    cart.position.x = x;
    // Rolling wheels: the angle is the distance travelled over the radius.
    wheels.forEach((wheel) => {
      wheel.rotation.y = -x / 0.3;
    });
    corner.draw(time, 0.3, beats.passes[0] + 0.6);
    // The first gate folds away as the slide zips home, so it stays out of the final shot.
    gateGroups.forEach(({ group, shownAt }, index) => group.draw(time, shownAt, index === 0 ? beats.go - 0.3 : Infinity));
    lintels.forEach((material, index) => {
      const hot = Math.max(flash(time, actionWords[index] + 0.15, 0.35), flash(time, pulseWords[index], 0.22));
      glow(material, hot);
    });
    stage.drawChips(time);
    stage.render();
  }

  return { stage, draw, cartX, cartSpeed, LAYOUT };
}

export { backOut, clamp01, mix, spring };
