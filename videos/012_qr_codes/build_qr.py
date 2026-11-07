"""Encode the Reel's QR code for real, and record what every module is for.

Run from the repository root: uv run python videos/012_qr_codes/build_qr.py
Writes source/qr.js. A Version 2 code (25 x 25) at error-correction level H, byte mode.
V2-H is one Reed-Solomon block: 16 data codewords and 28 error-correction codewords, so it
can correct up to 14 codewords, about 30% of the 44. Every damage region the video shows is
listed here with the codewords it touches, and the build fails if a "still scans" region
touches more than 14, so the picture never claims a repair the code could not make.

Pass --verify to decode the clean and damaged codes with OpenCV (needs opencv-python-headless,
e.g. `uv run --no-project --with opencv-python-headless --with numpy python ... --verify`).
"""

import json
import sys
from pathlib import Path

PROJECT = Path(__file__).parent
MESSAGE = "example.com"  # a reserved documentation domain, so the code points nowhere real
VERSION = 2
SIZE = 17 + 4 * VERSION
DATA_CODEWORDS = 16
EC_CODEWORDS = 28
CORRECTABLE = EC_CODEWORDS // 2
ALIGNMENT_CENTER = 18
LEVEL_H_FORMAT_BITS = 2

# ---------- GF(256) and Reed-Solomon ----------

EXP = [0] * 512
LOG = [0] * 256
value = 1
for power in range(255):
    EXP[power] = value
    LOG[value] = power
    value <<= 1
    if value & 0x100:
        value ^= 0x11D
for power in range(255, 512):
    EXP[power] = EXP[power - 255]


def multiply(a: int, b: int) -> int:
    return 0 if a == 0 or b == 0 else EXP[LOG[a] + LOG[b]]


def reed_solomon(data: list[int], degree: int) -> list[int]:
    """The remainder of data(x) * x^degree divided by the generator polynomial."""
    generator = [1]
    for power in range(degree):
        generator = [
            (generator[index] if index < len(generator) else 0)
            ^ (multiply(generator[index - 1], EXP[power]) if index > 0 else 0)
            for index in range(len(generator) + 1)
        ]
    remainder = [0] * degree
    for byte in data:
        factor = byte ^ remainder[0]
        remainder = remainder[1:] + [0]
        for index in range(degree):
            remainder[index] ^= multiply(generator[index + 1], factor)
    return remainder


# ---------- data codewords ----------


def data_codewords(message: str) -> tuple[list[int], str]:
    payload = message.encode("utf-8")
    bits = "0100" + format(len(payload), "08b") + "".join(format(byte, "08b") for byte in payload)
    capacity = DATA_CODEWORDS * 8
    if len(bits) > capacity:
        raise SystemExit(f"{message!r} does not fit V2-H byte mode")
    stream = bits + "0" * min(4, capacity - len(bits))
    stream += "0" * (-len(stream) % 8)
    words = [int(stream[index : index + 8], 2) for index in range(0, len(stream), 8)]
    pad = [0xEC, 0x11]
    while len(words) < DATA_CODEWORDS:
        words.append(pad[(len(words) - len(stream) // 8) % 2])
    return words, bits


# ---------- the matrix ----------


def build() -> dict:
    data, bits = data_codewords(MESSAGE)
    codewords = data + reed_solomon(data, EC_CODEWORDS)
    modules = [[False] * SIZE for _ in range(SIZE)]
    role = [["?"] * SIZE for _ in range(SIZE)]

    def put(row: int, col: int, dark: bool, kind: str) -> None:
        modules[row][col] = dark
        role[row][col] = kind

    # Finder patterns with their light separators.
    for top, left in ((0, 0), (0, SIZE - 7), (SIZE - 7, 0)):
        for row in range(-1, 8):
            for col in range(-1, 8):
                r, c = top + row, left + col
                if 0 <= r < SIZE and 0 <= c < SIZE:
                    ring = max(abs(row - 3), abs(col - 3))
                    put(r, c, ring in (0, 1, 3), "F" if ring <= 3 else "S")
    # Timing patterns.
    for index in range(8, SIZE - 8):
        put(6, index, index % 2 == 0, "T")
        put(index, 6, index % 2 == 0, "T")
    # The one alignment pattern of Version 2.
    for row in range(-2, 3):
        for col in range(-2, 3):
            put(ALIGNMENT_CENTER + row, ALIGNMENT_CENTER + col, max(abs(row), abs(col)) != 1, "A")
    # Format areas (filled after masking) and the dark module.
    for index in range(9):
        if role[8][index] == "?":
            role[8][index] = "f"
        if role[index][8] == "?":
            role[index][8] = "f"
    for index in range(8):
        role[8][SIZE - 1 - index] = "f"
        role[SIZE - 1 - index][8] = "f"
    put(SIZE - 8, 8, True, "K")

    # Zig-zag placement, two columns at a time from the bottom right.
    order = []
    for right in range(SIZE - 1, 0, -2):
        if right <= 6:
            right -= 1
        upward = ((right + 1) & 2) == 0
        for vertical in range(SIZE):
            for step in range(2):
                col = right - step
                row = SIZE - 1 - vertical if upward else vertical
                if role[row][col] == "?":
                    order.append((row, col))
    total_bits = len(codewords) * 8
    codeword_of = [[-1] * SIZE for _ in range(SIZE)]
    bit_of = [[-1] * SIZE for _ in range(SIZE)]
    for index, (row, col) in enumerate(order):
        bit_of[row][col] = index
        if index < total_bits:
            word = index // 8
            put(row, col, (codewords[word] >> (7 - index % 8)) & 1 == 1, "D" if word < DATA_CODEWORDS else "E")
            codeword_of[row][col] = word
        else:
            put(row, col, False, "R")

    def mask_bit(mask: int, row: int, col: int) -> bool:
        x, y = col, row
        return [
            (x + y) % 2 == 0,
            y % 2 == 0,
            x % 3 == 0,
            (x + y) % 3 == 0,
            (x // 3 + y // 2) % 2 == 0,
            x * y % 2 + x * y % 3 == 0,
            (x * y % 2 + x * y % 3) % 2 == 0,
            ((x + y) % 2 + x * y % 3) % 2 == 0,
        ][mask]

    def format_bits(mask: int) -> int:
        payload = LEVEL_H_FORMAT_BITS << 3 | mask
        remainder = payload
        for _ in range(10):
            remainder = (remainder << 1) ^ ((remainder >> 9) * 0x537)
        return (payload << 10 | remainder) ^ 0x5412

    def apply(mask: int) -> list[list[bool]]:
        grid = [row[:] for row in modules]
        for row in range(SIZE):
            for col in range(SIZE):
                if role[row][col] in "DER" and mask_bit(mask, row, col):
                    grid[row][col] = not grid[row][col]
        word = format_bits(mask)
        bit = lambda index: (word >> index) & 1 == 1  # noqa: E731
        for index in range(6):
            grid[index][8] = bit(index)
        grid[7][8] = bit(6)
        grid[8][8] = bit(7)
        grid[8][7] = bit(8)
        for index in range(9, 15):
            grid[8][14 - index] = bit(index)
        for index in range(8):
            grid[8][SIZE - 1 - index] = bit(index)
        for index in range(8, 15):
            grid[SIZE - 15 + index][8] = bit(index)
        grid[SIZE - 8][8] = True
        return grid

    def penalty(grid: list[list[bool]]) -> int:
        score = 0
        lines = grid + [list(column) for column in zip(*grid)]
        for line in lines:
            run, previous = 0, None
            for cell in line:
                run = run + 1 if cell == previous else 1
                previous = cell
                if run == 5:
                    score += 3
                elif run > 5:
                    score += 1
            text = "".join("1" if cell else "0" for cell in line)
            for pattern in ("10111010000", "00001011101"):
                score += 40 * sum(1 for i in range(len(text) - 10) if text[i : i + 11] == pattern)
        for row in range(SIZE - 1):
            for col in range(SIZE - 1):
                cells = {grid[row][col], grid[row][col + 1], grid[row + 1][col], grid[row + 1][col + 1]}
                score += 3 if len(cells) == 1 else 0
        dark = sum(sum(row) for row in grid)
        score += 10 * (abs(dark * 20 - SIZE * SIZE * 10) // (SIZE * SIZE))
        return score

    mask = min(range(8), key=lambda candidate: penalty(apply(candidate)))
    grid = apply(mask)
    for row in range(SIZE):
        for col in range(SIZE):
            if role[row][col] == "f":
                modules[row][col] = grid[row][col]
    return {
        "grid": grid,
        "role": role,
        "codeword_of": codeword_of,
        "bit_of": bit_of,
        "mask": mask,
        "bits": bits,
        "codewords": codewords,
    }


# ---------- damage regions the picture shows ----------


def disc(center_row: float, center_col: float, radius: float) -> set:
    return {
        (row, col)
        for row in range(SIZE)
        for col in range(SIZE)
        if (row - center_row) ** 2 + (col - center_col) ** 2 <= radius * radius
    }


def segment(start: tuple, finish: tuple) -> set:
    steps = 40
    return {
        (round(start[0] + (finish[0] - start[0]) * index / steps), round(start[1] + (finish[1] - start[1]) * index / steps))
        for index in range(steps + 1)
    }


# Opening damage: a coffee stain, two scratches, and a torn-off corner. Together they must
# stay within what level H corrects, because the video says it "scans anyway".
STAIN = disc(11.5, 19.5, 2.4)
SCRATCHES = [segment((9, 10), (14, 15))]
TORN_CORNER = {(row, col) for row in range(SIZE) for col in range(SIZE) if row + col >= 44}
# The splash that wipes a chunk away, then gets rebuilt.
SPLASH = disc(14.0, 12.0, 3.8)
# The catch: a blot over the top-left finder pattern.
BLOT = disc(3.0, 3.0, 5.6)


def touched(code: dict, cells: set) -> set:
    return {code["codeword_of"][row][col] for row, col in cells if code["codeword_of"][row][col] >= 0}


def hook_grid(code: dict) -> list:
    """The opening damage as a scanner sees it: the stain darkens, scratches and the tear lighten."""
    grid = [row[:] for row in code["grid"]]
    for row, col in STAIN:
        grid[row][col] = True
    for row, col in set().union(*SCRATCHES) | TORN_CORNER:
        grid[row][col] = False
    return grid


def changed(code: dict, grid: list) -> set:
    return {
        code["codeword_of"][row][col]
        for row in range(SIZE)
        for col in range(SIZE)
        if grid[row][col] != code["grid"][row][col] and code["codeword_of"][row][col] >= 0
    }


def report(code: dict) -> dict:
    hook = STAIN | set().union(*SCRATCHES) | TORN_CORNER
    regions = {"hook": hook, "splash": SPLASH, "blot": BLOT}
    words = {name: sorted(touched(code, cells)) for name, cells in regions.items()}
    # Codewords in error: for the hook, those whose bits the damage really flips; for the
    # splash, every codeword it touches, since the chunk is gone and could read as anything.
    errors = {"hook": changed(code, hook_grid(code)), "splash": set(words["splash"])}
    for name in ("hook", "splash"):
        functions = {(r, c) for r, c in regions[name] if code["role"][r][c] in "FSTAKf"}
        print(
            f"{name}: {len(regions[name])} modules, touches {len(words[name])} codewords, "
            f"{len(errors[name])} in error (V2-H corrects {CORRECTABLE}), function modules {sorted(functions)}"
        )
        if len(errors[name]) > CORRECTABLE or functions:
            raise SystemExit(f"{name} damage is beyond what V2-H is guaranteed to correct")
    finder = sum(1 for r, c in BLOT if code["role"][r][c] == "F")
    print(f"blot: covers {finder} of the 49 top-left finder modules")
    return {name: sorted(cells) for name, cells in {**words, **{f"{k}Errors": v for k, v in errors.items()}}.items()}


def verify(code: dict, words: dict) -> None:
    import cv2
    import numpy as np

    def image(grid: list[list[bool]]) -> "np.ndarray":
        quiet, scale = 4, 12
        pixels = np.full((SIZE + 2 * quiet, SIZE + 2 * quiet), 255, np.uint8)
        for row in range(SIZE):
            for col in range(SIZE):
                if grid[row][col]:
                    pixels[row + quiet, col + quiet] = 0
        return cv2.resize(pixels, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)

    def damaged(cells: set, how: str) -> list[list[bool]]:
        grid = [row[:] for row in code["grid"]]
        for row, col in cells:
            grid[row][col] = {"dark": True, "light": False, "flip": not grid[row][col]}[how]
        return grid

    stained = hook_grid(code)
    cases = {
        "clean": code["grid"],
        "hook (stain dark, scratches light, corner gone)": stained,
        "splash (chunk inverted)": damaged(SPLASH, "flip"),
        "splash (chunk dark)": damaged(SPLASH, "dark"),
        "blot over finder": damaged(BLOT, "dark"),
    }
    detector = cv2.QRCodeDetector()
    for name, grid in cases.items():
        text, _, _ = detector.detectAndDecode(image(grid))
        print(f"  decode {name}: {text!r}")


def main() -> None:
    code = build()
    words = report(code)
    if "--verify" in sys.argv:
        verify(code, words)
    rows = lambda table: ["".join(table_row) for table_row in table]  # noqa: E731
    payload = {
        "message": MESSAGE,
        "version": VERSION,
        "level": "H",
        "size": SIZE,
        "mask": code["mask"],
        "dataCodewords": DATA_CODEWORDS,
        "ecCodewords": EC_CODEWORDS,
        "bits": code["bits"],
        "grid": ["".join("1" if cell else "0" for cell in row) for row in code["grid"]],
        "role": rows(code["role"]),
        "codeword": code["codeword_of"],
        "bit": code["bit_of"],
        "regions": {
            "stain": sorted(STAIN),
            "scratches": [sorted(line) for line in SCRATCHES],
            "torn": sorted(TORN_CORNER),
            "splash": sorted(SPLASH),
            "blot": sorted(BLOT),
        },
        "touched": words,
    }
    (PROJECT / "source" / "qr.js").write_text(
        "// Written by build_qr.py: a real V2-H encoding of the message. Do not edit by hand.\n"
        "export const QR = " + json.dumps(payload, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"mask {code['mask']}, wrote source/qr.js")


if __name__ == "__main__":
    main()
