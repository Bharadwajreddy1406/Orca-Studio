# Project: Manim Explainer Videos

This repository is used to create mathematical and technical explainer videos with Manim Community Edition.

The user provides the topic, explanation goal, and feedback. Codex is responsible for planning, implementing, rendering, and iterating on the video.

## Environment

* Use the existing `uv` project environment.
* Do not create separate virtual environments for individual videos.
* Run Manim through `uv run`.

Health check:

```bash
uv run manim checkhealth
```

Development render:

```bash
uv run manim -pql <scene_file> <SceneName>
```

Use low-quality renders during development. Use higher quality only when requested or when producing a final render.

## Repository Structure

```text
assets/
    images/
    svg/
    audio/
    fonts/

shared/
    reusable Manim helpers and components

scripts/
    create.py
    render.py

docs/
    manim_voiceover.md

videos/
    _template/
        scene.py
        script.md
        storyboard.md
        assets/

    <video_name>/
        scene.py
        script.md
        storyboard.md
        assets/
```

Each video must live inside its own folder under `videos/`.

Video-specific assets belong inside that video's `assets/` folder.

Use `shared/` only for genuinely reusable code.

## Project Utilities

Use the repository utilities instead of manually creating numbered folders or assembling routine render commands.

On Windows PowerShell, run them from the repository root:

```powershell
.\create "Project Name"
.\create
.\render 034
.\render 034_project_name --1080p60
```

`create` scans the numeric prefixes under `videos/`, selects the next number, and copies `videos/_template`. A supplied name is normalized to snake_case. With no name, it generates `auto_` followed by six numeric digits.

`render` accepts either a project's numeric prefix or its complete folder name. It discovers every `Scene` subclass declared in that project's `scene.py`, renders with the repository's existing `uv` environment, and leaves output in `media/`.

The default render preset is `--480p15`. The explicit presets are `--480p15`, `--720p30`, `--1080p60`, and `--2160p60`; `--108060p` and `--4k60` are supported aliases. The older `--quality low|medium|high|4k` syntax remains supported. Use `--preview` only when an interactive preview is wanted.

After every successful render, the utility exports a silent video track, a combined WAV narration track when audio exists, the SRT file when available, and `<Scene>_merged.mp4`, the final video with audio, under `media/exports/<project>/<preset>/`. Pass `--no-merge` to skip the merged file. Do not remove Manim's native output in `media/videos/`.

The command logic lives in `scripts/create.py` and `scripts/render.py`; `create.cmd` and `render.cmd` are only Windows launchers. Do not duplicate their numbering, lookup, or rendering logic elsewhere without a concrete need.

## Video Workflow

For substantial video work, follow this order:

1. Understand the concept and intended viewer takeaway.
2. Write or update `script.md`.
3. Write or update `storyboard.md`.
4. Implement the animation in `scene.py`.
5. Render a low-quality preview.
6. Inspect errors, layout, pacing, and visual clarity.
7. Fix problems and render again.
8. Produce a higher-quality render only when appropriate.

Do not jump directly into complex animation code before the explanation and visual flow are reasonably clear.

## Checkpoints and Approval

Do not run the full pipeline (script → storyboard → scene.py → render) end-to-end without pausing, unless explicitly told to.

Default checkpoints:

1. After writing or substantially revising `script.md` — pause for feedback before writing `storyboard.md`.
2. After writing or substantially revising `storyboard.md` — pause for feedback before touching `scene.py`.
3. After the first low-quality render of a new scene — pause for feedback before further polishing or high-quality rendering.

Skip a checkpoint only when:

* The user has explicitly said to proceed through multiple steps, or
* The change is small and clearly scoped (a minor wording fix, a color tweak, a one-line bug fix), or
* The user has established a pattern in this session of wanting fewer checkpoints.

When in doubt, checkpoint. It is cheaper to pause than to redo animation work built on an unapproved script or storyboard.

State clearly at each checkpoint what was done and what the next step would be, so the user can redirect before more work is sunk into a direction.

## Scope: When to Use the Full Workflow

Use the full script → storyboard → scene.py pipeline for:

* New videos.
* Substantial reworks of an existing video's explanation or structure.
* Changes that affect what the viewer is meant to understand, not just how it looks.

Skip the full pipeline for:

* Small visual fixes (color, spacing, layout adjustment, fixing an overlap).
* Bug fixes that don't change the explanation (a broken `Transform`, a LaTeX typo, an object drifting out of frame).
* Timing adjustments that don't change the underlying content.

When unsure whether a change is "substantial," lean toward asking rather than assuming either direction. A change that seems small in code (e.g. reordering two animation beats) can be substantial in meaning if it changes the logical flow of the explanation.

## script.md

`script.md` contains the narration.

Write for spoken delivery.

Prefer:

* short sentences
* intuitive explanations
* progressive reasoning
* concrete examples
* clear transitions

Avoid:

* textbook-style writing
* unnecessary formalism
* long paragraphs
* narration that merely describes obvious on-screen actions

## storyboard.md

`storyboard.md` describes what the viewer sees.

Break the explanation into visual beats.

For each beat, think about:

* what is currently visible
* what changes
* what appears or disappears
* what moves or transforms
* what idea the visual change communicates

Think visually before thinking about Manim APIs.

## Narration and Audio Sync

If a video includes voiceover, `script.md` is the source of truth for timing, not `scene.py`.

Before implementing or changing a narrated scene, read and follow `docs/manim_voiceover.md`. It is the repository's detailed guide for `VoiceoverScene`, narration segmentation, timing, bookmarks, speech services, subcaptions, secrets, rendering, and review.

Before implementing animation timing:

* Confirm whether narration is pre-recorded (audio file exists in `assets/audio/`) or not yet recorded.
* If audio exists, treat animation beats as subordinate to narration timing. Measure or estimate narration segment durations and align `self.wait()` calls and animation runtimes accordingly.
* If audio does not yet exist, animation timing is provisional. Note this explicitly when reporting work, since durations will likely need adjustment once real narration is recorded.
* Do not silently invent narration timing. If timing is ambiguous or unmeasured, say so rather than assuming.

When narration is part of the scene, prefer `manim-voiceover` and `VoiceoverScene` over guessed `self.wait()` timing. Keep speech-service selection easy to replace, and never place provider credentials in `scene.py`.

Voiceover blocks must use approved narration from `script.md` and should correspond to storyboard beats or sub-beats. Use each voiceover tracker's duration, and bookmarks only where needed, to make visual timing subordinate to narration.

Voiceover renders must disable Manim caching. The repository's `render` utility detects direct `manim_voiceover` imports and adds `--disable_caching` automatically. When rendering a voiceover scene manually, include that flag explicitly.

Each narrated project may define `voiceover.json` beside `scene.py`. Use `service`, `voice`, and `options` fields. The default service is `edge-tts` with `en-IN-NeerjaNeural`. Run `.\render --list-voices` to query all available Edge TTS voices, and use `--voice` or `--voice-service` for one-render overrides. Do not use Windows SAPI voices.

Supported service names are `edge-tts`, `gtts`, `azure`, `elevenlabs`, and `openai`. Add the corresponding `manim-voiceover` extra before using a provider that requires one. Edge TTS and the other external services transmit narration text outside the computer, so do not select or invoke a new external provider without explicit user authorization. Keep API keys in environment variables or `.env`; never store credentials in `voiceover.json`, `script.md`, or `scene.py`.

Each storyboard beat should map to a narration segment. When editing `script.md`, check whether the corresponding storyboard beat still matches; when editing `storyboard.md`, check whether narration still fits the new visual pacing. These two files drift apart easily — treat a change to one as a prompt to re-check the other.

## Visual Philosophy

Use animation to explain ideas, not decorate them.

Prefer:

* geometric intuition
* continuous transformations
* animated graphs
* changing quantities
* correspondence between equations and geometry
* visual highlighting
* spatial relationships
* meaningful camera movement
* visual continuity

Avoid:

* PowerPoint-style slides
* walls of text
* excessive labels
* random movement
* unnecessary effects
* decorative animations with no explanatory purpose

Every important animation should contribute to understanding.

## Visual Style Consistency

Videos in this repository should feel like they belong to the same series unless a video has a specific reason to diverge.

* If a shared visual identity exists or is introduced (colors, fonts, title card style, standard intro/outro), it belongs in `shared/`, e.g. `shared/theme.py`, not duplicated per video.
* Before introducing a new color palette, font, or stylistic convention in a video, check whether `shared/` already defines one. Use it if so.
* If a new video genuinely needs a different visual treatment (e.g. a different subject area with its own visual language), state that explicitly rather than silently diverging from established style.
* Do not hardcode color hex values or font names repeatedly across multiple videos if they represent a repository-wide convention — factor them into `shared/`.

## Manim Guidelines

Use Manim Community Edition.

Prefer appropriate Manim tools such as:

* `MathTex`
* `Tex`
* `VGroup`
* `Axes`
* `NumberPlane`
* `ValueTracker`
* `always_redraw`
* updaters
* `Transform`
* `ReplacementTransform`
* `TransformMatchingTex`
* `.animate`

Use `MathTex` for mathematical expressions.

Use `TransformMatchingTex` when related equations transform into one another.

Use `ValueTracker`, updaters, or `always_redraw` for continuously changing mathematical objects.

## Layout

Keep important content inside the frame.

Avoid accidental overlaps between:

* equations
* labels
* arrows
* braces
* graphs
* diagrams

Maintain clear visual hierarchy.

Do not fill every part of the screen.

Use empty space deliberately.

## Animation Timing

Timing should reflect meaning.

Do not give every animation the same duration.

Important transformations may be slower.

Simple appearances can be quicker.

Use `self.wait()` intentionally.

Avoid unnecessary dead time.

## Multi-Scene Videos

Some videos may require more than one `Scene` subclass (e.g. to manage complexity, rendering time, or reusability of a sub-animation).

* Keep all scenes for one video inside that video's `scene.py`, unless the file becomes unwieldy — in that case, split into multiple files within the video's folder (not into `shared/`, unless the split-out scene is genuinely reusable elsewhere).
* Document the intended render/concatenation order in `storyboard.md` or a short note in `scene.py`, since Manim renders each `Scene` independently and does not automatically stitch them together.
* If final output requires concatenating multiple rendered clips, state the concatenation method used (e.g. `ffmpeg`) and the exact command, so the process is reproducible.

## Code Quality

Keep `scene.py` readable.

Use descriptive names such as:

```python
secant_line
tangent_line
moving_point
slope_equation
delta_x_label
```

Avoid meaningless names like:

```python
obj1
thing
temp
x1
```

Break longer scenes into helper methods when doing so improves clarity.

Do not over-engineer simple scenes.

Comments should explain mathematical or visual intent, not obvious Python syntax.

## Code Formatting

* Run formatting and linting before considering a code change complete, if tooling is configured in the project (e.g. `ruff`, `black`).
* If no linter/formatter is configured, ask whether one should be added rather than silently picking a style; in the meantime, follow the formatting conventions already present in the file being edited.

## Accuracy

Mathematical and technical correctness is mandatory.

Do not use a visually attractive representation if it creates a false or misleading idea.

Verify:

* equations
* notation
* signs
* graph domains
* coordinate relationships
* units
* transformations

before considering a video complete.

## Rendering and Validation

After meaningful changes to `scene.py`, render the affected scene whenever practical.

Do not assume code is correct because it is syntactically valid.

Check for:

* Manim exceptions
* LaTeX errors
* missing assets
* objects outside the frame
* overlaps
* unreadable text
* awkward pacing
* unintended jumps or transformations

Fix discovered issues before finishing the task.

## Output and Render File Conventions

Manim's default `media/` output directory can grow large and disorganized across many videos. Follow these conventions:

* Let Manim's default `media/` structure stand (`media/videos/<scene_file>/<quality>/`); do not manually relocate rendered files unless asked.
* `media/` should be gitignored at the repository root. Verify this exists; add it if missing.
* Prefer `.\render <project>` for routine project renders so scene discovery, quality selection, output location, and voiceover cache handling stay consistent.
* Treat `media/exports/<project>/<preset>/` as the organized delivery directory. It contains separate video/audio/subtitle assets and the final merged MP4.
* Low-quality development renders (`-pql`) are disposable — do not treat them as deliverables and do not reference them in commits or documentation.
* When a render is intended as a final deliverable, say so explicitly and note the exact output path so the user can find it without searching.
* Do not delete previous renders unless asked. Old renders are useful for comparison during iteration.

## Working Style

When asked to create or modify a video:

* inspect existing files first
* preserve useful work already present
* make concrete changes instead of only explaining what should be done
* render and test when practical
* report meaningful remaining limitations

The user acts primarily as the director.

Codex acts primarily as the animation engineer.
