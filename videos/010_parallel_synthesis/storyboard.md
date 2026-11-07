# Storyboard: Parallel Synthesis

## Build

This is a HyperFrames composition, and `orca render 010` runs all of it:

1. `build_narration.py` voices `script.md` with ElevenLabs (Liam, `eleven_v3`, stability 0.0) in one cached request, tightens the pauses, and times every word with WhisperX (`timing.json`). The take is final; a rebuild spends no credits.
2. `build_timeline.py` schedules every beat from the spoken words. It writes `timeline.js`, `cues.json`, and `index.html` from `source/index.template.html`. WhisperX heard "frontend" as "front end" and dropped it, so that hit is timed from the word before it plus 0.07 s, where the take's energy rises.
3. `build_mix.py` mixes `shared/sound_effects/` and bank effects under the take, then masters to -14 LUFS.

The code builds on the shared Reel kit (`reel/`, copied from `shared/reel/`): `source/world.js` is the Three.js world on `createStage`, and `source/main.js` is the choreography, the app window, the findings cards and the evidence board.

## Spine

**The developer's desk**, then **the case map**: headquarters (a flat ink ring) with three footprint trails fanning out to three crime scenes, a **database** (three stacked disks), a **frontend** (a screen whose page blocks load in) and a **network** (two masts with a packet riding the cable).

What makes this different from 006: 006 merged independent results into a plan. Here the three analyses look at **one** problem and **disagree**. The heart of the video is the **evidence board**, where the findings are compared and weighed, not just stacked.

The example runs from start to finish:

| Analysis | Finding | Delay | Claim |
| --- | --- | --- | --- |
| Database | slow query | 2.4 s | It's the DB! |
| Frontend | big images | 0.3 s | It's the UI! |
| Network | API latency | 0.4 s | It's the net! |

The app's load timer stops at 3.1 s (2.4 + 0.3 + 0.4). After the fix it loads in 0.7 s (0.3 + 0.4).

## Cast

- **Developer:** plain figure; typing, slumped, tapping a foot, cheering.
- **The detective:** the series' antenna bot with a deerstalker and magnifier, then a rubber stamp.
- **Investigators:** antenna bots with a hard hat (database), a beret and glasses (frontend) and headphones (network). Each picks up a clipboard at its scene.

Emotion marks: a sigh puff, sweat drops, and "?" marks over the detective.

## Beats

The Reel runs 34.6 s (end card from 32.44 s). Times include the 0.55 s voice offset.

| Beat | Narration | Picture | Sound |
| --- | --- | --- | --- |
| 1. Hook (0.6) | "Your app is suddenly... so... slow." | Torn reveal. The desk pops up; the app window counts up its load time with a stalling bar. On "slow" (2.53) the developer slumps with a sigh and a sweat drop, then taps a foot | Swish and pops, all ending before the voice; ticks; a sad note on "slow" |
| 2. The question (4.36) | "Where's the problem hiding?" | The app fades and the headline "Where's the problem *hiding?*" rises. The detective pops in and peers through the magnifier on "problem" | A pop, a glint |
| 3. At once (6.10) | "AI checks three angles at once." | Whip to the case map. The three scene pads land on "three", the three investigators appear on "angles", and on "once" (7.68) all three run out at the same moment, laying footprint trails | Whip, pops, three swishes together |
| 4. Database (8.94) | "One looks at the database." | Close on the database. The disks pop up on the word and the top one, the slow query, pulses orange. The findings card pops: slow query, 2.4 s | Knock on the word, a ding for the card |
| 5. Frontend (10.62) | "One looks at the frontend." | Close on the screen; its page blocks load in one by one. Card: big images, 0.3 s | Knock, ding |
| 6. Network (12.14) | "One looks at the network." | Close on the masts; the packet shuttles along the cable. Card: API latency, 0.4 s | Knock, ding |
| 7. Findings (13.00) | "Each brings back its own findings." | Back to the map, then down to headquarters. The investigators run home while each card flies into the evidence board on "brings", "back" and "its" | Whip, a swish and a pop per card |
| 8. Disagreement (15.32) | "But they don't all agree." | Each card shows its own claim (It's the DB! / UI! / net!). On "don't" the cards shake against each other with orange clash marks; the investigators jab at their own cards, and "?" marks pop over the detective | Buzz on "don't", knocks |
| 9. Compare (17.20) | "So AI compares them... and finds the most likely cause." | On "compares" a bar grows under each card, in proportion to its delay. On "cause" (20.42) the database card and bar turn orange, the other two dim, and the board's header becomes "Most likely: slow query". The top disk glows again | A tick per bar, a three-note chord on "cause" |
| 10. The name (21.26) | "That's Parallel Synthesis." | The board clears; a wide shot of the whole case map under the headline "Parallel *Synthesis*" | Arrival on "Parallel" |
| 11. Synthesis (23.20) | "Many views, one stronger answer." | Three orange beams run from the three scenes into one point above headquarters. On "one" (24.32) an orange crystal pops there with the tag "slow database query"; it grows on "stronger" and bursts on "answer" | Sweep, pop, chord, sparkle |
| 12. The catch (26.04) | "Just remember... the answer is only as good as the analyses behind it." | Back at the board. On "only" an ink blot splats on the frontend card; on "good" its reading jumps to 9.0 s, its bar outgrows the database's, and the header flips to "✗ Most likely: the frontend". The frontend bot is shocked, then slumps; the detective is confused and shrugs | A splat, a buzz, a sad note |
| 13. Sign-off (30.52) | "Case closed!" | Whip back to the desk. The detective slams a stamp down and "CASE CLOSED" slams on screen on "Case"; the app now loads in 0.7 s with a check. The developer cheers on "closed" | Heavy slam, chord |
| 14. End card (32.44) | None | Follow for more, `@BradAndPrad`, the cheering figure in a deerstalker | One glockenspiel note |

## Accuracy

- All numbers are invented examples, labelled only as readings. The load times are consistent: 3.1 s is the sum of the three delays, and fixing the 2.4 s query leaves 0.7 s.
- The synthesis is shown as comparing the measured evidence, not counting votes: the three claims disagree, and the conclusion follows the largest measured delay. It is called the *most likely* cause, never a certainty.
- The bars are drawn to scale (height proportional to seconds), including the rescale in the catch, where the bad 9.0 s reading wrongly dominates.
- The catch shows garbage in, garbage out: one bad analysis is enough to tilt the conclusion. The final beat returns to the real readings.

## Credits

Narration: ElevenLabs, voice Liam, model `eleven_v3`. Effects: the channel's library in `shared/sound_effects/`, plus ticks, knocks, dings, notes and a glockenspiel from earshot's code-made bank.
