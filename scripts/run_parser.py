import os
import sys
import json
import urllib.request
import subprocess

def get_semester_type():
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    if not supabase_url or not supabase_key:
        # Check .env.local locally
        try:
            with open(".env.local", "r") as f:
                for line in f:
                    if "=" in line and not line.strip().startswith("#"):
                        key, val = line.strip().split("=", 1)
                        os.environ[key] = val.strip().replace('"', '').replace("'", "")
            supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
            supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
        except FileNotFoundError:
            pass

    if not supabase_url or not supabase_key:
        print("Warning: Supabase credentials not found. Defaulting to regular semester parser.")
        return "regular"

    try:
        url = f"{supabase_url}/rest/v1/semester_settings?id=eq.1&select=semester_type"
        req = urllib.request.Request(url, headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
        })
        resp = urllib.request.urlopen(req, timeout=6)
        rows = json.loads(resp.read().decode("utf-8"))
        if rows:
            return rows[0].get("semester_type", "regular")
    except Exception as e:
        print(f"Warning: Could not query active semester type from Supabase: {e}")
    return "regular"

def main():
    sem_type = get_semester_type()
    print(f"Active Semester Type detected: {sem_type}")
    if sem_type == "summer":
        print("Launching Summer Timetable Parser...")
        res = subprocess.run(["python3", "scripts/parse_summer_timetable.py"])
        sys.exit(res.returncode)
    else:
        print("Launching Regular Semester Timetable Parser...")
        res = subprocess.run(["python3", "all_courses_schedule.py"])
        sys.exit(res.returncode)

if __name__ == "__main__":
    main()
