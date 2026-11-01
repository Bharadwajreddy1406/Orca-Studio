"""Run real bubble sort and schedule every picture and sound event from the narration.

Run from the repository root: uv run python videos/003_bubble_sort/build_timeline.py
Reads timing.json, writes timeline.js for the composition and cues.json for the mix.
"""

import json
import re
from pathlib import Path

PROJECT = Path(__file__).parent
START_VALUES = [5, 3, 8, 1, 4, 10, 2, 7, 9, 6]
# C major pentatonic: any two values sound consonant together.
VALUE_NOTES = ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5", "G5", "A5"]

IDLE, ACTIVE, LOCKED = 0, 1, 2
FAST_PASS_STEP_SECONDS = {2: 0.13, 3: 0.095, 4: 0.075, 5: 0.065}
LOCK_SECONDS = 0.14
END_CARD_SECONDS = 2.2
MAXIMUM_SECONDS = 30.0
QUESTION_HOLD = 0.6
MINIMUM_QUESTION_HOLD = 0.25
INTRO_WHOOSH_START = 0.05
INTRO_WHOOSH_SECONDS = 0.6


class Schedule:
    """The sort's state, plus the keyframes that replay it as a function of time."""

    def __init__(self) -> None:
        self.order = list(START_VALUES)
        self.moves = {value: [] for value in START_VALUES}
        self.states = {value: [] for value in START_VALUES}
        self.counters = []
        self.verdicts = []
        self.cues = []
        self.pair_visits = []
        self.comparisons = 0
        self.swaps = 0
        self.pass_number = 1

    def paint(self, value: int, state: int, time: float) -> None:
        self.states[value].append({"t": round(time, 3), "state": state})

    def count(self, time: float) -> None:
        self.counters.append(
            {
                "t": round(time, 3),
                "pass": self.pass_number,
                "comparisons": self.comparisons,
                "swaps": self.swaps,
            }
        )

    def cue(self, effect: str, time: float, **extra: object) -> None:
        self.cues.append({"effect": effect, "t": round(time, 3), **extra})

    def compare(
        self,
        slot: int,
        look_at: float,
        act_at: float,
        act_seconds: float,
        verdict_until: float | None = None,
    ) -> bool:
        left, right = self.order[slot], self.order[slot + 1]
        should_swap = left > right
        self.comparisons += 1
        self.paint(left, ACTIVE, look_at)
        self.paint(right, ACTIVE, look_at)
        self.count(look_at)
        self.pair_visits.append({"t": round(look_at, 3), "slot": slot})

        if verdict_until is not None:
            relation = ">" if should_swap else "<"
            outcome = "swap" if should_swap else "keep"
            self.verdicts.append(
                {
                    "t": round(look_at, 3),
                    "end": round(verdict_until, 3),
                    "slot": slot,
                    "text": f"{left} {relation} {right} · {outcome}",
                }
            )

        if should_swap:
            self.swaps += 1
            self.order[slot], self.order[slot + 1] = right, left
            self.moves[left].append(
                {
                    "t": round(act_at, 3),
                    "dur": round(act_seconds, 3),
                    "from": slot,
                    "to": slot + 1,
                    "front": False,
                }
            )
            self.moves[right].append(
                {
                    "t": round(act_at, 3),
                    "dur": round(act_seconds, 3),
                    "from": slot + 1,
                    "to": slot,
                    "front": True,
                }
            )
            self.count(act_at)
            self.cue("note", act_at, note=VALUE_NOTES[left - 1], gain=-15)
        return should_swap

    def release(self, value: int, time: float) -> None:
        self.paint(value, IDLE, time)

    def lock(self, slot: int, time: float) -> None:
        self.paint(self.order[slot], LOCKED, time)
        self.cue("lock", time, gain=-11)


def word_time(line: dict, word: str) -> float:
    """Return when a word starts inside a narration line, so visuals can land on it."""
    for heard in line["words"]:
        if re.sub(r"[^a-z]", "", heard["word"].casefold()) == word:
            return heard["start"]
    raise ValueError(f"{word!r} was not heard in: {line['text']}")


def main() -> None:
    timing = json.loads((PROJECT / "timing.json").read_text(encoding="utf-8"))
    lines = timing["lines"]
    schedule = Schedule()
    starts = []

    # Beat 1: the whoosh carries the tear, and the voice waits until it has ended.
    schedule.cue("intro", INTRO_WHOOSH_START, gain=-9)
    starts.append(INTRO_WHOOSH_START + INTRO_WHOOSH_SECONDS + 0.04)

    # Beat 2: the camera dives from the crowd to the ten bars.
    dive_start = starts[0] + lines[0]["duration"] + 0.1
    starts.append(dive_start)
    dive_end = dive_start + max(1.5, lines[1]["duration"])
    schedule.cue("dive", dive_start + 0.05, gain=-15)

    # Beat 3: look at the first pair, then swap on the spoken word "swap".
    starts.append(max(dive_end, starts[1] + lines[1]["duration"]) + 0.1)
    swap_word = starts[2] + word_time(lines[2], "swap")
    schedule.compare(
        0, starts[2], swap_word, 0.5, verdict_until=starts[2] + lines[2]["duration"]
    )

    # Beat 4: the keep outcome, held on "leave them".
    starts.append(starts[2] + lines[2]["duration"] + 0.2)
    schedule.release(schedule.order[0], starts[3])
    schedule.compare(1, starts[3], starts[3], 0, verdict_until=starts[3] + 1.1)

    # Beat 5: the 8 is carried, the 10 takes over, and the 10 locks on the word "locks".
    starts.append(starts[3] + lines[3]["duration"] + 0.15)
    lock_word = starts[4] + word_time(lines[4], "locks")
    slots = range(2, 9)
    step = (lock_word - starts[4]) / len(slots)
    for index, slot in enumerate(slots):
        look_at = starts[4] + index * step
        schedule.release(schedule.order[slot - 1], look_at)
        schedule.compare(
            slot,
            look_at,
            look_at + step * 0.32,
            step * 0.62,
            verdict_until=look_at + step * 0.96,
        )
    schedule.release(schedule.order[8], lock_word)
    schedule.lock(9, lock_word)

    # Beat 6: the same rule runs faster, and the narration ends long before it does.
    starts.append(starts[4] + lines[4]["duration"] + 0.15)
    clock = starts[5]
    fast_start = clock
    for pass_number, step_seconds in FAST_PASS_STEP_SECONDS.items():
        schedule.pass_number = pass_number
        last_slot = len(START_VALUES) - pass_number - 1
        for slot in range(last_slot + 1):
            if slot:
                schedule.release(schedule.order[slot - 1], clock)
            swapped = schedule.compare(
                slot, clock, clock + step_seconds * 0.15, step_seconds * 0.85
            )
            clock += step_seconds if swapped else step_seconds * 0.72
        schedule.release(schedule.order[last_slot], clock)
        schedule.lock(last_slot + 1, clock)
        clock += LOCK_SECONDS
    fast_end = clock

    # Beat 7: a pass with no swaps, then the wave lands on the word "sorted".
    schedule.pass_number = 6
    starts.append(fast_end + 0.1)
    sorted_word = starts[6] + word_time(lines[6], "sorted")
    pass_step = max(0.12, (sorted_word - starts[6]) / 4)
    for slot in range(4):
        if slot:
            schedule.release(schedule.order[slot - 1], starts[6] + slot * pass_step)
        schedule.compare(
            slot,
            starts[6] + slot * pass_step,
            starts[6] + slot * pass_step,
            0,
            verdict_until=starts[6] + (slot + 1) * pass_step * 0.96,
        )
    wave_start = max(sorted_word, starts[6] + 4 * pass_step)
    assert schedule.order == sorted(START_VALUES)
    assert (schedule.comparisons, schedule.swaps) == (39, 18)
    wave_step = 0.075
    for slot, value in enumerate(schedule.order):
        schedule.paint(value, LOCKED, wave_start + slot * wave_step)
        schedule.cue(
            "note",
            wave_start + slot * wave_step,
            note=VALUE_NOTES[value - 1],
            gain=-16,
        )
    wave_end = wave_start + wave_step * len(schedule.order) + 0.35

    # Beat 8: the catch, then the number landing on the word "billion".
    starts.append(max(wave_end, starts[6] + lines[6]["duration"]) + 0.12)
    starts.append(starts[7] + lines[7]["duration"] + 0.15)
    billion_word = starts[8] + word_time(lines[8], "billion")
    schedule.cue("impact", billion_word, gain=-9)

    # Beat 9: the question, then the end card.
    starts.append(starts[8] + lines[8]["duration"] + 0.15)
    # A faster voice makes a shorter video instead of leaving dead air before the end.
    question_ends = starts[9] + lines[9]["duration"]
    latest_end_card = MAXIMUM_SECONDS - END_CARD_SECONDS
    if latest_end_card - question_ends < MINIMUM_QUESTION_HOLD:
        raise ValueError(
            f"This voice ends at {question_ends:.2f}s, too slow for a "
            f"{MAXIMUM_SECONDS:.0f}s Reel. Try a faster voice or a higher speed."
        )
    end_card = round(min(latest_end_card, question_ends + QUESTION_HOLD), 3)
    duration = round(end_card + END_CARD_SECONDS, 3)
    schedule.cue("end", end_card + 0.1, gain=-13)

    for index, start in enumerate(starts):
        schedule.cue(
            "voice", start, file=lines[index]["file"], duration=lines[index]["duration"]
        )

    beats = {
        "hook": 0.0,
        "dive": dive_start,
        "diveEnd": dive_end,
        "rule": starts[2],
        "keep": starts[3],
        "carry": starts[4],
        "lock": lock_word,
        "fast": fast_start,
        "fastEnd": fast_end,
        "noSwaps": starts[6],
        "wave": wave_start,
        "waveEnd": wave_end,
        "problem": starts[7],
        "cost": starts[8],
        "billion": billion_word,
        "question": starts[9],
        "endCard": end_card,
        "duration": duration,
    }
    reel = {
        "beats": {name: round(value, 3) for name, value in beats.items()},
        "values": START_VALUES,
        "moves": schedule.moves,
        "states": schedule.states,
        "counters": schedule.counters,
        "verdicts": schedule.verdicts,
        "pairVisits": schedule.pair_visits,
        "tell": round(word_time(lines[9], "tell") + starts[9], 3),
    }
    (PROJECT / "timeline.js").write_text(
        "window.REEL = " + json.dumps(reel) + ";\n", encoding="utf-8"
    )
    (PROJECT / "cues.json").write_text(
        json.dumps({"duration": duration, "cues": schedule.cues}, indent=1),
        encoding="utf-8",
    )
    template = (PROJECT / "source" / "index.template.html").read_text(encoding="utf-8")
    (PROJECT / "index.html").write_text(
        template.replace("__DURATION__", str(duration))
        .replace("__END_START__", str(round(end_card, 3)))
        .replace("__SCENE_LENGTH__", str(round(end_card + 0.2, 3)))
        .replace("__END_LENGTH__", str(round(duration - end_card, 3))),
        encoding="utf-8",
    )
    print(f"duration {duration:.2f}s, {len(schedule.cues)} cues")
    for name, value in beats.items():
        print(f"  {name:9} {value:6.2f}")


if __name__ == "__main__":
    main()
