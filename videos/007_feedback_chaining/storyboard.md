# Storyboard: Feedback Chaining

## Build

This is a HyperFrames composition, and `orca render 007` runs all of it:

1. `build_narration.py` voices `script.md` with ElevenLabs (Liam, `eleven_v3`, stability 0.0) in one request, trims the pauses between lines to 0.28 s, and times every word with WhisperX (`timing.json`). The take is cached by a hash of text, voice and settings, so a rebuild spends no credits.
2. `build_timeline.py` schedules every beat from the spoken words, including the card's laps round the loop. It writes `timeline.js`, `cues.json`, and `index.html` from `source/index.template.html`.
3. `build_mix.py` mixes `shared/sound_effects/` and bank effects under the take, then masters to -14 LUFS.

`source/motion.js` and `source/cast.js` come from 006 and are extended here with headphones, goggles and a dizzy mark. `world.js` is the Three.js world, and `main.js` is the choreography and the console.

The script follows the house style in `AGENTS.md`: 81 words in 13 lines, written from the user's draft.

## Spine

**The developer's desk**, then **the loop**: an oval of chain with Write at the bottom and Test at the top. The code card rides up the right side to Test. When it fails, it turns into an orange error card and rides back down the left side, and the code is fixed at Write. The camera leans after the card, so the shot keeps moving.

**The console** at the top carries the example: `add(a, b)` should give 5 for `add(2, 3)`.

| Attempt | Code | Result |
| --- | --- | --- |
| 1 | `a - b` | -1, fail |
| 2 | `a * b` | 6, fail |
| 3 | `a + b` | 5, pass |

Each fix answers the previous error. A row of five pips marks the stopping limit.

## Cast

- **Developer:** headphones; frustrated, then hopeful.
- **The AI:** the antenna figure from 005 and 006. It writes and fixes.
- **Tester:** goggles and clipboard.

Emotion marks: a sigh puff, a sweat drop, a lightbulb, and dizzy spirals.

## Beats

The Reel runs 37.8 s. Each line is one beat.

| Beat | Narration | Picture | Sound |
| --- | --- | --- | --- |
| 1. Hook | "AI wrote your code... and it's broken. Again." | Torn reveal. The desk pops up; the console shows `a - b` with a bug crawling on it. The developer slumps with a sigh and a sweat drop | Swish ending before the voice, pops, a sad note on "broken" |
| 2. The pain | "Now you're stuck fixing it yourself." | Frantic typing, confused face | Fast keystrokes |
| 3. The twist | "But what if AI tested its own code?" | The AI pops in with a lightbulb; the developer cheers | The idea sound |
| 4. The test | "The test runs." | Whip to the loop as the chain forms. The code card rides up to Test | Whip, clinks, a swish |
| 5. Fail | "It fails, and sends back the error." | Test flashes orange with an X; the console shows -1. The error card rides back down | Error buzz, swish |
| 6. Fix | "AI reads that feedback... and fixes the code." | On "fixes", Write flashes and the code becomes `a * b` | Knock, sparkle |
| 7. Again | "Then it tests again." | The card rides up again | Swish |
| 8. Loop | "Fail. Fix. Test. Until it passes." | Each word is one step: fail with 6, fix to `a + b`, test, and a pass on "passes". The whole loop glows | Buzz, knock, a three-note chord |
| 9. Limit | "Or until it hits a stopping limit." | The five limit pips appear, three filled | A pop on "limit" |
| 10. The name | "That's Feedback Chaining." | The title, with the loop beneath it | Arrival on "Feedback" |
| 11. Learning | "Every attempt learns from the last one." | The console becomes a log of all three attempts | A pop per row |
| 12. The catch | "Just remember... without a stopping limit, it can loop forever." | The card accelerates round the loop and the camera spins with it. The attempt counter runs into the hundreds, the pips go orange, and both bots go dizzy | A rising sweep under quickening ticks |
| 13. Sign-off | "Know when to stop!" | A STOP sign slams down in the middle of the loop. Everything halts and the bots cheer | Heavy slam |
| 14. End card | None | Follow for more, `@BradAndPrad`, the developer cheering | One glockenspiel note |

## Accuracy

The three attempts are a real run: `add(2, 3)` returns -1, 6, then 5. In the runaway beat, the counter is a dramatization of an unbounded loop, not a measured count.

## Credits

Narration: ElevenLabs, voice Liam, model `eleven_v3`. Effects: the channel's library in `shared/sound_effects/`, plus keystrokes, ticks, clinks, notes and a riser from earshot's code-made bank.
