#!/usr/bin/env python3
"""
Filter student-relevant events using a chat model via Groq API.

Input format:
{
  "events": [
    {
      "event_name": "...",
      "date": "...",
      "time": "...",
      "event_location": "..."
    }
  ]
}

Usage examples:
    python3 scripts/filter_events.py
    python3 scripts/filter_events.py --input public/data/slate_calendar_events.json --output public/data/student_events.json

Environment variables:
    GROQ_API_KEY       Required. Groq API key.
    GROQ_MODEL         Optional. Defaults to llama-3.3-70b-versatile.
"""

import argparse
import json
import os
import re
import time
from pathlib import Path
from typing import Any

import requests

API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_INPUT = "public/data/slate_calendar_events.json"
DEFAULT_OUTPUT = "public/data/student_events.json"
DEFAULT_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Filter student-relevant events.")
    parser.add_argument("--input", type=str, default=DEFAULT_INPUT, help="Path to scraped events JSON.")
    parser.add_argument("--output", type=str, default=DEFAULT_OUTPUT, help="Path for filtered events JSON.")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help="Model name for Groq chat completion.")
    parser.add_argument("--batch-size", type=int, default=50, help="Events per API request.")
    parser.add_argument("--sleep", type=float, default=2.0, help="Seconds to sleep between batches.")
    parser.add_argument("--max-retries", type=int, default=3, help="Retries per batch on parse/network errors.")
    parser.add_argument("--timeout", type=int, default=90, help="HTTP timeout (seconds) for each batch request.")
    return parser.parse_args()


def load_events(path: str) -> tuple[dict[str, Any], list[dict[str, str]]]:
    raw = Path(path).read_text(encoding="utf-8")
    data = json.loads(raw)
    events = data.get("events", [])

    compact = [
        {
            "event_name": e.get("event_name", ""),
            "date": e.get("date", ""),
            "time": e.get("time", ""),
            "event_location": e.get("event_location", ""),
        }
        for e in events
    ]
    return data, compact


def build_prompt(batch: list[dict[str, str]]) -> str:
    return (
        "You are filtering a university calendar. Your job is to identify events that are "
        "relevant to students, meaning events students would care about or could attend.\n\n"
        "Include:\n"
        "- Job fairs, recruitment drives, career events\n"
        "- Seminars, guest speakers, workshops open to students\n"
        "- Exams, vivas, sessionals, quizzes, deadlines\n"
        "- Club or society events\n"
        "- Competitions, hackathons, cultural events\n"
        "- Any event where students are participants or audience\n\n"
        "Exclude:\n"
        "- Internal faculty or staff meetings\n"
        "- Administrative or management meetings\n"
        "- PhD or MS thesis defenses unless explicitly open to students\n"
        "- Staff-only training sessions\n"
        "- Any event clearly only for faculty, management, or admin\n\n"
        "Here are the events as JSON:\n"
        f"{json.dumps(batch, ensure_ascii=False, indent=2)}\n\n"
        "Respond only with a valid JSON array of the filtered events using the same fields."
    )


def extract_json_array(raw: str) -> list[dict[str, str]]:
    text = raw.strip()

    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z0-9_-]*\\n", "", text)
        text = re.sub(r"```$", "", text).strip()

    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\[.*\]", text, flags=re.DOTALL)
    if not match:
        raise ValueError("Model response did not contain a JSON array.")

    parsed = json.loads(match.group(0))
    if not isinstance(parsed, list):
        raise ValueError("Parsed JSON is not an array.")
    return parsed


def filter_batch(
    batch: list[dict[str, str]],
    api_key: str,
    model: str,
    timeout: int,
    max_retries: int,
) -> list[dict[str, str]]:
    payload = {
        "model": model,
        "temperature": 0,
        "max_tokens": 4000,
        "messages": [{"role": "user", "content": build_prompt(batch)}],
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    last_error: Exception | None = None
    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.post(API_URL, headers=headers, json=payload, timeout=timeout)
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"]
            return extract_json_array(raw)
        except Exception as exc:
            last_error = exc
            if attempt == max_retries:
                break
            backoff = min(6, attempt * 2)
            print(f"[!] Batch attempt {attempt}/{max_retries} failed, retrying in {backoff}s ...")
            time.sleep(backoff)

    raise RuntimeError(f"Batch failed after {max_retries} attempts: {last_error}")


def write_output(data: dict[str, Any], filtered: list[dict[str, str]], output_path: str) -> None:
    output = {
        "filtered_at": data.get("scraped_at", ""),
        "date_range": data.get("date_range", ""),
        "total_original": len(data.get("events", [])),
        "total_filtered": len(filtered),
        "events": filtered,
    }

    out_path = Path(output_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    args = parse_args()
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        print("[!] Set GROQ_API_KEY environment variable before running.")
        return

    source, compact = load_events(args.input)
    print(f"[*] Loaded {len(compact)} events. Filtering for student relevance ...")

    batches = [compact[i : i + args.batch_size] for i in range(0, len(compact), args.batch_size)]
    filtered: list[dict[str, str]] = []

    for idx, batch in enumerate(batches, start=1):
        print(f"[*] Processing batch {idx}/{len(batches)} ({len(batch)} events) ...")
        filtered.extend(filter_batch(batch, api_key, args.model, args.timeout, args.max_retries))
        if idx < len(batches) and args.sleep > 0:
            time.sleep(args.sleep)

    write_output(source, filtered, args.output)

    print(f"[+] Done. {len(filtered)}/{len(compact)} events kept -> {args.output}")
    print("\n-- Sample --")
    print(json.dumps(filtered[:3], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
