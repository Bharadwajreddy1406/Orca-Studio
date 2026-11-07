"""Schedule every picture and sound event from the words spoken in the ElevenLabs take.

Run from the repository root: uv run python videos/011_routing/build_timeline.py
Reads timing.json, writes timeline.js for the composition, cues.json for the mix, and
index.html from source/index.template.html.

Each request card's journey is a list of [node, time, ease] stops. The nodes are named points
in the world (see NODES in source/world.js), so the picture and the sound share one schedule.
"""

import json
from pathlib import Path

PROJECT = Path(__file__).parent

# Speech starts this late, so the opening swish has fully ended before the voice.
VOICE_OFFSET = 0.55
END_HOLD = 1.2
END_CARD_SECONDS = 2.2
MAXIMUM_SECONDS = 45.0


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

    # ---- the spoken anchors ----
    ai_word = word(0, "ai")
    you = word(1, "you")
    appointment = word(1, "appointment")
    someone = word(1, "someone")
    billing_word = word(1, "billing")
    same = word(2, "same")
    both = word(2, "both")
    laugh = round(both + 0.45, 3)
    not_word = word(2, "not")
    first = word(3, "first")
    figures = word(3, "figures")
    tag_a = word(3, "out")
    tag_b = word(3, "caller")
    to_scheduling = word(4, "appointments")
    scheduling = word(4, "scheduling")
    to_billing = word(5, "billing")
    billing_desk = word(5, "billing", 1)
    every = word(6, "every")
    right_road = word(6, "right")
    road = word(6, "road")
    routing = word(7, "routing")
    rights = [word(8, "request"), word(8, "workflow"), word(8, "specialist")]
    remember = word(9, "just")
    misreads = word(9, "misreads")
    sends = word(9, "sends")
    wrong = word(9, "wrong")
    path = word(9, "path")
    next_caller = word(10, "next")
    please = word(10, "please")

    end_card = round(end[10] + END_HOLD, 3)
    duration = round(end_card + END_CARD_SECONDS, 3)
    if duration > MAXIMUM_SECONDS:
        raise ValueError(f"The Reel runs {duration:.2f}s, over {MAXIMUM_SECONDS:.0f}s.")

    # ---- the request cards ----
    # A road ride: router slot, the road's two ends, the desk. `side` is "L" (scheduling) or "R".
    def ride(side: str, leave: float, land: float) -> list:
        span = land - leave
        return [
            [f"fork{side}", round(leave + span * 0.18, 3), "s"],
            [f"road{side}", round(leave + span * 0.86, 3), "l"],
            [f"desk{side}", round(land, 3), "o"],
        ]

    cards = []
    # The two first callers. They ask, wait, jam the single slot, get read, and get routed.
    cards.append({
        "kind": "appt", "from": appointment, "until": end_card + 0.5,
        "tag": "Appointment", "tagAt": tag_a, "stamp": scheduling, "badge": "check",
        "path": [["callerA", appointment, "s"], ["callerA", same - 0.05, "s"], ["inlet", same + 0.35, "s"],
                 ["slotA", both - 0.05, "s"], ["slotA", not_word, "s"], ["hoverA", not_word + 0.25, "b"],
                 ["hoverA", to_scheduling + 0.2, "s"], *ride("L", to_scheduling + 0.2, scheduling)],
        "jam": [both - 0.05, not_word],
    })
    cards.append({
        "kind": "bill", "from": billing_word, "until": end_card + 0.5,
        "tag": "Billing", "tagAt": tag_b, "stamp": billing_desk, "badge": "check",
        "path": [["callerB", billing_word, "s"], ["callerB", same + 0.1, "s"], ["inlet", same + 0.5, "s"],
                 ["slotB", both - 0.05, "s"], ["slotB", not_word, "s"], ["hoverB", not_word + 0.25, "b"],
                 ["hoverB", to_billing + 0.45, "s"], *ride("R", to_billing + 0.45, billing_desk)],
        "jam": [both - 0.05, not_word],
    })
    # The flurry: six mixed requests, each one read, switched and sent down its road.
    flips = [{"t": round(first + 0.3, 3), "side": 0},
             {"t": round(to_scheduling - 0.05, 3), "side": -1},
             {"t": round(to_billing - 0.05, 3), "side": 1}]
    flurry_kinds = ["bill", "appt", "appt", "bill", "appt", "bill"]
    gap = 0.3
    for index, kind in enumerate(flurry_kinds):
        side = "L" if kind == "appt" else "R"
        arrive = round(every - 0.15 + index * gap, 3)
        at_slot = round(arrive + 0.32, 3)
        land = round(at_slot + 0.62, 3)
        cards.append({
            "kind": kind, "from": round(arrive - 0.15, 3), "until": round(land + 0.3, 3), "small": True,
            "path": [["inlet", arrive, "s"], ["slot", at_slot, "l"], *ride(side, at_slot, land)],
            "stamp": land, "fold": True,
        })
        flips.append({"t": round(at_slot - 0.12, 3), "side": -1 if side == "L" else 1})
    # The worked example for "right request, right workflow, right specialist".
    cards.append({
        "kind": "appt", "from": rights[0] - 0.35, "until": end_card + 0.5,
        "tag": "Appointment", "tagAt": rights[0], "stamp": rights[2], "badge": "check",
        "path": [["inlet", rights[0] - 0.35, "s"], ["hoverA", rights[0] - 0.05, "o"],
                 ["hoverA", rights[1] - 0.05, "s"], *ride("L", rights[1] - 0.05, rights[2])],
        "glow": rights[0],
    })
    flips.append({"t": round(rights[1] - 0.2, 3), "side": -1})
    # The catch: a billing question, misread as an appointment, sent down the wrong road.
    flips.append({"t": round(remember, 3), "side": 0})
    cards.append({
        "kind": "bill", "from": remember + 0.1, "until": end_card + 0.5,
        "tag": "Appointment", "tagAt": misreads, "wrongTag": True, "stamp": path, "badge": "cross",
        "path": [["callerB", remember + 0.1, "s"], ["callerB", remember + 0.5, "s"], ["inlet", remember + 0.9, "s"],
                 ["hoverC", word(9, "if") - 0.05, "o"], ["hoverC", sends - 0.05, "s"], *ride("L", sends - 0.05, wrong)],
    })
    flips.append({"t": round(sends - 0.2, 3), "side": -1})
    flips.sort(key=lambda flip: flip["t"])

    beats = {
        "start": start,
        "end": end,
        "ai": ai_word,
        "you": you,
        "appointment": appointment,
        "someone": someone,
        "billingWord": billing_word,
        "same": same,
        "both": both,
        "laugh": laugh,
        "not": not_word,
        "first": first,
        "figures": figures,
        "tagA": tag_a,
        "tagB": tag_b,
        "toScheduling": to_scheduling,
        "scheduling": scheduling,
        "toBilling": to_billing,
        "billingDesk": billing_desk,
        "every": every,
        "rightRoad": right_road,
        "road": road,
        "routing": routing,
        "rights": rights,
        "remember": remember,
        "misreads": misreads,
        "sends": sends,
        "wrong": wrong,
        "path": path,
        "next": next_caller,
        "please": please,
        "cards": cards,
        "flips": flips,
        "endCard": end_card,
        "duration": duration,
        "bursts": [
            {"t": not_word, "x": 0, "y": 1.6, "z": 0.4, "count": 26},
            {"t": please, "x": 0, "y": 1.4, "z": 0, "count": 30},
        ],
        "shakes": [
            {"t": both, "amount": 0.05},
            {"t": not_word, "amount": 0.07},
            {"t": scheduling, "amount": 0.04},
            {"t": billing_desk, "amount": 0.04},
            {"t": path, "amount": 0.09},
        ],
    }

    cues = []

    def cue(effect: str, time: float, gain: float) -> None:
        cues.append({"effect": effect, "t": round(time, 3), "gain": gain})

    # Beat 1: the swish ends before the voice; the help desk pops; the phone rings on "calling".
    cue("tear", 0.05, -14)
    cue("pop", 0.3, -22)
    cue("ding1", start[0] + 0.02, -21)
    cue("ding1", start[0] + 0.32, -23)
    cue("pop", ai_word, -20)
    # Beat 2: two callers, two different requests.
    cue("pop", you, -21)
    cue("ding0", appointment + 0.05, -20)
    cue("pop", someone, -21)
    cue("ding2", billing_word + 0.05, -20)
    # Beat 3: both cards forced into one slot, the jam, the laugh, the rejection.
    cue("slide", same + 0.2, -21)
    cue("knock", both - 0.03, -15)
    cue("knock", both + 0.12, -19)
    cue("buzz", not_word, -16)
    # Beat 4: the fork forms, the desks pop up, and each request gets read.
    cue("whip", first - 0.05, -18)
    for link in range(10):
        cue("clink", first + 0.1 + link * 0.045, -26)
    cue("pop", first + 0.45, -21)
    cue("pop", first + 0.6, -21)
    cue("sparkle", figures, -25)
    cue("pop", tag_a, -19)
    cue("pop", tag_b, -19)
    # Beats 5 and 6: the switch flips, the card rides, the specialist stamps it.
    for flip_at, land_at in ((to_scheduling, scheduling), (to_billing, billing_desk)):
        cue("tick", flip_at - 0.05, -17)
        cue("slide", flip_at + 0.45, -22)
        cue("step", land_at, -16)
        cue("sparkle", land_at + 0.05, -23)
    # Beat 7: the flurry, a click of the switch and a tick for every card.
    for flip in flips:
        if every - 0.4 < flip["t"] < road + 0.4:
            cue("tick", flip["t"], -21)
    for card in cards:
        if card.get("small"):
            cue("clink", card["stamp"], -24)
    cue("sparkle", road, -20)
    # Beat 8: the name.
    cue("arrive", routing, -15)
    # Beat 9: three right things, three rising notes.
    for index, at in enumerate(rights):
        cue(f"ding{index}", at, -18)
    cue("slide", rights[1] + 0.1, -23)
    cue("step", rights[2], -18)
    # Beat 10: the catch: a misread, the wrong road, a frustrated caller.
    cue("pop", remember + 0.15, -21)
    cue("buzz", misreads + 0.1, -20)
    cue("tick", sends - 0.2, -18)
    cue("slide", sends + 0.2, -21)
    cue("step", wrong, -18)
    cue("sad", path, -18)
    # Beat 11: the next caller, and everyone cheers.
    cue("pop", next_caller, -19)
    for note in range(3):
        cue("chord" + str(note), please, -18)
    cue("sparkle", please + 0.05, -21)

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
    print(f"duration {duration:.2f}s, {len(cues)} cues, {len(cards)} cards")


if __name__ == "__main__":
    main()
