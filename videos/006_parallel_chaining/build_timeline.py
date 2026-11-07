"""Schedule every picture and sound event from the words spoken in the ElevenLabs take.

Run from the repository root: uv run python videos/006_parallel_chaining/build_timeline.py
Reads timing.json, writes timeline.js for the composition and cues.json for the mix.
"""

import json
from pathlib import Path

PROJECT = Path(__file__).parent

# Speech starts this late, so the opening swish has fully ended before the voice.
VOICE_OFFSET = 0.55
END_HOLD = 1.4
END_CARD_SECONDS = 2.2
MAXIMUM_SECONDS = 45.0
# Each task's length on the timing bar, in pixels. The hotel search is the longest, so it
# decides when the parallel run is done: the total is the longest task, not their sum.
TASK_PIXELS = [190, 270, 230]
STATIONS = [(-8, -6), (0, -6), (8, -6)]


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

    fan_out = word(4, "scenes")
    work_start = round(fan_out + 0.45, 3)
    complete = start[9]
    rate = TASK_PIXELS[1] / (complete - work_start)
    done = [round(work_start + pixels / rate, 3) for pixels in TASK_PIXELS]
    # The counter-example replays the run with step 2 waiting on step 1.
    depend = word(12, "remember")
    replay_rate = TASK_PIXELS[0] / 0.9
    replay_done = [round(depend + TASK_PIXELS[0] / replay_rate, 3)]
    replay_done.append(round(replay_done[0] + TASK_PIXELS[1] / replay_rate, 3))
    replay_done.append(round(depend + TASK_PIXELS[2] / replay_rate, 3))

    end_card = round(end[13] + END_HOLD, 3)
    # The AI takes the jobs one by one across this line, until "same" regroups them.
    simultaneously = word(3, "same")
    sequence_from = start[2] + 0.15
    sequence_step = (simultaneously - 0.3 - sequence_from) / 3
    duration = round(end_card + END_CARD_SECONDS, 3)
    if duration > MAXIMUM_SECONDS:
        raise ValueError(f"The Reel runs {duration:.2f}s, over {MAXIMUM_SECONDS:.0f}s.")

    beats = {
        "start": start,
        "end": end,
        "goa": word(0, "goa"),
        "idea": word(0, "start"),
        "cards": start[1],
        "taskWords": [word(1, "flights"), word(1, "hotels"), word(1, "places")],
        "ai": start[2],
        "sequential": start[2],
        "seqWords": [round(sequence_from + step * sequence_step, 3) for step in range(3)],
        "simultaneously": simultaneously,
        "behind": start[4],
        "fanOut": fan_out,
        "workStart": work_start,
        "lane": [start[5], start[6], start[7]],
        "taskPixels": TASK_PIXELS,
        "done": done,
        "independent": start[8],
        "wait": word(8, "waits"),
        "complete": complete,
        "together": word(9, "together"),
        "planReady": word(9, "plan"),
        "named": word(10, "parallel"),
        "compare": start[11],
        "saving": word(11, "saving"),
        "remember": start[12],
        "depend": depend,
        "replayDone": replay_done,
        "again": start[13],
        "endCard": end_card,
        "duration": duration,
        "bursts": [
            {"t": done[i], "x": STATIONS[i][0], "y": 1.4, "z": STATIONS[i][1], "count": 16} for i in range(3)
        ] + [{"t": word(9, "plan"), "x": 0, "y": 1.8, "z": -20, "count": 30}],
        "shakes": [
            {"t": word(10, "parallel"), "amount": 0.06},
            {"t": word(9, "plan"), "amount": 0.05},
        ],
    }

    cues = []

    def cue(effect: str, time: float, gain: float) -> None:
        cues.append({"effect": effect, "t": round(time, 3), "gain": gain})

    # Beat 1: the swish ends before the voice, then the beach pops up, and a sad note on "idea".
    cue("tear", 0.05, -14)
    for delay in (0.25, 0.4, 0.6, 0.75):
        cue("pop", delay + 0.1, -22)
    cue("sad", beats["idea"] + 0.1, -22)

    # Beat 2: one card per task, each landing on its word.
    for landing in beats["taskWords"]:
        cue("step", landing, -16)

    # Beat 3: the AI arrives, and the cards fly into its hands.
    cue("sparkle", beats["ai"], -18)
    cue("slide", beats["ai"] + 0.45, -19)

    # Beat 4: a clock ticks while the tasks run one after another, then the idea lands.
    clock = beats["seqWords"][0]
    while clock < beats["simultaneously"] - 0.3:
        cue("tick", clock, -24)
        clock += 0.5
    for landing in beats["seqWords"][1:]:
        cue("knock", landing, -18)
    cue("idea", beats["simultaneously"], -15)
    cue("slide", beats["simultaneously"] + 0.1, -20)

    # Beat 5: the dive behind the scenes, and three chains forging at the same moment.
    cue("sweep", beats["behind"] + 0.35, -20)
    for link in range(6):
        cue("clink", fan_out + link * 0.05, -24)

    # Beats 6 to 8: a whip to each station; each task chimes when it finishes, on its own.
    for index in range(3):
        cue("whip", beats["lane"][index] - 0.05, -18)
    for index, finished in enumerate(done):
        cue("ding" + str(index), finished, -14)

    # Beat 10: results fly down the chains and land as one plan, with a three-note chord.
    for link in range(6):
        cue("clink", beats["together"] - 0.1 + link * 0.05, -24)
    cue("slide", beats["together"], -23)
    for note in range(3):
        cue("chord" + str(note), beats["planReady"], -22)
    cue("sparkle", beats["planReady"] + 0.05, -24)

    # Beat 11: the name lands.
    cue("arrive", beats["named"], -14)

    # Beat 12: the comparison, with the saved time marked on "saving".
    cue("whip", beats["compare"] + 0.05, -21)
    cue("sparkle", beats["saving"], -18)

    # Beat 13: the catch. Step 2 has to wait, and its clock ticks until step 1 is done.
    cue("sad", depend, -20)
    clock = depend + 0.25
    while clock < replay_done[0]:
        cue("tick", clock, -24)
        clock += 0.4
    cue("ding0", replay_done[0], -16)
    cue("ding2", replay_done[2], -17)
    cue("ding1", replay_done[1], -16)

    # Beat 14: back on the beach, happy, then the end note.
    cue("whip", beats["again"] - 0.05, -17)
    cue("sparkle", beats["again"] + 0.45, -16)
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
    print(f"duration {duration:.2f}s, {len(cues)} cues; tasks done at {done}")


if __name__ == "__main__":
    main()
