# Storyboard: Iterative Refinement

## Build

This is a HyperFrames composition, and `orca render 009` runs all of it:

1. `build_narration.py` voices `script.md` with ElevenLabs (Charlie, `eleven_v3`, stability 0.0) in one cached request, tightens the pauses, and times every word with WhisperX (`timing.json`). The take is final; a rebuild spends no credits.
2. `build_timeline.py` schedules every beat from the spoken words, including the cart's three rides along the rail and the ride home. It writes `timeline.js`, `cues.json`, and `index.html` from `source/index.template.html`.
3. `build_mix.py` mixes `shared/sound_effects/` and bank effects under the take, then masters to -14 LUFS.

The project builds on the shared kit in `reel/` (stage, cast, motion, end card). Local files are `source/world.js` (rail, cart, bin, gates), `source/slide.js` (the one slide, painted at any quality from v1 to v4), `source/costumes.js` (a tie, a rag and a clicker, which the kit lacks), and `source/main.js` (choreography). WhisperX heard "Pass one/two/three" as digits and "improved" as "improve", so those beats use line starts and the neighbouring words.

## Spine

**One slide on a cart**, riding a rail through **three gates**: Pass 1 · Structure, Pass 2 · Words, Pass 3 · Examples. The camera follows the cart. At each gate the SAME slide changes on the spoken word, a scan bar sweeps it, the gate's lintel flashes, and a **quality meter** beside it climbs. A version tag counts v1 to v4.

| Version | Slide | Meter |
| --- | --- | --- |
| v1 | Jumbled tilted boxes, a scattered wall of tiny lines, a crossed-line chart, a filename for a title | 16 |
| v2 | Title "Q3 Update" with a rule; two clean panels; the text is still a wall | 42 |
| v3 | The wall collapses into three bullets: Sales +12%, 2 new clients, Ships in May | 64 |
| v4 | A clear bar chart (+12%, Q3 in accent), accent underline and bullet dots, sparkles | 86 |

Each pass gains less than the one before (26, 22, 22). A "good enough" line sits at 80.

## Cast

- **Presenter:** a tie; nervous (sweat, sigh), desperate, hopeful, then confident with a clicker.
- **The AI:** the antenna figure from the series. It blocks the restart and does every pass, with a pencil, then a polishing rag.
- **Audience:** two small figures (glasses, beret) who cheer at the end.

## Beats

The Reel runs 36.3 s. Each line is one beat. Times are in film seconds.

| Beat | Narration | Picture | Sound |
| --- | --- | --- | --- |
| 1. Hook (0.6) | "Big meeting tomorrow... and your AI slides look meh." | Torn reveal. Headline "Big meeting tomorrow". The messy v1 slide on its cart; the presenter sweats, points, then slumps. A "meh." stamp slams onto the slide on "meh" (4.36) | Swish ending before the voice, pops, a sad note and a soft slam on "meh" |
| 2. Restart (5.07) | "Start over? No way." | The slide crumples and flies toward the bin of past restarts. On "No" (6.08) the AI pops in arms out, an accent X lands on the bin, and the slide springs back | Whoosh, a knock and pop on "No" |
| 3. Twist (7.10) | "What if you improved them, one pass at a time?" | The AI with a lightbulb; the presenter cheers. Headline "One pass at a time". The quality meter arrives on "pass" (8.82) at 16 | The idea sound, a pop |
| 4. Pass one (10.12) | "Pass one: fix the structure." | The cart rides to gate 1 with the AI walking beside it. On "fix" (11.18) boxes snap into a grid, the title lands, tag v2, meter 42 | Whip, clink, four snaps, a ding on "structure" |
| 5. Pass two (12.60) | "Pass two: simplify the words." | Ride to gate 2. On "simplify" (13.68) the wall of lines shrinks into three bullets, tag v3, meter 64 | Whip, sweep, three pops, a ding on "words" |
| 6. Pass three (15.20) | "Pass three: sharper examples, polished slides." | Ride to gate 3. On "sharper" (16.33) the confusing chart becomes three clear bars with +12%; on "polished" (17.63) the AI polishes with a rag: accent underline, sparkles, tag v4, meter 86 | Pops per bar, sparkle and ding on "polished", a chord on "slides" |
| 7. Payoff (19.31) | "Every version beats the last one." | Four cards fly out of the slide into a 2 x 2 grid, v1 to v4, each with its meter bar; v4 gets an accent frame on "beats" (20.23) | A pop per card, a chord on v4 |
| 8. The name (21.76) | "That's Iterative Refinement." | A wide shot of the whole rail, all three gates and the finished slide. Headline "Iterative Refinement" | Arrival on "Iterative" |
| 9. Benefit (23.82) | "Small, focused passes... until it's good enough." | Each gate lights on "small", "focused", "passes". On "until" the camera pushes in; on "good" (26.41) the "good enough" line drops onto the meter, which is already past it, and a check pops | Clinks, a whoosh, a glock note |
| 10. Catch (27.39) | "Just remember... decide what good enough means, or you'll polish forever." | On "decide" (28.33) the line turns solid accent. On "or" (30.20) the line vanishes: the AI polishes faster and faster, the tag runs v5 to v48, the meter creeps toward the top and never reaches it, the AI sweats and goes dizzy | Knock, ding, a buzz and riser under quickening ticks |
| 11. Sign-off (31.86) | "Go nail that meeting!" | The cart zips home on the rail. The presenter, confident with a clicker, presents v4 (tag v4 with a check); the audience pops in and cheers on "meeting" (32.58). Headline "Go nail that meeting!" | Whip, slam on "nail", a chord and sparkle on "meeting" |
| 12. End card (34.10) | None | Follow for more, `@BradAndPrad`, the AI cheering | One glockenspiel note |

## Accuracy

The meter is illustrative, not measured. It shows the two true points of the idea: each focused pass improves the same output with shrinking gains, and without a stop rule ("good enough") extra passes keep adding less and less without ending. The version counter in the catch is a dramatization of an unbounded loop.

## Credits

Narration: ElevenLabs, voice Charlie, model `eleven_v3`. Effects: the channel's library in `shared/sound_effects/`, plus clinks, ticks, knocks, dings, notes and a riser from earshot's code-made bank.
