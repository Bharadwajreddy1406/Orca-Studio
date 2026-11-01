"""Create the next numbered video project from ``videos/_template``."""

from __future__ import annotations

import argparse
import re
import secrets
import shutil
from pathlib import Path


PROJECT_PATTERN = re.compile(r"^(?P<number>\d+)_")
SLUG_PART_PATTERN = re.compile(r"[a-z0-9]+")
RANDOM_SUFFIX_DIGITS = 6


def repository_root() -> Path:
    return Path(__file__).resolve().parents[1]


def numbered_projects(videos_dir: Path) -> list[tuple[int, Path]]:
    projects: list[tuple[int, Path]] = []
    if not videos_dir.is_dir():
        return projects

    for candidate in videos_dir.iterdir():
        if not candidate.is_dir():
            continue
        match = PROJECT_PATTERN.match(candidate.name)
        if match:
            projects.append((int(match.group("number")), candidate))
    return projects


def resolve_project(identifier: str, videos_dir: Path) -> Path:
    projects = numbered_projects(videos_dir)

    if identifier.isdigit():
        requested_number = int(identifier)
        matches = [path for number, path in projects if number == requested_number]
    else:
        matches = [
            path
            for _, path in projects
            if path.name.casefold() == identifier.casefold()
        ]

    if not matches:
        raise FileNotFoundError(
            f"No video project matches {identifier!r} in {videos_dir}"
        )
    if len(matches) > 1:
        names = ", ".join(sorted(path.name for path in matches))
        raise ValueError(f"Project identifier {identifier!r} is ambiguous: {names}")
    return matches[0]


def next_project_number(videos_dir: Path) -> int:
    existing_numbers = [number for number, _ in numbered_projects(videos_dir)]
    return max(existing_numbers, default=0) + 1


def project_slug(name: str) -> str:
    slug = "_".join(SLUG_PART_PATTERN.findall(name.casefold()))
    if not slug:
        raise ValueError(
            "Project name must contain at least one ASCII letter or number."
        )
    return slug


def automatic_slug() -> str:
    suffix = secrets.randbelow(10**RANDOM_SUFFIX_DIGITS)
    return f"auto_{suffix:0{RANDOM_SUFFIX_DIGITS}d}"


def create_project(name: str | None, root: Path | None = None) -> Path:
    root = root or repository_root()
    videos_dir = root / "videos"
    template_dir = videos_dir / "_template"

    if not template_dir.is_dir():
        raise FileNotFoundError(f"Video template not found: {template_dir}")

    number = next_project_number(videos_dir)
    number_width = max(3, len(str(number)))
    slug = project_slug(name) if name else automatic_slug()
    destination = videos_dir / f"{number:0{number_width}d}_{slug}"

    if destination.exists():
        raise FileExistsError(f"Project already exists: {destination}")

    shutil.copytree(template_dir, destination)
    return destination


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="create",
        description="Create the next numbered Manim video project.",
    )
    parser.add_argument(
        "name",
        nargs="?",
        help=(
            "Project name. It is converted to snake_case. If omitted, an "
            "auto_XXXXXX name is generated."
        ),
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        destination = create_project(args.name)
    except (FileExistsError, FileNotFoundError, ValueError) as error:
        print(f"create: error: {error}")
        return 1

    print(f"Created {destination.name}")
    print(destination)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
