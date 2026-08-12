#!/usr/bin/env python3
"""
Analyze a timetable.json file produced by the scraper.
Used by the CI forensics workflow to print a summary of the output.

Usage: python3 scripts/analyze_output.py [timetable.json]
"""
import json
import re
import sys
from pathlib import Path


def analyze(path: str) -> int:
    p = Path(path)
    if not p.exists():
        print(f"File not found: {path}")
        return 1

    try:
        with p.open() as f:
            d = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Invalid JSON: {e}")
        return 1

    batches = [k for k in d.keys() if re.match(r"^20\d{2}$", k)]
    other_keys = [k for k in d.keys() if not re.match(r"^20\d{2}$", k)]

    print(f"top-level keys: {list(d.keys())[:10]}")
    print(f"year batches found: {batches}")
    print(f"other keys: {other_keys}")
    print(f"file size: {p.stat().st_size} bytes")

    for batch in batches:
        entries = d[batch]
        if isinstance(entries, dict):
            n_courses = len(entries)
            n_sections = sum(len(v) for v in entries.values()) if entries else 0
            print(f"  {batch}: {n_courses} courses, {n_sections} section entries")
        else:
            print(f"  {batch}: {len(entries) if hasattr(entries, '__len__') else '?'} entries")

    if batches:
        print("RESULT: Scraper produced batch data (SUCCESS)")
        return 0
    else:
        print("RESULT: Scraper produced EMPTY output (only __meta__)")
        return 2


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "timetable.json"
    sys.exit(analyze(path))
