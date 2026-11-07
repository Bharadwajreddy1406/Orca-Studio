# Storyboard: QR Codes

## Build

A HyperFrames composition; `orca render 012` runs all of it:

1. `build_qr.py` encodes the message `example.com` (a reserved documentation domain) as a real QR code, Version 2 (25 x 25), level H, byte mode, mask chosen by the standard penalty rules. It writes `source/qr.js` with each module's colour, role (finder, separator, timing, alignment, format, dark module, data, repair, remainder), codeword and zig-zag bit index, plus every damage region the picture shows. It stops the build if a damage region the video says "still scans" puts more than 14 codewords in error (V2-H corrects 14 of 44). `--verify` decodes the clean and damaged codes with OpenCV: clean, opening damage and splash all decode to `example.com`; the covered finder does not. It is not part of `orca render`, because `source/qr.js` is checked in.
2. `build_narration.py` voices `script.md` with ElevenLabs (Liam, `eleven_v3`, stability 0.0) in one cached request, then speeds the cached take to 1.08x (pitch kept), cuts the breath between lines to 0.12 s, and times every word with WhisperX.
3. `build_timeline.py` schedules every beat from the spoken words and writes `timeline.js`, `cues.json` and `index.html`.
4. `build_mix.py` mixes the effects under the take and masters to -14 LUFS.

`source/world.js` is the Three.js world on the shared `createStage`; `source/main.js` holds the headlines, chips, viewfinder and level bars.

## Look

Not part of the Brad & Prad AI-chaining series. Brand colours, fonts, paper, torn reveal and the Follow-for-more end card, but its own world: a café menu on the table with a bone QR sticker whose dark modules are extruded ink tiles. Stains are ink at low opacity, never a fourth colour. Accent marks one thing at a time: the finder patterns, the repair data, the rebuilt modules, the viewfinder. No cast; only the end-card figure.

## Beats

The Reel runs 38.1 s (end card from 36.34 s, 1.8 s). Times include the 0.55 s voice offset. Every line has its own visual beat, camera moves take 0.2 to 0.6 s.

| Beat | Narration | Picture | Sound |
| --- | --- | --- | --- |
| 1. Hook (0.6) | "Spilled coffee on the menu's QR code?" | Torn reveal over a camera already gliding in. The cup tips on "spilled", droplets fly, a coffee ring spreads over the code. Headline "Spilled coffee on the *QR code?*" | Swish (ends before the voice), knock, splat, pop |
| 2. Pain (2.91) | "Smudged. Scratched. Torn." | Three camera punch-ins, one per word: the stain smears; a scratch cuts across the tiles; the sticker's corner rips off along a stepped tear and flies away. A paper tag stamps each word, "*Torn.*" in accent | Slide, whip, tear |
| 3. Slow way (5.41) | "Ask for a new menu? Ugh." | Pull back: a service bell pops up beside the menu and is rung three times. On "Ugh" the camera sags and the bell slumps. "*Ugh.*" tag | Three bell dings, a sad note |
| 4. Twist (7.91) | "What if it just... scans anyway?" | Front view. The viewfinder brackets snap round the damaged code; the scan line makes a slow pass through the pause, a fast one back, and on "anyway" the link chip `example.com` pops with a check. "It scans *anyway?*" | Pop, sweep, whip, ding, sparkle |
| 5. Bits (11.05) | "Your link becomes bits. Black and white squares." | Rewind: the damage undoes itself and every module flips away. The chip pulses on "link" and turns into the real first bits of the stream on "bits": `0100` (byte mode) `00001011` (11 characters) `01100101` (e) `01111000` (x). "1 = dark square, 0 = light square". The 16 message codewords flip in, in the standard zig-zag order up the right-hand columns | Slide, pop, key, sparse ticks |
| 6. Finders (14.01) | "Three corner squares mark the spot, and which way's up." | The three finder patterns slam down one per word in accent; timing patterns, alignment pattern and format information follow. On "and" the code spins a quarter turn the wrong way, then snaps upright on "up" with an up arrow; the finders pulse | Three knocks, clinks, whip, thud |
| 7. Repair data (17.03) | "Then extra repair data, computed from your message." | Low angle. The 28 repair codewords rain into the rest of the grid in accent; on "computed" the message modules flash. On "message" the repair modules merge to ink. "Repair *data*", "16 message bytes + 28 repair bytes" | Riser, ticks, sparkle, a marimba note |
| 8. Splash (19.99) | "Now, splash! A chunk is gone." | A coffee drop falls on "now" and lands on "splash" (droplets, shake, stain). The chunk under it shudders, then its modules break away on "chunk" | Whip, slam, buzz, tear |
| 9. Rebuild (22.95) | "The scanner rebuilds the missing pieces." | Viewfinder; the scan line sweeps top to bottom and each missing module flips back, in accent, as the line passes its row. "*Rebuilt!*" | Sweep, riser, pops |
| 10. Payoff (25.13) | "Your link pops right back!" | The rebuilt modules settle into ink, the stain fades, and the `example.com` chip pops out with a check | Ding, chord |
| 11. Name (26.81) | "That's Reed-Solomon error correction." | Hero orbit of the whole code. "Reed–Solomon *error correction*" | Arrival |
| 12. Benefit (29.16) | "Up to thirty percent can go missing." | The code shrinks up; four bars drawn to scale rise: L ≈7%, M ≈15%, Q ≈25%, and H ≈30% in accent on "thirty". "of the codewords, at each level". The rebuilt chunk glows once more | Four ticks, a ding |
| 13. Catch (31.01) | "Hide too much, or a corner square? No scan." | A napkin slides over most of the code ("Hide *too much?*"), slides off, and a coaster drops onto the top-left finder ("Or a *corner?*"). The scan line passes, the brackets shudder and a cross pops: "No *scan.*" | Slide, slide, knock, sweep, buzz |
| 14. Sign-off (34.88) | "Happy scanning!" | The coaster flicks away, the code hops and spins a full turn, a ripple runs out from the centre, confetti, a check. "Happy *scanning!*" | Whip, ding, chord, sparkle |
| 15. End card (36.34) | None | Follow for more, `@BradAndPrad`, the cheering figure | Glockenspiel note |

## Accuracy

- The code is a real encoding. Its finder, separator, timing and alignment patterns, dark module and format information sit where the standard puts them for Version 2, and the data and repair modules appear in the real zig-zag placement order. The bits shown on "bits" are the real start of the stream.
- "Computed from your message", never a copy: the 28 repair codewords are the Reed–Solomon remainder of the 16 message codewords; the caption gives both counts.
- The opening damage puts 10 codewords in error (the stain darkens light modules, the scratch and tear lighten dark ones), and the splash touches 10; level H corrects up to 14 of 44. Neither touches a finder, timing, alignment or format module. OpenCV decodes both.
- "Up to thirty percent" is level H's figure. The bars give all four levels as approximate shares of codewords, and the headline uses ≈.
- The catch is shown as a covered finder pattern or damage beyond the limit; OpenCV fails to find the code with the finder covered.

## Credits

Narration: ElevenLabs, voice Liam, model `eleven_v3`. Effects: the channel's library in `shared/sound_effects/`, plus ticks, knocks, dings, notes, a riser and a glockenspiel from earshot's code-made bank.
