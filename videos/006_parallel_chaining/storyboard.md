# Storyboard: Parallel Chaining

## Build

This is a HyperFrames composition, and `orca render 006` runs all of it:

1. `build_narration.py` voices `script.md` with ElevenLabs (Liam, `eleven_v3`, stability 0.0) in one request, trims the pauses between lines to 0.28 s, and times every word with WhisperX (`timing.json`). The take is cached by a hash of text, voice and settings, so a rebuild spends no credits unless one of those changes. The key comes from `ELEVEN_LABS_API_KEY` in `.env`.
2. `build_timeline.py` schedules every beat from the spoken words. It writes `timeline.js`, `cues.json`, and `index.html` from `source/index.template.html`.
3. `build_mix.py` mixes `shared/sound_effects/` and a few bank effects under the take, then masters to -14 LUFS.

The code is in `source/`: `motion.js` and `cast.js` come from 005 and are extended here, `world.js` is the Three.js world, and `main.js` is the choreography and the timing bar.

Square brackets in `script.md` are v3 delivery tags (`[excited]`, `[sighs]`). They are performed, never spoken, and never shown.

## Spine

Two places in one Three.js world. **The beach in Goa** holds the traveler's story: excited, overwhelmed, bored waiting, delighted, and finally relaxed with the plan. **The workshop** holds the mechanism: one request on a hub, three chains fanning out to three stations, and three chains fanning back into one plan. It is a diamond that reads top to bottom in the portrait frame.

The explanation rests on **the timing bar**, a chart that morphs through the video:

- one after another, then regrouped into three rows that start together
- three bars growing at once, each finishing on its own
- in order against in parallel: the sum against the longest, with the time saved marked
- the catch: hotels waiting on the flight, so its bar starts where the flight's ends

## Cast

Brand stick figures, costumed in `cast.js`:

- **Traveler:** bucket hat and backpack, then sunglasses and the plan.
- **The AI:** the antenna figure from 005, carried over for the series.
- **Flights:** pilot cap and paper plane.
- **Hotels:** bellhop cap and suitcase.
- **Places:** safari hat and binoculars.

Emotion marks: a sigh puff, a sweat drop, a lightbulb, hearts and an hourglass.

## Beats

The Reel runs 38.6 s. Each line is one beat.

| Beat | Narration | Picture | Sound |
| --- | --- | --- | --- |
| 1. Hook | "Planning a trip to Goa? Ugh... where do you even start?" | Torn reveal. The beach pops up. The traveler cheers, then slumps with a sigh puff and a sweat drop | Swish ending before the voice, pops, a sad note on "start" |
| 2. The pain | "Flights. Hotels. Places to visit." | Three job cards land on their words. The traveler is confused, then shocked | A pop per card |
| 3. The slow way | "One by one? That takes forever." | The AI pops in and takes the cards. The timing bar fills one block after another while the traveler taps a foot | Clock ticks, a knock per block |
| 4. The twist | "What if AI did all three... at the same time?" | On "same", the blocks regroup into three rows starting together, the finish line jumps back, and the AI's lightbulb goes on | The idea sound |
| 5. Behind the scenes | "Behind the scenes, it splits into three prompts." | The camera rises into the workshop. Three chains forge out of the hub at once | Sweep, clinks together |
| 6–8. Three at once | "One finds flights." / "One compares hotels." / "One picks places to visit." | A close-up on each station while all three bars keep growing. Each card fills as it is described | A whip per station |
| 9. Nobody waits | "None of them waits." | The wide shot: rings filling at different speeds, each task finishing on its own | A chime per finish |
| 10. Together | "Then the results come together... into one travel plan!" | Results ride the fan-in chains into the merge, and the plan card assembles on "plan" | Clinks, a three-note chord on "plan" |
| 11. The name | "That's Parallel Chaining." | The full diamond, with pulses through the chains | Arrival on "parallel" |
| 12. Benefit | "All at once, saving you time." | The timing bar: in order against in parallel, with the time saved marked on "saving" | Sparkle on "saving" |
| 13. The catch | "Just remember... it only works when tasks don't depend on each other." | A hot link joins flights to hotels. The bellhop waits with an hourglass, and the bar shows hotels starting late | A sad note, the clock, chimes |
| 14. Sign-off | "Happy travels!" | Back on the beach: sunglasses, the plan held high, hearts | Whip, sparkle |
| 15. End card | None | Follow for more, `@BradAndPrad`, the traveler cheering | One glockenspiel note |

## Accuracy

The bar lengths are fixed in `build_timeline.py`, and the parallel run is done when its longest task is. In order, the total is their sum. Flight times, hotels and the budget are invented examples. Baga Beach, Fort Aguada and Dudhsagar Falls are real places in Goa.

## Credits

Narration: ElevenLabs, voice Liam, model `eleven_v3`. Effects: the channel's library in `shared/sound_effects/`, plus ticks, clinks, chimes and notes from earshot's code-made bank.
