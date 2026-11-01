# Storyboard: Sequential Chaining

## Build

This is a HyperFrames composition, and `orca render 005` runs all of it:

1. `build_narration.py` times every word of the user's recording with WhisperX (`timing.json`). No voice is synthesized for this project.
2. `build_timeline.py` schedules every beat from the spoken words. It writes `timeline.js`, `cues.json`, and `index.html` from `source/index.template.html`.
3. `build_mix.py` mixes `shared/sound_effects/` and a few bank effects under the recording, then masters to -14 LUFS.

The code is in `source/`: `motion.js` (easing and keyframes), `cast.js` (costumed figures), `world.js` (the Three.js world), `main.js` (the choreography).

The recording and SRT are in `assets/audio/recording/`. `script.md` is the SRT's text. The recording plays unedited, shifted only so the opening swish ends before speech.

## Spine

One continuous Three.js world on the channel's paper, and one object tells the story: **a chain**. The massive prompt is four slabs stacked on a tiny AI. It shatters into four steps, the steps fly off and become four workstations, and every hand-off forges a chain between them. Each output card literally flies into the next prompt, becoming its input.

Stations run along the world's x axis. Close-ups look straight at one station and whip sideways to the next. Overviews orbit round to look along the line, so the chain climbs diagonally up the portrait frame. Feet stay above y = 1250.

## Cast

Stick figures from the brand kit, costumed in `cast.js`:

- **Owner:** flat cap, apron, takeaway cup.
- **The AI:** antenna and side bolts. It is also the first worker.
- **Step 1, the analyst:** deerstalker and magnifier.
- **Step 2, the planner:** glasses and clipboard.
- **Step 3, the writer:** beret and giant pencil.
- **Step 4, the inspector:** hard hat and rubber stamp.

## Beats

| Beat | Narration | Picture | Sound |
| --- | --- | --- | --- |
| 1. Hook | "Let's understand sequential chaining." | Torn reveal. Links snap together one by one along a diagonal, the last in accent, landing on "chaining". The AI points at them | Paper swish, ended before the voice; a clink per link |
| 2. The shop | "Imagine you're running a coffee shop and want AI to create an Instagram campaign for your new coffee." | Whip to the shop, which pops up piece by piece. Steam rises from the cup. A phone with an empty post slides in on "Instagram" | Whip, pops |
| 3. The massive prompt | "You could have given ChatGPT one massive prompt asking it to understand your audience, come up with ideas, write captions, and review everything." | Whip to the AI. A slab lands on each task, and the AI's knees buckle further each time | Whip, a heavier thud each time, low impact on the last |
| 4. Break it | "But what if you broke that task into smaller steps instead?" | On "broke", the stack shatters with flying chips, and the slabs regroup as a numbered staircase on "smaller" | Rising hit landing on "broke", a pop per step |
| 5. Step 1 | "First, ask AI to identify your target audience and the coffee's key selling points." | Slab flies to station 1. Prompt types in, the analyst sweeps a magnifier, and the output card fills in: audience on "audience", selling points on "selling" | Whip, typing, sparkle on the output |
| 6. Step 2 | "Take that output and pass it to the next prompt to create a content outline." | Whip. The card flies into prompt 2 as a chip, and a chain forges behind. The outline fills row by row, finishing on "outline" | Whip, clinks, typing, sparkle |
| 7. Step 3 | "Then use that outline to write an engaging caption." | The same hand-off. The writer scribbles; the caption writes itself word by word, finishing on "caption" | Same |
| 8. Step 4 | "Finally, send that caption for a quality check." | The same hand-off. The stamp slams PASSED on "check" | Same, then a stamp hit |
| 9. Notice | "Did you notice something?" | The camera sweeps up and round, revealing the whole chain climbing the frame | Long swish |
| 10. Builds | "Every step builds on the result of the previous one." | An accent pulse runs through plinths and links, 1 to 4 | Rising clinks |
| 11. The name | "This is called sequential chaining, breaking complex tasks into smaller prompts where the output of one becomes the input of the next." | Name lands. Zoom to one joint on "output": a card crosses the link, and its tag flips from OUTPUT to INPUT on "input" | Whoosh, soft pop on the flip |
| 12. Benefits | "It's easier to manage, debug, improve." | Three words land in a row, each on its cue. Manage: ticks on every step. Debug: a bug on step 2 gets squashed. Improve: step 3 rises with an arrow | A pop per word, squish on the bug |
| 13. The catch | "But be careful, a single mistake in an early step can affect the entire process." | Step 1 turns accent with an X on "mistake". From "affect", plinths topple like dominoes, links go accent and drop, and figures fall. The slam lands on "entire" | Malfunction, a thud per fall, heavy slam |
| 14. Restored | "That is sequential chaining for you." | Everything springs back upright. The phone returns with the finished post, and a heart pops on "you" | Respawn, rising clinks, sparkle |
| 15. Tease | "In the next reel, we'll see about parallel chaining." | Phone leaves. Steps 2, 3 and 4 slide side by side and the chains rewire to fan out from step 1, landing on "parallel" | Sweep landing on "parallel" |
| 16. End card | None | Follow for more, `@BradAndPrad`, logo slot, cheering figure | One glockenspiel note |

## Accuracy

Each prompt shown includes the previous step's output as a chip, which is what sequential chaining means. The audience, outline and caption on the cards are invented examples for this imaginary coffee, not data. The final beat previews fan-out only; the narration names parallel chaining without defining it.

## Credits

Effects come from the channel's library in `shared/sound_effects/`, plus typing, clink and end-note sounds from earshot's code-made bank, which the library doesn't cover. Narration is the user's own recording.
