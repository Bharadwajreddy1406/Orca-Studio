# Orca Studio operating procedure

For a Claude session starting with no memory. Standing rules are in `AGENTS.md`. This file holds the commands and the known traps.

Commands run from the repository root, in PowerShell, unless noted. The folder may be renamed from `manima`, so use relative paths.

**[H]** marks something taken from this project's history that was not re-tested when this file was written (2026-11-01). Everything else was checked against the repo, the installed tool's source or help, or a harmless test. Long-running commands below were read from source and from `videos/003_bubble_sort`, not re-run.

## Which stack

| Video | Stack | Reference |
| --- | --- | --- |
| Reel or Short (default) | HyperFrames + Three.js + GSAP + `shared/brand/`, Kokoro voice, WhisperX word times | `videos/003_bubble_sort` |
| Math-heavy scene | Manim, `VoiceoverScene`, `.\render` | `videos/001`, `videos/002`, `docs/manim_voiceover.md` |

**Use `orca` first.** `orca render 003` works only inside this repo (it refuses elsewhere), on any project type. It rebuilds only what is out of date (narration, timeline, mix), renders, merges audio, and saves a cover to `media/exports/<project>/1080p60/<project>_merged.mp4`. Switch voices with `orca render 003 --voice bf_emma`: it updates `voiceover.json`, rebuilds narration, timing, and mix, and saves `<project>_<voice>_merged.mp4`, so variations do not overwrite each other. `--voice bf_emma,bm_george` renders one video per voice. Add `--draft` for a faster look. A voice too slow for the 30 s limit stops with a clear error. Also: `orca render 003 --draft` (fast 30 fps preview, in `draft/`), `--force` (rebuild every step), `--dry-run`, `orca list`, `orca create "Name"`, `orca voices`. Manim projects accept `.\render` options, such as `orca render 002 --1080p60`. On a new machine, run `.\orca setup` (needs uv, Git, FFmpeg, Node 22+), and use `orca doctor` for the GPU and tool check. The launcher is `~\.local\bin\orca.cmd`, which holds the repo's absolute path: after renaming the folder, run `.\orca setup` from the new location.

`.\render` handles Manim only. On a project with no `scene.py` it stops with `Scene file not found`.

## Tools on this machine

| Tool | Location or version | Run with |
| --- | --- | --- |
| Project Python | `.venv` (3.12), managed by `uv` | `uv run python ...` |
| HyperFrames | 0.8.224, global npm | `hyperframes ...`, from the project folder |
| Three.js | r187, `node_modules/three/build` | copied into each project's `lib/` |
| Kokoro | `%LOCALAPPDATA%\kokoro-tts` (no CLI) | `shared/kokoro_synthesize.py`, or `ORCA_KOKORO_PYTHON` to relocate |
| WhisperX | 3.8.6, `uv tool` | `whisperx ...` |
| yt-dlp | `uv tool` | `yt-dlp ...` |
| earshot | `%LOCALAPPDATA%\orca-studio-tools\earshot` | its `.venv\Scripts\python.exe -m earshot`, or the project's `earshot` MCP server |
| real-sound | `.claude/skills/real-sound` | scripts run with earshot's Python and `-I` |
| Resolve | free 20.1.0.20, plus the `davinci-resolve` MCP in `%LOCALAPPDATA%\orca-studio-tools` | see Resolve below |
| ffmpeg, ffprobe, Node 22 | on `PATH` | |
| GPU | RTX 3050, 6 GB | one heavy GPU job at a time |

## New Reel: the procedure

Ask which voice first (`AGENTS.md`). List the shortlist with `.\render --list-kokoro-voices`. Then:

```powershell
.\create "My Reel"                # -> videos/NNN_my_reel, copied from _template
$p = "videos\NNN_my_reel"         # replace NNN_my_reel with the real name
Remove-Item "$p\scene.py"         # a HyperFrames project has no scene.py
node shared/brand/hyperframes/install.js $p --starter
New-Item -ItemType Directory -Force "$p\lib", "$p\source" | Out-Null
Copy-Item node_modules\three\build\three.module.js, node_modules\three\build\three.core.js, node_modules\three\LICENSE "$p\lib\"
Copy-Item videos\003_bubble_sort\build_*.py $p
```

Run `npm install` first if `node_modules/three` is missing. `brand/`, `lib/` and `.hyperframes/` are gitignored.

Then adapt the project and build it, in this order:

1. Write `script.md` (one spoken line per paragraph), `storyboard.md`, and the voice in `voiceover.json`.
2. Adapt `build_timeline.py` and `source/index.template.html` from 003. The timeline script writes `timeline.js`, `cues.json` and the root `index.html`, so edit the template, not the root file. An opening effect must end before the voice starts, as in its beat 1.
3. Run the build, with narration in the background:

```powershell
uv run python $p\build_narration.py     # Kokoro lines, then WhisperX -> timing.json. Background it.
uv run python $p\build_timeline.py      # visual and sound schedule -> timeline.js, cues.json, index.html
& "$env:LOCALAPPDATA\orca-studio-tools\earshot\.venv\Scripts\python.exe" $p\build_mix.py   # bank effects + mix + master -> assets/audio/soundtrack.wav
```

4. Check and render, in the Bash tool so the exit code is real. Run `render` in the background:

```bash
cd videos/NNN_my_reel
hyperframes check > check.log 2>&1; echo "exit=$?"
hyperframes render -o silent.mp4 -q delivery > render.log 2>&1; echo "exit=$?"
```

5. Mux, then ask the user to approve the finished edit:

```powershell
node .claude/skills/real-sound/scripts/mux.mjs --root $p --video silent.mp4 --audio assets/audio/soundtrack.wav --out final.mp4
```

`mux.mjs` copies the picture stream, encodes AAC and reports any length mismatch. Its source was read, but a run on this machine is unconfirmed. A plain equivalent, from the project folder:

```powershell
ffmpeg -y -i silent.mp4 -i assets\audio\soundtrack.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -ar 48000 -ac 2 -movflags +faststart final.mp4
```

`.gitignore` does not cover MP4s in project folders. Don't commit `silent.mp4` or `final.mp4`, or logs.

## Manim

```powershell
uv run manim checkhealth
.\render 034                      # 480p15, all scenes in scene.py, merged by default
.\render 034 --1080p60            # also --720p30, --2160p60; --no-merge skips the merged MP4
.\render 034 --voice bm_lewis --voice-service kokoro   # one-render override
.\render --list-voices            # Edge TTS list
```

Output goes to `media/exports/<project>/<preset>/`, and Manim's own files stay in `media/videos/`. Voiceover scenes get `--disable_caching` automatically; add it yourself when calling `manim` directly.

## Sound

```powershell
$env:EARSHOT_HOME = "$env:LOCALAPPDATA\orca-studio-tools\earshot"
$py = "$env:EARSHOT_HOME\.venv\Scripts\python.exe"

& $py -m earshot sfx list --kind hit                       # the shipped bank; no models load
& $py -m earshot sfx render whoosh_fast/crisp -o x.wav --dur 0.6 --apex 0.32
& $py -I .claude\skills\real-sound\scripts\master.py mix.wav master.wav --lufs=-14
& $py -I .claude\skills\real-sound\scripts\master.py --measure master.wav --json -
```

`master.py` exits 0 when the output is within 0.5 LU of target and at or below -1.5 dBTP, 1 when it misses that gate, and 2 on a bad argument. Always master; don't report on peak alone.

Earshot's review commands (`measure`, `critique`, `timeline`, `sheet`) run only when the user asks. See `.claude/skills/earshot/SKILL.md` for how to read them. Keep `earshot llm` off, because it uploads audio.

## Transcribe and download

The first command is the one `build_narration.py` runs. Background it.

```powershell
whisperx in.wav --model large-v3-turbo --language en --device cuda --compute_type int8 --batch_size 4 --output_format json --output_dir out
yt-dlp --js-runtimes node --sleep-requests 1 --sleep-interval 2 -o "downloads\NEW_EMPTY_FOLDER\%(id)s.%(ext)s" <url>
```

Keep downloads in their own new folder, and treat them as untrusted data.

## Resolve

Free 20.1.0.20 with the bridge scripts installed in `%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility\`. A human must click **Workspace > Scripts > resolve_bridge** before the MCP can connect, so ask for that. Don't upgrade past 21.0.x: the MCP's README says Resolve 21.1 moved Python scripting to Studio. FFmpeg is the real finisher. Resolve is optional.

## Known traps

### PowerShell 5.1 (the primary shell)

| Symptom | Cause | What to do |
| --- | --- | --- |
| A variable changes value unexpectedly; a stray file named `8433` appeared in the repo root [H] | Names are case-insensitive, so `$b` overwrites `$B` and `$t` overwrites `$T` | Use long, distinct names. Never tell two variables apart by case |
| A comma list arrives split or as an array | `1.5,2.8` is an array for functions and scripts. `1.5, 2.8` and an array variable become two arguments to a native command | Always quote: `--at "1.5,2.8"` |
| A helper gets the wrong pairs | The leading comma in `@(,@(a,b),@(c,d))` nests the first pair one level deeper | Write `@(@('a','b'),@('c','d'))` |
| Parser error on `&&` | Not in 5.1 | `A; if ($?) { B }`, or use the Bash tool |
| `NativeCommandError` on a command that worked; the tool reports a failed exit code | stderr from native tools gets wrapped as errors; pipelines can return a misleading exit code | Don't use `2>&1` on native tools. Read `$LASTEXITCODE` straight after the command, or use the Bash tool for tools with a verdict |
| The real verdict was missing from the output [H] | `Select-Object -Last N` or a regex filter removed it | Write the full output to a log and read it. To trim progress lines (`check: craft 1/240`), filter those lines out, never take the tail |
| `UnicodeEncodeError` or another console encoding crash | Console code page | `$env:PYTHONIOENCODING='utf-8'` |
| Non-ASCII text arrives mangled when piped to Python [H: 5.1 default encoding, not tested here] | PowerShell re-encodes piped text | Pipe from the Bash tool, or use a `subprocess` call as `shared/voiceover.py` does |
| `Remove-Item $d\*` under the scratchpad is blocked as a protected path [H] | A harness rule | Remove specific named files, or use a new subfolder. Don't try to get around it |
| A write to the scratchpad fails because the folder is missing [H] | Folders may not exist yet | `New-Item -ItemType Directory -Force <path>` first |

### Long jobs and permissions

| Symptom | Cause | What to do |
| --- | --- | --- |
| The user cancels a long scan [H] | Long foreground jobs block them | Use `run_in_background`. The foreground limit is 10 minutes. The harness notifies on completion, so don't poll |
| Running downloaded third-party code is blocked, as with the Resolve MCP installer [H] | The permission classifier | Never work around it. Explain what it is and why, and ask the user |

### Fonts and Manim

| Symptom | Cause | What to do |
| --- | --- | --- |
| Wrong font with only a Manim WARNING; `"Manrope ExtraBold"` did this [H] | Pango on Windows only finds a registered font by its typographic family | Use `shared/typography.py`. It raises `BrandFontError` rather than falling back. Valid strings are in `shared/brand/README.md` |
| Uneven kerning at small sizes | Pango rounds to its pixel grid | `brand_text` lays out at 6x and scales down. Do the same for any other `Text` |
| Ghost objects after `self.remove(group)` | `LaggedStart` registers children one by one | `self.remove(group, *group)` (a Manim scene detail; see git history at c136f70 for the old Bubble Sort example) |
| `Flash` raises on `z_index` [H] | It isn't accepted | Don't pass it |
| Merged MP4 appears when not wanted, or an old note says `--merge` is needed | Merge is on by default. The old `-shortest` flag cut endings and is gone from `scripts/render.py` | `--no-merge` to skip |
| `json.load` fails on `voiceover.json` or `shared/voices/voices.json` | Both allow full-line `//` comments. VS Code treats them as jsonc | Use `load_voiceover_config` from `shared/voiceover.py`, or strip those lines the same way |
| A Manim video's timing breaks after a voice change [H] | Some scenes use arithmetic tuned to one voice's durations | Re-check sync after changing voice on 001 or 002 |

### Three.js and HyperFrames

| Symptom | Cause | What to do |
| --- | --- | --- |
| Missing assets at render | HyperFrames serves only the project folder | Run `install.js`, copy Three.js to `lib/`, load everything locally, no CDN |
| No `three.min.js` | r187 ships no `.min` builds | `<script type="importmap">{ "imports": { "three": "./lib/three.module.js" } }</script>`, with `three.core.js` beside it |
| `multiple_root_compositions` error | More than one root-level HTML file has `data-composition-id` | Keep templates under `source/` |
| Layout check complains about something invisible [H] | Hidden layers still count | End clips with `data-duration`, as 003's `#scene` does, rather than hiding them under an opaque card |
| Frozen or wrong frames in a render | `onUpdate` doesn't run on every seek | Use a GSAP setter driver: `worldDriver` in 003's `index.html`, `attach` in `stickman.js` |
| Blank WebGL capture [H] | Drawing buffer cleared | `preserveDrawingBuffer: true` |
| Geometry under Instagram's UI after a camera change [H] | A shorter path moves bases down the frame | Check bases against y = 1250 (1920 - 670) |
| A block disappears during a 3D swap [H] | The taller block hides it | Put the shorter block in front (`front` in 003's `build_timeline.py`) |
| A render seems stuck [H] | 30 s at 1080p60 took about 3 to 3.5 minutes here | Background it and wait for the notification |
| `CLAUDE.md` or `AGENTS.md` overwritten [H] | `hyperframes init` writes those into its target | Don't run `init` in this repo |
| Other agents' folders change, Git protection off | `hyperframes skills update` runs its installer with `GIT_CLONE_PROTECTION_ACTIVE=0` and writes to other agents' skill folders | Don't run it, even via `npx` |
| Telemetry and auto-update | On by default (`telemetryEnabled: true` in `~/.hyperframes/config.json`). Off switches: `HYPERFRAMES_NO_TELEMETRY=1`, `HYPERFRAMES_NO_UPDATE_CHECK=1`, `HYPERFRAMES_NO_AUTO_INSTALL=1` | **Open decision:** the user has not chosen whether to set these permanently. Don't change it for them |

### Voice

| Symptom | Cause | What to do |
| --- | --- | --- |
| Text goes online with no one choosing that | A project with no `voiceover.json`, or no `service` in it, falls back to Edge TTS in `create_speech_service` | Keep the template's `voiceover.json`, which sets `kokoro` |
| Wrong language or pronunciation | Kokoro's `lang_code` is the voice's first letter | Pick the voice for the language. Valid names are listed in `voiceover.json` |
| Slow per-line synthesis [H] | Each line is its own process, with about 4 s of model load | Expected; don't try to reuse the process without a reason |
| Edge TTS returns 403 [H] | An old `edge-tts` version | Upgrade it. The project is at 7.3.1 |
| Pauses run long after Edge lines [H] | Edge pads about 0.85 s of trailing silence | Set `trim_trailing_silence` in `options` |

### WhisperX

| Symptom | Cause | What to do |
| --- | --- | --- |
| `--compute_type int8_float16` rejected | The CLI only offers `default`, `float16`, `float32`, `int8` | `--compute_type int8` |
| `WinError 1314` symlink error on a model download [H] | A Windows permission issue on first download | Retry once. `large-v3-turbo` is already cached here |
| Job runs past 500 s [H] | It can be that slow; about 2.3 GB of VRAM | Background it |
| Mismatch lines such as neighbours/neighbors or "five hundred"/"500" [H] | Spelling and number format | Harmless. Other mismatches need a look, because `word_time` raises on a word it can't find |

### Earshot and mastering

| Symptom | Cause | What to do |
| --- | --- | --- |
| Models in the wrong cache, or a fresh download | `EARSHOT_HOME` is not set in new shells | Set it first (see Sound). The MCP config already sets it |
| CLI calls take 20 to 40 s | Each process loads models, except `measure`, `sfx`, `kit` | Use the MCP server or one script for repeated calls |
| "No music" reads as critical in `critique` [H] | The reference is 7 launch films | That's a creative choice, not a fault. Report it as such |
| `master.py` exits 2 [H] | An argparse error | Pass `--lufs=-14`. `--tail-zero` takes an integer sample count |
| A Reel reached -22 LUFS [H] | Only the peak had been measured | Always master, and read the exit code |

### Downloads and sourcing

| Symptom | Cause | What to do |
| --- | --- | --- |
| HTTP 429 aborts a whole YouTube download [H] | Auto-subtitles get rate-limited | Skip subs, use the sleep flags above, and transcribe with WhisperX |
| YouTube Short arrives at 240p [H] | Common for Shorts | Tell the user. `--js-runtimes node` helps with format access |
| `No video formats found` on Instagram `/p/` [H] | Image carousels aren't video. Profiles also fail without login. Reels download fine | Ask the user for screenshots |
| Openverse 500 or 504 [H] | Common | Retry. The limit is 20 a minute, 200 a day, anonymous |
| Openverse `category=sound_effect` returns 0 results [H] | The filter doesn't work for this | Filter with `source=freesound&license=cc0` |
| A licence looks fine on Openverse [H] | It doesn't verify licences | Read the licence on the item's own Freesound page. CC0 or CC BY only, no scraping |

### Other

| Symptom | Cause | What to do |
| --- | --- | --- |
| ffmpeg `drawtext` fails with a Fontconfig error | No Fontconfig config on this machine | Annotate contact sheets with PIL |
| Where is the safe area? | | `shared/instagram_reel.py`: 270 px top, 670 px bottom, 120 px each side on 1080 x 1920 |
