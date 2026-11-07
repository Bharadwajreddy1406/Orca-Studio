# Shared Reel kit

These are the parts every Reel in the series repeats, written once. Projects 008 and later build on it. The references are `videos/006_parallel_chaining` and `videos/007_feedback_chaining`, which predate the kit and hold their own copies.

HyperFrames serves only the project folder, so these files are copied into `<project>/reel/`, which is gitignored like `brand/`. `orca render` copies them on every render. While developing, copy them yourself: `cp shared/reel/*.js videos/<project>/reel/`. Edit the files here, never the copies.

| File | What it gives you |
| --- | --- |
| `motion.js` | `clamp01`, `mix`, `smooth`, `spring`, `backOut`, `bounceOut`, `track(initial, keys, time)` for keyframes `{t, d, v, e}`, `seeded` |
| `cast.js` | `createMember(svg, {seed, startPose, startExpression, props, apron})`, costume props (hats, tools, emotion marks) and custom `POSES` |
| `stage.js` | `createStage(container, beats, {opening, keys, adjust})`; `fade`, `pinTo`, `standAt`, `showLine`, `driveFrames` |
| `endcard.js` | `frameReel(timeline, beats, {accents, closerProps})`: the torn reveal, paper jumps, the end-card fade and the cheering closer |

Python lives beside it: `shared/reel_narration.py` (`build(project)`) and `shared/reel_mix.py` (`mix(project, extra_shared, extra_bank)`). Each project's `build_narration.py` and `build_mix.py` is a few lines that call them.

## `createStage`

`createStage` returns:

- `THREE`, `scene` and `materials` (`bone`, `ink`, `accent`, `edge`)
- `block(material, w, h, d, x, y, z)`, `plinth(w, h, d)` and `glow(material, amount)`
- `popGroup(x, z)`, with `.add(px, pz, delay, ...meshes)` and `.draw(time, shownAt, hiddenAt, returnAt)`
- `makeLinks(n)`, `placeChain(links, from, to, {formedAt, gone, heat, thick, lift, time})` and `pulse(time, at, span)`
- `drawChips(time)`, for `beats.bursts`
- `closeUp(x, z, extra)`, `poseAt(time)`, `applyCamera(pose)`, `toScreen` and `pixelsPerUnit`
- `render()`

A camera pose is `{yaw, pitch, dist, x, y, z}` orbiting the look point. `closeUp` frames about 11 units across at 96 px per unit. `beats.shakes` (`{t, amount}`) shakes it. Pass `adjust(pose, time)` to add a follow or a spin.

## Markup every Reel uses

```html
<link rel="stylesheet" href="brand/brand.css" />
<script src="brand/vendor/gsap.min.js"></script>
<script src="brand/stickman/stickman.js"></script>
<script src="brand/brand-kit.js"></script>
<script src="timeline.js"></script>
<script type="importmap">{ "imports": { "three": "./lib/three.module.js" } }</script>
...
<div id="root" data-composition-id="main" data-start="0" data-duration="__DURATION__" data-width="1080" data-height="1920" data-fps="60">
  <div id="paper" class="clip" data-start="0" data-duration="__DURATION__" data-track-index="0">
    <div class="paper-sheet bp-paper is-quiet"></div>
    <div class="paper-sheet bp-paper"></div>
    <div class="paper-sheet bp-paper is-folded"></div>
  </div>
  <div id="scene" class="clip" data-start="0" data-duration="__SCENE_LENGTH__" data-track-index="1">
    <div id="world"></div>
    <svg id="figures" viewBox="0 0 1080 1920" width="1080" height="1920" style="overflow: visible; pointer-events: none"></svg>
    <div id="labels" data-layout-allow-overflow data-layout-allow-overlap><!-- pinned labels --></div>
    <!-- screen cards, then <div class="bp-safe"> headlines </div> -->
  </div>
  <div id="end-card" class="clip" data-start="__END_START__" data-duration="__END_LENGTH__" data-track-index="2">
    <div class="bp-safe">
      <div id="end-title" class="bp-headline bp-accent">Follow for more</div>
      <div id="end-handle" class="bp-caption">@BradAndPrad</div>
      <div id="end-logo-slot"></div>
    </div>
    <div id="end-stage"></div>
  </div>
  <div id="sheet-top" class="clip bp-torn-top" data-start="0" data-duration="1.3" data-track-index="3"></div>
  <div id="sheet-bottom" class="clip bp-torn-bottom" data-start="0" data-duration="1.3" data-track-index="4"></div>
</div>
<script type="module">
  import { timeline } from "./source/main.js";
  window.__timelines = window.__timelines || {};
  window.__timelines["main"] = timeline;
</script>
```

Styles to copy:

```css
#root { position: absolute; inset: 0; overflow: hidden; }
#world, #figures, #labels { position: absolute; inset: 0; }
#world canvas { display: block; }
#labels > * { position: absolute; left: 0; top: 0; opacity: 0; will-change: transform; }
.line { position: absolute; top: 0; left: 0; right: 0; text-align: center; font-size: 84px; line-height: 1.04; opacity: 0; }
.line.big { font-size: 112px; }
#end-title { position: absolute; top: 0; left: 0; right: 0; text-align: center; font-size: 168px; line-height: 1; }
#end-handle { position: absolute; top: 372px; left: 0; right: 0; text-align: center; }
#end-logo-slot { position: absolute; top: 470px; left: 50%; width: 280px; height: 280px; margin-left: -140px; }
#end-stage svg { position: absolute; inset: 0; overflow: visible; }
```

In `main.js`, `export const timeline = gsap.timeline({ paused: true })`, then call `frameReel`, add your tweens, and finally call `driveFrames(timeline, beats.duration, drawFrame)`. `drawFrame` calls `stage.applyCamera(stage.poseAt(time))` first, then the cast, labels and cards, then the world.

## The timeline script

`build_timeline.py` reads `timing.json`. Word times there are seconds into the tightened take, and it adds `VOICE_OFFSET = 0.55` so the opening swish ends before speech. It writes:

- `timeline.js` (`window.REEL = {beats}`)
- `cues.json` (`{duration, take, cues: [{effect, t, gain}]}`, including `{"effect": "voice", "t": VOICE_OFFSET}`)
- `index.html`, from `source/index.template.html` with `__DURATION__`, `__END_START__`, `__SCENE_LENGTH__` and `__END_LENGTH__` filled in

The end card starts about 1.2 s after the last word and holds for 2.2 s.

Effect names available in `shared/reel_mix.py`:

- **Library sounds:** `tear`, `sad`, `idea`, `whip`, `slide`, `pop`, `step`, `sparkle`, `arrive`, `sweep`, `buzz`, `slam`
- **Bank sounds:** `clink`, `tick`, `key`, `riser`, `knock`, `ding0` to `ding2`, `chord0` to `chord2`, `end`

A cue's `t` is when the hit lands, not when the file starts.
