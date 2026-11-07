# Storyboard: Routing

## Build

This is a HyperFrames composition, and `orca render 011` runs all of it:

1. `build_narration.py` voices `script.md` with ElevenLabs (Charlie, `eleven_v3`, stability 0.0) in one request, tightens the pauses, and times every word with WhisperX (`timing.json`). The take is cached, so a rebuild spends no credits.
2. `build_timeline.py` schedules every beat from the spoken words, including each request card's journey as a list of `[node, time, ease]` stops. It writes `timeline.js`, `cues.json`, and `index.html` from `source/index.template.html`.
3. `build_mix.py` mixes `shared/sound_effects/` and bank effects under the take, then masters to -14 LUFS (`shared/reel_mix.py`).

The composition builds on the shared Reel kit in `reel/` (stage, cast, motion, end card). `source/world.js` is the Three.js world, `source/main.js` the choreography, and `source/costumes.js` adds this Reel's props (headset, phone, nurse cap, visor, laugh, ring and scribble marks) and poses without editing the kit.

## Spine

**The hospital help desk**: a bone desk with an orange cross, where the AI router stands in a headset. Requests are cards: a **calendar card** (appointment) and a **receipt card** (billing).

**The fork**: an inlet chain road runs from the callers to the desk. Behind it, a railway-style **switch** (an ink arrow with an orange tip) turns to face one of two chain roads: left to the **Scheduling** desk (wall calendar, nurse bot) and right to the **Billing** desk (calculator and ledgers, clerk bot). Each request takes exactly one road. The road glows as a card rides it.

## Cast

- **The AI router:** the antenna figure from earlier Reels, with a headset. Reads cards through a magnifier and works the switch.
- **Caller A:** on the phone, wants an appointment.
- **Caller B:** flat cap, on the phone, has a billing question; calls again for the catch.
- **Nurse bot:** antenna, nurse cap, stamp. **Clerk bot:** antenna, visor, stamp.
- **Caller C:** bucket hat, the next caller at the end.

## Beats

The Reel runs 36.5 s (voice starts at 0.55 s; end card at 34.29 s). Times are absolute.

| Beat | Narration | Picture | Sound |
| --- | --- | --- | --- |
| 1. Hook (0.6) | "Calling a hospital's AI assistant?" | Torn reveal onto the help desk. The AI rings (sound waves), then presents on "AI" (1.83). Headline "Calling a hospital's **AI** assistant?" | Tear before the voice, two phone dings, pop |
| 2. Two callers (3.1) | "You want an appointment. Someone else has a billing question." | Camera pulls back. Caller A pops on "you"; the calendar card pops above them on "appointment" (3.64), sweat drop. Caller B on "someone"; the receipt card on "billing" (5.93) | Pops, a ding per card |
| 3. One slot (7.25) | "Same process for both? [laughs] Of course not!" | Headline "Same process for **both?**". Both cards ride the inlet and jam into the one slot on "both" (8.33): the desk shudders, everyone shocked. The AI laughs, holding its sides. On "not" (9.95) a red ✗ pops, the cards spring out and chips fly | Slide, two knocks, error buzz |
| 4. Classify (10.7) | "First, AI figures out what each caller needs." | On "first" the slot disappears; the switch, the two chain roads and both desks with signposts pop up (overview). On "figures" the camera moves in; the AI scans with a magnifier. Tags pop: "Appointment" on "out", "Billing" on "caller" | Whip, clinks, pops |
| 5. Scheduling (14.3) | "Appointments go to scheduling." | Switch flips left on "appointments"; the calendar card rides the left road, which glows under it, and lands on "scheduling" (15.14). The nurse stamps it, a check badge pops, caller A cheers with hearts | Tick, slide, stamp, sparkle |
| 6. Billing (16.1) | "Billing questions go to billing." | Switch flips right; the receipt card rides the right road and lands on the second "billing" (17.54). Clerk stamps, caller B cheers | Same |
| 7. Every request (18.4) | "Every request takes the right road." | A flurry of six mixed cards: each one rides in, the switch clicks to its road, it lands and is filed. Both roads flash on "road" (20.1) | A tick per flip, a clink per landing |
| 8. The name (20.9) | "That's Routing." | Headline "That's **Routing**"; the help desk glows | Arrival on "routing" |
| 9. Benefit (22.1) | "Right request, right workflow, right specialist." | Three rows with checks, one per word. A fresh calendar card is tagged and pulses on "request", rides the glowing left road on "workflow", and is stamped by the nurse on "specialist" | Three rising dings |
| 10. The catch (26.0) | "Just remember... if AI misreads the request, it sends it down the wrong path." | Medium shot. Caller B sends a receipt card; the AI scans it and tags it "Appointment" on "misreads". The switch flips left on "sends"; the card rides to Scheduling and lands on "wrong" (30.89); its tag turns orange, a ✗ badge pops on "path", the left road flickers, the nurse is puzzled and shrugs, caller B is fed up (scribble). Headline "Wrong **path!**" | Buzz, slide, sad note on "path" |
| 11. Sign-off (32.1) | "Next caller, please!" | Caller C steps up; the AI waves them in, and on "please" everyone cheers. Headline "Next caller, **please!**" | Pop, a three-note chord |
| 12. End card (34.3) | None | Follow for more, `@BradAndPrad`, the cheering closer in headphones | One glockenspiel note |

## Accuracy

Routing classifies each request once and sends it down exactly one path; it never splits a request across workflows (that would be parallelization). The catch shows the real failure mode: routing is only as good as the classification, so a misread sends the request to the wrong specialist.
