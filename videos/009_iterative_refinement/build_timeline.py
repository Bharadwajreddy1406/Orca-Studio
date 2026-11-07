"""Schedule every picture and sound event from the words spoken in the ElevenLabs take.

Run from the repository root: uv run python videos/009_iterative_refinement/build_timeline.py
Reads timing.json, writes timeline.js for the composition, cues.json for the mix, and
index.html from source/index.template.html.

WhisperX heard "Pass one/two/three" as digits and "improved" as "improve", so those words are
not in timing.json; beats use the line starts and the neighbouring words instead.
"""

import json
from pathlib import Path

PROJECT = Path(__file__).parent

# Speech starts this late, so the opening swish has fully ended before the voice.
VOICE_OFFSET = 0.55
END_HOLD = 1.2
END_CARD_SECONDS = 2.2
MAXIMUM_SECONDS = 45.0
# The three refinement gates along the rail, and how high the slide rides on its cart.
GATES = (11.0, 21.0, 31.0)
BOARD_Y = 6.5


def main() -> None:
    timing = json.loads((PROJECT / "timing.json").read_text(encoding="utf-8"))
    lines = timing["lines"]

    def word(line: int, spoken: str, nth: int = 0) -> float:
        found = [w for w in lines[line]["words"] if w["word"] == spoken]
        if len(found) <= nth:
            raise ValueError(f"{spoken!r} was not heard in: {lines[line]['text']}")
        return round(found[nth]["start"] + VOICE_OFFSET, 3)

    start = [round(line["words"][0]["start"] + VOICE_OFFSET, 3) for line in lines]
    end = [round(line["words"][-1]["end"] + VOICE_OFFSET, 3) for line in lines]

    # The slide's cart: it leaves on "Pass ...", and arrives under each gate before the action word.
    passes = [start[3], start[4], start[5]]
    cart_keys = []
    for gate, leaves in zip(GATES, passes):
        cart_keys.append({"t": round(leaves + 0.04, 3), "d": 0.78, "to": gate})
    go = word(10, "go")
    cart_keys.append({"t": round(go - 0.32, 3), "d": 0.5, "to": 0.0})

    end_card = round(end[10] + END_HOLD, 3)
    duration = round(end_card + END_CARD_SECONDS, 3)
    if duration > MAXIMUM_SECONDS:
        raise ValueError(f"The Reel runs {duration:.2f}s, over {MAXIMUM_SECONDS:.0f}s.")

    beats = {
        "start": start,
        "end": end,
        "gates": list(GATES),
        "boardY": BOARD_Y,
        "tomorrow": word(0, "tomorrow"),
        "slides0": word(0, "slides"),
        "meh": word(0, "meh"),
        "startOver": start[1],
        "noWay": word(1, "no"),
        "whatIf": start[2],
        "onePass": word(2, "one"),
        "passWord": word(2, "pass"),
        "passes": passes,
        "fix": word(3, "fix"),
        "structure": word(3, "structure"),
        "simplify": word(4, "simplify"),
        "words": word(4, "words"),
        "sharper": word(5, "sharper"),
        "examples": word(5, "examples"),
        "polished": word(5, "polished"),
        "slides": word(5, "slides"),
        "every": word(6, "every"),
        "version": word(6, "version"),
        "beatsWord": word(6, "beats"),
        "last": word(6, "last"),
        "named": start[7],
        "iterative": word(7, "iterative"),
        "small": word(8, "small"),
        "focused": word(8, "focused"),
        "passesWord": word(8, "passes"),
        "until": word(8, "until"),
        "goodEnough": word(8, "good"),
        "remember": start[9],
        "decide": word(9, "decide"),
        "means": word(9, "means"),
        "orWord": word(9, "or"),
        "polish": word(9, "polish"),
        "forever": word(9, "forever"),
        "go": go,
        "nail": word(10, "nail"),
        "meeting": word(10, "meeting"),
        "cartKeys": cart_keys,
        "endCard": end_card,
        "duration": duration,
    }
    beats["bursts"] = [
        {"t": beats["fix"] + 0.1, "x": GATES[0], "y": 4.4, "z": 0.6, "count": 22},
        {"t": beats["simplify"] + 0.1, "x": GATES[1], "y": 4.4, "z": 0.6, "count": 22},
        {"t": beats["polished"] + 0.05, "x": GATES[2], "y": 4.4, "z": 0.6, "count": 34},
        {"t": beats["meeting"], "x": 3.4, "y": 0.6, "z": 1.4, "count": 36},
    ]
    beats["shakes"] = [
        {"t": beats["noWay"], "amount": 0.08},
        {"t": beats["fix"] + 0.1, "amount": 0.05},
        {"t": beats["simplify"] + 0.1, "amount": 0.05},
        {"t": beats["polished"], "amount": 0.07},
        {"t": beats["meeting"], "amount": 0.08},
    ]

    cues = []

    def cue(effect: str, time: float, gain: float) -> None:
        cues.append({"effect": effect, "t": round(time, 3), "gain": gain})

    # Beat 1: the swish ends before the voice; the set pops up; a sad note on "meh".
    cue("tear", 0.05, -14)
    for delay in (0.28, 0.42, 0.56):
        cue("pop", delay, -22)
    cue("sad", beats["meh"] + 0.05, -20)
    cue("slam", beats["meh"] + 0.02, -24)

    # Beat 2: the slide crumples toward the bin, and the AI blocks it on "No way".
    cue("whip", beats["startOver"] + 0.35, -19)
    cue("knock", beats["noWay"], -14)
    cue("pop", beats["noWay"] + 0.02, -18)
    cue("slide", beats["noWay"] + 0.25, -23)

    # Beat 3: the idea, then the quality meter arrives on "pass".
    cue("idea", beats["whatIf"] + 0.05, -16)
    cue("pop", beats["passWord"], -19)

    # Beats 4 to 6: each pass rides the rail to its gate and changes the slide on the action word.
    for keys in cart_keys[:3]:
        cue("whip", keys["t"] + 0.3, -20)
        cue("clink", keys["t"] + keys["d"] - 0.05, -24)
    for snap in range(4):
        cue("step", beats["fix"] + 0.05 + snap * 0.07, -21)
    cue("ding0", beats["structure"], -19)
    cue("sweep", beats["simplify"] + 0.25, -22)
    for bullet in range(3):
        cue("pop", beats["simplify"] + 0.25 + bullet * 0.13, -20)
    cue("ding1", beats["words"], -19)
    for bar in range(3):
        cue("pop", beats["sharper"] + 0.05 + bar * 0.12, -20)
    cue("sparkle", beats["polished"], -17)
    cue("ding2", beats["polished"] + 0.05, -18)
    cue("chord0", beats["slides"], -20)
    cue("chord2", beats["slides"], -20)

    # Beat 7: the four versions line up, each one landing with a pop, the last one with a chord.
    for card, at in enumerate((beats["every"], beats["version"], beats["version"] + 0.3, beats["beatsWord"])):
        cue("pop", at, -19)
        if card == 3:
            for note in range(3):
                cue("chord" + str(note), at + 0.02, -19)

    # Beats 8 and 9: the name, then each gate lights on its word.
    cue("arrive", beats["iterative"], -15)
    for at in (beats["small"], beats["focused"], beats["passesWord"]):
        cue("clink", at, -20)
    cue("whip", beats["until"] - 0.1, -22)
    cue("end", beats["goodEnough"], -17)

    # Beat 10: the target line is set, then without it the polishing never ends.
    cue("knock", beats["decide"], -16)
    cue("ding0", beats["means"], -20)
    cue("buzz", beats["orWord"], -21)
    cue("riser", beats["orWord"], -20)
    clock, gap = beats["orWord"] + 0.1, 0.24
    while clock < go - 0.45:
        cue("tick", clock, -23)
        clock += gap
        gap = max(0.05, gap * 0.84)
    cue("sparkle", beats["forever"], -21)

    # Beat 11: the slide zips home and the audience cheers.
    cue("whip", go - 0.08, -16)
    cue("slam", beats["nail"], -20)
    for note in range(3):
        cue("chord" + str(note), beats["meeting"], -17)
    cue("sparkle", beats["meeting"] + 0.05, -19)

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
