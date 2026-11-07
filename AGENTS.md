# Project: Orca Studio

**Read `docs/SOP.md` before doing any video work.** It has the exact working commands and the known traps, so you don't repeat past trial and error.

This repository is used to create mathematical and technical explainer videos and Reels.

The user provides the topic, explanation goal, and feedback. Claude is responsible for planning, implementing, rendering, and iterating on the video.

## Default Stack

* Reels and Shorts: HyperFrames + Three.js + GSAP + the `shared/brand/` kit for the look, Kokoro for voice, WhisperX for word times. `videos/003_bubble_sort` is the reference project.
* Math-heavy scenes: Manim Community Edition. The Manim guidance below applies to these.
* The `.\render` utility only handles Manim projects. HyperFrames projects use their own build steps, listed in `docs/SOP.md`.

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
shared/
    reusable Manim helpers and components
    brand/        the channel's brand kit
    voices/       the Kokoro voice shortlist and samples

scripts/
    create.py
    render.py

docs/
    SOP.md
    manim_voiceover.md

videos/
    _template/
        scene.py
        script.md
        storyboard.md
        voiceover.json
        assets/

    <video_name>/           Manim project
        scene.py
        script.md
        storyboard.md
        voiceover.json
        assets/

    <video_name>/           HyperFrames project (no scene.py)
        index.html
        build_*.py
        source/
        script.md
        storyboard.md
        voiceover.json
        assets/
```

Each video must live inside its own folder under `videos/`.

Video-specific assets belong inside that video's `assets/` folder.

Use `shared/` only for genuinely reusable code.

## Project Utilities

Use the repository utilities instead of manually creating numbered folders or assembling routine render commands.

### `orca`: the default command

`orca` runs anywhere inside this repository and refuses to run outside it. Prefer it for every render, because it detects the project type and rebuilds only what is out of date.

```powershell
orca setup                                 # check this machine, install what it needs
orca doctor                                # GPU, tools, disk; changes nothing
orca list                                  # projects and their type
orca voices                                # the Kokoro shortlist
orca create "Project Name"                 # the next numbered project
orca render 034                            # build and render any project
orca render 034 --draft                    # faster 30 fps preview (HyperFrames)
orca render 034 --voice bf_emma            # switch voice and render
orca render 034 --voice bf_emma,bm_george  # one video per voice (HyperFrames)
orca render 034 --force                    # rebuild every step (HyperFrames)
orca render 034 --dry-run                  # show the steps, change nothing
```

The user can switch voices and re-render without Claude. For a HyperFrames project, `--voice` writes the voice into the project's `voiceover.json` and it stays set, so a later plain render uses that voice. It rebuilds narration, timing, and the mix, because the voice changes every duration. Output goes to `media/exports/<project>/<1080p60|draft>/<project>_<voice>_merged.mp4`, so variations do not overwrite each other, along with a matching `_video.mp4` and `_cover.png`.

For Manim projects, `orca render` hands off to `render`, so its options work too, such as `orca render 002 --1080p60`. There, `--voice` applies to that one render only and is not saved. It does not re-time the scene's hard-coded animation offsets, so re-check timing after switching voices.

Video length follows the voice, so a faster voice gives a shorter video with no dead air. A voice too slow to fit a project's maximum length stops the build with an error rather than overrunning. The logic lives in `scripts/orca.py`; `orca.cmd` and `~\.local\bin\orca.cmd` are only launchers. The second one holds this repository's absolute path, and `.\orca setup` rewrites it after the folder is renamed.

`orca setup` is in `scripts/orca_setup.py`. It picks CUDA or CPU builds and a WhisperX model from the detected GPU, and saves machine choices in the gitignored `orca.local.json`, read through `shared/machine.py`. Tool locations also live in `shared/machine.py`, so never hard-code them. Only Windows has been exercised; the macOS and Linux paths are written but untested.

### `create` and `render`

These are the older Manim utilities that `orca` builds on. On Windows PowerShell, run them from the repository root:

```powershell
.\create "Project Name"
.\create
.\render 034
.\render 034_project_name --1080p60
```

`create` scans the numeric prefixes under `videos/`, selects the next number, and copies `videos/_template`. A supplied name is normalized to snake_case. With no name, it generates `auto_` followed by six numeric digits.

`render` handles Manim projects only and stops with an error on a project with no `scene.py`. It accepts either a project's numeric prefix or its complete folder name. It discovers every `Scene` subclass declared in that project's `scene.py`, renders with the repository's existing `uv` environment, and leaves output in `media/`.

The default render preset is `--480p15`. The explicit presets are `--480p15`, `--720p30`, `--1080p60`, and `--2160p60`; `--108060p` and `--4k60` are supported aliases. The older `--quality low|medium|high|4k` syntax remains supported. Use `--preview` only when an interactive preview is wanted.

After every successful render, the utility exports a silent video track, a combined WAV narration track when audio exists, the SRT file when available, and `<Scene>_merged.mp4`, the final video with audio, under `media/exports/<project>/<preset>/`. Pass `--no-merge` to skip the merged file. Do not remove Manim's native output in `media/videos/`.

The command logic lives in `scripts/create.py`, `scripts/render.py`, and `scripts/orca.py`; `create.cmd`, `render.cmd`, and `orca.cmd` are only Windows launchers. Do not duplicate their numbering, lookup, or rendering logic elsewhere without a concrete need.

## Video Workflow

For substantial video work, follow this order:

1. Understand the concept and intended viewer takeaway.
2. Write or update `script.md`.
3. Write or update `storyboard.md`.
4. Implement the animation in `scene.py` or, for a Reel, the HyperFrames composition.
5. Render a low-quality preview.
6. Inspect errors, layout, pacing, and visual clarity.
7. Fix problems and render again.
8. Produce the higher-quality final render, then mux and master as needed.

Do not jump directly into complex animation code before the explanation and visual flow are reasonably clear.

## Autonomy and Approval

Claude does most of the work end to end. For a new video, go from idea through script, storyboard, code, and render without pausing for approval at each stage.

Only two routine pauses remain:

1. At the start, ask which voice to use (see "Voice selection: ask every time" below).
2. After the finished, edited video exists, ask the user to approve it. Give the exact file path.

Also pause for:

* anything destructive, paid, or outward-facing, such as publishing or sending text to a new external service
* a genuine blocker that you cannot resolve yourself

Where `docs/manim_voiceover.md` or a skill speaks of "approved" narration or sync, your own review of the render satisfies it, and the two pauses above still apply.

## Scope: When to Use the Full Workflow

Use the full script → storyboard → implementation pipeline for:

* New videos.
* Substantial reworks of an existing video's explanation or structure.
* Changes that affect what the viewer is meant to understand, not just how it looks.

Skip the full pipeline for:

* Small visual fixes (color, spacing, layout adjustment, fixing an overlap).
* Bug fixes that don't change the explanation (a broken `Transform`, a LaTeX typo, an object drifting out of frame).
* Timing adjustments that don't change the underlying content.

When unsure whether a change is "substantial," choose, then say what you chose in your report. A change that seems small in code (e.g. reordering two animation beats) can be substantial in meaning if it changes the logical flow of the explanation.

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

### Reel scripts: the house style

Every Reel or Short script follows these rules, whether Claude writes it from a topic or is handed a draft. A handed-in draft that breaks them is rewritten to fit before any voice is generated. Keep its meaning, its example and its key terms, and show the rewrite in the report. `videos/006_parallel_chaining/script.md` is the reference.

**Length.** The finished Reel runs 30 to 40 seconds, end card included. That means 75 to 90 spoken words, at most 14 lines. Count the words before generating any voice. A take that runs long is cut in the script, never sped up.

**Shape.** The beats go in this order, each one line unless noted:

1. Hook: a relatable question or problem in under 10 words, with emotion ("Planning a trip to Goa? Ugh... where do you even start?").
2. The pain: the everyday mess, in fragments ("Flights. Hotels. Places to visit.").
3. The slow or obvious way, and why it hurts ("One by one? That takes forever.").
4. The twist: "What if..." pointing at the idea.
5. The mechanism: one very short line per moving part, never a list read out in one sentence.
6. The payoff: what the viewer gets.
7. The name: say the concept's name once, here, after the viewer has seen it work.
8. The benefit: one line.
9. The catch: one line on when it does not apply. This line keeps the video accurate.
10. Sign-off: two or three words with a smile ("Happy travels!").

**Lines.**

* One spoken line per paragraph, and one visual beat per line. The build scripts and storyboard rely on this.
* Each sentence is 3 to 10 words. Fragments are fine.
* Use one concrete, everyday example from start to finish (a trip, a coffee shop), not abstract terms.
* Cut openers and filler such as "Let's understand", "Here's what's happening", "In this video", "basically", "so". Start on the hook.
* Name the concept at most twice.
* No narration of what the picture already shows.
* Use second person ("you"), and use contractions.

**Emotion and pace (ElevenLabs `eleven_v3`).**

* Put delivery tags at the start of a line or phrase, at most about one every two lines. Use only tags the v3 docs name: `[excited]`, `[curious]`, `[sighs]`, `[whispers]`, `[sarcastic]`, `[laughs]`, `[mischievously]`. An unknown tag may be read aloud.
* Use `...` for a beat of suspense, and a spoken interjection ("Ugh", "Wait") for feeling. Both cost nothing.
* Use stability `0.0` (Creative) for expressive Reels.
* Tags and stage directions never appear on screen. Headlines are written separately, in `storyboard.md` and the composition.
* The build trims the pauses between lines to about 0.3 s (`LINE_GAP_SECONDS` in the 006 `build_narration.py`), so a line break is a short breath, not a pause. Use `...` for a real pause.

**Credits.** ElevenLabs credits are limited. Finish and check the script before the one paid request, voice the whole script in a single request, and cache the take by a hash of text, voice and settings, as 006's `build_narration.py` does. A free plan cannot use Voice Library voices through the API, and a key may lack `user_read` or `voices_write`. Check the voice with a free `GET /v1/voices/{id}` before writing the request.

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

Voiceover blocks must use the narration in `script.md` and should correspond to storyboard beats or sub-beats. Use each voiceover tracker's duration, and bookmarks only where needed, to make visual timing subordinate to narration.

Voiceover renders must disable Manim caching. The repository's `render` utility detects direct `manim_voiceover` imports and adds `--disable_caching` automatically. When rendering a voiceover scene manually, include that flag explicitly.

Each narrated project may define `voiceover.json` beside `scene.py`. Use `service`, `voice`, and `options` fields. The default service for new projects is `kokoro`, a free voice that runs locally in its own environment (`%LOCALAPPDATA%\kokoro-tts`, overridable with `ORCA_KOKORO_PYTHON`), so narration text never leaves the computer. The user's voice shortlist is `shared/voices/voices.json`, with a sample of each voice in `shared/voices/samples/`. Run `.\render --list-kokoro-voices` to list it, and use `--voice` or `--voice-service` for one-render overrides. `.\render --list-voices` still lists Edge TTS voices. Do not use Windows SAPI voices.

### Voice selection: ask every time

At the start of every new narrated video, ask the user which voice to use, unless their request already names one. Read the shortlist from `shared/voices/voices.json` and ask with AskUserQuestion. A question holds at most four options, so ask in two steps: first the group (American, British female, British male), then the voice inside it. State each voice's grade and pace, and point the user at its sample file. Claude cannot hear audio, so never describe how a voice sounds. Write the answer into that project's `voiceover.json` and change nothing else if the user later switches voice.

Supported service names are `kokoro`, `edge-tts`, `gtts`, `azure`, `elevenlabs`, and `openai`. Add the corresponding `manim-voiceover` extra before using a provider that requires one. Edge TTS and the other external services transmit narration text outside the computer, so do not select or invoke a new external provider without explicit user authorization. Keep API keys in environment variables or `.env`; never store credentials in `voiceover.json`, `script.md`, or `scene.py`.

### Sound rules

Any opening sound effect ends before the voiceover starts. They never overlap.

The mix's mastering step handles loudness: `.claude/skills/real-sound/scripts/master.py` to -14 LUFS, whose exit code is the gate. This needs no earshot report.

Use the shipped effects bank (`earshot sfx`) when no recording fits; rendering effects is part of the mix, not an earshot review. Use `.claude/skills/real-sound` only for films that need a fully sourced soundtrack. Sound from Openverse is CC0 or CC BY only, with the licence read on the item's own page, because Openverse does not verify licences.

### Hearing the result: earshot

Run earshot's review commands (`measure`, `critique`, `timeline`, `sheet`) only when the user requests them. They are not a step before a video is final.

Claude cannot hear audio. Without an earshot reading, report what was measured, such as the master's loudness, and never describe how the audio sounds.

When requested, earshot runs locally on CPU as the `earshot` MCP server (`%LOCALAPPDATA%\orca-studio-tools\earshot`), with `.claude/skills/earshot` explaining how to read it. Treat its scorecard as evidence, not a verdict: its reference profile is 7 launch films, and it cannot judge taste or emotion. Keep the `llm` command off, because it uploads audio.

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
* The channel brand kit ("Brad & Prad") lives in `shared/brand/`; read `shared/brand/README.md` before any new video. `shared/brand/tokens.json` is the single source for the three colors and fonts. Manim scenes use `shared/colors.py` and `shared/typography.py`; HyperFrames projects run `node shared/brand/hyperframes/install.js <project> --starter`. Do not redefine brand colors, fonts, paper, or the stick figure per video.

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

After meaningful changes to `scene.py` or a HyperFrames composition, render the affected work whenever practical. Run `hyperframes check` on a composition first.

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
* HyperFrames projects render inside their own folder, not `media/`. See `docs/SOP.md`.
* Prefer `.\render <project>` for routine Manim project renders so scene discovery, quality selection, output location, and voiceover cache handling stay consistent.
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

Claude acts primarily as the animation engineer.
