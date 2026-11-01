# Orca Studio

Orca Studio is a workspace for building mathematical and technical explainer videos
and Reels. Reels use HyperFrames, Three.js, and GSAP; math-heavy scenes use Manim
Community Edition. Each video has its own numbered folder containing the narration
script, visual storyboard, implementation, and local assets.

Working commands and known traps are in [the operating procedure](docs/SOP.md).
Standing rules are in `AGENTS.md`.

## Repository workflow

New or substantially revised videos follow this sequence, without pausing between
stages. The user chooses the voice at the start and approves the finished video.

1. Write `script.md`.
2. Write `storyboard.md`.
3. Implement `scene.py` or the HyperFrames composition.
4. Render and review a low-quality preview.
5. Refine timing and layout before producing a higher-quality render.

Reusable visual helpers belong in `shared/`. Video-specific assets belong in
that video's `assets/` folder.

## Project utilities

Run these commands from the repository root on Windows.

```powershell
# Create the next numbered project from videos/_template.
.\create "System Design 01"
# -> videos/002_system_design_01

# Omit the name to generate an auto_XXXXXX suffix.
.\create
# -> videos/003_auto_482901

# Render by number or by the complete project folder name.
.\render 002
.\render 002_system_design_01
```

`render` handles Manim projects only. It defaults to 480p at 15 fps and renders
every Manim `Scene` declared in the selected project's `scene.py`. Select a resolution and frame-rate preset
directly:

```powershell
.\render 002 --480p15
.\render 002 --720p30
.\render 002 --1080p60
.\render 002 --2160p60
.\render 002 --preview
```

`--108060p` is accepted as an alias for `--1080p60`, and `--4k60` is accepted
as an alias for `--2160p60`. The older `--quality low|medium|high|4k` form also
remains supported.

After rendering, separate delivery assets are written to
`media/exports/<project>/<preset>/`:

- `<Scene>_video.mp4`: silent video track;
- `<Scene>_audio.wav`: combined narration track for voiceover scenes;
- `<Scene>.srt`: generated subtitles, when available.

Every render also remuxes the separate video and audio tracks into a final `<Scene>_merged.mp4`. Add `--no-merge` to skip it:

```powershell
.\render 001 --1080p60 --no-merge
# -> media/exports/001_derivative_intuition/1080p60/
```

Manim's native output under `media/videos/` is preserved as well.

The same utilities can be invoked directly with
`uv run python scripts/create.py` and `uv run python scripts/render.py`.
Command Prompt also accepts the shorter bare forms `create` and `render` from
the repository root.

## Manim Voiceover guide

Narrated Manim videos use `manim-voiceover` so narration timing controls animation
timing. Read [the full Manim Voiceover guide](docs/manim_voiceover.md) before
implementing or changing a narrated scene.

The key repository rules are:

- `script.md` remains the source of truth for spoken narration.
- Use `VoiceoverScene` and divide narration into storyboard-aligned voiceover
  blocks instead of guessing timing with arbitrary waits.
- Use `tracker.duration` and occasional bookmarks to synchronize meaningful
  visual actions with speech.
- Keep speech services replaceable and keep API credentials out of scene files.
- Render voiceover scenes with Manim caching disabled. The `render` utility
  detects direct `manim_voiceover` imports and adds `--disable_caching`
  automatically.
- Re-render and review the complete video with audio whenever the speech service
  or narration changes.

### Choosing a voice

New projects use Kokoro, a free voice that runs locally, so narration text stays on
this computer. List the shortlist with:

```powershell
.\render --list-kokoro-voices
```

Edge TTS is the online alternative. List all voices it currently offers:

```powershell
.\render --list-voices
```

Choose one for a single render:

```powershell
.\render 001 --voice en-IN-NeerjaNeural
```

Or save the default in the project's `voiceover.json`:

```json
{
  "service": "edge-tts",
  "voice": "en-IN-NeerjaNeural",
  "options": {
    "rate": "+0%",
    "volume": "+0%",
    "pitch": "+0Hz"
  }
}
```

`videos/_template/voiceover.json` selects `kokoro`. A project with no configured
service falls back to `edge-tts` with `en-IN-NeerjaNeural`. Edge TTS is an
online service and sends narration text to Microsoft's speech service. Windows
SAPI voices are not used by this repository.

### External voice providers

Supported provider names are `kokoro` (local), `edge-tts`, `gtts`, `azure`, `elevenlabs`,
and `openai`. External providers must be explicitly selected and will transmit narration text
to that provider. Install the matching optional dependency first, for example:

```powershell
uv add "manim-voiceover[openai]"
```

Then configure `voiceover.json`:

```json
{
  "service": "openai",
  "voice": "alloy",
  "options": {
    "model": "tts-1-hd"
  }
}
```

Configuration can be overridden for one render:

```powershell
.\render 001 --voice-service openai --voice alloy --1080p60
```

Provider-specific settings belong in `options`. API keys must remain in
environment variables or `.env`, never in `voiceover.json` or `scene.py`.

## Orca CLI

`orca` is the everyday command. It works anywhere inside this folder and refuses to run outside it. It detects the project type and rebuilds only what is out of date.

### First time on a machine

Install [uv](https://docs.astral.sh/uv/), Git, FFmpeg, and Node 22+, then run this inside the folder:

```powershell
.\orca setup      # Windows. On macOS or Linux: ./orca setup
```

Setup checks your GPU, asks which voice engine and tools you want, installs them with versions matched to your hardware, and saves your choices in `orca.local.json`. It adds an `orca` launcher to `~/.local/bin`. Run `orca doctor` at any time to check the GPU, tools, and disk. It changes nothing.

### Commands

| Command | What it does |
| --- | --- |
| `orca setup` | Checks this machine and installs what it needs |
| `orca doctor` | Shows the GPU, tools, and disk, changing nothing |
| `orca list` | Lists projects and their type |
| `orca voices` | Lists the voice shortlist, with sample files |
| `orca create "Name"` | Creates the next numbered project |
| `orca render 003` | Builds and renders a project |
| `orca render 003 --draft` | Faster 30 fps preview (HyperFrames projects) |
| `orca render 003 --voice bf_emma` | Switches the voice and renders |
| `orca render 003 --voice bf_emma,bm_george` | Renders one video per voice (HyperFrames projects) |
| `orca render 003 --force` | Rebuilds every step (HyperFrames projects) |
| `orca render 003 --dry-run` | Shows the steps without changing anything |

### Trying different voices

Listen to the samples in `shared/voices/samples/`, then render with the voice you want:

```powershell
orca render 003 --voice bf_emma --draft
```

Use `--draft` to compare quickly, and drop it for the final 1080p 60 fps video. On HyperFrames projects:

- Narration, timing, and the sound mix are rebuilt to fit the new voice.
- Each voice gets its own file, so variations don't overwrite each other: `media/exports/003_bubble_sort/<1080p60 or draft>/003_bubble_sort_bf_emma_merged.mp4`.
- The voice stays set in the project's `voiceover.json`, so a later plain `orca render 003` uses it too.
- The video's length follows the voice: a faster voice makes a shorter video. A voice too slow to fit the project's maximum length stops with an error instead of overrunning.

On Manim projects, `--voice` applies to that one render only. The animation may need re-timing afterward.

If you rename this folder, run `orca setup` again from its new location (using `.\orca setup`) to rewrite the launcher. More detail is in `orca --help` and `docs/SOP.md`.
