# Copilot instructions: Orca Studio

`AGENTS.md` at the repository root is the full set of project instructions; read it before any video work. Copilot cannot import it, so the Reel script rules are repeated below. If the two ever disagree, `AGENTS.md` wins, and this copy should be updated to match.

## Reel scripts: the house style

Every Reel or Short script follows these rules, whether you write it from a topic or are handed a draft. A handed-in draft that breaks them is rewritten to fit before any voice is generated. Keep its meaning, its example and its key terms, and show the rewrite. `videos/006_parallel_chaining/script.md` is the reference.

**Length.** The finished Reel runs 30 to 40 seconds, end card included. That means 75 to 90 spoken words, at most 14 lines. Count the words before generating any voice. A take that runs long is cut in the script, never sped up.

**Shape.** The beats go in this order, each one line unless noted:

1. Hook: a relatable question or problem in under 10 words, with emotion ("Planning a trip to Goa? Ugh... where do you even start?").
2. The pain: the everyday mess, in fragments ("Flights. Hotels. Places to visit.").
3. The slow or obvious way, and why it hurts ("One by one? That takes forever.").
4. The twist: "What if..." pointing at the idea.
5. The mechanism: one very short line per moving part, never a list read out in one sentence.
6. The payoff: what the viewer gets.
7. The name: say the concept's name once, here, after the viewer has seen it work.
8. The benefit: one line.
9. The catch: one line on when it does not apply. This line keeps the video accurate.
10. Sign-off: two or three words with a smile ("Happy travels!").

**Lines.**

* One spoken line per paragraph, and one visual beat per line. The build scripts and storyboard rely on this.
* Each sentence is 3 to 10 words. Fragments are fine.
* Use one concrete, everyday example from start to finish (a trip, a coffee shop), not abstract terms.
* Cut openers and filler such as "Let's understand", "Here's what's happening", "In this video", "basically", "so". Start on the hook.
* Name the concept at most twice.
* No narration of what the picture already shows.
* Use second person ("you"), and use contractions.

**Emotion and pace (ElevenLabs `eleven_v3`).**

* Put delivery tags at the start of a line or phrase, at most about one every two lines. Use only tags the v3 docs name: `[excited]`, `[curious]`, `[sighs]`, `[whispers]`, `[sarcastic]`, `[laughs]`, `[mischievously]`. An unknown tag may be read aloud.
* Use `...` for a beat of suspense, and a spoken interjection ("Ugh", "Wait") for feeling.
* Use stability `0.0` (Creative) for expressive Reels.
* Tags and stage directions never appear on screen.
* The build trims the pauses between lines to about 0.3 s, so a line break is a short breath, not a pause. Use `...` for a real pause.

**Credits.** ElevenLabs credits are limited. Finish and check the script before the one paid request, voice the whole script in a single request, and cache the take by a hash of text, voice and settings, as `videos/006_parallel_chaining/build_narration.py` does. A free plan cannot use Voice Library voices through the API. Check the voice with a free `GET /v1/voices/{id}` first. Never print, log or commit the API key; it lives in `.env`.
