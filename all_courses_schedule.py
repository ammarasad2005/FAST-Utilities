#!/usr/bin/env python3

import io
import urllib.request
import urllib.parse
import re
import json
import sys
import os
from datetime import date, timedelta
import zipfile
import xml.etree.ElementTree as ET

# ==============================================================================
# ADMIN PANEL OVERRIDE: Fetch course mappings from Supabase if override is ON.
# Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local
# ==============================================================================
def _load_dotenv(path=".env.local"):
    """Minimal .env.local parser — sets os.environ for keys not already set."""
    try:
        with open(path, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = val
    except FileNotFoundError:
        pass

_load_dotenv()

def _fetch_admin_mappings():
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    if not supabase_url or not supabase_key:
        return None, False, None, {}
    try:
        url = (
            f"{supabase_url}/rest/v1/semester_settings"
            f"?id=eq.1&select=regular_course_mappings,override_course_mappings,google_sheets_url,sheet_name_mappings"
        )
        req = urllib.request.Request(url, headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
        })
        resp = urllib.request.urlopen(req, timeout=6)
        rows = json.loads(resp.read().decode("utf-8"))
        if rows:
            row = rows[0]
            mappings = row.get("regular_course_mappings")
            override = bool(row.get("override_course_mappings", False))
            gs_url = row.get("google_sheets_url")
            sheet_mappings = row.get("sheet_name_mappings") or {}
            return mappings, override, gs_url, sheet_mappings
    except Exception as e:
        print(f"⚠  Could not fetch admin settings from Supabase: {e}")
    return None, False, None, {}


# ==============================================================================
# INPUT VARIABLE: Paste your Google Sheets string here.
# ==============================================================================
SHEET_INPUT = "https://docs.google.com/spreadsheets/d/1ZQJqdArlwCS965uw4sbJrB6j8rEPfZerMT7X8qkXSzY/edit?gid=2029661410#gid=2029661410"

# ==============================================================================
# SOURCE OF TRUTH: Predefined Mapping
# Used to determine the batch for Regular Courses.
# ==============================================================================
VALID_COURSES_MAP = {
    "2022": {
        "CS": ["Stat Modeling", "Entre", "Digital Mktg", "AI Prod Develop", "Gen AI", "Cloud Comp", "Tech Mgt", "Big Data", "Deep Learn", "Agentic AI", "Fund of Data Vis", "ML for Robo", "Robo Tech", "Fund of SPM", "MLOPs"],
        "SE": ["PPIT", "S/w Metrices", "Cloud Comp", "NLP", "Entre", "User Exp Engg", "Gen AI"],
        "AI": ["PPIT", "Fin Mgt", "Info Sec", "Blockchain", "Responsible AI", "Agentic AI", "Gen AI"],
        "DS": ["Reinf Learn", "Agentic AI", "MLOPs", "Fin Mgt", "NLP", "Resp AI", "Gen AI", "Comp Vision"],
        "CY": ["Blockchain", "Entre", "PPIT", "Cloud Security", "Blockchain"]
    },
    "2023": {
        "CS": ["PDC", "Web", "AI", "Comp Arch", "SE", "Comp Const", "DIP", "AI Lab"],
        "SE": ["SPM", "Civics", "Comp Net Lab", "AI Lab", "Comp Net", "AI", "Process Mining", "Formal Meth in SE"],
        "AI": ["Comp Vision", "NLP", "PDC", "Art Neural Net", "Comp Net", "Comp Net Lab"],
        "DS": ["Deep Learn", "AI", "PDC", "NLP", "AI Lab", "Data Mining", "Comp Net", "Comp Net Lab"],
        "CY": ["AI", "Digital Forensics", "Sec S/w Design", "Info Sec", "Malware Analysis", "Ethical Hack", "Digital Forensics Lab", "AI Lab", "Sec S/w Design Lab", "Comp Net", "Comp Net Lab"]
    },
    "2024": {
        "CS": ["DB", "OS", "Prob & Stats", "SDA", "DB Lab", "OS Lab", "AI", "AI Lab"],
        "SE": ["DB", "SRE", "SDA", "COAL", "OS", "COAL Lab", "OS Lab", "DB Lab", "Pak Studies"],
        "AI": ["DB", "AI", "OS", "DB Lab", "OS Lab", "AI Lab", "Pak Studies", "Fund of S/w Engg", "Prob & Stats"],
        "DS": ["AI", "AI Lab", "Pak Studies", "DB", "OS", "DB Lab", "OS Lab", "Prob & Stats", "Fund of S/w Engg"],
        "CY": ["Comp Net", "Prob & Stats", "Algo", "Pak Studies", "Comp Net Lab", "COAL Lab", "TBW", "COAL"]
    },
    "2025": {
        "CS": ["OOP", "Discrete", "Civics", "MV Calculus", "Pak Studies", "Exp Writing", "Exp Writing Lab", "OOP Lab"],
        "SE": ["DLD", "OOP", "MV Calculus", "Exp Writing", "Exp Writing Lab", "AP", "Seerah & UHQ-I", "OOP Lab", "DLD Lab"],
        "AI": ["OOP", "OOP Lab", "MV Calculus", "DLD", "DLD Lab", "AP", "Exp Writing", "Exp Writing Lab", "Seerah & UHQ-I"],
        "DS": ["OOP", "MV Calculus", "DLD", "DLD Lab", "Civics", "Pak Studies", "OOP Lab", "Exp Writing", "Exp Writing Lab"],
        "CY": ["OOP", "OOP Lab", "DLD", "DLD Lab", "MV Calculus", "AP", "Exp Writing", "Exp Writing Lab", "Seerah & UHQ-I"]
    }
}

# ==============================================================================
# RESOLVE: Which mapping to use (admin override vs hardcoded)
# ==============================================================================
_admin_mappings, _override_enabled, _db_sheets_url, _sheet_name_mappings = _fetch_admin_mappings()

if _db_sheets_url and _db_sheets_url.strip():
    SHEET_INPUT = _db_sheets_url.strip()
    print(f"✅ Loaded Google Sheets URL from Supabase: {SHEET_INPUT}")
else:
    print(f"ℹ  Using default/hardcoded Google Sheets URL: {SHEET_INPUT}")

if _override_enabled and _admin_mappings and isinstance(_admin_mappings, dict):
    EFFECTIVE_COURSES_MAP = _admin_mappings
    print("✅ Using admin-defined course mappings from Supabase (override is ON).")
else:
    EFFECTIVE_COURSES_MAP = VALID_COURSES_MAP
    if _override_enabled and not _admin_mappings:
        print("⚠  Override is ON but no admin mappings found in DB — falling back to hardcoded VALID_COURSES_MAP.")
    else:
        print("ℹ  Using hardcoded VALID_COURSES_MAP (override is OFF).")

DAY_ALIASES = {
    "mon": "Monday",
    "monday": "Monday",
    "tue": "Tuesday",
    "tues": "Tuesday",
    "tuesday": "Tuesday",
    "wed": "Wednesday",
    "weds": "Wednesday",
    "wednesday": "Wednesday",
    "thu": "Thursday",
    "thur": "Thursday",
    "thurs": "Thursday",
    "thursday": "Thursday",
    "fri": "Friday",
    "friday": "Friday",
    "sat": "Saturday",
    "saturday": "Saturday",
}

MONTH_MAP = {
    "january": "Jan", "jan": "Jan",
    "february": "Feb", "feb": "Feb",
    "march": "Mar", "mar": "Mar",
    "april": "Apr", "apr": "Apr",
    "may": "May",
    "june": "Jun", "jun": "Jun",
    "july": "Jul", "jul": "Jul",
    "august": "Aug", "aug": "Aug",
    "september": "Sep", "sep": "Sep",
    "october": "Oct", "oct": "Oct",
    "november": "Nov", "nov": "Nov",
    "december": "Dec", "dec": "Dec",
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

CANONICAL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
DAY_INDEX = {name: idx for idx, name in enumerate(CANONICAL_DAYS)}

# ==============================================================================
# HELPER: Batch reverse-lookup (returns ALL possible batches, not just the first)
# ==============================================================================
def find_possible_batches(course_name, dept=None):
    """Returns every batch in EFFECTIVE_COURSES_MAP that lists (dept, course_name)."""
    lookup_name = course_name[:-4].strip() if course_name.lower().endswith("lab") else course_name
    possible = []
    for b, departments in EFFECTIVE_COURSES_MAP.items():
        if dept:
            if dept in departments:
                courses = departments[dept]
                if course_name in courses or lookup_name in courses:
                    possible.append(b)
        else:
            for d, courses in departments.items():
                if course_name in courses or lookup_name in courses:
                    possible.append((b, d))
    return possible

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
            if normalized in seen:
                continue
            seen.add(normalized)
            sheet_names.append(title)

        if sheet_names:
            return sheet_names
    except Exception as e:
        print(f"HTML workbook inspection failed: {e}. Falling back to zip method.")

    export_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=xlsx"
    response = urllib.request.urlopen(export_url)
    workbook_bytes = response.read()

    with zipfile.ZipFile(io.BytesIO(workbook_bytes)) as workbook_zip:
        workbook_xml = workbook_zip.read("xl/workbook.xml")

    root = ET.fromstring(workbook_xml)
    namespace = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    return [sheet.attrib["name"] for sheet in root.findall("main:sheets/main:sheet", namespace)]

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

        # If year is omitted in the sheet tab, infer the nearest plausible year.
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

def resolve_timetable_sheets(sheet_id, explicit_mappings=None):
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

# ==============================================================================
# HELPER: Time Overlap Logic
# ==============================================================================
def parse_time_to_minutes(t_str):
    start_str, end_str = t_str.split('-')
    def to_mins(hm):
        h, m = map(int, hm.split(':'))
        if 1 <= h <= 7: h += 12  # PM mapping for afternoon FAST classes
        return h * 60 + m
    return to_mins(start_str.strip()), to_mins(end_str.strip())
    
def minutes_to_time(m):
    h = (m // 60)
    mi = m % 60
    # FAST 24h-like format used in scraper (1:00 PM is 1:00)
    h_disp = h - 12 if h > 12 else h
    return f"{h_disp:02d}:{mi:02d}"

def is_overlap(t1_str, t2_str):
    if t1_str == "Unknown Time" or t2_str == "Unknown Time": 
        return False
    try:
        s1, e1 = parse_time_to_minutes(t1_str)
        s2, e2 = parse_time_to_minutes(t2_str)
        return max(s1, s2) < min(e1, e2)
    except Exception:
        return False

def get_slot_quota(t_str):
    """
    80 min -> 2 slots
    105 min -> 1 slot
    165 min -> 1 slot
    Returns (duration_mins, quota)
    """
    if t_str == "Unknown Time":
        return 0, 999
    try:
        s, e = parse_time_to_minutes(t_str)
        duration = e - s
        if abs(duration - 80) <= 5: return duration, 2
        if abs(duration - 105) <= 5: return duration, 1
        if abs(duration - 165) <= 5: return duration, 1
        return duration, 999 # Default for unknown durations
    except:
        return 0, 999

def is_batch_busy(batch, dept, section, day, check_time, busy_calendar):
    key = f"{batch}-{dept}-{section}-{day}"
    occupied_times = busy_calendar.get(key, [])
    for busy_t in occupied_times:
        if is_overlap(check_time, busy_t):
            return True
    return False

def has_quota_room(batch, dept, section, course_name, quota, quota_calendar):
    """Checks if the batch has room in its weekly quota for this course."""
    if quota >= 999: return True
    key = f"{batch}-{dept}-{section}-{course_name}"
    assigned_count = quota_calendar.get(key, 0)
    return assigned_count < quota

# ==============================================================================
# SETUP
# ==============================================================================
if "/d/" in SHEET_INPUT:
    sheet_id = SHEET_INPUT.split("/d/")[1]
else:
    sheet_id = SHEET_INPUT

sheet_id = sheet_id.split('/')[0].replace('\r', '').strip()

if not sheet_id or sheet_id.startswith("http"):
    print("Error: Could not extract Spreadsheet ID.")
    sys.exit(1)

print(f"Using Spreadsheet ID: {sheet_id}")
print("Fetching and parsing unified timetable (2-pass constraint satisfaction)...")

day_sheets = resolve_timetable_sheets(sheet_id, _sheet_name_mappings)

# Regex patterns
repeat_pattern = re.compile(r'^([^(]+?)\s*\(\s*([A-Z]{2,}(?:\/[A-Z]{2,})?)\s*-\s*([A-Z0-9]+)\s*,\s*(\d{2})\s*\)')
regular_pattern = re.compile(r'^([^(]+?)\s*\(\s*(?:([A-Z]{2,}(?:\/[A-Z]{2,})?)\s*-)?\s*([^)]+?)\s*\)')
time_pattern    = re.compile(r'\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}')

# ==============================================================================
# CONSTRAINT SATISFACTION DATA STRUCTURES
#
#   busy_calendar      : "{batch}-{dept}-{section}-{day}" → list of time strings
#                        Tracks every confirmed slot so Pass 2 can eliminate
#                        impossible candidates.
#
#   unambiguous_classes: List of fully resolved class records (batch is known).
#
#   ambiguous_pool     : Records where 2+ batches are possible — deferred to
#                        Pass 2.
# ==============================================================================
busy_calendar       = {}   # key: "{batch}-{dept}-{section}-{day}" → list[str]
quota_calendar      = {}   # key: "{batch}-{dept}-{section}-{course_name}" -> int (count)
unambiguous_classes = []   # list of fully resolved records
ambiguous_pool      = []   # list of records still needing deduction
timetable_meta      = {"days": []}

# ==============================================================================
# PASS 1 — ANCHOR PASS
# Parse every sheet cell across all five day-tabs.
#   • Repeat courses   → batch is encoded in the cell text → anchor immediately.
#   • Regular courses  → call find_possible_batches():
#       len == 1  → unambiguous → anchor immediately
#       len  > 1  → ambiguous   → push to ambiguous_pool
#       len == 0  → unmapped    → discard
# ==============================================================================
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

    req_url = (
        f"https://docs.google.com/spreadsheets/d/{sheet_id}"
        f"/gviz/tq?tqx=out:json&sheet={urllib.parse.quote(sheet_name, safe='')}"
    )
    try:
        response = urllib.request.urlopen(req_url)
        text     = response.read().decode("utf-8")

        start_idx = text.find("{")
        end_idx   = text.rfind("}") + 1
        data      = json.loads(text[start_idx:end_idx])
        rows      = data.get("table", {}).get("rows", [])

        time_map        = {}
        master_time_map = {}
        current_room    = ""
        is_lab_section  = False

        for r in rows:
            cells = r.get("c", [])
            if not cells:
                continue

            first_val = (
                str(cells[0].get("v", "")).strip()
                if cells[0] and cells[0].get("v")
                else ""
            )

            if first_val in ("Room", "Lab"):
                is_lab_section = (first_val == "Lab")
                local_time_map = {}
                row_last_time  = "Unknown Time"
                
                for i in range(1, len(cells)):
                    c_val = str(cells[i].get("v", "")).strip() if cells[i] and cells[i].get("v") else ""
                    
                    if c_val and c_val not in ("Room", "Lab"):
                        row_last_time = c_val
                    elif not c_val and i in master_time_map:
                        # Fallback logic: 
                        # If current header cell is empty, check if master header starts a new slot
                        m_time = master_time_map[i]
                        if m_time != "Unknown Time" and row_last_time != "Unknown Time":
                            try:
                                m_start, m_end = parse_time_to_minutes(m_time)
                                r_start, r_end = parse_time_to_minutes(row_last_time)
                                # If master starts after current row_last_time ends, it's a new slot
                                if m_start >= r_end:
                                    row_last_time = m_time
                            except:
                                pass
                        elif row_last_time == "Unknown Time":
                            row_last_time = m_time
                    
                    local_time_map[i] = row_last_time
                
                # First header of the day becomes the master template
                if not master_time_map:
                    master_time_map = local_time_map.copy()
                
                time_map = local_time_map
                continue

            if first_val:
                current_room = first_val
            if not current_room:
                continue

            # ── Scan each column for a class entry ──
            for i in range(1, len(cells)):
                val = (
                    str(cells[i].get("v", "")).replace("\n", " ").strip()
                    if cells[i] and cells[i].get("v")
                    else ""
                )
                if not val:
                    continue

                val_lower = val.lower()
                is_reserved = False
                is_cancelled = False

                if "reserved" in val_lower:
                    time_slot = time_map.get(i, "Unknown Time")
                    if time_slot == "Unknown Time":
                        continue
                    unambiguous_classes.append({
                        "course_name": "Reserved",
                        "dept":        "System",
                        "section":     "Reserved",
                        "normalized_section": "Reserved",
                        "day":         day,
                        "sheet_name":  sheet_name,
                        "time":        time_slot,
                        "room":        current_room,
                        "category":    "regular",
                        "batch":       "System",
                        "is_rescheduled": False,
                        "is_exam":     False,
                        "isReserved":  True
                    })
                    continue

                if "cancel" in val_lower or "cancle" in val_lower:
                    is_cancelled = True
                    # Remove the cancel keyword and any surrounding parens
                    val = re.sub(r'(?i)\s*\(\s*(?:cancel|cancle)[a-z]*\s*\)\s*', ' ', val)
                    val = re.sub(r'(?i)\s*\b(?:cancel|cancle)[a-z]*\b\s*', ' ', val)
                    val = val.strip()

                course_name = dept = section = batch = category = None

                # Repeat courses carry the YY suffix, e.g. "AI (CS-A, 23)"
                rep_match = repeat_pattern.search(val)
                if rep_match:
                    course_name = rep_match.group(1).strip()
                    dept        = rep_match.group(2).strip()
                    section     = rep_match.group(3).strip()
                    batch       = "20" + rep_match.group(4).strip()
                    category    = "repeat"
                else:
                    reg_match = regular_pattern.search(val)
                    if reg_match:
                        course_name = reg_match.group(1).strip()
                        dept_group  = reg_match.group(2)
                        dept        = dept_group.strip() if dept_group else None
                        section     = reg_match.group(3).strip()
                        category    = "regular"
                        
                        # Fix for AI/DS department courses appearing as sections
                        # Matches "AI", "DS" or "DS, Gp-II", "AI, G-I"
                        for dcode in ["AI", "DS", "SE", "CY"]:
                            if dept is None:
                                if section == dcode:
                                    dept = dcode
                                    section = ""
                                    break
                                elif section.startswith(f"{dcode},") or section.startswith(f"{dcode} "):
                                    dept = dcode
                                    section = section[len(dcode):].strip(", ").strip()
                                    break
                        
                        if dept is None:
                            # Try to infer department directly
                            possible = find_possible_batches(course_name, dept=None)
                            if possible:
                                dept = possible[0][1] # (batch, dept)
                            else:
                                dept = "CS" # Fallback

                if not category:
                    continue

                # Normalize: force "Lab" suffix when inside the lab block
                if is_lab_section and not course_name.lower().endswith("lab"):
                    course_name = f"{course_name} Lab"

                # Determine if special slot
                is_saturday    = (day == "Saturday")
                is_rescheduled = any(k in val.lower() for k in ["rescheduled", "resch"])
                is_exam        = any(k in val.lower() for k in ["mid", "exam", "sessional"])
                
                # Logic: Saturday itself is a "rescheduled day" concept.
                # It bypasses quotas internally, but only carries the label if explicitly marked.
                bypasses_quota = is_rescheduled or is_saturday

                if is_rescheduled or is_exam:
                    # Strip keywords from course name if they got captured
                    course_name = re.sub(r'(?i)\b(resch(eduled)?|mid|exam|sessional)\b', '', course_name).strip()
                    label = "Exam" if is_exam else "Rescheduled"
                    print(f"  ✨ {label}: {course_name} ({dept}-{section}) on {day}")

                # Determine the class time
                explicit_time = time_pattern.search(val)
                actual_time   = (
                    explicit_time.group(0)
                    if explicit_time
                    else time_map.get(i, "Unknown Time")
                )

                # Skip Masters courses (scheduled after 5:15 PM)
                if actual_time != "Unknown Time":
                    try:
                        _, e_min = parse_time_to_minutes(actual_time)
                        if e_min > (17 * 60 + 15): # 17:15 is 5:15 PM
                            continue
                    except:
                        pass

                # Force specific durations based on cell type (per user request)
                is_actually_lab = is_lab_section or course_name.lower().endswith("lab")
                blocking_time = actual_time # Time slot used for conflict detection
                
                if actual_time != "Unknown Time":
                    try:
                        s_min, _ = parse_time_to_minutes(actual_time)
                        if is_exam:
                            # Exams/Sessionals are strictly 90 mins for display
                            e_min_disp = s_min + 90
                            actual_time = f"{minutes_to_time(s_min)}-{minutes_to_time(e_min_disp)}"
                            # But if it's a lab slot, it blocks the full 165 mins for other classes
                            # because a section can't have a 10:00 class if they are in a lab until 11:15
                            if is_actually_lab:
                                e_min_block = s_min + 165
                                blocking_time = f"{minutes_to_time(s_min)}-{minutes_to_time(e_min_block)}"
                            else:
                                blocking_time = actual_time
                        elif is_actually_lab:
                            # Regular labs are 165 mins
                            e_min = s_min + 165
                            actual_time = f"{minutes_to_time(s_min)}-{minutes_to_time(e_min)}"
                            blocking_time = actual_time
                    except Exception as e:
                        pass

                duration, quota = get_slot_quota(actual_time)

                # Base record — batch filled in when resolved
                record = {
                    "course_name": course_name,
                    "dept":        dept,
                    "section":     section,
                    "day":         day,
                    "sheet_name":  sheet_name,
                    "time":        actual_time,
                    "blocking_time": blocking_time,
                    "room":        current_room,
                    "category":    category,
                    "batch":       batch,        # None for regular until resolved
                    "is_rescheduled": is_rescheduled,
                    "is_saturday": is_saturday,
                    "bypasses_quota": bypasses_quota,
                    "is_exam":     is_exam,
                    "quota":       quota,
                    "isCancelled":  is_cancelled
                }

                if category == "repeat":
                    # Batch encoded in cell — anchor immediately
                    cal_key = f"{batch}-{dept}-{section}-{day}"
                    busy_calendar.setdefault(cal_key, []).append(blocking_time)
                    if not bypasses_quota:
                        q_key = f"{batch}-{dept}-{section}-{course_name}"
                        quota_calendar[q_key] = quota_calendar.get(q_key, 0) + 1
                    unambiguous_classes.append(record)

                else:  # regular
                    possible = find_possible_batches(course_name, dept)
                    if not possible:
                        continue
                    elif len(possible) == 1:
                        # Single candidate — anchor immediately
                        batch_val = possible[0]
                        record["batch"] = batch_val
                        cal_key = f"{batch_val}-{dept}-{section}-{day}"
                        busy_calendar.setdefault(cal_key, []).append(blocking_time)
                        if not bypasses_quota:
                            q_key = f"{batch_val}-{dept}-{section}-{course_name}"
                            quota_calendar[q_key] = quota_calendar.get(q_key, 0) + 1
                        unambiguous_classes.append(record)
                    else:
                        # Multiple candidates — defer to Pass 2
                        record["possible_batches"] = possible
                        ambiguous_pool.append(record)

    except Exception as e:
        print(f"Warning: Could not process {day} ({sheet_name}). Error: {e}")

print(
    f"\nPass 1 complete — "
    f"{len(unambiguous_classes)} anchored, "
    f"{len(ambiguous_pool)} deferred to deduction pass."
)

# ==============================================================================
# PASS 2 — DEDUCTION PASS
# For each ambiguous record, check busy_calendar at its exact slot key.
# A batch is "free" if its slot is NOT already occupied by a different batch.
# A section cannot be in two places at once, so the occupied batch eliminates
# itself as a candidate for any other class at the same slot.
#
# Logic:
#   free = [b for b in possible if busy_calendar.get(key) != b]
#   → if exactly 1 free candidate remains → assign it
#   → if 0 remain → conflict warning, skip
#   → if 2+ remain → still ambiguous, best-effort assign first free candidate
# ==============================================================================
deduced_count   = 0
conflict_count  = 0
fallback_count  = 0

still_ambiguous = ambiguous_pool.copy()
changed = True

while changed:
    changed = False
    next_ambiguous = []
    
    for record in still_ambiguous:
        dept           = record["dept"]
        section        = record["section"]
        day            = record["day"]
        actual_time    = record["time"]
        blocking_time  = record["blocking_time"]
        possible       = record["possible_batches"]
        course_name    = record["course_name"]
        quota          = record["quota"]
        is_rescheduled = record["is_rescheduled"]
        bypasses_quota = record.get("bypasses_quota", False)

        # Per-batch key: check if THAT batch is already busy or at its quota
        free_candidates = [
            b for b in possible
            if not is_batch_busy(b, dept, section, day, blocking_time, busy_calendar)
            and (bypasses_quota or has_quota_room(b, dept, section, course_name, quota, quota_calendar))
        ]

        if len(free_candidates) == 1:
            # Definitive deduction — exactly one batch can own this slot
            assigned = free_candidates[0]
            record["batch"] = assigned
            cal_key = f"{assigned}-{dept}-{section}-{day}"
            busy_calendar.setdefault(cal_key, []).append(blocking_time)
            if not bypasses_quota:
                q_key = f"{assigned}-{dept}-{section}-{record['course_name']}"
                quota_calendar[q_key] = quota_calendar.get(q_key, 0) + 1
            unambiguous_classes.append(record)
            changed = True
            deduced_count += 1

        elif len(free_candidates) == 0:
            # All candidate batches are already confirmed busy here — genuine conflict
            conflict_count += 1
            print(
                f"  ⚠ Conflict skipped: {record['course_name']} "
                f"({dept}-{section}) on {day} @ {actual_time} "
                f"— all {len(possible)} candidates already busy"
            )

        else:
            # Still ambiguous — keep for next pass
            record["possible_batches"] = free_candidates
            next_ambiguous.append(record)
            
    still_ambiguous = next_ambiguous

# Any remaining items in still_ambiguous could not be deduced.
# Sort to ensure that slots of the same course/section/time (e.g. Mon 10:00 and Wed 10:00) 
# are processed sequentially, allowing the quota logic to pair them to the same batch.
still_ambiguous.sort(key=lambda x: (x["dept"], x["section"], x["course_name"], x["time"]))

for record in still_ambiguous:
    dept           = record["dept"]
    section        = record["section"]
    day            = record["day"]
    actual_time    = record["time"]
    blocking_time  = record["blocking_time"]
    possible       = record["possible_batches"]
    course_name    = record["course_name"]
    quota_val      = record["quota"]
    is_rescheduled = record["is_rescheduled"]
    bypasses_quota = record.get("bypasses_quota", False)

    # Re-calculate free candidates based on the MOST RECENT quota and busy state
    free_candidates = [
        b for b in possible
        if not is_batch_busy(b, dept, section, day, blocking_time, busy_calendar)
        and (bypasses_quota or has_quota_room(b, dept, section, course_name, quota_val, quota_calendar))
    ]

    # Sort candidates by:
    # 1. "Already has some slots assigned" (Secondary sort - keeps pairs together)
    # 2. "Total room left" (Tertiary sort)
    free_candidates.sort(
        key=lambda b: (
            quota_calendar.get(f"{b}-{dept}-{section}-{course_name}", 0) > 0,
            quota_val - quota_calendar.get(f"{b}-{dept}-{section}-{course_name}", 0)
        ),
        reverse=True
    )

    if free_candidates:
        assigned = free_candidates[0]
        if "Comp Net Lab" in course_name or "AI Lab" in course_name:
            print(f"  [DEBUG] P2 Assignment: {course_name} ({dept}-{section}) on {day} @ {actual_time} -> {assigned}")
        new_record = record.copy()
        new_record["batch"] = assigned
        cal_key = f"{assigned}-{dept}-{section}-{day}"
        busy_calendar.setdefault(cal_key, []).append(blocking_time)
        if not bypasses_quota:
            q_key = f"{assigned}-{dept}-{section}-{course_name}"
            quota_calendar[q_key] = quota_calendar.get(q_key, 0) + 1
        unambiguous_classes.append(new_record)
        fallback_count += 1
    else:
        print(
            f"  ⚠ Dropped ambiguous: {record['course_name']} "
            f"({dept}-{section}) on {day} @ {actual_time} "
            f"— no batches with room left and not busy"
        )

print(
    f"Pass 2 complete — "
    f"{deduced_count} deduced, "
    f"{fallback_count} fallback, "
    f"{conflict_count} conflicts skipped."
)

# ==============================================================================
# PASS 3 — DISCOVER ELECTIVES & BUILD FINAL JSON HIERARCHY
# Walk unambiguous_classes and identify electives based on section range.
#   batch → dept → "regular"|"repeat" → course → section → day → [{room, time}]
# ==============================================================================
data_hierarchy = {}

# 1. Discover Section Ranges per (Batch, Dept)
# Maps (batch, dept) -> set of normalized section letters
dept_section_map = {}

def normalize_section_for_logic(s):
    if not s: return None
    # Gp-I, G-I etc are immediate electives, but for range logic we handle letters
    if "G-" in s or "Gp-" in s: return None 
    if s == "BX": return "B"
    # A1, A2 -> A
    match = re.match(r"([A-Z])\d*", s)
    if match: return match.group(1)
    return s if len(s) == 1 and s.isalpha() else None

for rec in unambiguous_classes:
    b, d, s = rec["batch"], rec["dept"], rec["section"]
    norm = normalize_section_for_logic(s)
    if norm:
        key = (b, d)
        dept_section_map.setdefault(key, set()).add(norm)

# 2. Identify Electives and Build Hierarchy
# A course is an elective if its max section < dept max section, 
# or if it has "G-"/"Gp-" in its section name (for 2022).
course_max_section = {} # (batch, dept, course) -> max_norm_idx
for rec in unambiguous_classes:
    norm = normalize_section_for_logic(rec["section"])
    if norm:
        idx = ord(norm.upper()) - ord('A')
        key = (rec["batch"], rec["dept"], rec["course_name"])
        course_max_section[key] = max(course_max_section.get(key, -1), idx)

def is_course_elective(rec):
    b, d, c, s = rec["batch"], rec["dept"], rec["course_name"], rec["section"]
    # 2022 special cases
    if b == "2022" and ("G-" in s or "Gp-" in s or s == "" or s in ["AI", "DS"]):
        return True
    
    # Range logic
    norm_max = course_max_section.get((b, d, c))
    dept_sections = dept_section_map.get((b, d), set())
    if norm_max is not None and dept_sections:
        dept_max_idx = max(ord(x.upper()) - ord('A') for x in dept_sections)
        if norm_max < dept_max_idx:
            return True
    return False

# 3. Check for Shared Courses
shared_courses = {} # course_name -> set of (batch, dept)
for rec in unambiguous_classes:
    shared_courses.setdefault(rec["course_name"], set()).add((rec["batch"], rec["dept"]))

print("\n--- Shared Courses Discovery ---")
found_shared = False
for name, depts in shared_courses.items():
    if len(depts) > 1:
        found_shared = True
        dept_str = ", ".join([f"{b} {d}" for b, d in sorted(list(depts))])
        print(f"  • {name} is shared between: {dept_str}")

# 4. Final Hierarchy Build
# (batch, course_name) -> dict of {group_name: count}
course_group_counts = {}
# (batch, dept) -> max_section_index
dept_max_sections = {}
# (batch, dept, course_name) -> max_section_index
course_max_sections = {}

def extract_section_letter(s):
    if not s: return "A"
    # 1. Remove group tags like G-I, Gp-II (use non-capturing group for prefix)
    cleaned = re.sub(r'(?:G|Gp)-(?:III|II|I)', '', s).strip()
    # 2. If after cleaning we only have punctuation or nothing, it's a group-wide course -> Section A
    if not re.search(r'[a-zA-Z]', cleaned):
        return "A"
    # 3. Look for patterns like CS-A or just A
    match = re.search(r'([A-Z])\d*', cleaned)
    if match:
        letter = match.group(1)
        # If the "letter" found is actually a Roman numeral leftover (like I in G-I if sub failed)
        # or if it's just 'I' but the course is clearly an elective, default to A.
        if letter in ['I', 'V']: return "A"
        if letter == "B" and "BX" in cleaned: return "B"
        return letter
    return "A"

# FIRST PASS: Discover everything and count group occurrences
for rec in unambiguous_classes:
    if rec.get("isReserved"):
        rec["normalized_section"] = rec["section"]
        continue
    b, d, c, s = rec["batch"], rec["dept"], rec["course_name"], rec["section"]
    
    # 1. Find Group (Check III then II then I to avoid partial matches)
    group_match = re.search(r'(G|Gp)-(III|II|I)', s)
    group_val = None
    if group_match:
        group_val = "G-" + group_match.group(2)
    
    # 2. Normalize Section
    norm_s = extract_section_letter(s)
    rec["normalized_section"] = norm_s
    
    # 3. Count Group Occurrences Globally (per course)
    if group_val:
        key = (b, c)
        if key not in course_group_counts:
            course_group_counts[key] = {}
        course_group_counts[key][group_val] = course_group_counts[key].get(group_val, 0) + 1
    
    # 4. Track max sections
    if norm_s.isalpha() and len(norm_s) == 1:
        idx = ord(norm_s.upper()) - ord('A')
        dept_max_sections[(b, d)] = max(dept_max_sections.get((b, d), -1), idx)
        course_max_sections[(b, d, c)] = max(course_max_sections.get((b, d, c), -1), idx)

# RESOLVE GROUPS: Apply majority voting
global_course_groups = {}
for (b, c), counts in course_group_counts.items():
    # Find the group with the maximum count
    best_group = max(counts, key=counts.get)
    global_course_groups[(b, c)] = best_group

# SECOND PASS: Build hierarchy with range-based elective detection
seen_slots = set()
for rec in unambiguous_classes:
    batch       = rec["batch"]
    dept        = rec["dept"]
    category    = rec["category"]
    course_name = rec["course_name"]
    section     = rec["normalized_section"]
    day         = rec["day"]
    sheet_name  = rec.get("sheet_name", rec["day"])
    actual_time = rec["time"]
    room        = rec["room"]
    
    # Deduplication: Avoid adding the exact same slot multiple times
    slot_key = (batch, dept, category, course_name, section, day, actual_time)
    if slot_key in seen_slots:
        continue
    seen_slots.add(slot_key)
    
    if rec.get("isReserved"):
        is_elective = False
        group = None
    else:
        # Inherit group
        group = global_course_groups.get((batch, course_name))
        
        # Range-based detection
        d_max = dept_max_sections.get((batch, dept), -1)
        c_max = course_max_sections.get((batch, dept, course_name), -1)
        
        is_elective_by_range = (c_max < d_max) if d_max != -1 else False
        is_elective = is_course_elective(rec) or (group is not None) or is_elective_by_range

    # Debug specific problematic courses
    if any(k in course_name for k in ["Deep Learn", "Data Vis", "ML for Robo", "Agentic AI"]):
        if batch == "2022":
            print(f"  [DEBUG] 2022 Course: {course_name} ({dept}-{section}) | Group: {group} | Elective: {is_elective}")

    if batch not in data_hierarchy:
        data_hierarchy[batch] = {}
    if dept not in data_hierarchy[batch]:
        data_hierarchy[batch][dept] = {"regular": {}, "repeat": {}}

    target = data_hierarchy[batch][dept][category]

    if course_name not in target:
        target[course_name] = {}
    if section not in target[course_name]:
        target[course_name][section] = {}
    if sheet_name not in target[course_name][section]:
        target[course_name][section][sheet_name] = []

    slot_data = {
        "room": room, 
        "time": actual_time,
        "rescheduled": rec.get("is_rescheduled", False),
        "is_elective": is_elective,
        "elective_group": group,
        "exam": rec.get("is_exam", False)
    }
    if rec.get("isCancelled"):
        slot_data["cancelled"] = True
        
    target[course_name][section][sheet_name].append(slot_data)

# ==============================================================================
# OUTPUT
# ==============================================================================
output_filename = "timetable.json"
data_hierarchy["__meta__"] = timetable_meta
with open(output_filename, "w") as json_file:
    json.dump(data_hierarchy, json_file, indent=4)

total_resolved  = len(unambiguous_classes)
total_ambiguous = len(ambiguous_pool)
print(f"\\n✅ Success! Unified schedule exported to: {output_filename}")
print(
    f"   Total resolved: {total_resolved} class slots "
    f"({total_ambiguous} passed through the deduction pass)"
)
