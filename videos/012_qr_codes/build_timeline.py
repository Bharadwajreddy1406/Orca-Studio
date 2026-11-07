"""Schedule every picture and sound event from the words spoken in the ElevenLabs take.

Run from the repository root: uv run python videos/012_qr_codes/build_timeline.py
Reads timing.json, writes timeline.js for the composition, cues.json for the mix, and
index.html from source/index.template.html. The QR code itself is source/qr.js, written by
build_qr.py from a real Version 2-H encoding.
"""

import json
from pathlib import Path

PROJECT = Path(__file__).parent

# Speech starts this late, so the opening swish has fully ended before the voice.
VOICE_OFFSET = 0.55
END_HOLD = 0.8
END_CARD_SECONDS = 1.8
MAXIMUM_SECONDS = 40.0


def bits_markup(bits: str) -> str:
    """The first bits of the real stream: mode (0100 = bytes), length (11), then 'e' and 'x'."""
    groups = [bits[0:4], bits[4:12], bits[12:20], bits[20:28]]
    span = lambda text: f"<span>{text}</span>"  # noqa: E731
    return f'{span(groups[0])} {span(groups[1])}</div><div class="row">{span(groups[2])} {span(groups[3])} {span("...")}'


def main() -> None:
    timing = json.loads((PROJECT / "timing.json").read_text(encoding="utf-8"))
    qr = json.loads((PROJECT / "source" / "qr.js").read_text(encoding="utf-8").split("export const QR = ", 1)[1].rstrip(";\n"))
    lines = timing["lines"]

    def word(line: int, spoken: str, nth: int = 0) -> float:
        found = [w for w in lines[line]["words"] if w["word"] == spoken]
        if len(found) <= nth:
            raise ValueError(f"{spoken!r} was not heard in: {lines[line]['text']}")
        return round(found[nth]["start"] + VOICE_OFFSET, 3)

    start = [round(line["start"] + VOICE_OFFSET, 3) for line in lines]
    end = [round(line["end"] + VOICE_OFFSET, 3) for line in lines]

    b = {
        # 1. Hook
        "spilled": word(0, "spilled"),
        "coffee": word(0, "coffee"),
        "qr": word(0, "qr"),
        # 2. The pain
        "smudged": word(1, "smudged"),
        "scratched": word(1, "scratched"),
        "torn": word(1, "torn"),
        # 3. The slow way
        "ask": word(2, "ask"),
        "menu": word(2, "menu"),
        "ugh": word(2, "ugh"),
        # 4. The twist
        "what": word(3, "what"),
        "just": word(3, "just"),
        "scans": word(3, "scans"),
        "anyway": word(3, "anyway"),
        # 5. Bits
        "link": word(4, "link"),
        "bits": word(4, "bits"),
        "black": word(4, "black"),
        "squares": word(4, "squares"),
        # 6. Finder patterns
        "three": word(5, "three"),
        "corner": word(5, "corner"),
        "squares2": word(5, "squares"),
        "mark": word(5, "mark"),
        "spot": word(5, "spot"),
        "and": word(5, "and"),
        "ways": word(5, "way's"),
        "up": word(5, "up"),
        # 7. Repair data
        "then": word(6, "then"),
        "extra": word(6, "extra"),
        "repair": word(6, "repair"),
        "computed": word(6, "computed"),
        "message": word(6, "message"),
        # 8. Damage
        "now": word(7, "now"),
        "splash": word(7, "splash"),
        "chunk": word(7, "chunk"),
        "gone": word(7, "gone"),
        # 9. Repair
        "scanner": word(8, "scanner"),
        "rebuilds": word(8, "rebuilds"),
        "missing": word(8, "missing"),
        "pieces": word(8, "pieces"),
        # 10. Payoff
        "link2": word(9, "link"),
        "pops": word(9, "pops"),
        "back": word(9, "back"),
        # 11. Name
        "thats": word(10, "that's"),
        "reed": word(10, "reed"),
        "error": word(10, "error"),
        "correction": word(10, "correction"),
        # 12. Benefit
        "upTo": word(11, "up"),
        "thirty": word(11, "thirty"),
        "goMissing": word(11, "missing"),
        # 13. Catch
        "hide": word(12, "hide"),
        "much": word(12, "much"),
        "or": word(12, "or"),
        "corner2": word(12, "corner"),
        "square": word(12, "square"),
        "no": word(12, "no"),
        "scan": word(12, "scan"),
        # 14. Sign-off
        "happy": word(13, "happy"),
        "scanning": word(13, "scanning"),
    }

    end_card = round(end[13] + END_HOLD, 3)
    duration = round(end_card + END_CARD_SECONDS, 3)
    if duration > MAXIMUM_SECONDS:
        raise ValueError(f"The Reel runs {duration:.2f}s, over {MAXIMUM_SECONDS:.0f}s.")

    # Derived moments, shared by picture and sound.
    clear_at = round(b["anyway"] + 0.42, 3)  # the damage rewinds and the modules flip away
    data_from = round(b["bits"] + 0.12, 3)  # message bits stream into the zig-zag
    data_until = round(b["squares"] + 0.4, 3)
    ec_from = round(b["extra"] - 0.02, 3)  # repair codewords drop in
    ec_until = round(b["message"] - 0.15, 3)
    merge_at = round(b["message"] + 0.15, 3)
    sweeps = [
        # [from, until, direction]: the scanner's line crossing the code (1 = top to bottom)
        [round(b["just"] - 0.05, 3), round(b["scans"] - 0.02, 3), 1],
        [round(b["scans"], 3), round(b["anyway"] - 0.08, 3), -1],
        [round(b["scanner"] - 0.1, 3), round(b["pieces"] - 0.05, 3), 1],
        [round(b["no"] - 0.62, 3), round(b["no"] - 0.06, 3), 1],
        [round(b["happy"] - 0.05, 3), round(b["scanning"] + 0.15, 3), 1],
    ]
    # The rebuilt modules reappear as the third sweep passes their row.
    rebuild_sweep = sweeps[2]

    beats = {
        **b,
        "start": start,
        "end": end,
        "clearAt": clear_at,
        "dataFrom": data_from,
        "dataUntil": data_until,
        "ecFrom": ec_from,
        "ecUntil": ec_until,
        "mergeAt": merge_at,
        "sweeps": sweeps,
        "endCard": end_card,
        "duration": duration,
        "bursts": [
            {"t": round(b["spilled"] + 0.32, 3), "x": 3.75, "y": 0.6, "z": -0.25, "count": 18},
            {"t": b["splash"], "x": 0, "y": 0.8, "z": 1.0, "count": 30},
            {"t": b["chunk"], "x": 0, "y": 0.6, "z": 1.0, "count": 22},
            {"t": b["scanning"], "x": 0, "y": 1.2, "z": 0, "count": 40},
        ],
        "shakes": [
            {"t": b["torn"], "amount": 0.08},
            {"t": b["ugh"], "amount": 0.05},
            {"t": b["three"], "amount": 0.05},
            {"t": b["corner"], "amount": 0.05},
            {"t": b["squares2"], "amount": 0.05},
            {"t": b["splash"], "amount": 0.12},
            {"t": b["chunk"], "amount": 0.06},
            {"t": b["corner2"] + 0.1, "amount": 0.06},
            {"t": b["no"], "amount": 0.08},
        ],
    }

    cues = []

    def cue(effect: str, time: float, gain: float) -> None:
        cues.append({"effect": effect, "t": round(time, 3), "gain": gain})

    # 1. The torn reveal's swish ends before the voice. The cup tips and splashes.
    cue("tear", 0.05, -14)
    cue("knock", b["spilled"] + 0.12, -17)
    cue("step", b["spilled"] + 0.32, -15)
    cue("pop", b["qr"], -22)
    # 2. Smudge, scratch, tear: one hit each.
    cue("slide", b["smudged"], -18)
    cue("whip", b["scratched"], -17)
    cue("tear", b["torn"], -13)
    # 3. The service bell, rung three times, then the sigh.
    for ring in (b["ask"], b["menu"], b["ugh"] - 0.45):
        cue("ding1", ring + 0.02, -19)
    cue("sad", b["ugh"], -20)
    # 4. The scanner's first look: a slow pass, a quick one back, and it scans.
    cue("pop", b["what"], -21)
    cue("sweep", sweeps[0][0] + 0.55, -23)
    cue("whip", sweeps[1][0] + 0.2, -21)
    cue("ding2", b["anyway"], -16)
    cue("sparkle", b["anyway"] + 0.04, -22)
    # 5. The rewind and the bit stream: sparse ticks, not one per module.
    cue("slide", clear_at + 0.1, -21)
    cue("pop", b["link"], -20)
    cue("key", b["bits"], -19)
    steps = 9
    for index in range(steps):
        cue("tick", data_from + (data_until - data_from) * index / (steps - 1), -22 if index % 2 else -19)
    # 6. Three finder patterns slam down, the code spins, and lands upright.
    for at in (b["three"], b["corner"], b["squares2"]):
        cue("knock", at, -14)
    cue("clink", b["mark"], -24)
    cue("clink", b["spot"], -24)
    cue("whip", b["and"] - 0.12, -19)
    cue("step", b["up"], -16)
    # 7. Repair data: a riser as it rains in, a chord when it merges with the message.
    cue("riser", ec_from + 0.1, -22)
    for index in range(7):
        cue("tick", ec_from + (ec_until - ec_from) * index / 6, -23)
    cue("sparkle", b["computed"], -22)
    cue("chord0", merge_at, -20)
    # 8. Splash: the drop, the impact, the chunk torn away.
    cue("whip", b["now"] + 0.05, -20)
    cue("slam", b["splash"], -15)
    cue("buzz", b["chunk"], -19)
    cue("tear", b["gone"] - 0.1, -19)
    # 9. The scanner sweeps; a riser under the rebuild, pops as pieces return.
    cue("sweep", rebuild_sweep[0] + 0.9, -20)
    cue("riser", b["rebuilds"] - 0.1, -21)
    for index in range(4):
        cue("pop", b["missing"] - 0.25 + index * 0.16, -22)
    # 10. The link comes back.
    cue("ding0", b["pops"], -16)
    cue("chord1", b["back"], -19)
    cue("chord2", b["back"] + 0.02, -21)
    # 11. The name.
    cue("arrive", b["reed"], -16)
    # 12. Four levels rise; H lands on "thirty".
    for index in range(4):
        cue("tick", b["upTo"] + 0.05 + index * 0.12, -20)
    cue("ding2", b["thirty"], -17)
    # 13. The catch: a napkin over too much, a coaster on the corner, the scan fails.
    cue("slide", b["hide"], -18)
    cue("slide", b["or"], -21)
    cue("knock", b["corner2"] + 0.1, -15)
    cue("sweep", sweeps[3][0] + 0.45, -23)
    cue("buzz", b["no"], -15)
    # 14. Sign-off: the coaster flicks off, the code spins, a happy chord.
    cue("whip", b["happy"], -18)
    cue("ding2", b["scanning"], -17)
    for note in range(3):
        cue("chord" + str(note), b["scanning"] + 0.05, -19)
    cue("sparkle", b["scanning"] + 0.08, -21)

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
        .replace("__END_LENGTH__", str(round(duration - end_card, 3)))
        .replace("__BITS__", bits_markup(qr["bits"])),
        encoding="utf-8",
    )
    print(f"duration {duration:.2f}s, end card at {end_card:.2f}s, {len(cues)} cues")


if __name__ == "__main__":
    main()
