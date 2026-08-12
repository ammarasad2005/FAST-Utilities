#!/usr/bin/env python3

import io
import urllib.request
import urllib.parse
import re
import json
import csv
import sys
import os
from datetime import date, timedelta
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict

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

# ==============================================================================
# KNOWN ELECTIVES — courses explicitly tagged as electives in the course
# allocation list (e.g., "(CS Elective IV)", "(AI Elective-II)").
# These are authoritative — if a course is in this set, it IS an elective,
# and if it's in the admin course map but NOT here, it IS core (not elective).
# The range-based heuristic is only a fallback for courses not in either set.
# Update this set when the course allocation list changes (new electives added
# or old ones removed).
# ==============================================================================
KNOWN_ELECTIVES = {
    # CS senior electives (Elective IV) — Batch 2023
    ("CS", "Agentic AI"), ("CS", "Gen AI"), ("CS", "Cloud Comp"),
    ("CS", "Deep Learn"), ("CS", "MLOps"), ("CS", "Fund of Data Vis"),
    ("CS", "Fund of SPM"), ("CS", "SMD"), ("CS", "Game Design"),
    # CY electives
    ("CY", "Web Prog"), ("CY", "Blockchain"), ("CY", "Cloud Comp"),
    ("CY", "Security Ops"), ("CY", "Info Assur"),
    # AI electives
    ("AI", "Agentic AI"), ("AI", "Blockchain"), ("AI", "AI Prod Dev"),
    ("AI", "Multiagent Sys"), ("AI", "Edge Comp"), ("AI", "Adv AI"),
    ("AI", "App Comp Vision"),
    # DS electives
    ("DS", "Fund of CV"), ("DS", "Agentic AI"), ("DS", "Multiagent Sys"),
    # SE electives
    ("SE", "Gen AI"), ("SE", "NLP"), ("SE", "Formal Meth in SE"),
    ("SE", "Process Mining"), ("SE", "SMD"), ("SE", "Game Design"),
}

# Build a set of ALL (dept, course) from the admin's effective course map.
# These are courses we have authoritative identity data for. If a course is
# in this set but NOT in KNOWN_ELECTIVES, it's a known core course — the
# range heuristic should NOT override this.
ALL_KNOWN_COURSES = set()
for _b, _depts in EFFECTIVE_COURSES_MAP.items():
    for _d, _courses in _depts.items():
        for _c in _courses:
            ALL_KNOWN_COURSES.add((_d, _c))

def is_known_elective(dept, course_name):
    """Check if a course is a known elective. Handles 'Lab' suffix variants."""
    if (dept, course_name) in KNOWN_ELECTIVES:
        return True
    # "ML Lab" inherits from "ML" being a known elective
    if course_name.lower().endswith(" lab"):
        base = course_name[:-4].strip()
        if (dept, base) in KNOWN_ELECTIVES:
            return True
    return False

def is_known_course(dept, course_name):
    """Check if a course is in the admin's course mappings (core or elective)."""
    if (dept, course_name) in ALL_KNOWN_COURSES:
        return True
    if course_name.lower().endswith(" lab"):
        base = course_name[:-4].strip()
        if (dept, base) in ALL_KNOWN_COURSES:
            return True
    return False

# ==============================================================================
# COURSE-SECTION-BATCH LOOKUP — from the course allocation list
#
# The allocation list tells us exactly which (dept, course, section) combinations
# belong to which batch. This is more authoritative than the range heuristic
# or the constraint-satisfaction guess.
#
# Example: (CS, "Algo", "B") → {2024} because only BCS-5B takes Algo,
#          not BCS-7B. This resolves the ambiguity that find_possible_batches
#          creates when a course appears in both 2024/CS and 2023/CS maps.
#
# The lookup is built at startup by fetching the allocation list's 4 tabs.
# If the fetch fails, the lookup is empty and the scraper falls back to
# the existing constraint-satisfaction behavior.
# ==============================================================================

ALLOCATION_SHEET_ID = "1O9LXRAXKApeOWrD4OcgPCFRJRONPA6JnWPkW_LFYXb0"

SEMESTER_TO_BATCH = {
    1: "2026", 2: "2026",   # Year 1
    3: "2025", 4: "2025",   # Year 2
    5: "2024", 6: "2024",   # Year 3
    7: "2023", 8: "2023",   # Year 4
    9: "2022",              # Repeater (graduated)
}

# Full course name → short name mapping.
# The allocation list uses full names ("Design and Analysis of Algorithms");
# the timetable uses short names ("Algo"). This mapping bridges them.
# Only courses that appear in MULTIPLE batches' admin maps need to be here
# (those are the ones that cause ambiguity). But including all is more robust.
FULL_TO_SHORT = {
    ("CS", "Programming Fundamentals"): "PF",
    ("AI", "Programming Fundamentals"): "PF",
    ("DS", "Programming Fundamentals"): "PF",
    ("CY", "Programming Fundamentals"): "PF",
    ("SE", "Programming Fundamentals"): "PF",
    ("CS", "Object Oriented Programming"): "OOP",
    ("AI", "Object Oriented Programming"): "OOP",
    ("SE", "Object Oriented Programming"): "OOP",
    ("CS", "Data Structures"): "Data St",
    ("AI", "Data Structures"): "Data St",
    ("DS", "Data Structures"): "Data St",
    ("CY", "Data Structures"): "Data St",
    ("SE", "Data Structures"): "Data St",
    ("CS", "Design and Analysis of Algorithms"): "Algo",
    ("AI", "Design and Analysis of Algorithms"): "Algo",
    ("DS", "Design and Analysis of Algorithms"): "Algo",
    ("SE", "Design and Analysis of Algorithms"): "Algo",
    ("CS", "Applied Human Computer Interaction"): "App HCI",
    ("CS", "Computer Architecture"): "Comp Arch",
    ("CS", "Computer Networks"): "Comp Net",
    ("AI", "Computer Networks"): "Comp Net",
    ("DS", "Computer Networks"): "Comp Net",
    ("CS", "Technical and Business Writing"): "TBW",
    ("AI", "Technical and Business Writing"): "TBW",
    ("DS", "Technical and Business Writing"): "TBW",
    ("SE", "Technical and Business Writing"): "TBW",
    ("CS", "Information Security"): "Info Sec",
    ("CY", "Information Security"): "Info Sec",
    ("SE", "Information Security"): "Info Sec",
    ("CY", "Artificial Intelligence"): "AI",
    ("SE", "Artificial Intelligence"): "AI",
    ("CS", "Database Systems"): "DB",
    ("CY", "Database Systems"): "DB",
    ("CS", "Operating Systems"): "OS",
    ("CY", "Operating Systems"): "OS",
    ("DS", "Operating Systems"): "OS",
    ("CS", "Professional Practices in IT"): "PPIT",
    ("CY", "Professional Practices in IT"): "PPIT",
    ("SE", "Professional Practices in IT"): "PPIT",
    ("CS", "Parallel and Distributed Computing"): "PDC",
    ("SE", "Parallel and Distributed Computing"): "PDC",
    ("CS", "Final Year Project-I"): "FYP-I",
    ("AI", "Final Year Project-I"): "FYP-I",
    ("DS", "Final Year Project-I"): "FYP-I",
    ("CY", "Final Year Project-I"): "FYP-I",
    ("SE", "Final Year Project-I"): "FYP-I",
    ("CS", "Cloud Computing"): "Cloud Comp",
    ("CY", "Cloud Computing"): "Cloud Comp",
    ("CS", "Deep Learning for Perception"): "Deep Learn",
    ("CS", "MLOPS"): "MLOps",
    ("CS", "Agentic AI"): "Agentic AI",
    ("AI", "Agentic Artificial Intelligence"): "Agentic AI",
    ("DS", "Agentic Artificial Intelligence"): "Agentic AI",
    ("CS", "Generative AI"): "Gen AI",
    ("SE", "Generative AI"): "Gen AI",
    ("CY", "Blockchain and Cryptocurrency"): "Blockchain",
    ("AI", "Blockchain Technologies and Applications"): "Blockchain",
    ("CY", "Information Assurance"): "Info Assur",
    ("CY", "Security Operations and Administration"): "Security Ops",
    ("DS", "Fundamentals of Computer Vision"): "Fund of CV",
    ("SE", "Game Design and Development"): "Game Design",
    ("CS", "Game Design and Development"): "Game Design",
    ("SE", "Natural Language Processing"): "NLP",
    ("SE", "Software for Mobile Devices"): "SMD",
    ("CS", "Software for Mobile Devices"): "SMD",
    ("AI", "AI Product Development"): "AI Prod Dev",
    ("AI", "Advanced Artificial Intelligence"): "Adv AI",
    ("AI", "Multiagent Systems and Game Theory"): "Multiagent Sys",
    ("DS", "Multiagent Systems and Game Theory"): "Multiagent Sys",
    ("AI", "Methods in Business Research"): "Business Research",
    ("DS", "Methods in Business Research"): "Business Research",
    ("AI", "Edge Computing and Intelligent Systems"): "Edge Comp",
    ("DS", "Edge Computing"): "Edge Comp",
    ("CS", "Fundamentals of Data Visualization"): "Fund of Data Vis",
    ("CS", "Fundamentals of Software Project Management"): "Fund of SPM",
    ("SE", "Formal Methods in Software Engineering"): "Formal Meth in SE",
    ("SE", "Process Mining and Simulation"): "Process Mining",
    ("SE", "Software Quality Engineering"): "S/w Quality Engg",
    ("SE", "Software Construction and Develpment"): "S/w Const",
    ("CS", "Software Design and Analysis"): "SDA",
    ("CS", "Digital Logic Design"): "DLD",
    ("CS", "Computer Organization and Assembly Language"): "COAL",
    ("AI", "Computer Organization and Assembly Language"): "COAL",
    ("DS", "Computer Organization and Assembly Language"): "COAL",
    ("CY", "Computer Organization and Assembly Language"): "COAL",
    ("SE", "Computer Organization and Assembly Language"): "COAL",
    # COAL Lab — missing for all depts (was causing D1: COAL Lab AI misassignment)
    ("CS", "Computer Organization and Assembly Language Lab"): "COAL Lab",
    ("AI", "Computer Organization and Assembly Language Lab"): "COAL Lab",
    ("DS", "Computer Organization and Assembly Language Lab"): "COAL Lab",
    ("CY", "Computer Organization and Assembly Language Lab"): "COAL Lab",
    ("SE", "Computer Organization and Assembly Language Lab"): "COAL Lab",
    # Other missing Lab entries — theory exists, lab variant was missing
    ("AI", "Computer Networks Lab"): "Comp Net Lab",
    ("CS", "Computer Networks Lab"): "Comp Net Lab",
    ("DS", "Computer Networks Lab"): "Comp Net Lab",
    ("AI", "Data Structures Lab"): "Data St Lab",
    ("CS", "Data Structures Lab"): "Data St Lab",
    ("DS", "Data Structures Lab"): "Data St Lab",
    ("CY", "Data Structures Lab"): "Data St Lab",
    ("SE", "Data Structures Lab"): "Data St Lab",
    ("CS", "Digital Logic Design Lab"): "DLD Lab",
    ("CY", "Database Systems Lab"): "DB Lab",
    ("CS", "Database Systems Lab"): "DB Lab",
    ("CY", "Operating Systems Lab"): "OS Lab",
    ("CS", "Operating Systems Lab"): "OS Lab",
    ("DS", "Operating Systems Lab"): "OS Lab",
    ("CY", "Artificial Intelligence Lab"): "AI Lab",
    ("SE", "Artificial Intelligence Lab"): "AI Lab",
    ("AI", "Machine Learning Lab"): "ML Lab",
    ("DS", "Data Analysis & Visualization Lab"): "DAV Lab",
    ("DS", "Data Warehousing & Business Intelligence Lab"): "Data Ware & BI Lab",
    ("DS", "Introduction to Data Science Lab"): "Intro to DS Lab",
    # PF Lab — was missing for some depts
    ("CS", "Programming Fundamentals Lab"): "PF Lab",
    ("AI", "Programming Fundamentals Lab"): "PF Lab",
    ("DS", "Programming Fundamentals Lab"): "PF Lab",
    ("CY", "Programming Fundamentals Lab"): "PF Lab",
    ("SE", "Programming Fundamentals Lab"): "PF Lab",
    # OOP Lab — was missing for some depts
    ("CS", "Object Oriented Programming Lab"): "OOP Lab",
    ("AI", "Object Oriented Programming Lab"): "OOP Lab",
    ("SE", "Object Oriented Programming Lab"): "OOP Lab",
    # Prog for AI Lab
    ("AI", "Programming for AI Lab"): "Prof for AI Lab",
    # S&H courses that were missing
    ("CS", "Programming Fundamentals"): "PF",
    ("AI", "Calculus & Anlytical Geometry"): "Calculus",
    ("DS", "Calculus & Anlytical Geometry"): "Calculus",
    ("CY", "Calculus & Anlytical Geometry"): "Calculus",
    ("SE", "Calculus & Anlytical Geometry"): "Calculus",
    ("CS", "Functional English"): "Func Eng",
    ("AI", "Functional English"): "Func Eng",
    ("DS", "Functional English"): "Func Eng",
    ("CY", "Functional English"): "Func Eng",
    ("SE", "Functional English"): "Func Eng",
    ("CS", "Functional English- Lab"): "Func Eng Lab",
    ("AI", "Functional English- Lab"): "Func Eng Lab",
    ("DS", "Functional English- Lab"): "Func Eng Lab",
    ("CY", "Functional English- Lab"): "Func Eng Lab",
    ("SE", "Functional English Lab"): "Func Eng Lab",
    ("CS", "Introduction to Information & Communication Technologies"): "IICT Lab",
    ("AI", "Introduction to Information & Communication Technologies"): "IICT Lab",
    ("DS", "Introduction to Information & Communication Technologies"): "IICT Lab",
    ("CY", "Introduction to Information & Communication Technologies"): "IICT Lab",
    ("SE", "Introduction to Information & Communication Technologies"): "IICT",
    ("CS", "Islamic Studies/Ethics"): "Islamic",
    ("AI", "Islamic Studies/Ethics"): "Islamic",
    ("DS", "Islamic Studies/Ethics"): "Islamic",
    ("CS", "Ideology and Constitution of Pakistan"): "Ideology of Pak",
    ("AI", "Ideology and Constitution of Pakistan"): "Ideology of Pak",
    ("DS", "Ideology and Constitution of Pakistan"): "Ideology of Pak",
    ("CY", "Ideology and Constitution of Pakistan"): "Ideology of Pak",
    ("SE", "Ideology and Constitution of Pakistan"): "Ideology of Pak",
    ("CS", "Understanding Sirat Un Nabi (PBUH)"): "Seerah",
    ("AI", "Understanding Sirat-Un-Nabi (PBUH)"): "Seerah",
    ("DS", "Understanding Sirat-Un-Nabi (PBUH)"): "Seerah",
    ("CS", "Understanding of Holy Quran-I"): "UHQ-I&II",
    ("DS", "Understanding of Holy Quran-I"): "UHQ-I&II",
    ("CS", "Understanding of Holy Quran-II"): "UHQ-I&II",
    ("DS", "Understanding of Holy Quran-II"): "UHQ-I&II",
    ("AI", "Understanding of Holy Quran II/Ethics II"): "UHQ-II",
    ("CY", "Understanding of Holy Quran II/Ethics II"): "UHQ-II",
    ("SE", "Understanding of Holy Quran II/Ethics II"): "UHQ-II",
    ("AI", "Pakistan Studies"): "Pak Studies",
    ("CY", "Pakistan Studies"): "Pak Studies",
    ("SE", "Pakistan Studies"): "Pak Studies",
    ("CY", "Applied Physics"): "AP",
    ("SE", "Applied Physics"): "AP",
    ("AI", "Applied Physics"): "AP",
    ("DS", "Applied Physics"): "AP",
    ("CS", "Applied Physics"): "AP",
    ("CY", "Arts and Humanities Elective - I"): "Arts & Hum",
    ("SE", "Arts and Humanities Elective - I"): "Arts & Hum",
    ("CS", "Linear Algebra"): "LA",
    ("AI", "Linear Algebra"): "LA",
    ("DS", "Linear Algebra"): "LA",
    ("CY", "Linear Algebra"): "LA",
    ("SE", "Linear Algebra"): "LA",
    ("CY", "Cyber Security"): "Cy Sec",
    ("CY", "Web Programming"): "Web Prog",
    ("AI", "Machine Learning"): "ML",
    ("AI", "Knowledge Representation & Reasoning"): "Knowl Rep",
    ("AI", "Programming for AI"): "Prog for AI",
    ("DS", "Introduction to Data Science"): "Intro to DS",
    ("SE", "Introduction to Software Engineering"): "Intro to SE",
    ("DS", "Data Analysis & Visualization"): "DAV",
    ("DS", "Data Warehousing & Business Intelligence"): "Data Ware & BI",
    ("DS", "Advacned Statistics"): "Adv Stats",
    ("CS", "Discrete Structures"): "Discrete",
    ("AI", "Research Methodology"): "Research Methodology",
}

def _parse_alloc_section_code(s):
    """Parse 'BCS-5A' → ('CS', 5, 'A'). Returns (dept, semester, section_letter)."""
    if not s or not s.strip():
        return None
    m = re.match(r'^([BCDS][A-Z]{2})-(\d+)([A-Z]\d*)$', s.strip())
    if not m:
        return None
    prefix, sem, sec = m.groups()
    dept = {"BCS": "CS", "BAI": "AI", "BDS": "DS", "BCY": "CY", "BSE": "SE"}.get(prefix)
    if not dept:
        return None
    # Normalize: A1→A, A2→A, B1→B (lab sub-sections → parent section)
    norm = re.match(r'([A-Z])', sec)
    section_letter = norm.group(1) if norm else sec
    return (dept, int(sem), section_letter)

def build_course_section_lookup():
    """
    Fetch the course allocation list and build:
      {(dept, short_name, section_letter) → set of batches}

    This provides authoritative batch assignment for (course, section) pairs,
    resolving ambiguity when find_possible_batches returns multiple candidates.

    Returns an empty dict if the fetch fails (scraper falls back to existing behavior).
    """
    lookup = defaultdict(set)
    # All 4 tabs: Computing Labs, Sciences & Humanities, Computing Theory, Management
    allocation_gids = ["1026835609", "1344717791", "1902911975", "289237719"]

    for gid in allocation_gids:
        url = (
            f"https://docs.google.com/spreadsheets/d/{ALLOCATION_SHEET_ID}"
            f"/gviz/tq?tqx=out:csv&gid={gid}"
        )
        try:
            resp = urllib.request.urlopen(url, timeout=10)
            text = resp.read().decode("utf-8")
            rows = list(csv.reader(text.splitlines()))

            last_course_key = None  # (dept, full_name) — propagated through merged cells
            for row in rows[1:]:
                if len(row) < 5:
                    continue
                code = row[1].strip()
                course_full = row[2].strip()
                section_code = row[4].strip()

                # New course entry (code + name present) — update last_course_key
                if code and course_full:
                    clean = re.sub(r'\s*\([^)]*\)\s*$', '', course_full).strip()
                    parsed = _parse_alloc_section_code(section_code)
                    if parsed:
                        last_course_key = (parsed[0], clean)  # dept from section code

                # Process this section assignment
                if last_course_key and section_code:
                    parsed = _parse_alloc_section_code(section_code)
                    if parsed:
                        dept, sem, section = parsed
                        batch = SEMESTER_TO_BATCH.get(sem)
                        if batch and batch != "2022":  # skip graduated batch
                            short = FULL_TO_SHORT.get(last_course_key)
                            if short:
                                lookup[(dept, short, section)].add(batch)
        except Exception as e:
            print(f"⚠  Could not fetch allocation tab {gid}: {e}")

    return dict(lookup)

# Build the lookup at startup
print("Fetching course allocation list for section-level batch resolution...")
COURSE_SECTION_BATCH_LOOKUP = build_course_section_lookup()
if COURSE_SECTION_BATCH_LOOKUP:
    print(f"✅ Built course-section-batch lookup: {len(COURSE_SECTION_BATCH_LOOKUP)} entries")
else:
    print("⚠  Course-section-batch lookup is empty — falling back to constraint satisfaction only")

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
    80 min -> 2 slots (standard lecture, meets 2x/week)
    105 min -> 1 slot (long lecture or lab)
    165 min -> 1 slot (full lab)
    Other durations -> 1 slot (conservative default for explicit-time
    override cells like Seerah 55min, UHQ 110min, Ideology of Pak 105min)

    Previously, unrecognized durations returned quota=999 (unlimited),
    which caused the constraint satisfaction to assign ALL cells of a
    shared-section course to the same batch — leaving the other batch
    with nothing. This happened when two batches both offer a course to
    the same section letter (e.g., Seerah for both 2025/CS/B and
    2026/CS/B). With unlimited quota, both cells went to 2026, and 2025
    got zero.

    Default quota=1 ensures each (batch, dept, section, course) gets at
    most 1 slot from the constraint satisfaction's best-effort assignment.
    If a course genuinely needs 2+ slots, its duration will match 80 min
    (quota=2). Explicit-time override cells (Seerah 55min, etc.) are
    typically 1-ch courses that meet 1x/week → quota=1 is correct.

    Returns (duration_mins, quota)
    """
    if t_str == "Unknown Time":
        return 0, 999  # Unknown time → can't determine duration → unlimited
    try:
        s, e = parse_time_to_minutes(t_str)
        duration = e - s
        if abs(duration - 80) <= 5: return duration, 2
        if abs(duration - 105) <= 5: return duration, 1
        if abs(duration - 165) <= 5: return duration, 1
        return duration, 1  # Default: 1 slot for unrecognized durations
    except:
        return 0, 999  # Parse error → can't determine → unlimited

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

# ==============================================================================
# HARDCODED COLOR MAP — verified via Google Sheets API v4 on 2026-08-12
#
# The timetable sheet uses 20 distinct background colors to encode
# (department, batch). Each dept has a hue family; each batch has a
# different saturation/lightness within that hue. Repeat courses use
# solid yellow.
#
# This map is HARDCODED (not fetched at runtime) to avoid:
# 1. Google API rate-limiting on GitHub Actions CI IPs (caused empty
#    output in PR #25 — 7 rapid API calls triggered throttling that
#    also affected the gviz endpoint)
# 2. Additional API latency and failure modes
#
# To update: fetch colors via Sheets API locally, verify against the
# timetable sheet's header rows, and update this constant.
# ==============================================================================

# RGB values are 0-1 floats matching the Sheets API backgroundColor format.
# Tolerance of ±0.03 is used in identify_from_color() for approximate matching.
COLOR_MAP = {
    # CS — Orange/Amber spectrum
    (1.00, 0.72, 0.25): {"dept": "CS", "batch": "2026"},  # #FFB740
    (0.43, 0.32, 0.00): {"dept": "CS", "batch": "2025"},  # #6C5200
    (0.76, 0.58, 0.00): {"dept": "CS", "batch": "2024"},  # #C39401
    (1.00, 0.90, 0.60): {"dept": "CS", "batch": "2023"},  # #FFE499
    # DS — Purple/Violet spectrum
    (0.50, 0.30, 1.00): {"dept": "DS", "batch": "2026"},  # #7F4CFF
    (0.21, 0.11, 0.46): {"dept": "DS", "batch": "2025"},  # #351B75
    (0.69, 0.50, 0.84): {"dept": "DS", "batch": "2024"},  # #B17FD7
    (0.71, 0.65, 0.84): {"dept": "DS", "batch": "2023"},  # #B4A7D6
    # AI — Green spectrum
    (0.00, 0.96, 0.00): {"dept": "AI", "batch": "2026"},  # #00F600
    (0.15, 0.31, 0.07): {"dept": "AI", "batch": "2025"},  # #274E13
    (0.42, 0.66, 0.31): {"dept": "AI", "batch": "2024"},  # #6AA84F
    (0.71, 0.84, 0.66): {"dept": "AI", "batch": "2023"},  # #B6D7A8
    # CY — Blue spectrum
    (0.00, 0.00, 1.00): {"dept": "CY", "batch": "2026"},  # #0000FF
    (0.03, 0.22, 0.39): {"dept": "CY", "batch": "2025"},  # #063763
    (0.35, 0.62, 0.85): {"dept": "CY", "batch": "2024"},  # #599DDA
    (0.67, 0.80, 0.92): {"dept": "CY", "batch": "2023"},  # #ABCCEB
    # SE — Red/Maroon spectrum
    (0.90, 0.17, 0.02): {"dept": "SE", "batch": "2026"},  # #E62C06
    (0.52, 0.13, 0.05): {"dept": "SE", "batch": "2025"},  # #85200C
    (0.87, 0.49, 0.42): {"dept": "SE", "batch": "2024"},  # #DD7E6B
    (0.96, 0.80, 0.80): {"dept": "SE", "batch": "2023"},  # #F4CCCC
}

# Yellow threshold for repeat detection: R > 0.95 AND G > 0.95 AND B < 0.10
REPEAT_YELLOW_THRESHOLD = 0.95

def identify_from_color(rv, gv, bv):
    """
    Given a cell's background RGB (0-1 floats), identify (dept, batch, is_repeat).
    Returns (dept, batch, is_repeat) or None if color doesn't match any known mapping.

    Uses approximate matching (+/-0.03 tolerance) to handle minor color variations.
    """
    # Check for repeat yellow
    if rv > REPEAT_YELLOW_THRESHOLD and gv > REPEAT_YELLOW_THRESHOLD and bv < 0.10:
        return (None, None, True)  # Repeat — batch determined by cell text

    # Match against hardcoded color map with tolerance
    for (cr, cg, cb), info in COLOR_MAP.items():
        if abs(cr - rv) < 0.03 and abs(cg - gv) < 0.03 and abs(cb - bv) < 0.03:
            return (info["dept"], info["batch"], False)

    return None  # No match — fall back to text-based detection

def fetch_cell_colors(sheet_id, day_sheet_name):
    """
    Fetch background colors for ALL data cells in a day sheet via the Sheets API.
    Returns a dict: {(row_idx, col_idx): (r, g, b)} or None if API fails.

    Uses GOOGLE_SHEETS_API_KEY env var. If not set, returns None (fallback).
    """
    api_key = os.environ.get("GOOGLE_SHEETS_API_KEY", "")
    if not api_key:
        return None

    url = (
        f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}"
        f"?key={api_key}"
        f"&includeGridData=true"
        f"&ranges={urllib.parse.quote(day_sheet_name)}!A1:AH80"
        f"&fields=sheets(data(rowData(values(userEnteredValue,userEnteredFormat(backgroundColor)))))"
    )
    try:
        resp = urllib.request.urlopen(url, timeout=30)
        data = json.loads(resp.read().decode("utf-8"))
        sheets = data.get("sheets", [])
        if not sheets:
            return None
        grid_data = sheets[0].get("data", [])
        if not grid_data:
            return None
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
                        continue
                    colors[(r, c)] = (rv, gv, bv)
        return colors if colors else None
    except Exception as e:
        print(f"  Could not fetch cell colors for {day_sheet_name}: {e}")
        return None

def fetch_all_cell_colors(sheet_id, day_sheet_names):
    """
    Fetch background colors for ALL day sheets in a SINGLE API call.
    Returns a dict: {sheet_name: {(row_idx, col_idx): (r, g, b)}} or {} if API fails.

    Uses the Sheets API's multi-range support (multiple ranges= params).
    This makes exactly 1 API call instead of 6, avoiding Google's rate-limiting
    on CI IPs that caused empty output in PR #25 and PR #28.
    """
    api_key = os.environ.get("GOOGLE_SHEETS_API_KEY", "")
    if not api_key:
        return {}

    # Fetch colors per sheet with individual API calls (one sheet per request).
    #
    # Previously this used a single batched request with multiple `ranges=`
    # params (one per sheet, hardcoded as `SheetName!A1:AH80`). That failed
    # with HTTP 400 "Unable to parse range" whenever ANY sheet was smaller
    # than the hardcoded range — e.g. the Saturday placeholder tab (3x3)
    # caused the entire batched request to fail, returning zero colors for
    # ALL sheets. This was the actual root cause of the empty CI output in
    # PRs #25/#28/#30 (NOT "includeGridData poisons gviz" — the forensics
    # workflow on 2026-08-12 disproved that theory).
    #
    # Per-sheet calls also let us use a safe range per sheet by first asking
    # the API for that sheet's grid dimensions, then requesting exactly that
    # range. As a simpler fix, we omit the range entirely and let the API
    # return whatever cells exist for that sheet.
    base_url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}"
    common_fields = "fields=sheets(data(rowData(values(userEnteredValue,userEnteredFormat(backgroundColor)))))"

    result = {}
    for name in day_sheet_names:
        # Per-sheet call. No range= param means "all cells in the sheet".
        # This avoids the "Unable to parse range" 400 error for small sheets.
        url = (
            f"{base_url}"
            f"?key={api_key}"
            f"&includeGridData=true"
            f"&{common_fields}"
            f"&ranges={urllib.parse.quote(name, safe='')}"
        )
        try:
            resp = urllib.request.urlopen(url, timeout=30)
            data = json.loads(resp.read().decode("utf-8"))
            sheets = data.get("sheets", [])
            if not sheets:
                result[name] = {}
                continue
            grid_data = sheets[0].get("data", [])
            if not grid_data:
                result[name] = {}
                continue
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
                            continue
                        colors[(r, c)] = (rv, gv, bv)
            result[name] = colors
        except Exception as e:
            # Per-sheet failure is non-fatal — other sheets still get colors.
            # The text-based fallback handles any sheets we couldn't fetch.
            print(f"  Could not fetch cell colors for {name}: {e}")
            result[name] = {}

    return result

# ==============================================================================
# ROBUST CELL PARSER — validates against known vocabularies instead of
# permissive regexes + fix-up loops.
#
# There are exactly 4 cell patterns in the timetable:
#   1. (DEPT-SECTION)           e.g., PF (CS-A)           → regular
#   2. (DEPT-SECTION, YY)       e.g., OOP (CS-A, 25)      → repeat
#   3. (DEPT, YY)               e.g., Algo (CS, 23)       → repeat, no section
#   4. (DEPT)                   e.g., SMD (CS)            → regular, no section
#
# The parser splits the parenthetical content into dept/section/batch tokens
# and validates dept against VALID_DEPTS. If dept is not a known code, the
# cell is rejected (returns None). This eliminates the entire class of bugs
# where a dept code like "CS" is captured as a section string.
# ==============================================================================

VALID_DEPTS = {
    "CS", "AI", "DS", "CY", "SE",       # Single depts
    "AI/DS", "AI/DS/SE",                 # Shared depts
    "CI", "AIHS",                        # MS programs
    "CS-Robo",                           # Robotics special
}

time_pattern = re.compile(r'\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}')

def parse_cell_parens(val):
    """
    Parse a timetable cell's parenthetical content.
    Returns (course_name, dept, section, batch, category) or None if unparseable.

    - section is None when the cell has no section letter (Pattern 3 and 4).
      Caller should default it to "A".
    - batch is None for non-repeat cells (Pattern 1 and 4).
    - category is "repeat" when batch is not None, "regular" otherwise.
    """
    # 1. Strip trailing time annotation (e.g., "Func Eng (CS-G) 08:30-10:15")
    text = re.sub(r'\s+\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}\s*$', '', val).strip()

    # 2. Extract parenthetical content (last parens group in the cell)
    m = re.search(r'\(([^)]+)\)\s*$', text)
    if not m:
        return None
    course_name = text[:m.start()].strip()
    paren = m.group(1).strip()

    if not course_name or not paren:
        return None

    # 3. Split off batch suffix (", YY") if present
    batch = None
    batch_match = re.search(r',\s*(\d{2})\s*$', paren)
    if batch_match:
        batch = "20" + batch_match.group(1)
        paren = paren[:batch_match.start()].strip()

    # 4. Now paren is either "DEPT-SECTION" or "DEPT"
    if '-' in paren:
        parts = paren.split('-', 1)
        dept = parts[0].strip()
        section = parts[1].strip()
    else:
        dept = paren.strip()
        section = None

    # 5. Validate dept against known codes — THE KEY VALIDATION
    if dept not in VALID_DEPTS:
        return None  # reject malformed cells like "AP (A, 25)"

    # 6. Determine category
    category = "repeat" if batch is not None else "regular"

    return (course_name, dept, section, batch, category)

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
# STEP 1 — GVIZ FETCH (all day sheets, BEFORE any includeGridData call)
#
# Fetch and store ALL gviz rows for all day sheets FIRST. This must happen
# before any Google Sheets API v4 call with includeGridData=true, because
# includeGridData poisons the gviz endpoint on GHA IPs — subsequent gviz
# fetches return 0 rows even though the HTTP status is 200.
#
# The stored rows are parsed in STEP 3 after colors are fetched.
# ==============================================================================

gviz_snapshots = {}  # {sheet_name: {"rows": [...], "day": ..., "date": ..., "isoDate": ..., "isMakeup": ...}}

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

        gviz_snapshots[sheet_name] = {
            "rows": rows,
            "day": day,
        }
        print(f"  gviz {sheet_name}: status=ok rows={len(rows)}")
    except Exception as e:
        print(f"  gviz {sheet_name}: ERROR — {e}")
        gviz_snapshots[sheet_name] = {"rows": [], "day": day}

# ==============================================================================
# STEP 2 — FETCH CELL COLORS (single includeGridData call, AFTER all gviz)
#
# Now that all gviz data is safely stored, make ONE includeGridData call
# to fetch cell background colors. This is best-effort — if it fails, the
# scraper falls back to text-based detection (the existing heuristic pipeline).
# gviz is never called again after this point.
# ==============================================================================
_all_sheet_names = [ds["sheet_name"] for ds in day_sheets]
all_cell_colors = fetch_all_cell_colors(sheet_id, _all_sheet_names)
if all_cell_colors:
    total = sum(len(v) for v in all_cell_colors.values())
    print(f"Color data loaded: {len(all_cell_colors)} sheets, {total} colored cells (1 API call)")
else:
    print("Color data unavailable — using text-based detection (fallback mode)")

# ==============================================================================
# STEP 3 — PARSE STORED GVIZ ROWS (with color override if available)
#
# Parse the gviz rows stored in STEP 1. For each cell, use color data
# from STEP 2 (if available) to deterministically identify dept, batch,
# and category. Color-anchored cells with a known batch go directly to
# unambiguous_classes — they do NOT go through find_possible_batches
# or Pass 2.
# ==============================================================================
for day_info in day_sheets:
    day = day_info["day"]
    sheet_name = day_info["sheet_name"]
    snapshot = gviz_snapshots.get(sheet_name, {"rows": [], "day": day})
    rows = snapshot["rows"]
    cell_colors = all_cell_colors.get(sheet_name, {})

    time_map        = {}
    master_time_map = {}
    current_room    = ""
    is_lab_section  = False
    # MS boundary: column index of the 2nd "Room"/"Lab" header. Cells at or
    # beyond this column are MS courses (evening section) and must be skipped.
    # The timetable sheet has two "Room" columns in the header row — the first
    # at col 0 (BS section) and the second around col 30 (MS section). Everything
    # to the right of the 2nd "Room" column is MS. This structural check is more
    # reliable than color or time-based filtering because MS and BS colors can
    # overlap (e.g., MS(AI) shares a color with CS 2023).
    ms_boundary     = None

    for row_idx, r in enumerate(rows):
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

            # Detect MS boundary: find the 2nd "Room" or "Lab" value in this row.
            # The first is at col 0; the second marks the start of the MS section.
            header_seen = 0
            for i in range(0, len(cells)):
                c_val = str(cells[i].get("v", "")).strip() if cells[i] and cells[i].get("v") else ""
                if c_val in ("Room", "Lab"):
                    header_seen += 1
                    if header_seen == 2:
                        ms_boundary = i
                        print(f"  MS boundary detected on {day} {sheet_name}: col {ms_boundary} (all cells >= {ms_boundary} excluded)")
                        break

            for i in range(1, len(cells)):
                # Skip MS section cells (at or beyond the 2nd "Room"/"Lab" column)
                if ms_boundary is not None and i >= ms_boundary:
                    continue

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

        # Skip title/header rows that appear BEFORE the first "Room"/"Lab"
        # header. These rows contain day names ("Monday"), batch labels
        # ("BS CS (2026)"), and program labels ("MS (CS)") in col 0 and
        # other columns. Without this guard, the scraper treats the day name
        # as a room name and parses program-label cells like "MS (CS)" as
        # course entries — producing phantom courses with room="Monday" and
        # time="Unknown Time". master_time_map is only populated after the
        # first Room/Lab header, so it serves as a reliable "have we started
        # data rows yet?" flag.
        if not master_time_map:
            continue

        if first_val:
            current_room = first_val
        if not current_room:
            continue

        # ── Scan each column for a class entry ──
        for i in range(1, len(cells)):
            # Skip MS section cells (at or beyond the 2nd "Room"/"Lab" column).
            # This structurally excludes all MS courses regardless of color or time.
            if ms_boundary is not None and i >= ms_boundary:
                continue

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

            # ── Robust cell parser ──────────────────────────────────
            # Handles all 4 cell patterns via VALID_DEPTS validation.
            # Replaces the old repeat_pattern/regular_pattern + fix-up loop.
            parsed = parse_cell_parens(val)
            if parsed:
                course_name, dept, section, batch, category = parsed
                # Default section to "A" when cell has no section letter
                # (Pattern 3: "Algo (CS, 23)" and Pattern 4: "SMD (CS)")
                if section is None:
                    section = "A"
                # If dept couldn't be determined from cell (shouldn't happen
                # with VALID_DEPTS validation), infer from course name
                if dept is None:
                    possible = find_possible_batches(course_name, dept=None)
                    if possible:
                        dept = possible[0][1]
                    else:
                        dept = "CS"  # Fallback

            # ── Sheets API color-based override ─────────────────────
            # If cell color data is available, use it to DETERMINISTICALLY
            # identify dept, batch, and category. Color-anchored cells with
            # a known batch go directly to unambiguous_classes — they do NOT
            # go through find_possible_batches or Pass 2.
            color_anchored = False
            if cell_colors and COLOR_MAP:
                color_key = (row_idx, i)
                if color_key in cell_colors:
                    rv, gv, bv = cell_colors[color_key]
                    color_result = identify_from_color(rv, gv, bv)
                    if color_result:
                        color_dept, color_batch, is_repeat = color_result
                        if is_repeat:
                            # Yellow = repeat. Keep batch from text suffix (e.g., "OOP (CS-A, 25)" → batch=2025).
                            # Do NOT set batch=None — yellow doesn't encode batch, but the text might.
                            category = "repeat"
                            # batch stays as whatever parse_cell_parens set (from ",YY" suffix or None)
                        else:
                            # Non-yellow color gives dept AND batch deterministically.
                            category = "regular"
                            if color_batch:
                                batch = color_batch
                                color_anchored = True  # Color gave us a definitive batch
                            if color_dept:
                                dept = color_dept

            if not category:
                continue

            # Color override can set `category` from the cell's background
            # color even when the cell's text didn't parse via
            # parse_cell_parens() — in that case `course_name` is still None.
            # Skip such cells: they're not course entries (typically headers,
            # section labels, or other colored non-course text). Without this
            # guard, the next line crashes with
            #   AttributeError: 'NoneType' object has no attribute 'lower'
            # This was the actual root cause of the empty CI output in PRs
            # #25/#28/#30 (the per-day try/except masked it then; f8662c3
            # removed the try/except, exposing the crash).
            if course_name is None:
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

            # Skip Masters (MS) courses — this platform is BS-only.
            # MS rule: any class that STARTS after 5:00 PM (17:00) OR
            # CONTINUES PAST 5:20 PM (17:20) is an MS course → discard.
            # (BS classes end by 5:15 PM; the MS evening slot starts at 5:20 PM.)
            if actual_time != "Unknown Time":
                try:
                    s_min, e_min = parse_time_to_minutes(actual_time)
                    if s_min > (17 * 60) or e_min > (17 * 60 + 20):
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

            if category == "repeat" and batch:
                # Batch encoded in cell — anchor immediately
                cal_key = f"{batch}-{dept}-{section}-{day}"
                busy_calendar.setdefault(cal_key, []).append(blocking_time)
                if not bypasses_quota:
                    q_key = f"{batch}-{dept}-{section}-{course_name}"
                    quota_calendar[q_key] = quota_calendar.get(q_key, 0) + 1
                unambiguous_classes.append(record)

            elif color_anchored and batch:
                # Color gave us a definitive batch — anchor immediately,
                # do NOT send through find_possible_batches or Pass 2.
                # These are the D1/D2 cells that would otherwise be ambiguous.
                cal_key = f"{batch}-{dept}-{section}-{day}"
                busy_calendar.setdefault(cal_key, []).append(blocking_time)
                if not bypasses_quota:
                    q_key = f"{batch}-{dept}-{section}-{course_name}"
                    quota_calendar[q_key] = quota_calendar.get(q_key, 0) + 1
                unambiguous_classes.append(record)

            else:  # regular — no color anchor, use heuristic pipeline
                # Note: this branch also handles yellow/repeat cells with
                # batch=None (color said "repeat" but text had no ",YY"
                # suffix). They go through find_possible_batches like regular
                # cells, but keep category="repeat" so downstream logic
                # treats them as repeat once a batch is resolved.
                possible = find_possible_batches(course_name, dept)
                if not possible:
                    continue

                # ── Section-level batch resolution ──────────────────────
                # If the course-section-batch lookup has data for this
                # (dept, course, section), filter candidates to only
                # batches that actually offer this course to this section.
                # This is authoritative — from the course allocation list.
                if COURSE_SECTION_BATCH_LOOKUP and len(possible) > 1:
                    # Normalize section for lookup (same logic as extract_section_letter)
                    norm_section = section
                    if norm_section:
                        m = re.search(r'([A-Z])', norm_section)
                        if m:
                            norm_section = m.group(1)
                    lookup_key = (dept, course_name, norm_section)
                    valid_batches = COURSE_SECTION_BATCH_LOOKUP.get(lookup_key)
                    if valid_batches:
                        filtered = [b for b in possible if b in valid_batches]
                        if filtered:
                            possible = filtered

                if len(possible) == 1:
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

print(
    f"\nPass 1 complete — "
    f"{len(unambiguous_classes)} anchored, "
    f"{len(ambiguous_pool)} deferred to deduction pass."
)

# ==============================================================================
# SIBLING-CELL CATEGORY INFERENCE
#
# If a (batch, dept, course) tuple has at least one cell classified as
# "repeat", reclassify all "regular" cells of the same tuple as "repeat".
#
# This fixes inconsistent cell suffixing in the timetable where the sheet
# author adds ", YY" to some cells but not others for the same course.
# Example: OOP Lab (CS-B, 25) → repeat, OOP Lab (CS-A) → regular.
# Both are for Batch 2025 — the A/C/D cells just forgot the suffix.
#
# The allocation list is the source of truth for batch assignment (via
# the course-section-batch lookup). Once the batch is correctly resolved,
# if any sibling cell is repeat, ALL cells of that (batch, dept, course)
# should be repeat — a student either repeats a course or takes it for
# the first time, not both.
# ==============================================================================

# Build set of (batch, dept, course) that have at least one repeat cell
repeat_tuples = set()
for rec in unambiguous_classes:
    if rec.get("category") == "repeat":
        repeat_tuples.add((rec["batch"], rec["dept"], rec["course_name"]))

# Reclassify regular cells whose (batch, dept, course) has a repeat sibling
reclassified_count = 0
for rec in unambiguous_classes:
    if rec.get("category") == "regular":
        key = (rec["batch"], rec["dept"], rec["course_name"])
        if key in repeat_tuples:
            rec["category"] = "repeat"
            reclassified_count += 1

if reclassified_count > 0:
    print(f"  Sibling-cell inference: reclassified {reclassified_count} regular → repeat")
    print(f"  (based on {len(repeat_tuples)} (batch, dept, course) tuples with repeat siblings)")

# Also apply to ambiguous pool — if a deferred cell's (course, dept) has
# a repeat sibling for a specific batch, narrow its possible_batches to
# that batch and reclassify as repeat.
ambiguous_reclassified = 0
for rec in ambiguous_pool:
    if rec.get("category") == "regular":
        possible = rec.get("possible_batches", [])
        for b in possible:
            if (b, rec["dept"], rec["course_name"]) in repeat_tuples:
                rec["batch"] = b
                rec["category"] = "repeat"
                rec.pop("possible_batches", None)
                ambiguous_reclassified += 1
                break

if ambiguous_reclassified > 0:
    print(f"  Sibling-cell inference (ambiguous pool): resolved {ambiguous_reclassified} regular → repeat")
    # Move reclassified records from ambiguous_pool to unambiguous_classes
    still_ambiguous = []
    for rec in ambiguous_pool:
        if rec.get("category") == "repeat" and rec.get("batch"):
            # Anchor the resolved repeat cell
            cal_key = f"{rec['batch']}-{rec['dept']}-{rec['section']}-{rec['day']}"
            busy_calendar.setdefault(cal_key, []).append(rec["blocking_time"])
            unambiguous_classes.append(rec)
        else:
            still_ambiguous.append(rec)
    ambiguous_pool = still_ambiguous

# ==============================================================================
# PASS 2 — DEDUCTION PASS
# For each ambiguous record, check busy_calendar at its exact slot key.
# A batch is "free" if its slot is NOT already occupied by a different batch.
# A section cannot be in two places at once, so the occupied batch eliminates
# itself as a candidate for any other class at the same slot.
#
# ALSO: Repeat-cell exclusion — if a batch's section already has this course
# as a REPEAT (anchored in Pass 1 via batch suffix), exclude that batch from
# regular candidates. A section can't take the same course both as a repeat
# AND as a regular class.
#
# Logic:
#   free = [b for b in possible if busy_calendar.get(key) != b
#           and (b, dept, section, course) not in REPEAT_ANCHORED]
#   → if exactly 1 free candidate remains → assign it
#   → if 0 remain → conflict warning, skip
#   → if 2+ remain → still ambiguous, best-effort assign first free candidate
# ==============================================================================

# Build a set of (batch, dept, section, course) from all anchored repeat cells.
# This is used to exclude batches that already have this course as a repeat.
REPEAT_ANCHORED = set()
for rec in unambiguous_classes:
    if rec.get("category") == "repeat":
        # Normalize section for matching (same as extract_section_letter)
        raw_sec = rec.get("section", "")
        norm_sec = "A"
        if raw_sec:
            m = re.search(r'([A-Z])', raw_sec)
            if m:
                norm_sec = m.group(1)
        REPEAT_ANCHORED.add((rec["batch"], rec["dept"], norm_sec, rec["course_name"]))

if REPEAT_ANCHORED:
    print(f"  Repeat-cell exclusion: {len(REPEAT_ANCHORED)} anchored repeat (batch, dept, section, course) tuples")

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
        # ALSO: exclude batches that already have this course as a repeat
        # (a section can't take the same course both as repeat AND regular)
        norm_sec_lookup = "A"
        if section:
            m_sec = re.search(r'([A-Z])', section)
            if m_sec:
                norm_sec_lookup = m_sec.group(1)
        free_candidates = [
            b for b in possible
            if not is_batch_busy(b, dept, section, day, blocking_time, busy_calendar)
            and (bypasses_quota or has_quota_room(b, dept, section, course_name, quota, quota_calendar))
            and (b, dept, norm_sec_lookup, course_name) not in REPEAT_ANCHORED
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
    # ALSO: exclude batches that already have this course as a repeat
    norm_sec_fb = "A"
    if section:
        m_fb = re.search(r'([A-Z])', section)
        if m_fb:
            norm_sec_fb = m_fb.group(1)
    free_candidates = [
        b for b in possible
        if not is_batch_busy(b, dept, section, day, blocking_time, busy_calendar)
        and (bypasses_quota or has_quota_room(b, dept, section, course_name, quota_val, quota_calendar))
        and (b, dept, norm_sec_fb, course_name) not in REPEAT_ANCHORED
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
    # Range logic (used as fallback for courses not in KNOWN_ELECTIVES or ALL_KNOWN_COURSES)
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
        # Sort with a key that handles None (color override can leave dept=None
        # for yellow/repeat cells where parse_cell_parens didn't set it).
        # Replace None with empty string for sorting, then restore for display.
        sorted_depts = sorted(list(depts), key=lambda bd: (bd[0] or "", bd[1] or ""))
        dept_str = ", ".join([f"{b} {d or '(none)'}" for b, d in sorted_depts])
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
    # 2b. Section-choice pattern: letter + digit (e.g., "A1", "A2", "B1").
    # These are core courses where the student picks which section to attend.
    # Preserve the full section identifier so A1 and A2 are distinct in the
    # output — the frontend lets the user pick their section.
    choice_match = re.match(r'^([A-Z])(\d)$', cleaned)
    if choice_match:
        return cleaned  # e.g., "A1", "B2" — keep as-is
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
        # Inherit group from section-name tags (G-I, Gp-II, etc.)
        group = global_course_groups.get((batch, course_name))

        # ── Priority-based elective detection ──────────────────────────────
        # 1. KNOWN ELECTIVES from course allocation list → authoritative True
        # 2. KNOWN CORE from admin course mappings       → authoritative False
        # 3. Section-choice pattern (A1, A2, B1)         → False (core, user picks section)
        # 4. Explicit group tag (G-I, Gp-II)             → True
        # 5. Range-based heuristic                        → fallback only
        #
        # This replaces the old `is_course_elective(rec) or group or range`
        # OR-chain where the range heuristic could override known core courses.
        if is_known_elective(dept, course_name):
            is_elective = True
        elif is_known_course(dept, course_name):
            is_elective = False
        elif re.match(r'^[A-Z]\d$', section or ""):
            # Section-choice course (e.g., Func Eng with sections A1, A2, B1).
            # Core course — the student picks which section to attend.
            # Don't flag as elective; the frontend shows all sections for the
            # user to choose from.
            is_elective = False
        elif group is not None:
            is_elective = True
        else:
            d_max = dept_max_sections.get((batch, dept), -1)
            c_max = course_max_sections.get((batch, dept, course_name), -1)
            is_elective = (c_max < d_max) if d_max != -1 else False

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
# OUTPUT with FALLBACK PROTECTION
#
# If the scraper produces an empty timetable (only __meta__, no batch data),
# it means the gviz fetch was throttled or failed. In this case, DON'T
# overwrite the existing timetable.json — keep the previous (working) version.
# This prevents the website from losing all batch data when the scraper fails.
# ==============================================================================
output_filename = "timetable.json"
data_hierarchy["__meta__"] = timetable_meta

# Count year batches (keys matching ^20\d{2}$, excluding __meta__ and System)
import re as _re
year_batches = [k for k in data_hierarchy.keys() if _re.match(r'^20\d{2}$', k)]
total_resolved = len(unambiguous_classes)
total_ambiguous = len(ambiguous_pool)

print(f"  year_batches={year_batches}")

if len(year_batches) == 0:
    # Empty output — scraper failed. Restore previous timetable.json.
    print("\n⚠  WARNING: Scraper produced 0 year batches!")
    print("   Keeping previous timetable.json to avoid breaking the website.")

    import shutil
    prev_path = "public/data/timetable.json"
    if os.path.exists(prev_path):
        shutil.copy2(prev_path, output_filename)
        with open(prev_path, "r") as f:
            prev_data = json.load(f)
        prev_batches = [k for k in prev_data.keys() if _re.match(r'^20\d{2}$', k)]
        print(f"   Restored previous timetable.json ({len(prev_batches)} year batches)")
    else:
        with open(output_filename, "w") as json_file:
            json.dump(data_hierarchy, json_file, indent=4)
        print("   No previous timetable.json found — wrote empty output")

    print(f"   Scraper stats: {total_resolved} resolved, {total_ambiguous} ambiguous")
else:
    # Normal output — write the new timetable
    with open(output_filename, "w") as json_file:
        json.dump(data_hierarchy, json_file, indent=4)

    print(f"\n✅ Success! Unified schedule exported to: {output_filename}")
    print(
        f"   Total resolved: {total_resolved} class slots "
        f"({total_ambiguous} passed through the deduction pass)"
    )
    print(f"   Year batches: {year_batches}")
