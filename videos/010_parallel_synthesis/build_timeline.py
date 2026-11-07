"""Schedule every picture and sound event from the words spoken in the ElevenLabs take.

Run from the repository root: uv run python videos/010_parallel_synthesis/build_timeline.py
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
# Where the three crime scenes and the convergence point stand in the world (x, z).
SCENES = {"db": (-8.0, -8.0), "ui": (0.0, -11.0), "net": (8.0, -8.0)}
ANSWER = (0.0, 5.2, 4.6)


def main() -> None:
    timing = json.loads((PROJECT / "timing.json").read_text(encoding="utf-8"))
    lines = timing["lines"]

    def word(line: int, spoken: str, nth: int = 0, after: float = 0.0) -> float:
        found = [w for w in lines[line]["words"] if w["word"] == spoken]
        if len(found) <= nth:
            raise ValueError(f"{spoken!r} was not heard in: {lines[line]['text']}")
        return round(found[nth]["start"] + after + VOICE_OFFSET, 3)

    start = [round(line["start"] + VOICE_OFFSET, 3) for line in lines]
    end = [round(line["end"] + VOICE_OFFSET, 3) for line in lines]

    # WhisperX heard "frontend" as "front end" and dropped it from line 4. The word follows
    # "the" straight away (energy in the take rises at 10.06 s), so time it from there.
    frontend = word(4, "the", after=0.07)

    end_card = round(end[12] + END_HOLD, 3)
    duration = round(end_card + END_CARD_SECONDS, 3)
    if duration > MAXIMUM_SECONDS:
        raise ValueError(f"The Reel runs {duration:.2f}s, over {MAXIMUM_SECONDS:.0f}s.")

    hits = [word(3, "database"), frontend, word(5, "network")]
    brings = [word(6, "brings"), word(6, "back"), word(6, "its")]
    beats = {
        "start": start,
        "end": end,
        "slow": word(0, "slow"),
        "so": word(0, "so"),
        "problem": word(1, "problem"),
        "hiding": word(1, "hiding"),
        "checks": word(2, "checks"),
        "three": word(2, "three"),
        "angles": word(2, "angles"),
        "once": word(2, "once"),
        "hits": hits,
        "brings": brings,
        "findings": word(6, "findings"),
        "dont": word(7, "don't"),
        "agree": word(7, "agree"),
        "compares": word(8, "compares"),
        "them": word(8, "them"),
        "finds": word(8, "finds"),
        "likely": word(8, "likely"),
        "cause": word(8, "cause"),
        "parallel": word(9, "parallel"),
        "synthesis": word(9, "synthesis"),
        "many": word(10, "many"),
        "views": word(10, "views"),
        "one": word(10, "one"),
        "stronger": word(10, "stronger"),
        "answer": word(10, "answer"),
        "remember": word(11, "remember"),
        "answer2": word(11, "answer"),
        "only": word(11, "only"),
        "good": word(11, "good"),
        "analyses": word(11, "analyses"),
        "behind": word(11, "behind"),
        "case": word(12, "case"),
        "closed": word(12, "closed"),
        "endCard": end_card,
        "duration": duration,
        "scenes": SCENES,
        "answerPoint": ANSWER,
        "bursts": [
            {"t": word(10, "answer"), "x": ANSWER[0], "y": ANSWER[1], "z": ANSWER[2], "count": 34},
        ],
        "shakes": [
            {"t": word(2, "once"), "amount": 0.05},
            {"t": word(10, "stronger"), "amount": 0.08},
            {"t": word(11, "only"), "amount": 0.07},
            {"t": word(12, "case"), "amount": 0.22},
        ],
    }

    cues = []

    def cue(effect: str, time: float, gain: float) -> None:
        cues.append({"effect": effect, "t": round(time, 3), "gain": gain})

    # Beat 1: the swish and the desk's pops all end before the voice starts at 0.61 s.
    cue("tear", 0.0, -14)
    for delay in (0.25, 0.31, 0.37):
        cue("pop", delay, -22)
    # The load timer ticks while the app crawls, and a sad note lands on "slow".
    clock = 1.0
    while clock < start[1] - 0.2:
        cue("tick", clock, -25)
        clock += 0.5
    cue("sad", beats["slow"] + 0.05, -21)

    # Beat 2: the detective pops in; the magnifier glints on "problem".
    cue("pop", start[1] + 0.05, -19)
    cue("sparkle", beats["problem"], -23)

    # Beat 3: whip to the map, the three scenes mark on "three", the team appears, all dash off.
    cue("whip", start[2] - 0.3, -17)
    for index in range(3):
        cue("pop", beats["three"] + index * 0.09, -20)
        cue("pop", beats["angles"] + index * 0.06, -22)
    for index in range(3):
        cue("slide", beats["once"] + index * 0.03, -23)

    # Beats 4 to 6: each scene lands on its word, then its findings card dings.
    for index, hit in enumerate(hits):
        cue("knock", hit, -15)
        cue("ding" + str(index), hit + 0.45, -20)
    for index in range(2):
        cue("whip", hits[index] + 0.6, -24)

    # Beat 7: back to headquarters, the three cards fly home.
    cue("whip", start[6] - 0.25, -19)
    for index, at in enumerate(brings):
        cue("slide", at, -22)
        cue("pop", at + 0.42, -20)

    # Beat 8: they disagree.
    cue("buzz", beats["dont"], -17)
    for index in range(3):
        cue("knock", beats["agree"] + index * 0.12, -21)

    # Beat 9: compare: a tick per bar, then the chord when the most likely cause lights.
    for index in range(3):
        cue("tick", beats["compares"] + 0.1 + index * 0.2, -18)
    cue("sparkle", beats["finds"], -23)
    for note in range(3):
        cue("chord" + str(note), beats["cause"], -18)

    # Beat 10: the name arrives.
    cue("arrive", beats["parallel"], -15)

    # Beat 11: the beams converge and the answer lands.
    cue("sweep", beats["one"] - 0.1, -19)
    cue("pop", beats["one"], -18)
    for note in range(3):
        cue("chord" + str(note), beats["answer"], -17)
    cue("sparkle", beats["answer"] + 0.05, -21)

    # Beat 12: the catch: a splat of bad data, the wrong answer, a sad note.
    cue("whip", start[11] - 0.2, -22)
    cue("step", beats["only"], -15)
    cue("buzz", beats["good"] + 0.15, -18)
    cue("sad", beats["analyses"] + 0.1, -21)

    # Beat 13: the stamp slams on "case", the chord on "closed".
    cue("whip", beats["case"] - 0.3, -20)
    cue("slam", beats["case"], -13)
    for note in range(3):
        cue("chord" + str(note), beats["closed"] + 0.05, -18)
    cue("sparkle", beats["closed"] + 0.1, -21)

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
