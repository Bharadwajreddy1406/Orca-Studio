"""Schedule every picture and sound event from the words spoken in the ElevenLabs take.

Run from the repository root: uv run python videos/007_feedback_chaining/build_timeline.py
Reads timing.json, writes timeline.js for the composition and cues.json for the mix.
"""

import json
import math
from pathlib import Path

PROJECT = Path(__file__).parent

# Speech starts this late, so the opening swish has fully ended before the voice.
VOICE_OFFSET = 0.55
END_HOLD = 1.2
END_CARD_SECONDS = 2.2
MAXIMUM_SECONDS = 45.0
# The loop's two plinths, where the card turns round.
WRITE = (0, 8.2)
TEST = (0, -8.2)
PI = math.pi


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

    fails = [word(4, "fails"), word(7, "fail")]
    fixes = [word(5, "fixes"), word(7, "fix")]
    passed = word(7, "passes")
    # The card's angle round the loop: up the right to Test (π), back down the left to Write.
    token_keys = [
        {"t": start[3], "d": fails[0] - 0.1 - start[3], "to": PI},
        {"t": word(4, "sends"), "d": word(5, "reads") - word(4, "sends"), "to": 2 * PI},
        {"t": start[6], "d": fails[1] - 0.05 - start[6], "to": 3 * PI},
        {"t": fails[1] + 0.08, "d": fixes[1] - fails[1] - 0.12, "to": 4 * PI},
        {"t": word(7, "test"), "d": passed - 0.05 - word(7, "test"), "to": 5 * PI},
    ]
    endless = word(11, "without")
    stop = round(start[12] + 0.05, 3)

    end_card = round(end[12] + END_HOLD, 3)
    duration = round(end_card + END_CARD_SECONDS, 3)
    if duration > MAXIMUM_SECONDS:
        raise ValueError(f"The Reel runs {duration:.2f}s, over {MAXIMUM_SECONDS:.0f}s.")

    beats = {
        "start": start,
        "end": end,
        "broken": word(0, "broken"),
        "stuck": word(1, "stuck"),
        "idea": start[2],
        "tested": word(2, "tested"),
        "loopForms": round(start[3] - 0.55, 3),
        "firstRun": start[3],
        "tokenKeys": [{**key, "t": round(key["t"], 3), "d": round(max(0.15, key["d"]), 3)} for key in token_keys],
        "fails": fails,
        "fixes": fixes,
        "pass": passed,
        "limit": start[8],
        "limitWord": word(8, "limit"),
        "named": word(9, "feedback"),
        "learns": start[10],
        "endless": endless,
        "forever": word(11, "forever"),
        "stop": stop,
        "endCard": end_card,
        "duration": duration,
        "bursts": [
            {"t": passed, "x": TEST[0], "y": 1.4, "z": TEST[1], "count": 30},
            {"t": stop + 0.1, "x": 0, "y": 0.4, "z": 0, "count": 36},
        ],
        "shakes": [
            {"t": fails[0], "amount": 0.05},
            {"t": fails[1], "amount": 0.05},
            {"t": passed, "amount": 0.06},
            {"t": stop + 0.1, "amount": 0.24},
        ],
    }

    cues = []

    def cue(effect: str, time: float, gain: float) -> None:
        cues.append({"effect": effect, "t": round(time, 3), "gain": gain})

    # Beat 1: the swish ends before the voice; the desk pops up; a sad note on "broken".
    cue("tear", 0.05, -14)
    for delay in (0.25, 0.4, 0.5):
        cue("pop", delay + 0.1, -22)
    cue("sad", beats["broken"] + 0.1, -21)

    # Beat 2: frantic typing while stuck fixing it alone.
    clock = beats["stuck"]
    while clock < end[1]:
        cue("key", clock, -24)
        clock += 0.11
    # Beat 3: the idea, then the whip into the loop as the chain forms.
    cue("idea", beats["tested"], -15)
    cue("whip", start[3] - 0.45, -18)
    for link in range(11):
        cue("clink", beats["loopForms"] + link * 0.04, -25)
        cue("clink", beats["loopForms"] + 0.35 + link * 0.04, -25)

    # Beats 4 to 8: each test, each failure buzz, each error sliding back, each fix.
    cue("slide", start[3] + 0.05, -21)
    cue("slide", start[6] + 0.05, -21)
    cue("slide", word(7, "test"), -21)
    for failed in fails:
        cue("buzz", failed, -16)
    cue("slide", word(4, "sends"), -22)
    cue("slide", fails[1] + 0.08, -22)
    for fixed in fixes:
        cue("knock", fixed, -16)
        cue("sparkle", fixed + 0.05, -24)
    for note in range(3):
        cue("chord" + str(note), passed, -18)
    cue("sparkle", passed + 0.05, -20)

    # Beat 9: the stopping limit, then the name.
    cue("step", beats["limitWord"], -17)
    cue("arrive", beats["named"], -15)

    # Beat 11: each attempt in the log arrives with a pop.
    for row in range(3):
        cue("pop", beats["learns"] + 0.1 + row * 0.3, -20)

    # Beat 12: the runaway loop: a rising sweep under quickening ticks, then the slam.
    cue("riser", endless, -19)
    clock, gap = endless, 0.32
    while clock < stop - 0.05:
        cue("tick", clock, -22)
        clock += gap
        gap = max(0.06, gap * 0.82)
    cue("slam", stop + 0.1, -13)

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
