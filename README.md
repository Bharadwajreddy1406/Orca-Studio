# Manima

Manima is a workspace for building mathematical and technical explainer videos
with Manim Community Edition. Each video has its own numbered folder containing
the narration script, visual storyboard, Manim scene, and local assets.

## Repository workflow

New or substantially revised videos follow this sequence:

1. Write and approve `script.md`.
2. Write and approve `storyboard.md`.
3. Implement `scene.py`.
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

`render` defaults to 480p at 15 fps and renders every Manim `Scene` declared in
the selected project's `scene.py`. Select a resolution and frame-rate preset
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

Narrated videos use `manim-voiceover` so narration timing controls animation
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

### Choosing an Edge TTS voice

List all voices currently offered by Edge TTS:

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

`edge-tts` with `en-IN-NeerjaNeural` is the repository default. Edge TTS is an
online service and sends narration text to Microsoft's speech service. Windows
SAPI voices are not used by this repository.

### External voice providers

Supported provider names are `edge-tts`, `gtts`, `azure`, `elevenlabs`, and `openai`.
External providers must be explicitly selected and will transmit narration text
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
