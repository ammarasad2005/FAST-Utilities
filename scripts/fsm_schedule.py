#!/usr/bin/env python3
"""
FAST School of Management (FSM) Timetable Scraper
=================================================
Parses the FSM Google Sheet (single sheet, days stacked vertically)
and outputs fsm_timetable.json in the same format as the FSC timetable.

Key differences from FSC scraper:
- Single sheet with all days stacked vertically (not one sheet per day)
- Course name and batch/section are in SEPARATE cells (7 cols apart)
- Batch/section code format: DEPT + SEM + SECTION (e.g., AF07B = AF, sem 07, sec B)
- Semester number → batch year: 01→2026, 03→2025, 05→2024, 07→2023
- Departments: BBA, BA (=BSBA), FT, AF
- Colors are inconsistent — text-based code is primary, color is fallback
- No MS section (all BS programs)

Output: fsm_timetable.json (same structure as timetable.json)
"""
import os
import sys
import json
import re
import urllib.request
import urllib.parse
from datetime import date, timedelta

# ── Configuration ──
SHEET_INPUT = os.environ.get("FSM_SHEET_INPUT", "https://docs.google.com/spreadsheets/d/1AnFQQhv9lu4grESE2ypbDG7E1QOPGgGCRiejem5ocPw/edit?usp=sharing")
API_KEY = os.environ.get("GOOGLE_SHEETS_API_KEY", "")

# ── Departments ──
FSM_DEPTS = {"BBA", "BA", "FT", "AF"}  # BSBA normalized to BA

# ── Semester → Batch year mapping ──
# 01 = 1st sem (2026), 03 = 3rd sem (2025), 05 = 5th sem (2024), 07 = 7th sem (2023)
def sem_to_batch(sem_num):
    """Convert semester number (01, 03, 05, 07) to batch year."""
    sem = int(sem_num)
    return str(2026 - (sem - 1) // 2)

# ── Time slot column layout ──
# Each slot is 9 columns wide. Course name at first col, batch/section 7 cols later.
TIME_SLOTS = [
    {"start_col": 3,  "time": "08:30-09:50"},
    {"start_col": 12, "time": "10:00-11:20"},
    {"start_col": 21, "time": "11:30-12:50"},
    {"start_col": 30, "time": "01:00-02:20"},
    {"start_col": 39, "time": "02:25-03:45"},
    {"start_col": 48, "time": "03:50-05:10"},
]
BATCH_OFFSET = 7  # batch/section code is 7 cols after course name

# ── Day names ──
DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

# ── FSM Color Map (from legend, for fallback) ──
FSM_COLOR_MAP = {
    (0.800, 0.600, 1.000): {"dept": "AF", "batch": "2026"},
    (0.851, 0.918, 0.827): {"dept": "AF", "batch": "2025"},
    (0.710, 0.890, 0.906): {"dept": "AF", "batch": "2024"},
    (0.600, 0.200, 0.400): {"dept": "AF", "batch": "2023"},
    (1.000, 0.533, 0.847): {"dept": "BBA", "batch": "2026"},
    (1.000, 0.698, 0.396): {"dept": "BBA", "batch": "2025"},
    (0.918, 0.263, 0.208): {"dept": "BBA", "batch": "2024"},
    (0.471, 0.733, 1.000): {"dept": "BBA", "batch": "2023"},
    (0.945, 0.557, 0.525): {"dept": "BA", "batch": "2026"},
    (0.000, 1.000, 1.000): {"dept": "BA", "batch": "2025"},
    (0.651, 0.890, 0.718): {"dept": "BA", "batch": "2024"},
    (0.184, 0.573, 0.600): {"dept": "BA", "batch": "2023"},
    (0.988, 0.839, 0.925): {"dept": "FT", "batch": "2026"},
    (0.733, 0.557, 0.012): {"dept": "FT", "batch": "2025"},
    (1.000, 0.882, 0.800): {"dept": "FT", "batch": "2024"},
    (0.992, 0.945, 0.804): {"dept": "FT", "batch": "2023"},
}

def identify_from_color(rv, gv, bv):
    """Identify dept+batch from cell color. Tolerance ±0.04."""
    for (cr, cg, cb), info in FSM_COLOR_MAP.items():
        if abs(rv - cr) <= 0.04 and abs(gv - cg) <= 0.04 and abs(bv - cb) <= 0.04:
            return (info["dept"], info["batch"], False)
    return None

# ── Parse batch/section code ──
def parse_batch_section(code):
    """
    Parse a batch/section code like 'AF07B', 'BBA01A', 'BSBA05C', 'FT07A/B'.
    Returns (dept, batch_year, section) or None.
    """
    code = code.strip()
    # Normalize BSBA → BA
    if code.startswith("BSBA"):
        code = "BA" + code[4:]

    m = re.match(r'^(BBA|BA|FT|AF)(\d{2})([A-Z](?:/[A-Z])?)', code)
    if not m:
        return None
    dept = m.group(1)
    sem = m.group(2)
    section = m.group(3)
    batch = sem_to_batch(sem)
    return (dept, batch, section)

# ── Fetch cell colors via Sheets API ──
def fetch_cell_colors(sheet_id):
    """Fetch all non-white cell colors from the Timetable sheet."""
    if not API_KEY:
        return {}

    url = (
        f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}"
        f"?key={API_KEY}"
        f"&includeGridData=true"
        f"&fields=sheets(data(rowData(values(userEnteredValue,userEnteredFormat(backgroundColor)))))"
        f"&ranges={urllib.parse.quote('Timetable', safe='')}"
    )
    try:
        resp = urllib.request.urlopen(url, timeout=60)
        data = json.loads(resp.read().decode("utf-8"))
        sheets = data.get("sheets", [])
        if not sheets:
            return {}
        grid_data = sheets[0].get("data", [])
        if not grid_data:
            return {}
        row_data = grid_data[0].get("rowData", [])

        colors = {}
        for r, row in enumerate(row_data):
            cells = row.get("values", [])
            for c, cell in enumerate(cells):
                fmt = cell.get("userEnteredFormat", {})
                bg = fmt.get("backgroundColor", {})
                if bg:
                    rv = bg.get("red", 0)
                    gv = bg.get("green", 0)
                    bv = bg.get("blue", 0)
                    if rv > 0.98 and gv > 0.98 and bv > 0.98:
                        continue  # white
                    colors[(r, c)] = (rv, gv, bv)
        print(f"  FSM color data loaded: {len(colors)} colored cells")
        return colors
    except Exception as e:
        print(f"  Could not fetch FSM cell colors: {e}")
        return {}

# ── Main scraping logic ──
def main():
    # Extract sheet ID
    if "/d/" in SHEET_INPUT:
        sheet_id = SHEET_INPUT.split("/d/")[1].split("/")[0]
    else:
        sheet_id = SHEET_INPUT
    sheet_id = sheet_id.split("/")[0].strip()

    print(f"FSM Spreadsheet ID: {sheet_id}")
    print("Fetching and parsing FSM timetable...")

    # Fetch gviz data
    gviz_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:json&sheet=Timetable"
    resp = urllib.request.urlopen(gviz_url, timeout=30)
    text = resp.read().decode("utf-8", errors="replace")
    start_idx = text.find("{")
    end_idx = text.rfind("}") + 1
    data = json.loads(text[start_idx:end_idx])
    rows = data.get("table", {}).get("rows", [])
    print(f"  Fetched {len(rows)} rows from Timetable sheet")

    # Fetch colors
    cell_colors = fetch_cell_colors(sheet_id)

    # ── Build day → rows mapping ──
    # Days are stacked vertically. Find day boundaries.
    day_boundaries = {}  # day_name → (start_row, end_row, lab_start_row)
    current_day = None
    day_start = None
    lab_start = None

    for row_idx, r in enumerate(rows):
        cells = r.get("c", [])
        first_val = str(cells[0].get("v", "")).strip() if cells and cells[0] and cells[0].get("v") else ""

        if first_val in DAY_NAMES:
            # Save previous day
            if current_day:
                day_boundaries[current_day] = (day_start, row_idx - 1, lab_start)
            current_day = first_val
            day_start = row_idx
            lab_start = None

        # Detect Labs section
        second_val = str(cells[1].get("v", "")).strip() if len(cells) > 1 and cells[1] and cells[1].get("v") else ""
        col2_val = str(cells[2].get("v", "")).strip() if len(cells) > 2 and cells[2] and cells[2].get("v") else ""
        if (second_val == "Labs" or col2_val == "Labs") and current_day and lab_start is None:
            lab_start = row_idx

    # Save last day
    if current_day:
        day_boundaries[current_day] = (day_start, len(rows) - 1, lab_start)

    print(f"  Day boundaries: {day_boundaries}")

    # ── Parse each day ──
    # Output structure: batch → dept → "regular"|"repeat" → course_name → section → day → [slots]
    data_hierarchy = {}
    timetable_meta = {"days": []}

    for day_name in DAY_NAMES:
        if day_name not in day_boundaries:
            continue

        start_row, end_row, lab_start_row = day_boundaries[day_name]
        timetable_meta["days"].append({
            "day": day_name,
            "sheetName": day_name,
            "date": "",
            "isoDate": "",
            "isMakeup": False
        })

        # Determine the header row (should be 2 rows before the day start)
        # The header row has "Room" in col 2 and time slots in cols 3, 12, 21, 30, 39, 48
        header_row_idx = start_row - 1  # Row before the day's first data row
        # Actually the header is at row 2 (global). Each day section re-uses the same time slots.
        # Let's just use the fixed TIME_SLOTS config.

        # Process class rows (from day_start+1 to lab_start-1, or end_row if no labs)
        class_end = lab_start_row - 1 if lab_start_row else end_row
        is_lab_section = False

        for row_idx in range(start_row + 1, end_row + 1):
            if row_idx >= len(rows):
                break
            if row_idx == lab_start_row:
                is_lab_section = True
                continue

            r = rows[row_idx]
            cells = r.get("c", [])

            # Room name is in col 2
            room_cell = cells[2] if len(cells) > 2 else None
            current_room = str(room_cell.get("v", "")).strip() if room_cell and room_cell.get("v") else ""
            if not current_room or current_room.lower() in ("labs", "room"):
                continue

            # Scan each time slot
            for slot in TIME_SLOTS:
                course_col = slot["start_col"]
                batch_col = course_col + BATCH_OFFSET
                time_str = slot["time"]

                # Get course name
                course_cell = cells[course_col] if course_col < len(cells) else None
                course_val = str(course_cell.get("v", "")).replace("\n", " ").strip() if course_cell and course_cell.get("v") else ""
                if not course_val:
                    continue

                # Skip time slot headers
                if re.match(r'^\d{1,2}:\d{2}', course_val):
                    continue

                # Get batch/section code
                batch_cell = cells[batch_col] if batch_col < len(cells) else None
                batch_val = str(batch_cell.get("v", "")).strip() if batch_cell and batch_cell.get("v") else ""

                # Parse batch/section from text code
                dept = batch = section = None
                if batch_val:
                    parsed = parse_batch_section(batch_val)
                    if parsed:
                        dept, batch, section = parsed

                # Fallback: use color if text code didn't parse
                if dept is None and cell_colors:
                    color_key = (row_idx, course_col)
                    if color_key in cell_colors:
                        rv, gv, bv = cell_colors[color_key]
                        color_result = identify_from_color(rv, gv, bv)
                        if color_result:
                            dept, batch, _ = color_result

                # If still no dept, try the batch cell's color
                if dept is None and cell_colors:
                    batch_color_key = (row_idx, batch_col)
                    if batch_color_key in cell_colors:
                        rv, gv, bv = cell_colors[batch_color_key]
                        color_result = identify_from_color(rv, gv, bv)
                        if color_result:
                            dept, batch, _ = color_result

                if dept is None or batch is None:
                    continue

                if section is None:
                    section = "A"

                # Clean course name (remove leading course code like "MG4011 ")
                # Keep the full name — the course code prefix is useful for identification
                course_name = course_val
                # Strip leading tab/whitespace
                course_name = course_name.lstrip("\t ").strip()
                # If lab section, ensure "Lab" suffix
                if is_lab_section and not course_name.lower().endswith("lab"):
                    course_name = f"{course_name} Lab"

                # Override time if the cell contains explicit time
                time_match = re.search(r'(\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2})', course_val)
                if time_match:
                    time_str = time_match.group(1)

                # Determine category (all regular for now — FSM doesn't have repeat concept)
                category = "regular"

                # Build slot record
                slot_data = {
                    "room": current_room,
                    "time": time_str,
                    "rescheduled": False,
                    "is_elective": False,
                    "elective_group": None,
                    "exam": False
                }

                # Add to hierarchy
                if batch not in data_hierarchy:
                    data_hierarchy[batch] = {}
                if dept not in data_hierarchy[batch]:
                    data_hierarchy[batch][dept] = {"regular": {}, "repeat": {}}
                target = data_hierarchy[batch][dept][category]
                if course_name not in target:
                    target[course_name] = {}
                if section not in target[course_name]:
                    target[course_name][section] = {}
                if day_name not in target[course_name][section]:
                    target[course_name][section][day_name] = []
                target[course_name][section][day_name].append(slot_data)

    data_hierarchy["__meta__"] = timetable_meta

    # ── Output ──
    output_filename = "fsm_timetable.json"
    import re as _re
    year_batches = [k for k in data_hierarchy.keys() if _re.match(r'^20\d{2}$', k)]
    print(f"  year_batches={year_batches}")

    total_courses = sum(
        len(courses)
        for batch, depts in data_hierarchy.items()
        if batch != "__meta__" and isinstance(depts, dict)
        for dept, cats in depts.items() if isinstance(cats, dict)
        for cat, courses in cats.items() if isinstance(courses, dict)
    )
    print(f"  Total courses: {total_courses}")

    with open(output_filename, "w") as f:
        json.dump(data_hierarchy, f, indent=4)
    print(f"\n✅ FSM timetable exported to: {output_filename}")
    print(f"   Year batches: {year_batches}")
    print(f"   Total courses: {total_courses}")


if __name__ == "__main__":
    main()
