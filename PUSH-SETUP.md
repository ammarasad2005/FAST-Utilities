# Push Notifications — Setup Handover (no billing needed)

Everything on the sender side is **code-complete and committed**. What remains
is the one-time wiring of your Firebase project (Spark plan — free, no credit
card) and one GitHub secret. This document walks you through it.

---

## What's in the repo now

| Piece | Path | Role |
|---|---|---|
| Instant fan-out | `scripts/push/fanout.js` + steps in `update-timetable.yml` / `update-fsm-timetable.yml` | The workflows only fire it when they just committed changed timetable data — phones get pinged **~1–4 min after the new JSON is live** |
| Backup sweep | `scripts/push/sweep.js` + `.github/workflows/push-sweep.yml` | Every 20 min, hash-diffs the *other* datasets (exam-visibility, faculty, semester, student events, slate events) against `.github/state/push-hashes.json` and pings on change |
| Shared sender | `scripts/push/fcm.js` | One data-only, high-priority FCM message to topic `campus_updates` per change |
| Phone side | (in `fast-utilities-android` repo) | Native `PushMessagingService` wakes the app → repaints widgets → expedited re-sync → existing local tagged-only diff posts the actual notification. Nothing to change there |

> Why not Firebase Cloud Functions? They require the Blaze (card-billing)
> plan. FCM *sending* itself is free and unlimited on Spark — only the
> scheduler needed an address, and GitHub Actions (unlimited minutes on public
> repos) plays that role here.

---

## Your manual steps (≈10 min)

### 1. Firebase console — Android app registration
<https://console.firebase.google.com> → project **fast-utilities**
1. ⚙️ **Project settings → Your apps → Add app → Android**
2. Package name: `com.ammarasad.fastutilities` (exact, must match; nickname optional; Debug SHA-1 optional / skip)
3. Download **`google-services.json`**

### 2. Drop the config into the app build
- Place the file at `fast-utilities-android/android/app/google-services.json`
  (it is git-ignored by design — never commit it)
- Next APK build: `npx expo prebuild` (regenerates `/android` — our config
  plugin auto-applies the google-services wiring when the file exists), then
  build as usual. Builds without the file keep working exactly as before.

### 3. Enable the Cloud Messaging API
In the same Firebase project: **Build → Cloud Messaging**.
If "Firebase Cloud Messaging API (V1)" isn't enabled, hit **Manage API in
console** and enable it — this needs no billing account (it's Governed by
Spark quotas: unlimited sends).

### 4. Generate the service-account key
1. ⚙️ **Project settings → Service accounts**
2. **Generate new private key** → download the JSON (contains project_id,
   client_email, private_key — treat like a password; never paste into chat)

### 5. Add the GitHub secret
1. Repo **ammarasad2005/FAST-Utilities** → **Settings → Secrets and variables → Actions → New repository secret**
2. Name: `FIREBASE_SERVICE_ACCOUNT`
3. Value: the **entire contents** of the service-account JSON file
4. Save. If you ever rotate it, update just this secret.

### 6. Smoke test (5 min)
1. GitHub → **Actions → Push Sweep (backup) → Run workflow** (manual).
   Expect log: `[sweep] no dataset changes` (baseline was seeded during dev).
   A `[fcm] ping sent` line means credentials + API are live.
2. Real end-to-end: make any small edit in the school sheet (or reuse a
   previous change). Within ≤20 min the timetable workflow commits → the
   **"Fan out FCM ping"** step polls until Vercel serves it (~1–3 min) →
   phones on the updated APK notify — even force-closed.
3. Advance checks on a phone: the widget also repaints; opening the app
   shows the same change on the timetable tab.

---

## Expected latency (after setup)

| Path | Sheet edit → phone |
|---|---|
| Timetable / FSM changes | ≤20 (cron tick) + ~0.5 (workflow) + ~1–4 (Vercel live) + seconds (ping) → **typical ~10–20 min, worst ~30** |
| Other datasets (exams toggle, events…) | ≤20 (cron) + <1 (sweep) + seconds → **typical ~10–15 min, worst ~25** |
| Fallback if everything else stalls | Phone's own 15-min background sync (unchanged, always on) |

## Privacy note

No user data anywhere new: no device tokens stored, no per-user topics, no
analytics. The server only ever learns "dataset X changed". All per-user
scoping (your batch/dept/section tags) stays on the phone.

## If it misbehaves

- **No pings at all** → check the workflow run logs for
  `FIREBASE_SERVICE_ACCOUNT env is not set` (secret missing/renamed) or a 403
  (Cloud Messaging API not enabled — step 3).
- **Ping sent but phones silent** → the APK was built without
  `google-services.json` (step 2), or the OS notification permission is off;
  the 15-min local sync still catches everything.
- **Alert storm on first ever sweep run** → impossible by design: first run
  seeds baselines silently.
