#!/usr/bin/env python3
"""
Transform raw Sessional 1 grid xlsx → organized exam_schedule.xlsx (flat table).

The raw file is a 2D grid (dates × 8 time slots) where each cell can contain
MULTIPLE program/batch/section combos for the same course. This script walks
the grid, parses each cell, and produces a flat-table xlsx with ONE ROW per
(course, department, batch) combo — matching the format that the existing
TypeScript parser (scripts/parse-excel.ts) expects.

INPUT  : /home/z/my-project/upload/sessional1_fall2026.xlsx
OUTPUT : /home/z/my-project/repo/exam-table/exam_schedule.xlsx (OVERWRITES)

Skips graduate programs (MS, PhD, MBA, MSBA, MEE) — undergrad (BS) only.
Omits the Room column (draft has no room assignments; regular semester JSON
has no room field either).

Usage:
    python3 /home/z/my-project/scripts/transform_sessional_to_organized.py
"""
from __future__ import annotations

import datetime as dt
import re
import sys
from pathlib import Path
from typing import Optional

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

RAW_FILE = Path("/home/z/my-project/upload/sessional1_fall2026.xlsx")
OUT_FILE = Path("/home/z/my-project/repo/exam-table/exam_schedule.xlsx")

# ── Sheet config ────────────────────────────────────────────────────────────
# (sheet_name_in_raw, school_code, has_late_afternoon_slots)
# FSC/FSM have 8 time slots (cols B,D,F,H,J,L,N,P). FSE has 6 (cols B,D,F,H,J,L).
SHEET_CONFIG = [
    ("FSC", "FSC", True),
    ("FSM", "FSM", True),
    ("FSE", "FSE", False),
]

# Column indices (1-based) for the 8 time slots
# A=date, B=slot1, C=divider, D=slot2, E=divider, F=slot3, G=divider,
# H=slot4, I=divider, J=slot5, K=divider, L=slot6, M=divider,
# N=slot7, O=divider, P=slot8
TIME_SLOT_COLS_FULL = [2, 4, 6, 8, 10, 12, 14, 16]   # B,D,F,H,J,L,N,P
TIME_SLOT_COLS_FSE  = [2, 4, 6, 8, 10, 12]             # B,D,F,H,J,L

# ── Course code pattern ─────────────────────────────────────────────────────
# Matches: SS1012, CS1002, MT-1003, AI4015, etc. (2-4 letters + optional
# hyphen/space + 4 digits)
COURSE_CODE_RE = re.compile(r"^([A-Za-z]{2,4}[\s\-]?\d{4})\s+(.*)$", re.DOTALL)

# ── Program patterns ────────────────────────────────────────────────────────
# BS(CS) (A,B,C) — BS with dept in parens, sections in second parens
BS_PAREN_SECTIONS_RE = re.compile(
    r"BS\s*\(\s*(CS|AI|DS|CY|SE|AF|FT|BA|EE|CE)\s*\)\s*(?:\(([^)]*)\))?",
    re.IGNORECASE,
)
# BS(CS)-A,B or BS(CS) A,B — BS with dept in parens, sections after dash or space
BS_DASH_SECTIONS_RE = re.compile(
    r"BS\s*\(\s*(CS|AI|DS|CY|SE|AF|FT|BA|EE|CE)\s*\)\s*[-]?\s*([A-Za-z0-9,]+)?",
    re.IGNORECASE,
)
# BBA-A,B,C or BBA (A,B,C) — BBA standalone
BBA_RE = re.compile(
    r"\bBBA\s*[-]?\s*(?:\(([^)]*)\)|([A-Za-z0-9,]+))?",
    re.IGNORECASE,
)
# BCE-A or BCE (A) — BS(CE) normalized
BCE_RE = re.compile(r"\bBCE\s*[-]?\s*(?:\(([^)]*)\)|([A-Za-z0-9,]+))?", re.IGNORECASE)
# BEE-A,B or BEE (A,B) — BS(EE) normalized
BEE_RE = re.compile(r"\bBEE\s*[-]?\s*(?:\(([^)]*)\)|([A-Za-z0-9,]+))?", re.IGNORECASE)

# Graduate program prefixes to SKIP (user decision: "no graduate progs considered")
GRAD_PREFIXES = ("MS", "PhD", "MB", "MSBA", "MEE", "MCI", "MAAIHS", "MYS", "MCS")

# Batch year extraction: 4-digit year starting with 20
BATCH_YEAR_RE = re.compile(r"\b(20\d{2})\b")


def normalize_course_code(raw: str) -> str:
    """Strip hyphens/spaces, uppercase. 'MT-1003' → 'MT1003', 'SS 1012' → 'SS1012'."""
    return re.sub(r"[\s\-]", "", raw).upper()


def extract_course_and_name(cell_text: str) -> tuple[str, str]:
    """Extract (course_code, course_name) from the first line of the cell.

    The first line typically looks like:
        'SS1012  Functional English   '
        'CS4075 Cloud Computing '
        'AI3001 Knowledge Rep. and Reasoning BS(AI) A,B,C 2024'  ← program inline!
        'MT1003 - Calculus and Analytical Geometry (CS 3Z)'  ← special section in parens
        'EE2003\\nComputer Organization and Assembly Language'  ← code on own line, name on next

    Returns (normalized_code, cleaned_name). If the first line has a program
    inline (like 'BS(AI) A,B,C 2024'), the program lines are left in the
    remaining text for separate parsing.
    """
    text = cell_text.strip()
    # Try to match course code at start
    m = COURSE_CODE_RE.match(text)
    if m:
        code_raw = m.group(1)
        rest = m.group(2).strip()
        # If rest contains a program line (BS(...), BBA, etc.), split it off
        # The course name is everything BEFORE the first program pattern
        program_start = re.search(
            r"(?:BS\s*\(|\bBBA\b|\bBCE\b|\bBEE\b|\bMS\s*\(|\bPhD\b|\bMB-|\bMSBA-|\bMEE-)",
            rest,
        )
        if program_start:
            name = rest[:program_start.start()].strip().rstrip("-").strip()
            # The program part stays in the cell text for separate parsing
            return normalize_course_code(code_raw), name
        else:
            # No program on the first line — name is the rest
            # Strip trailing batch year if present
            name = re.sub(r"\s+\d{4}$", "", rest).strip()
            return normalize_course_code(code_raw), name

    # Fallback: code might be on its own line, name on the next
    lines = text.split("\n")
    if lines:
        first_token = lines[0].strip()
        name = lines[1].strip() if len(lines) > 1 else ""
        return normalize_course_code(first_token), name

    return "", ""


def extract_batch_year(cell_text: str) -> str:
    """Extract the 4-digit batch year from the cell text.

    Looks for a standalone 4-digit year (20XX) on its own line FIRST (this is
    the cell-wide batch year that applies to all programs). Falls back to any
    4-digit year found anywhere in the text.

    Returns '' if no year found.
    """
    lines = cell_text.strip().split("\n")
    # Check last few lines for a standalone year
    for line in reversed(lines[-3:]):
        line = line.strip()
        if re.match(r"^\d{4}$", line):
            return line
    # Fallback: any 4-digit year in the full text
    m = BATCH_YEAR_RE.search(cell_text)
    return m.group(1) if m else ""


def parse_programs(cell_text: str) -> list[tuple[str, str]]:
    """Parse the cell text and extract all BS program lines.

    Returns a list of (department, sections_string) tuples.
    Skips graduate programs (MS, PhD, MBA, MSBA, MEE).

    Normalizes:
        BCE-A → ('CE', 'A')
        BEE-A,B,C → ('EE', 'A,B,C')
        BBA-A,B,C → ('BBA', 'A,B,C')
        BS(CS) (A,B,C) → ('CS', 'A,B,C')
        BS(CS)-A,B → ('CS', 'A,B')
    """
    programs: list[tuple[str, str]] = []
    seen = set()

    def add(dept: str, sections: str):
        dept = dept.upper().strip()
        sections = (sections or "").strip().rstrip(",").strip()
        key = (dept, sections)
        if key not in seen and dept:
            seen.add(key)
            programs.append((dept, sections))

    # 1. BS(dept) (sections) — most common
    for m in BS_PAREN_SECTIONS_RE.finditer(cell_text):
        dept = m.group(1)
        sections = m.group(2) or ""
        add(dept, sections)

    # 2. BBA (standalone program)
    for m in BBA_RE.finditer(cell_text):
        sections = m.group(1) or m.group(2) or ""
        add("BBA", sections)

    # 3. BCE → BS(CE)
    for m in BCE_RE.finditer(cell_text):
        sections = m.group(1) or m.group(2) or ""
        add("CE", sections)

    # 4. BEE → BS(EE)
    for m in BEE_RE.finditer(cell_text):
        sections = m.group(1) or m.group(2) or ""
        add("EE", sections)

    return programs


def format_degree_sections(dept: str, sections: str) -> str:
    """Build the 'Degree & Sections' cell value for the organized xlsx.

    'CS' + 'A,B,C' → 'BS(CS) (A,B,C)'
    'BBA' + 'A,B,C' → 'BBA (A,B,C)'
    'CE' + 'A' → 'BS(CE) (A)'
    'EE' + 'A,B,C' → 'BS(EE) (A,B,C)'
    """
    if dept.upper() == "BBA":
        return f"BBA ({sections})" if sections else "BBA"
    return f"BS({dept}) ({sections})" if sections else f"BS({dept})"


def format_date_yy_mm_dd(date_val: dt.datetime) -> str:
    """'2026-09-19' → '26-09-19' (YY-MM-DD, matching existing organized xlsx)."""
    return date_val.strftime("%y-%m-%d")


def normalize_time(time_str: str) -> str:
    """Ensure time string has AM/PM markers.

    The FSE sheet's header row has times without AM/PM ('9:00 to 10:00' instead
    of '9:00 to 10:00 AM'). The frontend's parseTime() function requires AM/PM
    to compute a sort key; without it, all entries sort to 0 and break
    chronological order within a day.

    Inference rule: use the END time's hour to determine AM/PM.
      - End hour 8-11 → AM (morning)
      - End hour 12 → PM (noon)
      - End hour 1-7 → PM (afternoon/evening)

    Using the END hour handles the noon-crossing slot correctly:
      '11:40 to 12:40' → end hour 12 → PM → '11:40 to 12:40 PM' ✓
    (If we used the START hour 11 → AM, it would be wrong — the slot ends
    after noon, so PM is the correct marker for the sort key.)

    '9:00 to 10:00' → '9:00 to 10:00 AM'
    '01:00 to 02:00' → '01:00 to 02:00 PM'
    '5:00 to 6:00' → '5:00 to 6:00 PM'
    """
    s = time_str.strip()
    if "AM" in s.upper() or "PM" in s.upper():
        return s  # Already has AM/PM
    # Extract all HH:MM pairs; use the LAST (end time) to infer AM/PM
    times = re.findall(r"(\d{1,2}):(\d{2})", s)
    if not times:
        return s
    end_h = int(times[-1][0])
    # 8-11 = morning (AM), 12 = noon (PM), 1-7 = afternoon (PM)
    period = "AM" if 8 <= end_h <= 11 else "PM"
    return f"{s} {period}"


def build_organized_sheet(ws_raw, school: str, time_slot_cols: list[int], header_row: int) -> list[dict]:
    """Walk one sheet's grid and return a list of row dicts.

    Each row dict has keys: date, time, courseCode, courseName, degreeSections, batch.
    """
    # Build effective value map (resolve merged cells)
    value_map: dict[tuple[int, int], object] = {}
    for row in ws_raw.iter_rows():
        for cell in row:
            value_map[(cell.row, cell.column)] = cell.value
    for merge in ws_raw.merged_cells.ranges:
        top_left_val = value_map.get((merge.min_row, merge.min_col))
        for r in range(merge.min_row, merge.max_row + 1):
            for c in range(merge.min_col, merge.max_col + 1):
                if (r, c) != (merge.min_row, merge.min_col):
                    value_map[(r, c)] = top_left_val

    # Read time slot headers from the header row (normalized with AM/PM)
    time_slots: dict[int, str] = {}  # col_idx → normalized time string
    for col in time_slot_cols:
        val = value_map.get((header_row, col))
        if val and isinstance(val, str) and val.strip():
            time_slots[col] = normalize_time(val.strip())

    rows: list[dict] = []
    current_date: Optional[dt.datetime] = None

    # Walk rows after the header
    for r in range(header_row + 1, ws_raw.max_row + 1):
        cell_a = value_map.get((r, 1))  # Column A = date

        # Date group start (cell A is a datetime — could be top-left of merge
        # OR inherited from merge). Either way, update current_date.
        if isinstance(cell_a, dt.datetime):
            current_date = cell_a
            # IMPORTANT: do NOT `continue` — the date row ALSO has course cells
            # in the time-slot columns that need processing. Fall through.

        # End of data (note row)
        elif isinstance(cell_a, str) and cell_a.strip().lower().startswith("note:"):
            break

        # Skip separator rows (fully merged, empty)
        elif cell_a is None or (isinstance(cell_a, str) and not cell_a.strip()):
            # Could be a row inside a date group — check if any time-slot cell has data
            has_data = any(value_map.get((r, col)) for col in time_slot_cols)
            if not has_data:
                continue

        if current_date is None:
            continue

        date_str = format_date_yy_mm_dd(current_date)

        # Process each time slot column
        for col in time_slot_cols:
            time_str = time_slots.get(col)
            if not time_str:
                continue

            cell_val = value_map.get((r, col))
            if not cell_val or not str(cell_val).strip():
                continue

            cell_text = str(cell_val).strip()

            # Skip cells that are just "Reserved" or similar
            if "reserved" in cell_text.lower():
                continue

            # Extract course code + name
            code, name = extract_course_and_name(cell_text)
            if not code or not name:
                continue

            # Extract batch year
            batch = extract_batch_year(cell_text)
            if not batch:
                # Skip — can't determine batch (user decision: no year = skip)
                continue

            # Parse programs (skip grad programs)
            programs = parse_programs(cell_text)
            if not programs:
                # No BS programs found (maybe all grad) — skip
                continue

            # Emit one row per BS program
            for dept, sections in programs:
                rows.append({
                    "date": date_str,
                    "time": time_str,
                    "courseCode": code,
                    "courseName": name.strip(),
                    "degreeSections": format_degree_sections(dept, sections),
                    "batch": batch,
                    "school": school,
                })

    return rows


def write_organized_xlsx(all_rows: list[dict], out_path: Path):
    """Write the organized xlsx with 3 sheets (FSC, FSM, FSE)."""
    wb = Workbook()
    wb.remove(wb.active)  # remove default sheet

    # Styling
    title_font = Font(bold=True, size=12)
    header_font = Font(bold=True, size=11)
    body_font = Font(size=11)
    center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    thin = Border(*[Side(style="thin")] * 4)
    header_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")

    HEADERS = ["S.No", "Date", "Time Slot", "Course Code", "Course Name",
               "Degree & Sections", "Batch"]
    COL_WIDTHS = [6, 12, 22, 12, 42, 28, 8]

    for school in ["FSC", "FSM", "FSE"]:
        sheet_rows = [r for r in all_rows if r["school"] == school]
        ws = wb.create_sheet(title=f"{school} Final")

        # Row 1: Title
        ws.merge_cells("A1:G1")
        title = ws["A1"]
        title.value = f"Structured Exam Schedule - {school} Final (BS) Fall 2026 Sessional 1"
        title.font = title_font
        title.alignment = center

        # Row 3: Headers
        for i, h in enumerate(HEADERS, start=1):
            cell = ws.cell(row=3, column=i, value=h)
            cell.font = header_font
            cell.alignment = center
            cell.fill = header_fill
            cell.border = thin

        # Row 4+: Data
        for idx, row in enumerate(sheet_rows, start=1):
            r = 3 + idx
            values = [
                idx,
                row["date"],
                row["time"],
                row["courseCode"],
                row["courseName"],
                row["degreeSections"],
                row["batch"],
            ]
            for i, v in enumerate(values, start=1):
                cell = ws.cell(row=r, column=i, value=v)
                cell.font = body_font
                cell.border = thin
                cell.alignment = center if i in (1, 2, 3, 4, 7) else left

        # Column widths
        for i, w in enumerate(COL_WIDTHS, start=1):
            ws.column_dimensions[get_column_letter(i)].width = w

        ws.freeze_panes = "A4"

    out_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out_path)


def main():
    if not RAW_FILE.exists():
        print(f"❌ Input file not found: {RAW_FILE}")
        return 1

    print(f"📖 Loading raw file: {RAW_FILE}")
    wb_raw = load_workbook(RAW_FILE, data_only=True)
    print(f"   Sheets: {wb_raw.sheetnames}")

    all_rows: list[dict] = []

    for sheet_name, school, has_late_slots in SHEET_CONFIG:
        if sheet_name not in wb_raw.sheetnames:
            print(f"  ⚠️  Sheet '{sheet_name}' not found — skipping.")
            continue

        ws = wb_raw[sheet_name]
        time_cols = TIME_SLOT_COLS_FULL if has_late_slots else TIME_SLOT_COLS_FSE

        # Find header row (row containing 'Days' in col A AND a time string in col B)
        header_row = None
        for r in range(1, min(ws.max_row + 1, 15)):
            a = ws.cell(row=r, column=1).value
            b = ws.cell(row=r, column=2).value
            if (a and isinstance(a, str) and "days" in a.lower()
                and b and isinstance(b, str) and re.search(r"\d{1,2}:\d{2}", b)):
                header_row = r
                break
        if header_row is None:
            print(f"  ⚠️  No header row in {sheet_name} — skipping.")
            continue

        print(f"\n🔄 Processing sheet '{sheet_name}' (school={school}, header_row={header_row})")
        sheet_rows = build_organized_sheet(ws, school, time_cols, header_row)
        print(f"   → {len(sheet_rows)} rows extracted")
        all_rows.extend(sheet_rows)

    # Summary
    print(f"\n📊 Total rows: {len(all_rows)}")
    from collections import Counter
    by_school = Counter(r["school"] for r in all_rows)
    print(f"   By school: {dict(by_school)}")
    by_batch = Counter(r["batch"] for r in all_rows)
    print(f"   By batch:  {dict(sorted(by_batch.items()))}")
    by_date = Counter(r["date"] for r in all_rows)
    print(f"   By date:   {dict(sorted(by_date.items()))}")

    if not all_rows:
        print("❌ No rows extracted — NOT writing output file.")
        return 1

    # Write organized xlsx
    write_organized_xlsx(all_rows, OUT_FILE)
    print(f"\n✅ Wrote organized xlsx to: {OUT_FILE}")
    print(f"   File size: {OUT_FILE.stat().st_size:,} bytes")

    # Print sample rows
    print(f"\n📋 Sample rows (first 5):")
    for r in all_rows[:5]:
        print(f"  {r['date']} | {r['time'][:25]:25} | {r['courseCode']:8} | {r['courseName'][:35]:35} | {r['degreeSections']:25} | batch={r['batch']}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
