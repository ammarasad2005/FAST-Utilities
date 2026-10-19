#!/usr/bin/env python3
"""
SLATE NU Calendar Scraper (List-of-Events view)

This script logs into SLATE, switches to List of Events view, applies a date range,
and saves normalized events to JSON.

Requirements:
    pip install requests beautifulsoup4 lxml

Usage examples:
    python3 scripts/scrape_slate.py
    python3 scripts/scrape_slate.py --start 2026-01-01 --end 2026-12-31
    python3 scripts/scrape_slate.py --output public/data/slate_calendar_events.json

Environment variables:
    SLATE_USERNAME   Required. Your SLATE username.
    SLATE_PASSWORD   Required. Your SLATE password.
    SLATE_TOOL_BASE  Optional. Full SLATE calendar tool URL.
"""

import argparse
import calendar
import json
import os
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup

BASE_URL = "http://slate.nu.edu.pk"
LOGIN_URL = f"{BASE_URL}/portal/relogin"
DEFAULT_TOOL_BASE = f"{BASE_URL}/portal/site/~your_username/tool/your_tool_id"
DEFAULT_OUTPUT = "public/data/slate_calendar_events.json"
DEFAULT_DEBUG_HTML = "scripts/debug_list.html"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scrape SLATE events in list view.")
    parser.add_argument(
        "--start",
        type=str,
        default="",
        help="Range start date in YYYY-MM-DD. Defaults to first day of current month.",
    )
    parser.add_argument(
        "--end",
        type=str,
        default="",
        help="Range end date in YYYY-MM-DD. Defaults to last day of current month.",
    )
    parser.add_argument(
        "--tool-base",
        type=str,
        default=os.environ.get("SLATE_TOOL_BASE", DEFAULT_TOOL_BASE),
        help="Full SLATE calendar tool URL. Can also be set via SLATE_TOOL_BASE.",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=DEFAULT_OUTPUT,
        help="Output JSON path.",
    )
    parser.add_argument(
        "--debug-html",
        type=str,
        default=DEFAULT_DEBUG_HTML,
        help="Path to save the response HTML after date filtering.",
    )
    return parser.parse_args()


def parse_date_range(start_text: str, end_text: str) -> tuple[datetime, datetime]:
    now = datetime.now()
    
    # Start: First day of current month
    default_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # End: Last day of NEXT month
    # To get next month, we add 32 days to current month start
    next_month_approx = default_start + timedelta(days=32)
    last_day_next_month = calendar.monthrange(next_month_approx.year, next_month_approx.month)[1]
    default_end = next_month_approx.replace(day=last_day_next_month, hour=23, minute=59, second=59)

    start = datetime.strptime(start_text, "%Y-%m-%d") if start_text else default_start
    end = datetime.strptime(end_text, "%Y-%m-%d") if end_text else default_end

    if end < start:
        raise ValueError("End date must be on or after start date.")

    return start, end


def login(session: requests.Session, username: str, password: str) -> bool:
    print("[*] Fetching login page ...")
    resp = session.get(LOGIN_URL, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "lxml")
    hidden = {}
    for inp in soup.find_all("input", {"type": "hidden"}):
        name = inp.get("name")
        if name:
            hidden[name] = inp.get("value", "")

    payload = {**hidden, "eid": username, "pw": password, "submit": "Log in"}

    print("[*] Submitting credentials ...")
    r = session.post(LOGIN_URL, data=payload, timeout=30)
    r.raise_for_status()

    final = r.url.lower()
    if "relogin" in final or ("login" in final and "portal/site" not in final):
        soup2 = BeautifulSoup(r.text, "lxml")
        err = soup2.find(class_=re.compile(r"alertMessage|login-error|error", re.I))
        message = err.get_text(strip=True) if err else r.url
        print(f"[!] Login failed: {message}")
        return False

    print("[+] Login successful.")
    return True


def get_csrf_token(session: requests.Session, tool_base: str) -> str:
    resp = session.get(tool_base, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")
    token = soup.find("input", {"name": "sakai_csrf_token"})
    return token["value"] if token else ""


def scrape_list_view(
    session: requests.Session,
    tool_base: str,
    start: datetime,
    end: datetime,
    debug_html_path: str,
) -> list[dict[str, Any]]:
    form_action = f"{tool_base}?panel=Main"

    print("[*] Switching to List of Events view ...")
    csrf = get_csrf_token(session, tool_base)
    r1 = session.post(
        form_action,
        data={
            "view": "List of Events",
            "eventSubmit_doView": "view",
            "sakai_csrf_token": csrf,
        },
        timeout=30,
    )
    r1.raise_for_status()

    print(f"[*] Filtering: {start.date()} -> {end.date()} ...")
    soup1 = BeautifulSoup(r1.text, "lxml")
    csrf2 = soup1.find("input", {"name": "sakai_csrf_token"})
    csrf2 = csrf2["value"] if csrf2 else csrf

    r2 = session.post(
        form_action,
        data={
            "sakai_csrf_token": csrf2,
            "eventSubmit_doCustomdate": "Filter Events",
            "customStartDate": start.strftime("%m/%d/%Y"),
            "customStartDateISO8601": start.strftime("%Y-%m-%dT00:00:00+05:00"),
            "customStartYear": str(start.year),
            "customStartDay": str(start.day),
            "customStartMonth": str(start.month),
            "customEndDate": end.strftime("%m/%d/%Y"),
            "customEndDateISO8601": end.strftime("%Y-%m-%dT00:00:00+05:00"),
            "customEndYear": str(end.year),
            "customEndDay": str(end.day),
            "customEndMonth": str(end.month),
        },
        timeout=30,
    )
    r2.raise_for_status()

    debug_path = Path(debug_html_path)
    debug_path.parent.mkdir(parents=True, exist_ok=True)
    debug_path.write_text(r2.text, encoding="utf-8")

    soup2 = BeautifulSoup(r2.text, "lxml")
    events: list[dict[str, Any]] = []

    table = None
    col1 = soup2.find(id="col1")
    if col1:
        table = col1.find("table")
    if not table:
        table = soup2.find("table", class_=re.compile(r"listHier|eventList", re.I))
    if not table:
        print("[!] Could not find events table. Check debug HTML output.")
        return []

    rows = table.find_all("tr")
    current_date = ""

    for row in rows:
        if row.find("th"):
            continue

        cells = row.find_all("td")
        if not cells:
            continue

        text_content = " ".join(c.get_text(strip=True) for c in cells)
        if text_content.startswith("From Site:"):
            if events:
                events[-1]["from_site"] = text_content.replace("From Site:", "").strip().strip('"')
            continue

        date_cell = cells[0].get_text(strip=True)
        if date_cell:
            current_date = date_cell

        event: dict[str, Any] = {"date": current_date}
        col_names = ["date", "time", "for", "from", "event"]

        for i, cell in enumerate(cells):
            key = col_names[i] if i < len(col_names) else f"col_{i}"
            val = cell.get_text(separator=" ", strip=True)
            if val:
                event[key] = val
            link = cell.find("a", href=True)
            if link and "doDescription" in link.get("href", ""):
                href = link["href"]
                event["detail_url"] = href if href.startswith("http") else BASE_URL + href
                event["event_name"] = link.get_text(strip=True)

        if event.get("event_name") or event.get("event"):
            events.append(event)

    return events


def fetch_event_details(session: requests.Session, events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    total = sum(1 for e in events if e.get("detail_url"))
    print(f"[*] Fetching details for {total} events ...")

    completed = 0
    for event in events:
        url = event.get("detail_url")
        if not url:
            continue

        try:
            resp = session.get(url, timeout=30)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")

            for row in soup.find_all("tr"):
                cells = row.find_all(["th", "td"])
                if len(cells) >= 2:
                    label = cells[0].get_text(strip=True).rstrip(":").lower().replace(" ", "_")
                    value = cells[1].get_text(separator=" ", strip=True)
                    if label and value and label not in event:
                        event[label] = value

            for dl in soup.find_all("dl"):
                for dt, dd in zip(dl.find_all("dt"), dl.find_all("dd")):
                    label = dt.get_text(strip=True).rstrip(":").lower().replace(" ", "_")
                    value = dd.get_text(separator=" ", strip=True)
                    if label and value and label not in event:
                        event[label] = value

            completed += 1
            label = event.get("event_name", str(url))
            print(f"    [{completed}/{total}] {label[:60]}")
        except Exception as exc:
            completed += 1
            print(f"    [!] Could not fetch detail {completed}/{total}: {exc}")

    return events


def save_json(events: list[dict[str, Any]], path: str, start: datetime, end: datetime) -> None:
    output = {
        "scraped_at": datetime.now().isoformat(),
        "date_range": f"{start.date()} to {end.date()}",
        "total_events": len(events),
        "events": [
            {
                "event_name": e.get("event_name", ""),
                "date": e.get("date", ""),
                "time": re.sub(r"\\s+", " ", e.get("time", "")).replace(" PKT", "").strip(),
                "event_location": e.get("event_location", ""),
            }
            for e in events
        ],
    }

    out_path = Path(path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[+] Saved {len(events)} events -> {out_path}")


def main() -> None:
    args = parse_args()

    username = os.environ.get("SLATE_USERNAME", "").strip()
    password = os.environ.get("SLATE_PASSWORD", "").strip()
    if not username or not password:
        print("[!] Set SLATE_USERNAME and SLATE_PASSWORD environment variables before running.")
        return

    if "your_username" in args.tool_base or "your_tool_id" in args.tool_base:
        print("[!] Set a real calendar tool URL with --tool-base or SLATE_TOOL_BASE.")
        return

    try:
        range_start, range_end = parse_date_range(args.start, args.end)
    except ValueError as exc:
        print(f"[!] Invalid date range: {exc}")
        return

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        }
    )

    if not login(session, username, password):
        return

    events = scrape_list_view(session, args.tool_base, range_start, range_end, args.debug_html)
    print(f"[+] Found {len(events)} events in list view.")
    if not events:
        return

    events = fetch_event_details(session, events)
    save_json(events, args.output, range_start, range_end)

    print("\n-- Sample (first event) --")
    print(json.dumps(events[0], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
