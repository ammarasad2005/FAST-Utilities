#!/usr/bin/env python3
"""
CI Forensics Diagnostic
=======================
Investigates why the Google Sheets API + gviz endpoint behave differently
in GitHub Actions vs locally.

Run: python3 scripts/ci_forensics.py
Expected env: GOOGLE_SHEETS_API_KEY

Phases:
  1. Environment info (Python, IP, API key presence, DNS)
  2. API key validation (minimal metadata call, NO includeGridData)
  3. gviz baseline (all 6 day sheets, BEFORE any includeGridData)
  4. includeGridData (single batched call) — full response logging
  5. gviz after includeGridData (poisoning test)
  6. Cell analysis (crash candidate detection)
  7. Summary

The script NEVER crashes — all errors are caught and logged. Exit code is
always 0 so the workflow step succeeds and we get the full log.
"""
import os
import sys
import json
import urllib.request
import urllib.parse
import urllib.error
import re
import time
import socket
import traceback
from datetime import datetime, timezone

# ── Configuration ──────────────────────────────────────────────────────
SHEET_INPUT = "https://docs.google.com/spreadsheets/d/1ZQJqdArlwCS965uw4sbJrB6j8rEPfZerMT7X8qkXSzY/edit?gid=2029661410#gid=2029661410"
SHEET_ID = SHEET_INPUT.split("/d/")[1].split("/")[0]
DAY_SHEETS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

# ── Inline constants from all_courses_schedule.py ─────────────────────
# These MUST match the scraper's definitions so the crash-candidate
# detection is accurate.
COLOR_MAP = {
    (1.00, 0.72, 0.25): {"dept": "CS", "batch": "2026"},
    (0.43, 0.32, 0.00): {"dept": "CS", "batch": "2025"},
    (0.76, 0.58, 0.00): {"dept": "CS", "batch": "2024"},
    (1.00, 0.90, 0.60): {"dept": "CS", "batch": "2023"},
    (0.50, 0.30, 1.00): {"dept": "DS", "batch": "2026"},
    (0.21, 0.11, 0.46): {"dept": "DS", "batch": "2025"},
    (0.69, 0.50, 0.84): {"dept": "DS", "batch": "2024"},
    (0.71, 0.65, 0.84): {"dept": "DS", "batch": "2023"},
    (0.00, 0.96, 0.00): {"dept": "AI", "batch": "2026"},
    (0.15, 0.31, 0.07): {"dept": "AI", "batch": "2025"},
    (0.42, 0.66, 0.31): {"dept": "AI", "batch": "2024"},
    (0.71, 0.84, 0.66): {"dept": "AI", "batch": "2023"},
    (0.00, 0.00, 1.00): {"dept": "CY", "batch": "2026"},
    (0.03, 0.22, 0.39): {"dept": "CY", "batch": "2025"},
    (0.20, 0.56, 0.85): {"dept": "CY", "batch": "2024"},
    (0.59, 0.78, 0.84): {"dept": "CY", "batch": "2023"},
    (1.00, 0.50, 0.50): {"dept": "SE", "batch": "2026"},
    (0.45, 0.18, 0.18): {"dept": "SE", "batch": "2025"},
    (0.93, 0.40, 0.40): {"dept": "SE", "batch": "2024"},
    (0.95, 0.76, 0.80): {"dept": "SE", "batch": "2023"},
    (1.00, 1.00, 0.00): {"dept": None, "batch": None, "repeat": True},
}

VALID_DEPTS = {
    "CS", "AI", "DS", "CY", "SE", "EE", "MG", "SH", "MTH", "STAT",
    "BIO", "PHY", "CHEM", "ENG", "URD", "PSY", "ECO", "ACC", "FIN", "MGT",
}


def parse_cell_parens(val):
    """Exact copy of parse_cell_parens from all_courses_schedule.py."""
    text = re.sub(r'\s+\d{1,2}:\d{2}\s*[-\u2013]\s*\d{1,2}:\d{2}\s*$', '', val).strip()
    m = re.search(r'\(([^)]+)\)\s*$', text)
    if not m:
        return None
    course_name = text[:m.start()].strip()
    paren = m.group(1).strip()
    if not course_name or not paren:
        return None
    batch = None
    bm = re.search(r',\s*(\d{2})\s*$', paren)
    if bm:
        batch = "20" + bm.group(1)
        paren = paren[:bm.start()].strip()
    if '-' in paren:
        parts = paren.split('-', 1)
        dept, section = parts[0].strip(), parts[1].strip()
    else:
        dept, section = paren.strip(), None
    if dept not in VALID_DEPTS:
        return None
    category = "repeat" if batch is not None else "regular"
    return (course_name, dept, section, batch, category)


def identify_from_color(rv, gv, bv):
    """Exact copy of identify_from_color from all_courses_schedule.py."""
    for (cr, cg, cb), info in COLOR_MAP.items():
        if abs(rv - cr) <= 0.03 and abs(gv - cg) <= 0.03 and abs(bv - cb) <= 0.03:
            if info.get("repeat"):
                return (None, None, True)
            return (info["dept"], info["batch"], False)
    return None


# ── Utility ───────────────────────────────────────────────────────────
def ts():
    return datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3]


def log(phase, msg):
    print(f"[{ts()}] [{phase}] {msg}", flush=True)


def section(title):
    print("\n" + "=" * 72, flush=True)
    print(f"  {title}", flush=True)
    print("=" * 72, flush=True)


def rgb_to_hex(r, g, b):
    return f"#{int(r * 255):02x}{int(g * 255):02x}{int(b * 255):02x}"


# ── Phase 1: Environment ─────────────────────────────────────────────
def phase1_env():
    section("PHASE 1: Environment")
    log("ENV", f"Python:   {sys.version.split()[0]}")
    log("ENV", f"Platform: {sys.platform}")
    log("ENV", f"PID:      {os.getpid()}")
    log("ENV", f"CWD:      {os.getcwd()}")

    api_key = os.environ.get("GOOGLE_SHEETS_API_KEY", "")
    log("ENV", f"GOOGLE_SHEETS_API_KEY set: {bool(api_key)} (length={len(api_key)})")
    if api_key:
        log("ENV", f"  key prefix: {api_key[:6]}... (first 6 chars only)")

    groq_key = os.environ.get("GROQ_API_KEY", "")
    log("ENV", f"GROQ_API_KEY set: {bool(groq_key)}")
    supa_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    log("ENV", f"NEXT_PUBLIC_SUPABASE_URL set: {bool(supa_url)}")

    # Public IP
    for ip_service in ["https://api.ipify.org?format=json", "https://ifconfig.me/all.json"]:
        try:
            req = urllib.request.Request(ip_service, headers={"User-Agent": "curl/7.68.0"})
            resp = urllib.request.urlopen(req, timeout=10)
            body = resp.read().decode("utf-8", errors="ignore")
            data = json.loads(body)
            ip = data.get("ip") or data.get("ip_addr") or "unknown"
            log("ENV", f"Public IP: {ip} (via {ip_service.split('/')[2]})")
            break
        except Exception as e:
            log("ENV", f"IP service {ip_service} failed: {e}")

    # DNS
    for host in ["sheets.googleapis.com", "docs.google.com"]:
        try:
            ip = socket.gethostbyname(host)
            log("ENV", f"DNS {host} -> {ip}")
        except Exception as e:
            log("ENV", f"DNS {host} FAILED: {e}")


# ── Phase 2: API key validation ──────────────────────────────────────
def phase2_api_key():
    section("PHASE 2: API Key Validation (minimal call, NO includeGridData)")
    api_key = os.environ.get("GOOGLE_SHEETS_API_KEY", "")
    if not api_key:
        log("API", "SKIP: GOOGLE_SHEETS_API_KEY is not set in env")
        return False

    url = (
        f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}"
        f"?fields=sheets.properties.title&key={api_key}"
    )
    log("API", f"GET https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}")
    log("API", f"  ?fields=sheets.properties.title&key=***{api_key[-4:]}")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ci-forensics/1.0"})
        t0 = time.time()
        resp = urllib.request.urlopen(req, timeout=15)
        elapsed = time.time() - t0
        body = resp.read().decode("utf-8")
        log("API", f"HTTP {resp.status} in {elapsed:.2f}s, body={len(body)} bytes")
        # Log rate-limit headers if present
        for h in ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset",
                   "Retry-After", "X-Goog-Quota-Status"]:
            val = resp.headers.get(h)
            if val:
                log("API", f"  header {h}: {val}")
        data = json.loads(body)
        titles = [s["properties"]["title"] for s in data.get("sheets", [])]
        log("API", f"Sheet titles ({len(titles)}): {titles}")
        return True
    except urllib.error.HTTPError as e:
        log("API", f"HTTPError {e.code}: {e.reason}")
        try:
            err_body = e.read().decode("utf-8")
            log("API", f"Error body: {err_body[:500]}")
        except Exception:
            pass
        return False
    except Exception as e:
        log("API", f"ERROR: {type(e).__name__}: {e}")
        return False


# ── Phase 3 & 5: gviz test ───────────────────────────────────────────
def gviz_test(sheet_name):
    q = urllib.parse.quote(sheet_name, safe="")
    url = (
        f"https://docs.google.com/spreadsheets/d/{SHEET_ID}"
        f"/gviz/tq?tqx=out:json&sheet={q}"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        t0 = time.time()
        resp = urllib.request.urlopen(req, timeout=20)
        elapsed = time.time() - t0
        text = resp.read().decode("utf-8", errors="replace")
        start = text.find("{")
        end = text.rfind("}") + 1
        if start < 0:
            log("GVIZ", f"  {sheet_name:10}: HTTP {resp.status} {elapsed:.2f}s "
                       f"bytes={len(text)} NO JSON (first 200 chars: {text[:200]!r})")
            return (False, 0, "")
        data = json.loads(text[start:end])
        rows = data.get("table", {}).get("rows", [])
        sig = data.get("status", "n/a")
        preview = ""
        if rows:
            cells = rows[0].get("c", [])
            vals = []
            for c in cells[:5]:
                if c and "v" in c:
                    v = c["v"]
                    if isinstance(v, str):
                        v = v.replace("\n", " ")[:30]
                    vals.append(str(v))
            preview = " | ".join(vals)
        log("GVIZ", f"  {sheet_name:10}: HTTP {resp.status} {elapsed:.2f}s "
                   f"sig={sig} rows={len(rows)} row0=[{preview}]")
        return (True, len(rows), preview)
    except urllib.error.HTTPError as e:
        log("GVIZ", f"  {sheet_name:10}: HTTPError {e.code}: {e.reason}")
        try:
            log("GVIZ", f"    body: {e.read().decode('utf-8', errors='ignore')[:300]}")
        except Exception:
            pass
        return (False, 0, "")
    except Exception as e:
        log("GVIZ", f"  {sheet_name:10}: ERROR {type(e).__name__}: {e}")
        return (False, 0, "")


def phase3_gviz_baseline():
    section("PHASE 3: gviz Baseline (BEFORE any includeGridData call)")
    results = {}
    for s in DAY_SHEETS:
        ok, rows, _ = gviz_test(s)
        results[s] = (ok, rows)
    return results


# ── Phase 4: includeGridData ─────────────────────────────────────────
def phase4_include_grid_data():
    section("PHASE 4: includeGridData (single batched call — same as scraper)")
    api_key = os.environ.get("GOOGLE_SHEETS_API_KEY", "")
    if not api_key:
        log("COLORS", "SKIP: GOOGLE_SHEETS_API_KEY not set")
        return {}

    base_url = f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}"
    params = [
        f"key={api_key}",
        "includeGridData=true",
        "fields=sheets(data(rowData(values(userEnteredValue,userEnteredFormat(backgroundColor)))))",
    ]
    for name in DAY_SHEETS:
        params.append(f"ranges={urllib.parse.quote(name + '!A1:AH80', safe='!')}")
    url = base_url + "?" + "&".join(params)

    log("COLORS", f"GET {base_url}")
    log("COLORS", f"  params: includeGridData=true, {len(DAY_SHEETS)} ranges, fields=sheets(data(...))")
    log("COLORS", f"  URL total length: {len(url)} chars")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ci-forensics/1.0"})
        t0 = time.time()
        resp = urllib.request.urlopen(req, timeout=60)
        elapsed = time.time() - t0
        body = resp.read().decode("utf-8")
        log("COLORS", f"HTTP {resp.status} in {elapsed:.2f}s, body={len(body)} bytes")

        # Log all response headers
        log("COLORS", "Response headers:")
        for h, v in resp.headers.items():
            log("COLORS", f"  {h}: {v}")

        # Save raw response for deep analysis
        try:
            with open("raw_api_response.json", "w") as f:
                f.write(body)
            log("COLORS", "Saved raw response to raw_api_response.json")
        except Exception as e:
            log("COLORS", f"Could not save raw response: {e}")

        # Log first 500 chars of body for quick inspection
        log("COLORS", f"Body preview (first 500 chars): {body[:500]!r}")

        data = json.loads(body)
        sheets = data.get("sheets", [])
        log("COLORS", f"Parsed: {len(sheets)} sheet objects in response")

        all_colors = {}
        for i, sheet in enumerate(sheets):
            if i >= len(DAY_SHEETS):
                break
            sheet_name = DAY_SHEETS[i]
            grid_data = sheet.get("data", [])
            if not grid_data:
                log("COLORS", f"  {sheet_name:10}: NO grid_data (empty response for this sheet)")
                all_colors[sheet_name] = {}
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
            all_colors[sheet_name] = colors
            log("COLORS", f"  {sheet_name:10}: {len(row_data)} rowData rows, "
                         f"{len(colors)} non-white colored cells")

            # Sample 5 colored cells with their text values
            if colors:
                log("COLORS", f"    Sample colored cells (up to 5):")
                for j, ((r, c), (rv, gv, bv)) in enumerate(list(colors.items())[:5]):
                    val = ""
                    if r < len(row_data):
                        cells = row_data[r].get("values", [])
                        if c < len(cells):
                            uev = cells[c].get("userEnteredValue", {})
                            val = (
                                uev.get("stringValue")
                                or uev.get("formattedValue")
                                or str(uev)[:60]
                            )
                    hex_c = rgb_to_hex(rv, gv, bv)
                    match = identify_from_color(rv, gv, bv)
                    log("COLORS", f"      ({r:3},{c:2}) {hex_c}  match={match}  val={str(val)[:50]!r}")

        total = sum(len(v) for v in all_colors.values())
        log("COLORS", f"TOTAL: {total} colored cells across {len(all_colors)} sheets")
        return all_colors

    except urllib.error.HTTPError as e:
        log("COLORS", f"HTTPError {e.code}: {e.reason}")
        try:
            err_body = e.read().decode("utf-8")
            log("COLORS", f"Error body: {err_body[:1000]}")
        except Exception:
            pass
        # Log rate-limit headers from error response
        for h in ["X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"]:
            val = e.headers.get(h)
            if val:
                log("COLORS", f"  header {h}: {val}")
        return {}
    except Exception as e:
        log("COLORS", f"ERROR: {type(e).__name__}: {e}")
        traceback.print_exc()
        return {}


def phase5_gviz_after():
    section("PHASE 5: gviz AFTER includeGridData (poisoning test)")
    results = {}
    for s in DAY_SHEETS:
        ok, rows, _ = gviz_test(s)
        results[s] = (ok, rows)
    return results


# ── Phase 6: Cell analysis ───────────────────────────────────────────
def phase6_cell_analysis(all_colors):
    section("PHASE 6: Cell Analysis (crash candidate detection)")
    if not all_colors:
        log("ANALYSIS", "No color data available — skipping crash analysis")
        return 0

    total_colored = 0
    total_matched = 0
    total_crash = 0

    for sheet_name, colors in all_colors.items():
        if not colors:
            log("ANALYSIS", f"{sheet_name:10}: no colored cells")
            continue

        # Fetch gviz rows to get cell text (this is a 3rd gviz call per sheet,
        # but we're in diagnostic mode — correctness over efficiency)
        q = urllib.parse.quote(sheet_name, safe="")
        url = (
            f"https://docs.google.com/spreadsheets/d/{SHEET_ID}"
            f"/gviz/tq?tqx=out:json&sheet={q}"
        )
        try:
            resp = urllib.request.urlopen(url, timeout=20)
            text = resp.read().decode("utf-8", errors="replace")
            start = text.find("{")
            end = text.rfind("}") + 1
            data = json.loads(text[start:end])
            rows = data.get("table", {}).get("rows", [])
        except Exception as e:
            log("ANALYSIS", f"{sheet_name:10}: could not fetch gviz for analysis: {e}")
            continue

        crash_candidates = []
        matched_cells = 0
        unmatched_colors = 0

        for (r, c), (rv, gv, bv) in colors.items():
            total_colored += 1
            color_result = identify_from_color(rv, gv, bv)
            if not color_result:
                unmatched_colors += 1
                continue
            total_matched += 1
            matched_cells += 1

            # Get cell text from gviz rows
            val = ""
            if r < len(rows):
                cells = rows[r].get("c", [])
                if c < len(cells) and cells[c]:
                    v = cells[c].get("v")
                    if v:
                        val = str(v).replace("\n", " ").strip()

            parsed = parse_cell_parens(val)
            if not parsed:
                total_crash += 1
                hex_c = rgb_to_hex(rv, gv, bv)
                crash_candidates.append({
                    "row": r, "col": c, "hex": hex_c,
                    "val": val[:80], "color_match": color_result,
                })

        log("ANALYSIS", f"{sheet_name:10}: {len(colors)} colored, "
                       f"{matched_cells} color-matched, "
                       f"{unmatched_colors} unmatched, "
                       f"{len(crash_candidates)} crash candidates")
        for cc in crash_candidates[:8]:
            log("ANALYSIS", f"  CRASH: row={cc['row']} col={cc['col']} "
                           f"{cc['hex']} match={cc['color_match']}")
            log("ANALYSIS", f"    val={cc['val']!r}")

    log("ANALYSIS", f"TOTALS: {total_colored} colored, "
                   f"{total_matched} matched, "
                   f"{total_crash} crash candidates")
    if total_crash > 0:
        log("ANALYSIS", f"!! {total_crash} cells would trigger AttributeError in the scraper")
        log("ANALYSIS", f"!! This is the root cause of empty CI output")
        log("ANALYSIS", f"!! (NOT 'includeGridData poisons gviz')")
    elif total_matched > 0:
        log("ANALYSIS", "All color-matched cells parse correctly — no crash candidates")
    return total_crash


# ── Main ─────────────────────────────────────────────────────────────
def main():
    section("CI FORENSICS DIAGNOSTIC")
    log("MAIN", f"Sheet ID: {SHEET_ID}")
    log("MAIN", f"Day sheets: {DAY_SHEETS}")
    log("MAIN", f"Started at: {datetime.now(timezone.utc).isoformat()}")

    phase1_env()
    api_ok = phase2_api_key()
    baseline = phase3_gviz_baseline()
    all_colors = phase4_include_grid_data()
    after = phase5_gviz_after()
    crash_count = phase6_cell_analysis(all_colors)

    section("SUMMARY")

    log("SUM", "gviz BEFORE includeGridData:")
    for s in DAY_SHEETS:
        ok, rows = baseline.get(s, (False, 0))
        log("SUM", f"  {s:10}: {'OK' if ok else 'FAIL'} ({rows} rows)")

    log("SUM", "gviz AFTER includeGridData:")
    for s in DAY_SHEETS:
        ok, rows = after.get(s, (False, 0))
        log("SUM", f"  {s:10}: {'OK' if ok else 'FAIL'} ({rows} rows)")

    # Poisoning detection
    poisoned = False
    for s in DAY_SHEETS:
        b_ok, b_rows = baseline.get(s, (False, 0))
        a_ok, a_rows = after.get(s, (False, 0))
        if b_ok and b_rows > 0 and (not a_ok or a_rows == 0):
            log("SUM", f"  POISONED: {s} went from {b_rows} rows (before) to {a_rows} rows (after)")
            poisoned = True

    if poisoned:
        log("SUM", "!! POISONING DETECTED: gviz returned fewer rows after includeGridData")
        log("SUM", "!! The 'includeGridData poisons gviz' theory MAY be correct")
    else:
        log("SUM", "OK: No poisoning detected — gviz returns same rows before/after")
        log("SUM", "    The 'includeGridData poisons gviz' theory is DEBUNKED")

    if all_colors:
        total_cells = sum(len(v) for v in all_colors.values())
        log("SUM", f"includeGridData: {total_cells} colored cells across {len(all_colors)} sheets")
    elif api_ok:
        log("SUM", "!! includeGridData returned NO color data despite valid API key")
        log("SUM", "!! The API call succeeds but returns empty gridData — possible quota/IP issue")
    else:
        log("SUM", "includeGridData was not called (API key invalid or missing)")

    if crash_count > 0:
        log("SUM", f"!! {crash_count} cells would trigger AttributeError crash in scraper")
        log("SUM", f"!! ROOT CAUSE: color override sets category but leaves course_name=None")
        log("SUM", f"!! FIX: add 'if course_name is None: continue' before line 1447")
    else:
        log("SUM", "No crash candidates detected (or no color data to analyze)")

    log("MAIN", "Diagnostic complete. Review the full log above.")
    log("MAIN", f"Finished at: {datetime.now(timezone.utc).isoformat()}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log("FATAL", f"Unexpected error in main: {type(e).__name__}: {e}")
        traceback.print_exc()
    # Always exit 0 so the workflow step succeeds and we get the log
    sys.exit(0)
