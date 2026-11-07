"""Schedule every picture and sound event from the words spoken in the ElevenLabs take.

Run from the repository root: uv run python videos/008_hierarchical_chaining/build_timeline.py
Reads timing.json, writes timeline.js for the composition, cues.json for the mix, and
index.html from source/index.template.html.
"""

import json
from pathlib import Path

PROJECT = Path(__file__).parent

# Speech starts this late, so the opening swish has fully ended before the voice.
VOICE_OFFSET = 0.55
END_HOLD = 1.2
END_CARD_SECONDS = 2.2
MAXIMUM_SECONDS = 45.0
# Where the tree's nodes stand on the floor (x, z). Kept in step with LAYOUT in source/world.js.
ROOT = (0, -11)
LEVEL_TWO = [(-6, -1.5), (0, -1.5), (6, -1.5)]
LEVEL_THREE = [(-5, 8), (0, 8), (5, 8)]


def main() -> None:
    timing = json.loads((PROJECT / "timing.json").read_text(encoding="utf-8"))
    lines = timing["lines"]

    def word(line: int, spoken: str, nth: int = 0) -> float:
        found = [w for w in lines[line]["words"] if w["word"] == spoken]
        if len(found) <= nth:
            raise ValueError(f"{spoken!r} was not heard in: {lines[line]['text']}")
        return round(found[nth]["start"] + VOICE_OFFSET, 3)

    start = [round(line["start"] + VOICE_OFFSET, 3) for line in lines]
    end = [round(line["end"] + VOICE_OFFSET, 3) for line in lines]

    split_into_three = word(2, "splits")
    level_two = [word(3, "venue"), word(3, "food"), word(3, "decorations")]
    food_splits = word(5, "splits")
    level_three = [word(6, "menu"), word(6, "guests"), word(6, "shopping")]
    levels = [word(7, "big"), word(7, "smaller"), word(7, "tiny")]
    split_too_far = word(10, "split")
    party = word(11, "party")

    end_card = round(end[11] + END_HOLD, 3)
    duration = round(end_card + END_CARD_SECONDS, 3)
    if duration > MAXIMUM_SECONDS:
        raise ValueError(f"The Reel runs {duration:.2f}s, over {MAXIMUM_SECONDS:.0f}s.")

    beats = {
        "start": start,
        "end": end,
        "planning": word(0, "planning"),
        "partyWord": word(0, "party"),
        "where": word(0, "where"),
        "begin": word(0, "begin"),
        "huge": word(1, "huge"),
        "task": word(1, "task"),
        "ai": word(2, "ai"),
        "splits": split_into_three,
        "three": word(2, "three"),
        "levelTwo": level_two,
        "stop": word(4, "stop"),
        "foodAgain": start[5],
        "foodSplits": food_splits,
        "levelThree": level_three,
        "levels": levels,
        "pieces": start[8],
        "plan": word(8, "plan"),
        "check": word(8, "check"),
        "named": word(9, "hierarchical"),
        "chaining": word(9, "chaining"),
        "remember": start[10],
        "tooFar": split_too_far,
        "far": word(10, "far"),
        "managing": word(10, "managing"),
        "more": word(10, "more"),
        "doing": word(10, "doing"),
        "letsParty": start[11],
        "party": party,
        "endCard": end_card,
        "duration": duration,
        # Ink chips: the box bursts open, then Food bursts apart.
        "bursts": [
            {"t": split_into_three, "x": ROOT[0], "y": 4.4, "z": ROOT[1], "count": 34},
            {"t": food_splits, "x": LEVEL_TWO[1][0], "y": 1.4, "z": LEVEL_TWO[1][1], "count": 24},
        ],
        "shakes": [
            {"t": word(1, "huge"), "amount": 0.08},
            {"t": split_into_three, "amount": 0.14},
            *({"t": landed, "amount": 0.035} for landed in level_two),
            {"t": food_splits, "amount": 0.08},
            {"t": split_too_far, "amount": 0.06},
            {"t": party, "amount": 0.2},
        ],
    }

    cues = []

    def cue(effect: str, time: float, gain: float) -> None:
        cues.append({"effect": effect, "t": round(time, 3), "gain": gain})

    # Beat 1: the swish ends before the voice; the gift box pops up; a sad note on the sigh.
    cue("tear", 0.05, -14)
    cue("pop", 0.42, -20)
    cue("sparkle", beats["partyWord"], -23)
    cue("sad", beats["where"] - 0.3, -21)
    # Beat 2: the box swells on "huge".
    cue("slam", beats["huge"], -17)
    # Beat 3: the AI's idea, then the box bursts open.
    cue("idea", beats["ai"], -16)
    cue("whip", split_into_three, -18)
    cue("pop", split_into_three + 0.02, -17)
    # Beat 4: each plinth lands on its word, its chain clinking out of the box.
    for index, landed in enumerate(level_two):
        cue("pop", landed, -18)
        cue("ding" + str(index), landed + 0.02, -21)
        for link in range(5):
            cue("clink", landed - 0.3 + link * 0.05, -27)
    # Beat 5 and 6: the camera dives to Food, which splits.
    cue("knock", beats["stop"], -17)
    cue("whip", beats["foodAgain"] + 0.05, -19)
    cue("slide", food_splits, -20)
    for link in range(8):
        cue("clink", food_splits + 0.05 + link * 0.06, -27)
    # Beat 7: the three sub-tasks, each with its worker.
    for index, landed in enumerate(level_three):
        cue("pop", landed, -18)
        cue("ding" + str(index), landed + 0.02, -22)
    # Beat 8: the pull back, one knock per level.
    cue("sweep", levels[0] - 0.05, -21)
    for index, landed in enumerate(levels):
        cue("chord" + str(index), landed, -19)
    # Beat 9: planning scribbles, then one tick per tiny task.
    for stroke in range(6):
        cue("key", beats["plan"] - 0.25 + stroke * 0.09, -25)
    for index in range(3):
        cue("tick", beats["check"] + index * 0.12, -17)
    cue("sparkle", beats["check"] + 0.3, -22)
    # Beat 10: the name.
    cue("arrive", beats["named"], -15)
    # Beat 11: the tree over-splits: a cascade of pops, a rising sweep, the overhead buzz.
    cue("riser", split_too_far, -20)
    for burst in range(9):
        cue("pop", split_too_far + burst * 0.05, -25)
    for burst in range(9):
        cue("clink", beats["far"] + burst * 0.04, -28)
    cue("buzz", beats["managing"], -17)
    clock, gap = beats["managing"] + 0.2, 0.26
    while clock < beats["doing"] + 0.3:
        cue("tick", clock, -24)
        clock += gap
        gap = max(0.08, gap * 0.85)
    # Beat 12: the party.
    cue("slam", party, -15)
    for note in range(3):
        cue("chord" + str(note), party + 0.04, -18)
    cue("sparkle", party + 0.1, -19)
    for popped in range(4):
        cue("pop", party + 0.15 + popped * 0.11, -22)

    cue("end", end_card + 0.1, -13)
    cue("voice", VOICE_OFFSET, 0)

    (PROJECT / "timeline.js").write_text("window.REEL = " + json.dumps({"beats": beats}) + ";\n", encoding="utf-8")
    (PROJECT / "cues.json").write_text(
        json.dumps({"duration": duration, "take": timing["take"], "cues": cues}, indent=1), encoding="utf-8"
    )
    template = (PROJECT / "source" / "index.template.html").read_text(encoding="utf-8")
    (PROJECT / "index.html").write_text(
        template.replace("__DURATION__", str(duration))
        .replace("__END_START__", str(end_card))
        .replace("__SCENE_LENGTH__", str(round(end_card + 0.2, 3)))
        .replace("__END_LENGTH__", str(round(duration - end_card, 3))),
        encoding="utf-8",
    )
    print(f"duration {duration:.2f}s, {len(cues)} cues")


if __name__ == "__main__":
    main()
