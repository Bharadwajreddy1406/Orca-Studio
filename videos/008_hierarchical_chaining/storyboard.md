# Storyboard: Hierarchical Chaining

## Build

This is a HyperFrames composition, and `orca render 008` runs all of it:

1. `build_narration.py` voices `script.md` with ElevenLabs (Liam, `eleven_v3`, stability 0.0) in one cached request, tightens the pauses, and times every word with WhisperX (`timing.json`). Through `shared/reel_narration.py`.
2. `build_timeline.py` schedules every beat from the spoken words. It writes `timeline.js`, `cues.json`, and `index.html` from `source/index.template.html`.
3. `build_mix.py` mixes `shared/sound_effects/` and bank effects under the take, then masters to -14 LUFS. Through `shared/reel_mix.py`.

The composition builds on the shared Reel kit in `reel/` (`stage.js`, `cast.js`, `motion.js`, `endcard.js`). `source/world.js` is the Three.js world, `source/main.js` the choreography, and `source/costumes.js` adds three props the kit lacks (chef's hat, basket, party hat) without touching `reel/cast.js`.

## Spine

**One task tree, built on the floor.** A giant gift box labelled "Birthday party" is the root (Level 1). Its lid blows off and three plinths, Venue, Food and Decorations, land on their words, each chained to the box (Level 2). Food splits again into three smaller plinths, Menu, Guests and Shopping (Level 3), each with a worker bot and an output card. The tree is laid out in depth, so the camera reads it top to bottom: root far, tiny tasks near.

| Level | Nodes | Output |
| --- | --- | --- |
| 1 | Birthday party | |
| 2 | Venue, Food, Decorations | |
| 3 (under Food) | Menu, Guests, Shopping | Cake, Pizza / 24 kids / Candles, Plates |

## Cast

- **Planner:** holds a plan card. Thrilled, then sighing and sweating, rescued, and finally buried under the over-split, dizzy.
- **The AI:** the antenna figure from 005 to 007. It has the idea and splits the work.
- **Three worker bots:** a chef (Menu), a counter with a clipboard (Guests), a shopper with a basket (Shopping).

Emotion marks: a sigh puff, sweat drops, a lightbulb, dizzy spirals, party hats.

## Beats

The Reel runs 37.2 s. Times are the spoken word plus the 0.55 s voice offset.

| Beat | Narration | Picture | Sound |
| --- | --- | --- | --- |
| 1. Hook | "Planning a whole birthday party? Where do you even begin?" | Torn reveal. The gift box pops up; the planner cheers with the plan (0.6 s), then slumps with a sigh and a sweat drop. "Where do you even **begin?**" (2.7 s) | Swish ending before the voice, a pop, a sparkle on "party", a sad note on the sigh |
| 2. The pain | "That's one huge task." | On "huge" (5.0 s) the box swells by a third and quivers; the planner jumps back, shocked | Slam on "huge" |
| 3. The twist | "So AI splits it into three." | The AI pops in with a lightbulb on "AI" (7.0 s). On "splits" (7.4 s) the lid blows off in a burst and the camera rises over the tree | Idea, whip and pop |
| 4. Level 2 | "Venue. Food. Decorations." | Each plinth lands on its word (8.7, 9.6, 10.4 s) with its chain sliding out of the box and a flash | A pop and a rising ding per plinth, clinks |
| 5. Deeper | "But it doesn't stop there." | Food flashes on "stop" (12.3 s); the AI points up | Knock |
| 6. Food splits | "Food splits again." | The camera dives toward Food; it bursts on "splits" (13.7 s) and three chains run toward the viewer | Whip, swish, clinks |
| 7. Level 3 | "Pick a menu. Count the guests. Make a shopping list." | Menu, Guests and Shopping land on "menu", "guests", "shopping" (15.3, 16.5, 17.7 s), each with its worker and its card | A pop and a ding each |
| 8. The levels | "Big task, smaller tasks, tiny tasks." | Pull back to the whole tree. Badges 1, 2, 3 appear and each level glows on its word (18.8, 19.7, 21.0 s), the glow running down the chains. "Big → smaller → **tiny**" | A sweep, one marimba note per level |
| 9. The payoff | "Each tiny piece is easy to plan, and easy to check." | Back to the workers, who scribble; the cards hop on "plan" (24.1 s) and a tick lands on each card on "check" (25.6 s) | Key taps, three ticks, a sparkle |
| 10. The name | "That's Hierarchical Chaining." | The whole tree glows level by level. "Hierarchical **chaining**" | Arrival on "Hierarchical" |
| 11. The catch | "Just remember... split too far, and you're managing more than you're doing." | On "split" (29.4 s) every tiny task splits again, twice: 9 then 27 more pieces, 36 extra chains. On "managing" (31.0 s) the chains flash out of step (coordination traffic), the camera wobbles, the planner buckles holding his plan and goes dizzy, and a gauge shows Managing filling up while Doing barely moves | Riser, a cascade of pops and clinks, a buzz, quickening ticks |
| 12. Sign-off | "Let's party!" | On "party" (33.4 s) the extra pieces clear, confetti in ink and accent bursts from every node, balloons rise from the box, everyone cheers in party hats. "Let's **party!**" | Slam, a major chord, sparkle, pops |
| 13. End card | None | Follow for more, `@BradAndPrad`, the planner cheering in a party hat | One glockenspiel note |

## Accuracy

The tree is a real decomposition: each child is a part of its parent's job, and only Food is split further, as the narration says. The catch shows the real cost of over-decomposition: every extra node adds a hand-off to coordinate, so managing work grows while the useful work stays the same. The gauge is illustrative, not a measurement.

## Credits

Narration: ElevenLabs, voice Liam, model `eleven_v3`. Effects: the channel's library in `shared/sound_effects/`, plus clinks, ticks, keys, dings, marimba notes and a riser from earshot's code-made bank.
