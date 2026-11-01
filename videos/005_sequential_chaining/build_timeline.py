"""Schedule every picture and sound event from the words spoken in the recording.

Run from the repository root: uv run python videos/005_sequential_chaining/build_timeline.py
Reads timing.json, writes timeline.js for the composition and cues.json for the mix.
"""

import json
from pathlib import Path

PROJECT = Path(__file__).parent

# Speech starts this late, so the opening swish has fully ended before the voice.
VOICE_OFFSET = 0.55
END_HOLD = 0.45
END_CARD_SECONDS = 2.6
MAXIMUM_SECONDS = 90.0
WHIP_LEAD = 0.3
YARD_X = -17
STATION_X = [0, 16, 32, 48]
STATION_Z = [3, -3, 3, -3]


def main() -> None:
    timing = json.loads((PROJECT / "timing.json").read_text(encoding="utf-8"))
    lines = timing["lines"]

    def word(line: int, spoken: str, nth: int = 0) -> float:
        """When a word is spoken, on the Reel's clock."""
        found = [w for w in lines[line]["words"] if w["word"] == spoken]
        if len(found) <= nth:
            raise ValueError(f"{spoken!r} was not heard in: {lines[line]['text']}")
        return round(found[nth]["start"] + VOICE_OFFSET, 3)

    start = [round(line["start"] + VOICE_OFFSET, 3) for line in lines]
    end = [round(line["end"] + VOICE_OFFSET, 3) for line in lines]

    slabs = [word(2, "understand"), word(2, "come"), word(2, "write"), word(2, "review")]
    broke = word(3, "broke")
    smaller = word(3, "smaller")
    whip = [start[4 + index] - WHIP_LEAD for index in range(4)]
    check = word(7, "check")
    # The pulse crosses the chain between "every" and "previous".
    pulse_step = (word(9, "previous") - start[9]) / 4
    pulse = [round(start[9] + index * pulse_step, 3) for index in range(4)]
    pulse_link = [round(value + pulse_step * 0.45, 3) for value in pulse[:3]]
    affect = word(12, "affect")
    entire = word(12, "entire")
    topple = [round(affect + (entire - affect) * index / 3, 3) for index in range(4)]
    restore = [round(start[13] + index * 0.09, 3) for index in range(4)]
    parallel = word(14, "parallel")
    parallel_move = round(max(start[14] + 0.05, parallel - 0.95), 3)
    manage, debug, improve = word(11, "manage"), word(11, "debug"), word(11, "improve")
    output_word, input_word = word(10, "output"), word(10, "input")
    junction = round(output_word - 1.05, 3)

    end_card = round(end[14] + END_HOLD, 3)
    duration = round(end_card + END_CARD_SECONDS, 3)
    if duration > MAXIMUM_SECONDS:
        raise ValueError(f"The Reel runs {duration:.2f}s, over {MAXIMUM_SECONDS:.0f}s.")

    beats = {
        "start": start,
        "end": end,
        "voiceOffset": VOICE_OFFSET,
        "heroStart": start[0] + 0.1,
        "chaining": word(0, "chaining"),
        "shop": start[1],
        "shopGone": start[2] + 0.5,
        "coffeeShop": word(1, "coffee"),
        "instagram": word(1, "instagram"),
        "newCoffee": word(1, "coffee", 1),
        "massive": start[2],
        "chatgpt": word(2, "chatgpt"),
        "massiveWord": word(2, "massive"),
        "slabs": slabs,
        "broke": broke,
        "smaller": smaller,
        "steps": word(3, "steps"),
        "whip": [round(value, 3) for value in whip],
        "slabFlight": [round(value - 0.08, 3) for value in whip],
        "artLand": [word(4, "identify"), start[5] + 0.5, start[6] + 0.4, start[7] + 0.36],
        "audience": word(4, "audience"),
        "selling": word(4, "selling"),
        "outline": word(5, "outline"),
        "caption": word(6, "caption"),
        "check": check,
        "overview": round(start[8] - 0.2, 3),
        "pulse": pulse,
        "pulseLink": pulse_link,
        "called": start[10],
        "junction": junction,
        "output": output_word,
        "input": input_word,
        "benefits": round(start[11] - 0.25, 3),
        "manage": manage,
        "debug": debug,
        "improve": improve,
        "careful": round(start[12] - 0.1, 3),
        "mistake": word(12, "mistake"),
        "affect": affect,
        "entire": entire,
        "topple": topple,
        "restore": restore,
        "you": word(13, "you"),
        "parallel": parallel,
        "parallelMove": parallel_move,
        "endCard": end_card,
        "duration": duration,
        "bursts": [
            {"t": broke, "x": YARD_X, "y": 3.5, "z": 1, "count": 70, "spread": 8, "tall": 6},
            {"t": check, "x": STATION_X[3] + 1.8, "y": 1.6, "z": STATION_Z[3], "count": 18, "spread": 3, "tall": 1},
            *[
                {"t": topple[i], "x": STATION_X[i] + 3, "y": 0.3, "z": STATION_Z[i], "count": 14, "spread": 4, "tall": 0.4}
                for i in range(4)
            ],
        ],
        "shakes": [
            {"t": slabs[0], "amount": 0.05},
            {"t": slabs[1], "amount": 0.07},
            {"t": slabs[2], "amount": 0.09},
            {"t": slabs[3], "amount": 0.14},
            {"t": broke, "amount": 0.24},
            {"t": check, "amount": 0.08},
            {"t": entire, "amount": 0.2},
        ],
    }

    cues = []

    def cue(effect: str, time: float, gain: float) -> None:
        cues.append({"effect": effect, "t": round(time, 3), "gain": gain})

    # Beat 1: the swish ends before the voice, then links clink together up to "chaining".
    cue("tear", 0.05, -14)
    hero_start = beats["heroStart"]
    for index in range(8):
        clink_at = hero_start + (beats["chaining"] - hero_start) / 8 * index + 0.12
        cue("clink", clink_at, -19 if index < 7 else -14)

    # Beat 2: the shop.
    cue("whip", start[1] - 0.05, -18)
    for index, delay in enumerate((0.0, 0.2, 0.42, 0.58, 0.7)):
        cue("pop", start[1] + delay, -21)
    cue("slide", beats["instagram"], -18)
    cue("sparkle", beats["instagram"] + 0.22, -24)

    # Beat 3: each slab lands heavier, and the last is a real impact.
    cue("whip", start[2] - 0.05, -18)
    for index, landing in enumerate(slabs[:3]):
        cue("thud", landing, -16 + index * 2)
    cue("impact", slabs[3], -15)

    # Beat 4: the rising hit peaks on "broke", then a pop per stair.
    cue("shatter", broke, -9)
    for index in range(4):
        cue("step", broke + 0.5 + index * 0.08, -18)

    # Beats 5 to 8: a whip, clinks forging the chain, typing, and the output arriving.
    lands = [beats["audience"], beats["outline"], beats["caption"]]
    for index in range(4):
        cue("whip", whip[index] + 0.25, -17)
        if index:
            for link in range(7):
                cue("clink", whip[index] + 0.1 + link * 0.055, -23)
            cue("pop", whip[index] + 0.52, -19)
        for stroke in range(9):
            cue("key", start[4 + index] + 0.08 + stroke * 0.095 + (0.018 if stroke % 2 else 0), -25)
    for landing in beats["artLand"]:
        cue("pop", landing, -20)
    for landing in lands:
        cue("sparkle", landing, -19)
    cue("sparkle", beats["selling"], -22)
    cue("stamp", check, -15)

    # Beats 9 and 10: the sweep, then a rising clink as the pulse crosses each step.
    cue("sweep", beats["overview"], -15)
    for index in range(4):
        cue("rising" + str(index), pulse[index], -17)

    # Beat 11: the name, then the crossing and the flip.
    cue("sparkle", word(10, "sequential"), -21)
    cue("whip", junction + 0.45, -18)
    cue("slide", output_word, -19)
    cue("step", input_word, -14)

    # Beat 12: the three benefits.
    cue("whip", beats["benefits"] + 0.25, -20)
    cue("step", manage, -16)
    cue("step", debug, -16)
    cue("squish", debug + 0.28, -15)
    cue("rising3", improve, -16)

    # Beat 13: the malfunction, the dominoes, and the slam on "entire".
    cue("malfunction", beats["mistake"], -13)
    for index in range(3):
        cue("thud", topple[index], -15 + index * 2)
    cue("slam", entire, -12)

    # Beat 14: everything springs back with a rising clink per step, then the heart.
    cue("respawn", start[13], -14)
    for index in range(4):
        cue("rising" + str(index), restore[index], -18)
    cue("sparkle", beats["you"], -16)

    # Beat 15: the sweep arrives on "parallel".
    cue("arrive", parallel, -15)

    # End card: one clean note after the voice has finished.
    cue("end", end_card + 0.1, -13)

    cue("voice", VOICE_OFFSET, 0)

    (PROJECT / "timeline.js").write_text(
        "window.REEL = " + json.dumps({"beats": beats}) + ";\n", encoding="utf-8"
    )
    (PROJECT / "cues.json").write_text(
        json.dumps({"duration": duration, "cues": cues}, indent=1), encoding="utf-8"
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
