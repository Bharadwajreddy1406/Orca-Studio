# Storyboard: Bubble Sort, One Tiny Rule

## Build

This video is a HyperFrames composition rather than a Manim scene. Run these from the repository root, in order:

1. `uv run python videos/003_bubble_sort/build_narration.py` makes Lewis's lines and word timings (`timing.json`).
2. `uv run python videos/003_bubble_sort/build_timeline.py` runs real bubble sort and writes `timeline.js`, `cues.json`, and `index.html`.
3. `<earshot venv>/Scripts/python.exe videos/003_bubble_sort/build_mix.py` writes the mastered `assets/audio/soundtrack.wav`.
4. From the project folder: `hyperframes render -o silent.mp4 -q delivery`.
5. Mux `silent.mp4` with the soundtrack, then ask the user to approve the edit. Run earshot only if they ask.

## Spine

One continuous Three.js shot on the Brad & Prad paper. The array is `5 3 8 1 4 10 2 7 9 6`, sorted for real with early exit: 6 passes, 39 comparisons, 18 swaps. Exactly 30.0 s, 60 fps.

States: unsorted blocks are ink, the compared pair is accent, and locked blocks turn the paper's bone color. A stick figure on a rail is the algorithm, walking above the pair it compares. Readable content stays inside the Instagram-safe box. Below y = 1250 there is only floor and shadow.

## Beats

Times come from the narration. Key events land on the spoken word.

| Beat | Narration | Picture | Sound |
| --- | --- | --- | --- |
| 1. Hook | "How do computers sort millions of numbers?" | Torn orange reveal, then a restless field of blocks | Whoosh, ending before the voice starts |
| 2. Name it | "Let's start simple: Bubble Sort." | Camera dives down as the crowd falls away, leaving ten | Soft swish |
| 3. Swap | "Compare neighbours. Left one bigger? Swap." | Pair lights up; swap lands on "Swap", blocks passing in depth | Pitched marimba note |
| 4. Keep | "If not, leave them." | `5 < 8 · keep`. Nothing moves, and nothing sounds | None |
| 5. Carry | "The biggest gets carried to the end, and locks." | Figure walks right; the 8 stops and the 10 takes over; locks on "locks" | Notes on swaps, wood knock on the lock |
| 6. Repeat | "Repeat on what's left." | Passes 2 to 5, each faster | Notes on swaps, knock per lock |
| 7. Sorted | "No swaps? It's sorted." | Silent pass, then the wave on "sorted" | Rising scale from the wave only |
| 8. Catch | "But there's one problem: it's terrible at huge datasets." then "A million numbers could take five hundred billion comparisons." | Camera pulls back; `10 numbers: 39 comparisons`, then `≈ 500 billion` lands on "billion" | Punch hit on "billion" |
| 9. Question | "Know a faster algorithm? Tell me in the comments!" | Complexity grid, figure thinking, and the comment line on "Tell" | None |
| 10. End card | None | Follow for more, `@BradAndPrad`, logo slot | One glockenspiel note |

The worst case is n(n-1)/2 = 499,999,500,000 comparisons for n = 1,000,000. Best O(n) needs the early exit shown in beat 7.

## Credits

No third-party recordings. All effects come from earshot's code-made bank.
