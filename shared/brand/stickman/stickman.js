/*
 * Brad & Prad stick figure: original, code-drawn, and safe to seek.
 *
 * Every frame is a pure function of (figure options, keyframes, time). There is no
 * wall clock and no Math.random, so `seek(5.2)` draws the same picture whichever frame
 * came before it. GSAP only supplies time, through a setter on a driver object: setters
 * run even when a host seeks a paused timeline with callbacks suppressed.
 *
 * Browser:  <script src="brand/stickman/stickman.js"></script>
 *           const brad = BrandStickman.create(parent, { x: 540, y: 1200, height: 460, seed: 7 });
 *           brad.pose("standing", { at: 0 }).pose("pointing", { at: 1, duration: 0.35 });
 *           brad.say("happy", { at: 1 });
 *           brad.attach(timeline, 6);
 * Node:     require("./stickman.js").renderSvg({ pose: "shocked", expression: "shocked" })
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BrandStickman = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Skeleton proportions, in figure units. The figure is about 100 units tall.
  const BONES = {
    headRadius: 12,
    neck: 2.2,
    torso: 29,
    upperArm: 14.5,
    forearm: 14,
    thigh: 18.5,
    shin: 18.5,
    foot: 5.5,
    shoulderDrop: 3.5,
  };
  const STROKE = { body: 3.2, face: 1.25, detail: 1.6 };
  const FIGURE_HEIGHT_UNITS = 100;

  /*
   * Limb angles are absolute degrees on screen: 0 points straight down, +90 to screen
   * right, -90 to screen left, 180 straight up. L and R mean screen left and right.
   */
  const NUMERIC_POSE_KEYS = [
    "lean", "headTilt", "shoulderLift", "look", "lift",
    "armLUpper", "armLLower", "armRUpper", "armRLower",
    "legLUpper", "legLLower", "legRUpper", "legRLower",
  ];

  const STANDING = {
    lean: 0, headTilt: 0, shoulderLift: 0, look: 0, lift: 0,
    armLUpper: -24, armLLower: -13, armRUpper: 24, armRLower: 13,
    legLUpper: -13, legLLower: -8, legRUpper: 13, legRLower: 8,
    handL: "none", handR: "none",
  };

  const POSES = {
    standing: { ...STANDING },
    pointing: {
      ...STANDING, lean: 3, headTilt: 5, look: 2,
      armRUpper: 84, armRLower: 88, armLUpper: -24, armLLower: -12,
      legLUpper: -15, legRUpper: 13, handR: "point",
    },
    pointing_up: {
      ...STANDING, lean: -2, headTilt: -5, look: 1,
      armRUpper: 98, armRLower: 174, armLUpper: -24, armLLower: -12, handR: "point",
    },
    thinking: {
      ...STANDING, lean: 2, headTilt: 9, look: 2,
      armRUpper: 52, armRLower: -148, armLUpper: -22, armLLower: 74,
      legLUpper: -9, legLLower: 4, legRUpper: 15, legRLower: 7,
    },
    shrugging: {
      ...STANDING, headTilt: -7, shoulderLift: 3.5,
      armLUpper: -38, armLLower: -116, armRUpper: 38, armRLower: 116,
      handL: "open", handR: "open",
    },
    walk_contact: {
      ...STANDING, lean: 3, look: 2,
      armLUpper: 20, armLLower: 34, armRUpper: -20, armRLower: -8,
      legLUpper: -24, legLLower: -32, legRUpper: 26, legRLower: 14,
    },
    walk_passing: {
      ...STANDING, lean: 3, look: 2,
      armLUpper: -14, armLLower: 10, armRUpper: 16, armRLower: 26,
      legLUpper: 22, legLLower: -30, legRUpper: -3, legRLower: 0,
    },
    shocked: {
      ...STANDING, lean: -3, headTilt: 0, shoulderLift: 2, lift: 5,
      armLUpper: -112, armLLower: -160, armRUpper: 112, armRLower: 160,
      legLUpper: -16, legLLower: -10, legRUpper: 16, legRLower: 10,
      handL: "open", handR: "open",
    },
    presenting: {
      ...STANDING, lean: -2, headTilt: 4, look: 2,
      armRUpper: 62, armRLower: 112, armLUpper: -44, armLLower: 38,
      legLUpper: -14, legRUpper: 12, handR: "open",
    },
    cheering: {
      ...STANDING, lift: 4,
      armLUpper: -118, armLLower: -148, armRUpper: 118, armRLower: 148,
      legLUpper: -14, legLLower: -22, legRUpper: 14, legRLower: 22,
    },
  };

  /*
   * eyes: dot | wide | happy | side; brows: [left, right] tilt in degrees, or null;
   * mouth: flat | smile | grin | frown | o | squiggle | smirk; marks: shock | ponder | none.
   */
  const EXPRESSIONS = {
    neutral: { eyes: "dot", brows: null, mouth: "flat", marks: "none" },
    happy: { eyes: "dot", brows: null, mouth: "smile", marks: "none" },
    delighted: { eyes: "happy", brows: null, mouth: "grin", marks: "none" },
    shocked: { eyes: "wide", brows: [-10, 10], browHeight: 2.2, mouth: "o", marks: "shock" },
    thinking: { eyes: "side", brows: [10, -16], mouth: "smirk", marks: "ponder" },
    confused: { eyes: "dot", brows: [16, -12], mouth: "squiggle", marks: "none" },
    sad: { eyes: "dot", brows: [-20, 20], mouth: "frown", marks: "none" },
    determined: { eyes: "dot", brows: [18, -18], mouth: "flat", marks: "none" },
  };

  /* ---------- seeded randomness and easing ---------- */

  function mulberry32(seed) {
    let state = seed >>> 0;
    return function () {
      state = (state + 0x6d2b79f5) >>> 0;
      let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(...parts) {
    let hash = 2166136261;
    for (const part of parts) {
      const text = String(part);
      for (let index = 0; index < text.length; index += 1) {
        hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
      }
      hash = Math.imul(hash ^ 124, 16777619);
    }
    return hash >>> 0;
  }

  // GSAP's parser is used when present so eases read as in the rest of a composition.
  function resolveEase(name) {
    const gsapGlobal = typeof globalThis !== "undefined" ? globalThis.gsap : undefined;
    if (gsapGlobal && gsapGlobal.parseEase && name) return gsapGlobal.parseEase(name);
    return (progress) => progress * progress * (3 - 2 * progress);
  }

  /* ---------- hand-drawn ink primitives ---------- */

  function resample(points, stepCount) {
    const lengths = [0];
    for (let index = 1; index < points.length; index += 1) {
      const [x0, y0] = points[index - 1];
      const [x1, y1] = points[index];
      lengths.push(lengths[index - 1] + Math.hypot(x1 - x0, y1 - y0));
    }
    const total = lengths[lengths.length - 1] || 1;
    const sampled = [];
    let segment = 1;
    for (let step = 0; step <= stepCount; step += 1) {
      const target = (total * step) / stepCount;
      while (segment < points.length - 1 && lengths[segment] < target) segment += 1;
      const span = lengths[segment] - lengths[segment - 1] || 1;
      const mix = (target - lengths[segment - 1]) / span;
      sampled.push([
        points[segment - 1][0] + (points[segment][0] - points[segment - 1][0]) * mix,
        points[segment - 1][1] + (points[segment][1] - points[segment - 1][1]) * mix,
      ]);
    }
    return { sampled, total };
  }

  function smoothed(points, passes) {
    let current = points;
    for (let pass = 0; pass < passes; pass += 1) {
      current = current.map((point, index) => {
        if (index === 0 || index === current.length - 1) return point;
        const before = current[index - 1];
        const after = current[index + 1];
        return [
          (before[0] + 2 * point[0] + after[0]) / 4,
          (before[1] + 2 * point[1] + after[1]) / 4,
        ];
      });
    }
    return current;
  }

  // Slow noise along the stroke: a hand drifts, it does not jitter every sample.
  function driftNoise(random, count, knots) {
    const knotValues = Array.from({ length: knots + 2 }, () => random() * 2 - 1);
    return Array.from({ length: count }, (_, index) => {
      const position = (index / Math.max(count - 1, 1)) * knots;
      const left = Math.floor(position);
      const mix = position - left;
      const eased = mix * mix * (3 - 2 * mix);
      return knotValues[left] * (1 - eased) + knotValues[left + 1] * eased;
    });
  }

  function signedArea(points) {
    let area = 0;
    points.forEach(([x, y], index) => {
      const [nextX, nextY] = points[(index + 1) % points.length];
      area += x * nextY - nextX * y;
    });
    return area;
  }

  // All ink shares one winding direction so overlapping strokes merge under nonzero fill;
  // holes (rings) pass `asHole` to wind the other way.
  function polygonPath(rawPoints, asHole = false) {
    const wantsPositive = !asHole;
    const points = signedArea(rawPoints) >= 0 === wantsPositive ? rawPoints : [...rawPoints].reverse();
    let path = "";
    points.forEach(([x, y], index) => {
      path += `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    });
    return `${path}Z`;
  }

  /** A closed polygon tracing one pressure-varying ink stroke along `points`. */
  function inkStroke(points, width, seed, wobble) {
    const random = mulberry32(seed);
    const estimatedLength = points.reduce((sum, point, index) => {
      if (index === 0) return 0;
      return sum + Math.hypot(point[0] - points[index - 1][0], point[1] - points[index - 1][1]);
    }, 0);
    const stepCount = Math.max(4, Math.min(28, Math.round(estimatedLength / 2.2)));
    const { sampled } = resample(points, stepCount);
    const centerline = smoothed(sampled, 2);
    const wander = driftNoise(random, centerline.length, Math.max(2, Math.round(stepCount / 6)));
    const pressure = driftNoise(random, centerline.length, Math.max(2, Math.round(stepCount / 5)));
    const left = [];
    const right = [];
    centerline.forEach((point, index) => {
      const before = centerline[Math.max(index - 1, 0)];
      const after = centerline[Math.min(index + 1, centerline.length - 1)];
      const tangentLength = Math.hypot(after[0] - before[0], after[1] - before[1]) || 1;
      const normalX = -(after[1] - before[1]) / tangentLength;
      const normalY = (after[0] - before[0]) / tangentLength;
      const along = index / (centerline.length - 1);
      // Pressure eases in and out so strokes start and finish like a nib lifting.
      const taper = 0.72 + 0.28 * Math.sin(Math.PI * Math.min(1, along * 1.02));
      const halfWidth = (width / 2) * taper * (1 + pressure[index] * 0.16);
      const offset = wander[index] * wobble * Math.sin(Math.PI * along) ** 0.5;
      const middleX = point[0] + normalX * offset;
      const middleY = point[1] + normalY * offset;
      left.push([middleX + normalX * halfWidth, middleY + normalY * halfWidth]);
      right.push([middleX - normalX * halfWidth, middleY - normalY * halfWidth]);
    });
    return polygonPath(left.concat(right.reverse()));
  }

  /** A wobbly closed ring: an outer outline with an inner hole. */
  function inkRing(centerX, centerY, radius, width, seed, wobble) {
    const random = mulberry32(seed);
    const steps = 40;
    const radial = driftNoise(random, steps + 1, 5);
    const pressure = driftNoise(random, steps + 1, 4);
    const startAngle = random() * Math.PI * 2;
    const outer = [];
    const inner = [];
    for (let step = 0; step < steps; step += 1) {
      const angle = startAngle + (step / steps) * Math.PI * 2;
      // Blend the seam so the noise closes on itself.
      const blend = step / steps;
      const drift = radial[step] * (1 - blend) + radial[0] * blend;
      const press = pressure[step] * (1 - blend) + pressure[0] * blend;
      const centerRadius = radius + drift * wobble;
      const halfWidth = (width / 2) * (1 + press * 0.18);
      outer.push([
        centerX + Math.cos(angle) * (centerRadius + halfWidth),
        centerY + Math.sin(angle) * (centerRadius + halfWidth),
      ]);
      inner.push([
        centerX + Math.cos(angle) * (centerRadius - halfWidth),
        centerY + Math.sin(angle) * (centerRadius - halfWidth),
      ]);
    }
    return polygonPath(outer) + polygonPath(inner, true);
  }

  /* ---------- skeleton ---------- */

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const limbEnd = ([x, y], angle, length) => [
    x + Math.sin(toRadians(angle)) * length,
    y + Math.cos(toRadians(angle)) * length,
  ];

  /** Forward kinematics, with the figure's soles resting on y = 0 (minus `lift`). */
  function solveSkeleton(pose) {
    const hip = [0, 0];
    const leanRadians = toRadians(pose.lean);
    const shoulderCenter = [
      Math.sin(leanRadians) * BONES.torso,
      -Math.cos(leanRadians) * BONES.torso,
    ];
    const armRoot = [
      shoulderCenter[0] - Math.sin(leanRadians) * BONES.shoulderDrop,
      shoulderCenter[1] + Math.cos(leanRadians) * BONES.shoulderDrop - pose.shoulderLift,
    ];
    const headDistance = BONES.neck + BONES.headRadius;
    const headCenter = [
      shoulderCenter[0] + Math.sin(toRadians(pose.lean + pose.headTilt * 0.4)) * headDistance,
      shoulderCenter[1] - Math.cos(toRadians(pose.lean + pose.headTilt * 0.4)) * headDistance,
    ];
    const elbowL = limbEnd(armRoot, pose.armLUpper, BONES.upperArm);
    const wristL = limbEnd(elbowL, pose.armLLower, BONES.forearm);
    const elbowR = limbEnd(armRoot, pose.armRUpper, BONES.upperArm);
    const wristR = limbEnd(elbowR, pose.armRLower, BONES.forearm);
    const kneeL = limbEnd(hip, pose.legLUpper, BONES.thigh);
    const ankleL = limbEnd(kneeL, pose.legLLower, BONES.shin);
    const kneeR = limbEnd(hip, pose.legRUpper, BONES.thigh);
    const ankleR = limbEnd(kneeR, pose.legRLower, BONES.shin);
    const toeDirection = pose.look >= 0 ? 1 : -1;
    const toeOutL = pose.look === 0 ? -1 : toeDirection;
    const toeOutR = pose.look === 0 ? 1 : toeDirection;
    const footL = [ankleL[0] + BONES.foot * toeOutL, ankleL[1] + 0.8];
    const footR = [ankleR[0] + BONES.foot * toeOutR, ankleR[1] + 0.8];

    const skeleton = {
      hip, shoulderCenter, armRoot, headCenter,
      elbowL, wristL, elbowR, wristR, kneeL, ankleL, kneeR, ankleR, footL, footR,
    };
    // Plant the lower foot on the ground, which also gives walking its natural bob.
    const lowest = Math.max(footL[1], footR[1]);
    const verticalShift = -lowest - pose.lift;
    for (const point of Object.values(skeleton)) point[1] += verticalShift;
    return skeleton;
  }

  function handPaths(kind, wrist, angle, seed) {
    if (kind === "none") return [];
    if (kind === "point") {
      const tip = limbEnd(wrist, angle, 5.5);
      return [inkStroke([wrist, tip], STROKE.detail, hashSeed(seed, "point"), 0.1)];
    }
    // Three short fingers, fanned around the forearm direction.
    return [-34, 0, 34].map((spread) => {
      const tip = limbEnd(wrist, angle + spread, 4.2);
      return inkStroke([wrist, tip], STROKE.detail, hashSeed(seed, "open", spread), 0.08);
    });
  }

  /* ---------- face ---------- */

  function facePaths(head, pose, expression, blinking, seed) {
    const paths = [];
    const tilt = toRadians(pose.headTilt);
    const face = ([x, y]) => [
      head[0] + (x + pose.look) * Math.cos(tilt) - y * Math.sin(tilt),
      head[1] + (x + pose.look) * Math.sin(tilt) + y * Math.cos(tilt),
    ];
    const line = (points, tag, width = STROKE.face) =>
      inkStroke(points.map(face), width, hashSeed(seed, "face", tag), 0.06);
    const arc = (centerX, centerY, radiusX, radiusY, fromDegrees, toDegrees) => {
      const points = [];
      for (let step = 0; step <= 8; step += 1) {
        const angle = toRadians(fromDegrees + ((toDegrees - fromDegrees) * step) / 8);
        points.push([centerX + Math.cos(angle) * radiusX, centerY + Math.sin(angle) * radiusY]);
      }
      return points;
    };

    const eyeOffsetX = 4;
    const eyeHeight = -1.8;
    for (const side of [-1, 1]) {
      const eyeX = side * eyeOffsetX;
      const [faceX, faceY] = face([eyeX, eyeHeight]);
      if (blinking || expression.eyes === "happy") {
        const closed = expression.eyes === "happy"
          ? arc(eyeX, eyeHeight + 0.9, 1.9, 1.9, 200, 340)
          : [[eyeX - 1.2, eyeHeight], [eyeX + 1.2, eyeHeight]];
        paths.push(line(closed, `eye${side}`));
      } else if (expression.eyes === "wide") {
        paths.push(inkRing(faceX, faceY, 2.2, 0.95, hashSeed(seed, "eye", side), 0.05));
        const [pupilX, pupilY] = face([eyeX, eyeHeight]);
        paths.push(inkRing(pupilX, pupilY, 0.28, 0.56, hashSeed(seed, "pupil", side), 0));
      } else {
        const shift = expression.eyes === "side" ? 0.8 : 0;
        const [dotX, dotY] = face([eyeX + shift, eyeHeight - (shift ? 0.5 : 0)]);
        paths.push(inkRing(dotX, dotY, 0.62, 1.24, hashSeed(seed, "dot", side), 0.02));
      }
      if (expression.brows) {
        const browTilt = toRadians(expression.brows[side < 0 ? 0 : 1]);
        const browY = eyeHeight - 3.3 - (expression.browHeight || 0);
        const reachX = Math.cos(browTilt) * 2;
        const reachY = Math.sin(browTilt) * 2;
        paths.push(
          line([[eyeX - reachX, browY - reachY], [eyeX + reachX, browY + reachY]], `brow${side}`),
        );
      }
    }

    const mouthY = 5;
    const mouth = {
      flat: () => line([[-3, mouthY], [3, mouthY]], "mouth"),
      smile: () => line(arc(0, mouthY - 2.2, 4.2, 3, 20, 160), "mouth"),
      grin: () => {
        // An open laugh: the top edge is straight and the jaw is a deep arc.
        const jaw = arc(0, mouthY - 2.2, 5, 4.6, 0, 180);
        return line([...jaw, jaw[0]], "mouth");
      },
      frown: () => line(arc(0, mouthY + 2.2, 3.8, 2.6, 205, 335), "mouth"),
      o: () => {
        const [centerX, centerY] = face([0, mouthY + 0.5]);
        return inkRing(centerX, centerY, 2.1, 1.05, hashSeed(seed, "mouth-o"), 0.05);
      },
      squiggle: () =>
        line([[-2.8, mouthY], [-1.2, mouthY - 0.9], [0.4, mouthY + 0.5], [2.8, mouthY - 0.4]], "mouth"),
      smirk: () => line([[-1.8, mouthY + 0.4], [0.6, mouthY + 0.3], [2.6, mouthY - 0.8]], "mouth"),
    };
    paths.push(mouth[expression.mouth]());
    return paths;
  }

  /** Marks floating near the head. Time feeds them so they can animate deterministically. */
  function markPaths(head, marks, seed, time) {
    if (marks === "shock") {
      // Radiating dashes that pulse outward.
      const pulse = 1 + 0.08 * Math.sin(time * 16);
      return [-62, -32, 0, 32, 62].map((angle) => {
        const start = limbEnd(head, 180 + angle, (BONES.headRadius + 4) * pulse);
        const end = limbEnd(head, 180 + angle, (BONES.headRadius + 9.5) * pulse);
        return inkStroke([start, end], STROKE.detail, hashSeed(seed, "shock", angle), 0.12);
      });
    }
    if (marks === "ponder") {
      // Three rising dots, drawn one after another on a repeating 1.6 s beat.
      const beat = ((time % 1.6) + 1.6) % 1.6;
      const shown = Math.floor(beat / 0.4);
      return [0, 1, 2]
        .filter((index) => index <= shown)
        .map((index) =>
          inkRing(
            head[0] + BONES.headRadius + 2.5 + index * 3.6,
            head[1] - BONES.headRadius - 1 - index * 3.4,
            0.45 + index * 0.25,
            0.9 + index * 0.5,
            hashSeed(seed, "ponder", index),
            0.02,
          ),
        );
    }
    return [];
  }

  /* ---------- drawing one frame ---------- */

  function drawFrame(options, pose, expression, blinking, time) {
    const seed = options.seed;
    const boilIndex = options.boilFps > 0 ? Math.floor(time * options.boilFps) : 0;
    const frameSeed = (tag) => hashSeed(seed, boilIndex, tag);
    const bones = solveSkeleton(pose);
    const wobble = options.wobble;
    const ink = [
      inkRing(bones.headCenter[0], bones.headCenter[1], BONES.headRadius, STROKE.body * 0.92, frameSeed("head"), wobble * 0.55),
      inkStroke([bones.shoulderCenter, bones.hip], STROKE.body, frameSeed("torso"), wobble),
      inkStroke([bones.armRoot, bones.elbowL, bones.wristL], STROKE.body * 0.94, frameSeed("armL"), wobble),
      inkStroke([bones.armRoot, bones.elbowR, bones.wristR], STROKE.body * 0.94, frameSeed("armR"), wobble),
      inkStroke([bones.hip, bones.kneeL, bones.ankleL, bones.footL], STROKE.body, frameSeed("legL"), wobble),
      inkStroke([bones.hip, bones.kneeR, bones.ankleR, bones.footR], STROKE.body, frameSeed("legR"), wobble),
      ...handPaths(pose.handL, bones.wristL, pose.armLLower, frameSeed("handL")),
      ...handPaths(pose.handR, bones.wristR, pose.armRLower, frameSeed("handR")),
      ...facePaths(bones.headCenter, pose, expression, blinking, frameSeed("face")),
    ];
    if (options.glasses) {
      const tilt = toRadians(pose.headTilt);
      const lens = (side) => [
        bones.headCenter[0] + (side * 4 + pose.look) * Math.cos(tilt) + 1.8 * Math.sin(tilt),
        bones.headCenter[1] + (side * 4 + pose.look) * Math.sin(tilt) - 1.8 * Math.cos(tilt),
      ];
      const [leftX, leftY] = lens(-1);
      const [rightX, rightY] = lens(1);
      ink.push(inkRing(leftX, leftY, 3, 0.85, frameSeed("lensL"), 0.05));
      ink.push(inkRing(rightX, rightY, 3, 0.85, frameSeed("lensR"), 0.05));
    }
    return {
      inkPath: ink.join(""),
      accentPath: markPaths(bones.headCenter, expression.marks, frameSeed("marks"), time).join(""),
    };
  }

  /* ---------- pose helpers ---------- */

  function poseByName(name) {
    if (typeof name === "object") return { ...STANDING, ...name };
    if (!POSES[name]) throw new Error(`Unknown stick figure pose: ${name}`);
    return POSES[name];
  }

  function expressionByName(name) {
    if (typeof name === "object") return { ...EXPRESSIONS.neutral, ...name };
    if (!EXPRESSIONS[name]) throw new Error(`Unknown stick figure expression: ${name}`);
    return EXPRESSIONS[name];
  }

  function blendPoses(from, to, mix) {
    const blended = { ...to };
    for (const key of NUMERIC_POSE_KEYS) blended[key] = from[key] + (to[key] - from[key]) * mix;
    // Hands are hand-drawn swaps, not morphs.
    blended.handL = mix < 0.5 ? from.handL : to.handL;
    blended.handR = mix < 0.5 ? from.handR : to.handR;
    return blended;
  }

  function mirrorPose(pose) {
    return {
      ...pose,
      lean: -pose.lean,
      headTilt: -pose.headTilt,
      look: -pose.look,
      armLUpper: -pose.armRUpper, armLLower: -pose.armRLower,
      armRUpper: -pose.armLUpper, armRLower: -pose.armLLower,
      legLUpper: -pose.legRUpper, legLLower: -pose.legRLower,
      legRUpper: -pose.legLUpper, legRLower: -pose.legLLower,
      handL: pose.handR,
      handR: pose.handL,
    };
  }

  /** Continuous walk: phase 0 and 1 are the two contact poses, swapping legs and arms. */
  function walkPoseAt(phase) {
    const cycle = ((phase % 1) + 1) % 1;
    const quarter = cycle * 4;
    const swapped = (pose) => ({
      ...pose,
      armLUpper: pose.armRUpper, armLLower: pose.armRLower,
      armRUpper: pose.armLUpper, armRLower: pose.armLLower,
      legLUpper: pose.legRUpper, legLLower: pose.legRLower,
      legRUpper: pose.legLUpper, legRLower: pose.legLLower,
    });
    const keys = [
      POSES.walk_contact,
      POSES.walk_passing,
      swapped(POSES.walk_contact),
      swapped(POSES.walk_passing),
      POSES.walk_contact,
    ];
    const index = Math.floor(quarter);
    const mix = quarter - index;
    return blendPoses(keys[index], keys[index + 1], mix * mix * (3 - 2 * mix));
  }

  /* ---------- static SVG, for Manim and for design tools ---------- */

  function renderSvg({
    pose = "standing",
    expression = "neutral",
    seed = 7,
    ink = "#141210",
    accent = "#E8401A",
    glasses = false,
    flip = false,
    time = 0,
  } = {}) {
    const resolved = flip ? mirrorPose(poseByName(pose)) : poseByName(pose);
    const options = { seed, boilFps: 0, wobble: 0.5, glasses };
    const { inkPath, accentPath } = drawFrame(options, resolved, expressionByName(expression), false, time);
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-62 -118 124 124">` +
      `<path fill="${ink}" fill-rule="nonzero" stroke="${ink}" stroke-width="0.5" stroke-linejoin="round" d="${inkPath}"/>` +
      (accentPath
        ? `<path fill="${accent}" fill-rule="nonzero" stroke="${accent}" stroke-width="0.5" stroke-linejoin="round" d="${accentPath}"/>`
        : "") +
      `</svg>`
    );
  }

  /* ---------- animated figure ---------- */

  function create(parent, userOptions = {}) {
    const options = {
      x: 540,
      y: 1200,
      height: 460,
      seed: 7,
      ink: "var(--brand-ink, #141210)",
      accent: "var(--brand-accent, #E8401A)",
      boilFps: 6, // Redraw the wobble six times a second, like hand-drawn line boil.
      wobble: 0.5,
      blink: true,
      glasses: false,
      flip: false,
      startPose: "standing",
      startExpression: "neutral",
      ...userOptions,
    };
    const scale = options.height / FIGURE_HEIGHT_UNITS;

    const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
    let root = parent;
    if (parent.tagName.toLowerCase() !== "svg" && parent.tagName.toLowerCase() !== "g") {
      root = document.createElementNS(SVG_NAMESPACE, "svg");
      root.setAttribute("viewBox", "0 0 1080 1920");
      root.setAttribute("width", "1080");
      root.setAttribute("height", "1920");
      root.style.cssText = "position:absolute;inset:0;overflow:visible;pointer-events:none";
      parent.appendChild(root);
    }
    const group = document.createElementNS(SVG_NAMESPACE, "g");
    const inkElement = document.createElementNS(SVG_NAMESPACE, "path");
    const accentElement = document.createElementNS(SVG_NAMESPACE, "path");
    for (const [element, color] of [[inkElement, options.ink], [accentElement, options.accent]]) {
      element.setAttribute("fill-rule", "nonzero");
      element.setAttribute("stroke-linejoin", "round");
      element.setAttribute("stroke-width", "0.5");
      element.style.fill = color;
      element.style.stroke = color;
      group.appendChild(element);
    }
    root.appendChild(group);

    // Keyframes are data; time alone decides which of them apply.
    const initialPose = poseByName(options.startPose);
    const poseKeys = [];
    const expressionKeys = [{ at: -Infinity, expression: expressionByName(options.startExpression) }];
    const moveKeys = [];

    const figure = {
      options,

      /** Blend into a named pose (or a custom pose object) starting at time `at`. */
      pose(name, { at = 0, duration = 0, ease = "power2.out", flip = options.flip } = {}) {
        const target = poseByName(name);
        poseKeys.push({
          kind: "pose",
          at,
          duration,
          ease: resolveEase(ease),
          pose: flip ? mirrorPose(target) : target,
        });
        poseKeys.sort((first, second) => first.at - second.at);
        return figure;
      },

      /** Walk from `at` to `until`, blending in and out; `steps` full strides per second. */
      walk({ at = 0, until = 1, strideRate = 1.1, blend = 0.2, flip = options.flip } = {}) {
        poseKeys.push({ kind: "walk", at, until, strideRate, blend, flip, ease: resolveEase("none") });
        poseKeys.sort((first, second) => first.at - second.at);
        return figure;
      },

      /** Swap expression at time `at`. Faces cut rather than morph, like hand-drawn animation. */
      say(name, { at = 0 } = {}) {
        expressionKeys.push({ at, expression: expressionByName(name) });
        expressionKeys.sort((first, second) => first.at - second.at);
        return figure;
      },

      /** Glide the figure's feet to (x, y) in stage pixels. */
      moveTo({ x = options.x, y = options.y, at = 0, duration = 1, ease = "none" } = {}) {
        moveKeys.push({ x, y, at, duration, ease: resolveEase(ease) });
        moveKeys.sort((first, second) => first.at - second.at);
        return figure;
      },

      /** Resolve the pose at `time` by replaying keyframes in order. Pure. */
      poseAt(time) {
        let current = options.flip ? mirrorPose(initialPose) : initialPose;
        for (const key of poseKeys) {
          if (time < key.at) break;
          if (key.kind === "walk") {
            const walkEnd = Math.min(time, key.until);
            let walking = walkPoseAt((walkEnd - key.at) * key.strideRate);
            if (key.flip) walking = mirrorPose(walking);
            const enter = Math.min(1, (time - key.at) / key.blend);
            const leave = time > key.until ? Math.min(1, (time - key.until) / key.blend) : 0;
            current = blendPoses(current, walking, enter);
            if (leave > 0) current = blendPoses(walking, poseByName("standing"), leave);
          } else {
            const progress = key.duration > 0 ? Math.min(1, (time - key.at) / key.duration) : 1;
            current = blendPoses(current, key.pose, key.ease(progress));
          }
        }
        return current;
      },

      expressionAt(time) {
        let current = expressionKeys[0].expression;
        for (const key of expressionKeys) {
          if (time >= key.at) current = key.expression;
        }
        return current;
      },

      positionAt(time) {
        let x = options.x;
        let y = options.y;
        for (const key of moveKeys) {
          if (time < key.at) break;
          const progress = key.duration > 0 ? Math.min(1, (time - key.at) / key.duration) : 1;
          const eased = key.ease(progress);
          x += (key.x - x) * eased;
          y += (key.y - y) * eased;
        }
        return { x, y };
      },

      /** Blink schedule derived only from the seed: a 3 to 5 s rhythm of 0.12 s blinks. */
      blinkingAt(time) {
        if (!options.blink || time < 0) return false;
        let cursor = 0.8 + mulberry32(hashSeed(options.seed, "blink", 0))() * 1.5;
        for (let index = 1; cursor <= time; index += 1) {
          if (time < cursor + 0.12) return true;
          cursor += 3 + mulberry32(hashSeed(options.seed, "blink", index))() * 2;
        }
        return false;
      },

      /** Draw the frame for an absolute time in seconds. */
      seek(time) {
        const { x, y } = figure.positionAt(time);
        group.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale})`);
        const frame = drawFrame(
          options,
          figure.poseAt(time),
          figure.expressionAt(time),
          figure.blinkingAt(time),
          time,
        );
        inkElement.setAttribute("d", frame.inkPath);
        accentElement.setAttribute("d", frame.accentPath);
        return figure;
      },

      /**
       * Let a GSAP timeline drive this figure for `duration` seconds. The driver is a
       * setter property, so it redraws on any seek, including with events suppressed.
       */
      attach(timeline, duration) {
        let driverTime = 0;
        const driver = {
          get time() {
            return driverTime;
          },
          set time(value) {
            driverTime = value;
            figure.seek(value);
          },
        };
        timeline.fromTo(
          driver,
          { time: 0 },
          { time: duration, duration, ease: "none", immediateRender: true },
          0,
        );
        figure.seek(0);
        return figure;
      },
    };

    figure.seek(0);
    return figure;
  }

  return {
    create,
    renderSvg,
    walkPoseAt,
    poses: Object.keys(POSES),
    expressions: Object.keys(EXPRESSIONS),
    BONES,
  };
});
