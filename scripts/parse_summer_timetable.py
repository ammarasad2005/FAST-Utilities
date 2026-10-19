import os
import sys
import json
import re
import urllib.request
import urllib.parse
import zipfile
import io
import csv
import xml.etree.ElementTree as ET
from datetime import date, timedelta

CANONICAL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
DAY_ALIASES = {
    "mon": "Monday", "monday": "Monday",
    "tue": "Tuesday", "tues": "Tuesday", "tuesday": "Tuesday",
    "wed": "Wednesday", "weds": "Wednesday", "wednesday": "Wednesday",
    "thu": "Thursday", "thur": "Thursday", "thurs": "Thursday", "thursday": "Thursday",
    "fri": "Friday", "friday": "Friday",
    "sat": "Saturday", "saturday": "Saturday",
}

MONTH_NUM_MAP = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

MONTH_PATTERN = r"(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
DATE_PATTERNS = [
    re.compile(rf"(?i)\b(?P<day>\d{{1,2}})(?:st|nd|rd|th)?\s*[-/,]?\s*(?P<month>{MONTH_PATTERN})\.?\s*(?:[-/,]?\s*(?P<year>\d{{4}}))?\b"),
    re.compile(rf"(?i)\b(?P<month>{MONTH_PATTERN})\.?\s*[-/,]?\s*(?P<day>\d{{1,2}})(?:st|nd|rd|th)?\s*(?:[-/,]?\s*(?P<year>\d{{4}}))?\b"),
]

DAY_INDEX = {name: idx for idx, name in enumerate(CANONICAL_DAYS)}

def extract_date_label(sheet_title):
    parsed, explicit_year = parse_sheet_date(sheet_title, date.today())
    if not parsed:
        return ""
    label = parsed.strftime("%d %b")
    if explicit_year:
        label = f"{label} {parsed.year}"
    return label

def parse_sheet_date(sheet_title, reference_day):
    for pattern in DATE_PATTERNS:
        match = pattern.search(sheet_title)
        if not match:
            continue

        day_num = int(match.group("day"))
        month_token = match.group("month").lower().rstrip('.')
        month_num = MONTH_NUM_MAP.get(month_token)
        if not month_num:
            continue

        year_group = match.groupdict().get("year")
        explicit_year = bool(year_group)

        if explicit_year:
            try:
                return date(int(year_group), month_num, day_num), True
            except ValueError:
                continue

        candidates = []
        for candidate_year in (reference_day.year - 1, reference_day.year, reference_day.year + 1):
            try:
                d = date(candidate_year, month_num, day_num)
                candidates.append(d)
            except ValueError:
                continue

        if not candidates:
            continue

        best = min(candidates, key=lambda d: abs((d - reference_day).days))
        return best, False

    return None, False

def resolve_timetable_sheets(sheet_id, sheet_names, explicit_mappings=None):
    try:
        sheet_names = fetch_workbook_sheet_names(sheet_id)
        print(f"Resolved workbook sheet names: {', '.join(sheet_names)}")
    except Exception as exc:
        print(f"Warning: Could not inspect workbook tabs; falling back to canonical day names. Error: {exc}")
        return [
            {"day": day, "sheet_name": day, "date": "", "isoDate": (date.today() - timedelta(days=date.today().weekday()) + timedelta(days=DAY_INDEX[day])).strftime("%Y-%m-%d"), "isMakeup": False}
            for day in CANONICAL_DAYS
        ]

    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    # 1. Try LLM resolution if GROQ_API_KEY is present
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    llm_resolved = None
    if api_key:
        print("Attempting to resolve sheet names via Groq LLM...")
        llm_resolved = resolve_sheets_via_llm(sheet_names, api_key)

    resolved = []
    used = set()

    if llm_resolved:
        print(f"LLM successfully resolved sheets: {json.dumps(llm_resolved)}")
        for item in llm_resolved:
            sheet_name = item.get("sheet_name")
            day = item.get("canonical_day")
            parsed_date_str = item.get("parsed_date")
            is_makeup = bool(item.get("is_makeup", False))

            if not sheet_name or not day or day not in CANONICAL_DAYS or sheet_name not in sheet_names:
                continue

            # Date calculations
            if parsed_date_str:
                parsed_d, explicit_year = parse_sheet_date(sheet_name, today)
                if parsed_d:
                    date_label = parsed_d.strftime("%d %b")
                    iso_label = parsed_d.strftime("%Y-%m-%d")
                else:
                    date_label = parsed_date_str
                    iso_label = today.strftime("%Y-%m-%d")
            else:
                target_date = week_start + timedelta(days=DAY_INDEX[day])
                date_label = target_date.strftime("%d %b")
                iso_label = target_date.strftime("%Y-%m-%d")

            resolved.append({
                "day": day,
                "sheet_name": sheet_name,
                "date": date_label,
                "isoDate": iso_label,
                "isMakeup": is_makeup
            })
            used.add(sheet_name)

    # 2. If LLM resolution is not available or returned nothing, fall back to current heuristics/explicit mappings
    if not resolved:
        print("Falling back to deterministic date-proximity and alias heuristics.")
        for day in CANONICAL_DAYS:
            # Check if there is an explicit sheet name mapping defined for this day
            if explicit_mappings and explicit_mappings.get(day):
                explicit_sheet = explicit_mappings[day].strip()
                if explicit_sheet:
                    parsed_d, explicit_year = parse_sheet_date(explicit_sheet, today)
                    if parsed_d:
                        date_label = parsed_d.strftime("%d %b")
                        iso_label = parsed_d.strftime("%Y-%m-%d")
                    else:
                        target_date = week_start + timedelta(days=DAY_INDEX[day])
                        date_label = extract_date_label(explicit_sheet) or target_date.strftime("%d %b")
                        iso_label = target_date.strftime("%Y-%m-%d")

                    resolved.append({
                        "day": day,
                        "sheet_name": explicit_sheet,
                        "date": date_label,
                        "isoDate": iso_label,
                        "isMakeup": "makeup" in explicit_sheet.lower() or "rescheduled" in explicit_sheet.lower()
                    })
                    used.add(explicit_sheet)
                    continue

            target_date = week_start + timedelta(days=DAY_INDEX[day])
            matched_sheets = []
            for sheet_name in sheet_names:
                if sheet_name in used:
                    continue
                if resolve_day_name(sheet_name) == day:
                    matched_sheets.append(sheet_name)

            if matched_sheets:
                for matched_sheet in matched_sheets:
                    parsed_date, explicit_year = parse_sheet_date(matched_sheet, target_date)
                    if parsed_date:
                        date_label = parsed_date.strftime("%d %b")
                        iso_label = parsed_date.strftime("%Y-%m-%d")
                        is_makeup = True
                    else:
                        date_label = extract_date_label(matched_sheet) or ""
                        iso_label = target_date.strftime("%Y-%m-%d")
                        is_makeup = "makeup" in matched_sheet.lower() or "rescheduled" in matched_sheet.lower()

                    resolved.append({
                        "day": day,
                        "sheet_name": matched_sheet,
                        "date": date_label,
                        "isoDate": iso_label,
                        "isMakeup": is_makeup
                    })
                    used.add(matched_sheet)
            else:
                resolved.append({
                    "day": day,
                    "sheet_name": day,
                    "date": "",
                    "isoDate": target_date.strftime("%Y-%m-%d"),
                    "isMakeup": False
                })

    return resolved

def _load_dotenv():
    try:
        with open(".env.local", "r") as f:
            for line in f:
                if "=" in line and not line.strip().startswith("#"):
                    key, val = line.strip().split("=", 1)
                    os.environ[key] = val.strip().replace('"', '').replace("'", "")
    except FileNotFoundError:
        pass

_load_dotenv()

def fetch_db_settings():
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    if not supabase_url or not supabase_key:
        return None, {}
    try:
        url = f"{supabase_url}/rest/v1/semester_settings?id=eq.1&select=google_sheets_url,sheet_name_mappings"
        req = urllib.request.Request(url, headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
        })
        resp = urllib.request.urlopen(req, timeout=6)
        rows = json.loads(resp.read().decode("utf-8"))
        if rows:
            row = rows[0]
            return row.get("google_sheets_url"), row.get("sheet_name_mappings") or {}
    except Exception as e:
        print(f"⚠  Could not fetch settings from Supabase: {e}")
    return None, {}

def fetch_workbook_sheet_names(sheet_id):
    api_key = os.environ.get("GOOGLE_SHEETS_API_KEY")
    if api_key:
        api_url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}?fields=sheets.properties.title&key={api_key}"
        try:
            req = urllib.request.Request(api_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=6) as response:
                data = json.loads(response.read().decode("utf-8"))
                sheet_names = [sheet["properties"]["title"] for sheet in data.get("sheets", [])]
                if sheet_names:
                    print(f"Successfully fetched {len(sheet_names)} sheet names via official Google Sheets API.")
                    return sheet_names
        except Exception as e:
            print(f"Warning: Official Google Sheets API call failed: {e}. Falling back to scraping/zip methods.")

    html_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit?usp=sharing"
    request = urllib.request.Request(html_url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        html = urllib.request.urlopen(request).read().decode("utf-8", errors="ignore")
        sheet_pattern = re.compile(
            r'(?i)\b(?:monday|tuesday|wednesday|thursday|friday|saturday|mon|tue|wed|thu|fri|sat)(?:\s*\([^)]{1,40}\))?'
        )
        sheet_names = []
        seen = set()
        for match in sheet_pattern.finditer(html):
            title = match.group(0).strip()
            normalized = title.lower()
            if normalized not in seen:
                seen.add(normalized)
                sheet_names.append(title)
        if sheet_names:
            return sheet_names
    except Exception as e:
        print(f"HTML workbook inspection failed: {e}. Falling back to zip method.")

    # Fallback to ZIP/XML method
    export_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=xlsx"
    response = urllib.request.urlopen(export_url)
    workbook_bytes = response.read()
    with zipfile.ZipFile(io.BytesIO(workbook_bytes)) as workbook_zip:
        workbook_xml = workbook_zip.read("xl/workbook.xml")
    root = ET.fromstring(workbook_xml)
    namespace = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    return [sheet.attrib["name"] for sheet in root.findall("main:sheets/main:sheet", namespace)]

def resolve_sheets_via_llm(sheet_names, api_key, model="llama-3.3-70b-versatile"):
    import urllib.request
    import json
    
    API_URL = "https://api.groq.com/openai/v1/chat/completions"
    
    system_prompt = (
        "You are an expert scheduler assistant. Your task is to analyze a list of sheet names from a university timetable workbook "
        "and determine which sheets correspond to weekdays (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday).\n\n"
        "Rules:\n"
        "1. Identify the weekday for each sheet name (e.g. 'Mon', 'Monday', 'Tuesday (18 May)', 'Thu (Makeup)' represent Monday, Monday, Tuesday, Thursday respectively).\n"
        "2. Detect if the sheet name contains an explicit date. Extract that date in a clean format like 'DD Mmm' (e.g., '18 May', '05 Jun'). If no explicit date is mentioned in the sheet name, return null.\n"
        "3. Detect if the sheet name suggests it is a makeup/rescheduled day (e.g., contains 'makeup', 'make-up', 'rescheduled', 're-scheduled', etc.).\n"
        "4. Ignore sheets that are not day timetables (e.g. 'Instructions', 'Teacher Info', 'Main', 'Index', 'Settings').\n"
        "5. Respond ONLY with a valid JSON object containing a 'sheets' key whose value is an array of objects. Each object in the array must have these exact keys:\n"
        "   - 'sheet_name': the exact sheet name string\n"
        "   - 'canonical_day': one of 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'\n"
        "   - 'parsed_date': 'DD Mmm' (e.g., '19 May') or null\n"
        "   - 'is_makeup': true or false"
    )
    
    user_prompt = f"Analyze these sheet names: {json.dumps(sheet_names)}"
    
    payload = {
        "model": model,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    }
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        req = urllib.request.Request(
            API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            resp_data = json.loads(response.read().decode("utf-8"))
            content = resp_data["choices"][0]["message"]["content"]
            result = json.loads(content)
            if isinstance(result, dict) and "sheets" in result:
                return result["sheets"]
            if isinstance(result, list):
                return result
            print(f"Warning: Unexpected LLM response format: {content}")
    except Exception as e:
        print(f"Warning: Failed to resolve sheet names via Groq LLM: {e}")
    return None

def resolve_day_name(sheet_title):
    cleaned = re.sub(r"\s*\([^)]*\)\s*$", "", sheet_title).strip()
    prefix_match = re.match(r"^([A-Za-z]+)", cleaned)
    if not prefix_match:
        return None
    prefix = prefix_match.group(1).lower()
    if prefix in DAY_ALIASES:
        return DAY_ALIASES[prefix]
    for short_name, canonical in DAY_ALIASES.items():
        if prefix.startswith(short_name):
            return canonical
    return None

def parse_csv(csv_text):
    f = io.StringIO(csv_text)
    reader = csv.reader(f)
    return list(reader)

def parse_cell_details(cell_content):
    cell_content = cell_content.strip()
    val = cell_content.lower()
    
    if not cell_content:
        return "", "", False, False, False
        
    if "reserved" in val:
        return "Reserved", "Reserved", True, False, False
        
    # Check cancellation
    is_cancelled = False
    if "cancel" in val or "cancle" in val:
        is_cancelled = True
        # Remove cancel keyword and any surrounding parens
        cell_content = re.sub(r'(?i)\s*\(\s*(?:cancel|cancle)[a-z]*\s*\)\s*', ' ', cell_content)
        cell_content = re.sub(r'(?i)\s*\b(?:cancel|cancle)[a-z]*\b\s*', ' ', cell_content)
        cell_content = cell_content.strip()
        
    # Check rescheduled
    is_rescheduled = False
    if re.search(r'(?i)\b(?:resched[a-z]*|resch)\b', cell_content):
        is_rescheduled = True
        # Remove rescheduled keyword and any surrounding parens
        cell_content = re.sub(r'(?i)\s*\(\s*(?:resched[a-z]*|resch)\s*\)\s*', ' ', cell_content)
        cell_content = re.sub(r'(?i)\s*\b(?:resched[a-z]*|resch)\b\s*', ' ', cell_content)
        cell_content = cell_content.strip()
        
    # Extract course name and section
    match = re.match(r'^([^(]+?)\s*\(\s*([A-Za-z0-9\-/]+)\s*\)', cell_content)
    if match:
        course_name = match.group(1).strip()
        section = match.group(2).strip()
    else:
        course_name = cell_content
        section = "A"
        
    return course_name, section, False, is_cancelled, is_rescheduled

def process_sheet_rows(rows, day_name):
    if len(rows) < 2:
        return []

    is_grid_format = False
    for i in range(min(len(rows), 5)):
        first_cell = rows[i][0].lower().strip() if len(rows[i]) > 0 else ""
        if first_cell in ["room", "rooms", "lab", "labs"]:
            is_grid_format = True
            break

    entries = []

    if is_grid_format:
        current_time_headers = None
        for row in rows:
            if not row:
                continue
            first_cell = row[0].lower().strip()
            if first_cell in ["room", "rooms", "lab", "labs"]:
                current_time_headers = row
                continue
            
            if current_time_headers:
                room = row[0].strip()
                if not room or "reserved" in room.lower() or "students" in room.lower():
                    continue
                for col in range(1, min(len(row), len(current_time_headers))):
                    cell = row[col].strip()
                    if not cell:
                        continue
                    time_slot = current_time_headers[col].strip()
                    if not time_slot:
                        continue
                    
                    course_name, section, is_reserved, is_cancelled, is_rescheduled = parse_cell_details(cell)
                    entries.append({
                        "courseName": course_name,
                        "section": section,
                        "day": day_name,
                        "time": time_slot,
                        "room": room,
                        "isReserved": is_reserved,
                        "isCancelled": is_cancelled,
                        "isRescheduled": is_rescheduled
                    })
    else:
        # Flat table format
        headers = [h.lower().strip() for h in rows[0]]
        course_idx = -1
        section_idx = -1
        day_idx = -1
        time_idx = -1
        room_idx = -1

        for idx, h in enumerate(headers):
            if "course" in h or "subject" in h or "class" in h:
                course_idx = idx
            elif "section" in h or "sec" in h:
                section_idx = idx
            elif "day" in h:
                day_idx = idx
            elif "time" in h or "slot" in h:
                time_idx = idx
            elif "room" in h or "venue" in h:
                room_idx = idx

        for row in rows[1:]:
            if not row or all(c == "" for c in row):
                continue
            course_val = row[course_idx].strip() if course_idx < len(row) and course_idx >= 0 else ""
            if not course_val:
                continue
            
            course_name, section, is_reserved, is_cancelled, is_rescheduled = parse_cell_details(course_val)
            # If section column is explicitly present, override
            if section_idx < len(row) and section_idx >= 0 and row[section_idx].strip():
                section = row[section_idx].strip()
                
            day_val = row[day_idx].strip() if day_idx < len(row) and day_idx >= 0 else day_name
            time_val = row[time_idx].strip() if time_idx < len(row) and time_idx >= 0 else ""
            room_val = row[room_idx].strip() if room_idx < len(row) and room_idx >= 0 else "TBA"

            entries.append({
                "courseName": course_name,
                "section": section,
                "day": day_val,
                "time": time_val,
                "room": room_val,
                "isReserved": is_reserved,
                "isCancelled": is_cancelled,
                "isRescheduled": is_rescheduled
            })

    return entries

def main():
    gs_url, sheet_mappings = fetch_db_settings()
    if not gs_url:
        print("Error: Could not retrieve Google Sheets URL from Supabase.")
        sys.exit(1)

    print(f"Fetching summer timetable from URL: {gs_url}")
    # Extract spreadsheet ID
    if "/d/" in gs_url:
        sheet_id = gs_url.split("/d/")[1].split("/")[0].strip()
    else:
        sheet_id = gs_url.strip()

    try:
        sheet_names = fetch_workbook_sheet_names(sheet_id)
        print(f"Resolved sheet tabs: {sheet_names}")
    except Exception as e:
        print(f"Error resolving worksheet names: {e}")
        sheet_names = CANONICAL_DAYS

    # Match tabs using date proximity and aliases
    day_sheets = resolve_timetable_sheets(sheet_id, sheet_names, sheet_mappings)
    timetable_meta = {"days": []}
    all_entries = []

    for day_info in day_sheets:
        day = day_info["day"]
        sheet_name = day_info["sheet_name"]
        
        timetable_meta["days"].append({
            "day": day,
            "sheetName": sheet_name,
            "date": day_info.get("date", ""),
            "isoDate": day_info.get("isoDate", ""),
            "isMakeup": day_info.get("isMakeup", False)
        })

        if sheet_name not in sheet_names:
            print(f"ℹ  No matching sheet found in workbook for {day} (expected '{sheet_name}'), skipping.")
            continue

        print(f"Downloading and parsing sheet: {sheet_name} ({day})")
        csv_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet={urllib.parse.quote(sheet_name)}"
        try:
            req = urllib.request.Request(csv_url, headers={"User-Agent": "Mozilla/5.0"})
            csv_text = urllib.request.urlopen(req).read().decode("utf-8")
            rows = parse_csv(csv_text)
            day_entries = process_sheet_rows(rows, sheet_name)
            all_entries.extend(day_entries)
            print(f"✅ Parsed {len(day_entries)} slots for {day}")
        except Exception as e:
            print(f"⚠  Failed to fetch/parse sheet '{sheet_name}': {e}")

    # Build the nested RawTimetableJSON structure:
    # batch ("Summer") -> department ("CS") -> category ("regular") -> courseName -> section -> day -> [{room, time}]
    nested_timetable = {
        "Summer": {
            "CS": {
                "regular": {},
                "repeat": {}
            }
        },
        "System": {
            "System": {
                "regular": {},
                "repeat": {}
            }
        }
    }

    for entry in all_entries:
        course = entry["courseName"]
        sec = entry["section"]
        day = entry["day"]
        room = entry["room"]
        time_slot = entry["time"]
        is_reserved = entry.get("isReserved", False)
        is_cancelled = entry.get("isCancelled", False)
        is_rescheduled = entry.get("isRescheduled", False)

        if is_reserved:
            target_map = nested_timetable["System"]["System"]["regular"]
        else:
            target_map = nested_timetable["Summer"]["CS"]["regular"]

        if course not in target_map:
            target_map[course] = {}
        if sec not in target_map[course]:
            target_map[course][sec] = {}
        if day not in target_map[course][sec]:
            target_map[course][sec][day] = []

        slot_data = {
            "room": room,
            "time": time_slot,
            "rescheduled": is_rescheduled,
            "exam": False,
            "is_elective": False,
            "elective_group": None
        }
        if is_cancelled:
            slot_data["cancelled"] = True

        target_map[course][sec][day].append(slot_data)

    # Add meta information
    nested_timetable["__meta__"] = timetable_meta

    # Save to timetable.json
    out_path = "timetable.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(nested_timetable, f, indent=2)
    print(f"✅ Successfully wrote nested summer timetable containing {len(all_entries)} slots to {out_path}")

if __name__ == "__main__":
    main()
