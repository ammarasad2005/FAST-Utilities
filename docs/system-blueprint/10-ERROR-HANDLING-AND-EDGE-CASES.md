---
doc: 10-ERROR-HANDLING-AND-EDGE-CASES
generated: 2026-08-09T16:16:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# 10 — Error Handling & Edge Cases

## 1. API Error Envelope Conventions

⚠️ **Inconsistent error envelope shapes** across the 17 API routes:

| Pattern | Routes using it | Example |
|---------|----------------|---------|
| JSON `{ error: string }` | Most routes (12 of 17) | `{ "error": "Unauthorized" }` |
| JSON `{ error: string, confidence: 0, match: false, reasoning: '...' }` | `POST /api/lost-found/verify` | `{ "error": "...", "confidence": 0, "match": false, "reasoning": "Technical Error: ..." }` |
| Plain text | `GET /api/lost-found/cron/reminders` (401), `POST /api/export-image` (400/500) | `'Unauthorized'`, `'Invalid entries'`, `'Failed to generate image'` |
| JSON with details | `POST /api/admin/refetch-timetable` (GitHub API error) | `{ "error": "GitHub API error: ...", "details": "..." }` |
| 200 with embedded error | `POST /api/lost-found/verify` (token missing), `POST /api/lost-found/handoff` (token missing) | `{ "match": false, "confidence": 0, "error": "GitHub token not configured" }` |
| 201 (not 200) | `POST /api/lost-found` (item creation) | Every other successful mutation returns 200 |

### Standard HTTP status code usage

| Status | Used by | Trigger |
|--------|---------|---------|
| 200 | All successful responses (except `POST /api/lost-found`) | Normal success |
| 201 | `POST /api/lost-found` only | Successful item creation |
| 400 | All validation failures | Missing required field, invalid value, length violation, category not in whitelist |
| 401 | All admin-gated routes + cron (production) | Missing/invalid `admin_session` cookie OR missing `Bearer CRON_SECRET` |
| 404 | `GET/PATCH/DELETE /api/lost-found/[id]`, `GET /api/lost-found/claim/details`, `GET /api/lost-found/[id]/resolution` | Item/claim not found in DB |
| 500 | All routes (catch-all) | Supabase error, AI fetch error, unexpected exception |

⚠️ No route uses 403 (Forbidden) — auth is binary (401 = not logged in, otherwise allowed).
⚠️ No route uses 429 (Too Many Requests) — no rate-limiting anywhere.

## 2. Per-Route Error Handling Detail

### `/api/schedule` (GET)
- 400 `{ error: 'batch and dept required' }` — when either query param missing
- No 500 path — pure in-memory filter on bundled JSON

### `/api/timetable` (GET)
- 500 `{ error: 'Failed to retrieve timetable data' }` — caught exception, falls back to local JSON (silent — user still gets 200 with local data)

### `/api/feedback` (POST)
- 400 `{ error: 'Content is required' }` / `{ error: 'Invalid category' }` / `{ error: 'Rating must be between 1 and 5' }`
- 500 `{ error: 'Failed to submit feedback' }` / `{ error: 'Failed to fetch feedback' }`

### `/api/feedback/[id]` (DELETE)
- 400 `{ error: 'Feedback ID is required.' }` (only if `id` empty string — Next.js always provides non-empty)
- 401 `{ error: 'Unauthorized' }`
- 500 `{ error: 'Failed to delete feedback' }`

### `/api/smart-search` (POST)
- 400 `{ error: 'Query is required' }`
- 500 `{ error: 'Smart search failed' }`
- ⚠️ AI failures silently fall back to local scoring (200 with `source: 'local'`)

### `/api/admin/login` (POST)
- 400 `{ error: 'Username and password are required' }`
- 401 `{ error: 'Invalid username or password' }`
- 500 `{ error: 'Internal server error' }`

### `/api/admin/refetch-timetable` (POST)
- 401 `{ error: 'Unauthorized' }`
- 500 `{ error: 'GitHub Personal Access Token (GITHUB_TOKEN) is not configured in environment variables.' }`
- 500 `{ error: 'GitHub API error: <statusText>', details: <errorText> }` — propagates GitHub's HTTP status
- 500 `{ error: string }` — fetch threw

### `/api/lost-found` (GET, POST)
- GET 500 `{ error: 'Failed to fetch items' }`
- POST 400 `{ error: 'Type must be either "lost" or "found"' }` / `{ error: 'Title must be at least 3 characters' }` / `{ error: 'Description must be at least 5 characters' }` / `{ error: 'Location is required' }` / `{ error: 'Invalid category' }` / `{ error: 'Date is required' }`
- POST 500 `{ error: 'Failed to create item' }`

### `/api/lost-found/[id]` (GET, PATCH, DELETE)
- GET 404 `{ error: 'Item not found' }`
- GET 500 `{ error: 'Failed to fetch item' }`
- PATCH 401 `{ error: 'Unauthorized' }` (admin-toggle-resolved branch only)
- PATCH 400 `{ error: 'You have already registered a pending claim for this item...' }`
- PATCH 404 `{ error: 'Item not found' }`
- PATCH 500 `{ error: 'Failed to update item' }`
- DELETE 401 `{ error: 'Unauthorized' }`
- DELETE 404 `{ error: 'Item not found' }`
- DELETE 500 `{ error: 'Failed to delete item' }`

### `/api/lost-found/[id]/resolution` (GET)
- 404 `{ error: 'Item not found' }`
- 500 `{ error: string }`
- ⚠️ Never returns 400 — handles all data shapes defensively

### `/api/lost-found/verify` (POST)
- 400 `{ error: 'Images and item ID are required' }`
- 500 `{ error: string, confidence: 0, match: false, reasoning: 'Technical Error: <msg>' }`
- ⚠️ Token-missing returns 200 (not 500) with `{ match: false, confidence: 0, error: 'GitHub token not configured' }`

### `/api/lost-found/handoff` (POST)
- 500 `{ error: 'Failed to process location' }`
- ⚠️ Token-missing returns 200 with input echoed back (with 'Not specified' defaults)

### `/api/lost-found/claim/details` (GET)
- 400 `{ error: 'Claim ID is required' }`
- 404 `{ error: 'Claim not found' }`
- 500 `{ error: string }`

### `/api/lost-found/claim/sync` (POST)
- 400 `{ error: 'Found item ID and email are required' }`
- 404 `{ error: 'Found item not found' }`
- 500 `{ error: 'AI matching unavailable' }` — token missing (NO local fallback, unlike siblings)
- 500 `{ error: string }`

### `/api/lost-found/claim/unclaim` (POST)
- 400 `{ error: 'Claim ID and email are required' }`
- 400 `{ error: 'Email address does not match the email associated with this claim. Claim cannot be undone.' }`
- 404 `{ error: 'Claim not found' }`
- 500 `{ error: string }`

### `/api/lost-found/claim/user-claims` (GET)
- 400 `{ error: 'Email is required' }`
- 500 `{ error: string }`

### `/api/lost-found/claim/verify-hold` (POST)
- 400 `{ error: 'Claim ID is required' }`
- 400 `{ error: 'This claim has already been cancelled/unclaimed.' }`
- 404 `{ error: 'Claim not found' }`
- 500 `{ error: string }`

### `/api/lost-found/cron/reminders` (GET)
- 401 `'Unauthorized'` (plain text — only in production)
- 500 `{ error: string }`
- ⚠️ Dev mode is completely open — no auth check

### `/api/export-image` (POST)
- 400 `'Invalid entries'` (plain text)
- 500 `'Failed to generate image'` (plain text)
- ⚠️ No auth — anyone can submit large `entries` arrays (memory/DoS vector)

## 3. UI Error Handling Patterns

### Toast notifications

Used by 3 components/pages:

| Caller | Trigger | Toast type |
|--------|---------|------------|
| `FeedbackWidget.tsx` | Submit success | success animation panel (not toast) |
| `FeedbackWidget.tsx` | Submit failure | `toast({ variant: 'destructive', title: 'Submission failed', description: error })` |
| `admin/page.tsx` | Login error | Animated red banner (not toast) |
| `admin/page.tsx` | Item resolve/unresolve success | `toast({ title: 'Item marked as resolved' })` |
| `admin/page.tsx` | Item delete success | `toast({ title: 'Item deleted' })` |
| `admin/page.tsx` | Feedback delete success | `toast({ title: 'Feedback deleted' })` |
| `admin/page.tsx` | Settings save success | `toast({ title: 'Settings saved' })` |
| `admin/page.tsx` | Refetch timetable success | `toast({ title: 'Workflow triggered', description: data.message })` |
| `admin/page.tsx` | Any API error | `toast({ variant: 'destructive', title: 'Error', description: data.error })` |
| `lost-found/page.tsx` | Item report success | `toast({ title: 'Item reported' })` |
| `lost-found/page.tsx` | Claim recorded | `toast({ title: 'Claim recorded' })` |
| `lost-found/page.tsx` | Any API error | `toast({ variant: 'destructive', ... })` |

### Silent failures (no UI feedback)

| Caller | Behavior |
|--------|----------|
| `/` (landing) | `console.error('Error fetching initial summer courses:', err)` — no UI feedback |
| `/` (landing) | `console.error('Error checking semester type:', err)` — no UI feedback |
| `/home` | Same patterns as landing |
| `/timetable` | `fetch /api/timetable` errors fall back to bundled `allEntries` — no user feedback |
| `/timetable/custom` | Same fallback pattern |
| `/rooms` | `console.error('Could not load semester name')` — uses lazy-init default `'Spring 2026'` |
| All API routes that use `lib/email.ts` | All 5 email functions catch errors, `console.error` only — never re-throw |

### Console.log debug leftovers

⚠️ `src/app/schedule/page.tsx:39,64,67` has debug `console.log` statements in production code:
```ts
console.log('[Schedule] Summer mode:', isSummer);
console.log('[Schedule] Summer filter — selectedCourses:', selectedCourses);
```
Should be removed for production.

## 4. Empty States

| Component | Trigger | UI |
|-----------|---------|-----|
| `EmptyState` | `/schedule`, `/custom`, `/timetable`, `/timetable/custom` — filtered list is empty | Centered "∅" symbol + message + "Go back" button |
| `/lost-found` empty state | No items match filters | "No active reports right now" + "REPORT AN ITEM" CTA |
| `/lost-found` archived empty state | No archived items | "No archived items" |
| `/timetable/custom` initial | No rows added yet | "Add a class to begin" prompt |
| `/custom` initial | No rows added yet | "📋 Add a course to begin" prompt |
| `/admin` items tab | No items match filters | "No items found" |
| `/admin` feedback tab | No feedback match filters | "No feedback found" |

## 5. Loading States

| Component | Trigger | UI |
|-----------|---------|-----|
| `/admin` | `checkingAuth=true` | Centered spinner + "Verifying Admin Credentials..." |
| `/admin` | `loginLoading=true` | Button shows spinner + "Authenticating..." |
| `/admin` | `loadingSettings=true` | Centered RefreshCw spinner |
| `/admin` | `refetchingTimetable=true` | Button shows spinner + "Triggering..." |
| `/admin` | `actionLoading` (per-item) | Inline spinner on action button |
| `/lost-found` | `loading=true` (initial fetch) | SkeletonCard with shimmer effect |
| `/lost-found` | `smartSearchLoading=true` | Spinner in search results area |
| `FeedbackWidget` | `submitting=true` | Button shows Loader2 spinner + "Submitting..." |
| `ExportButton` | `isExporting=true` (PNG) | Button shows "Generating..." |
| `DesktopTicker` | `!mounted` | Hidden 180px placeholder div (hydration safety) |

⚠️ Other pages (landing, home, schedule, timetable, faculty, rooms, events, semester) have **no loading skeletons** — they either render nothing during load or flash unstyled content.

## 6. Error Boundaries

⚠️ **None of the 13 pages wrap children in React Error Boundaries.** A thrown error in any sub-component crashes the entire page (Next.js shows default error overlay in dev, blank page in production).

Next.js 14 App Router supports `error.tsx` files for route-level error boundaries — none are present in the codebase.

## 7. Network Failure Simulation (live-crawl verified)

| Scenario | Tested? | Result |
|----------|---------|--------|
| `/api/timetable` returns 500 | Not tested live | Code path: `serveLocalFallback()` returns local JSON; user sees stale data silently |
| `/api/lost-found` returns 500 | Not tested live | Code path: `toast({ variant: 'destructive' })` in admin; silent in lost-found page |
| Supabase unreachable | Not tested live | All Supabase queries would throw; most callers `console.error` and continue; some return empty arrays |
| GitHub Models AI unreachable | Not tested live | `smart-search`: falls back to local scoring; `handoff`: returns raw inputs; `verify`: returns `{ match: false, confidence: 0 }`; `claim/sync`: 500 hard fail |
| Vercel function timeout | Not tested live | Default Vercel timeout is 10s (free tier) / 60s (pro); no route explicitly extends this |

## 8. Edge Cases

### Empty / malformed inputs

| Input | Handling |
|-------|----------|
| Empty `entries` array to `POST /api/export-image` | 400 `'Invalid entries'` |
| Empty `items` array to `POST /api/smart-search` | 200 `{ suggestions: [], alternatives: [] }` |
| Empty `query` to `POST /api/smart-search` | 400 `{ error: 'Query is required' }` |
| Non-array `entries` to `POST /api/export-image` | 400 `'Invalid entries'` |
| Missing `id` in URL path | Next.js routing always provides non-empty `[id]` segment; explicit empty-string check is defensive |

### Unicode / special characters

- `contactInfo` in `POST /api/lost-found` is `.toLowerCase().trim()`'d — corrupts phone numbers and special chars
- All other string fields stored as-is (no sanitization)
- ⚠️ No HTML entity escaping in `lib/email.ts` HTML templates — claimer names/emails could contain HTML injection (limited impact since Gmail strips most scripts)

### Time parsing edge cases

- `parseTimeToMinutes` in `lib/timetable-filter.ts` applies FAST PM heuristic: hours 1-7 → +12. So `"01:00"` → 13:00 (780 min). Comment: "FAST University classes are 8:30 AM to 5:15 PM".
- `parseTime24` in `lib/dates.ts` uses `||` instead of `??` for hour/minute: `h=0` becomes `0` (correct for midnight, but suspect pattern).
- `sortByChronological` in `lib/dates.ts:108-117` uses 12-h `parseTime` instead of `parseTime24` — same-day exam sort order is INCORRECT for 24-h formatted times like "08:30" (returns 0, sorts as equal).
- Time strings with en-dash `–` (vs ASCII `-`) supported by `extractTimeFromCourseName` regex.
- `'TBA'` and `'Unknown Time'` → 0 minutes in `parseTimeToMinutes`.

### Date parsing edge cases

- Exam dates: `"DD/MM/YYYY"` format, parsed via `parseExamDate` in `lib/dates.ts:9`
- Sheet dates: `"03 Aug"` format, parsed inline in `DesktopTicker.tsx` and `timetable/page.tsx:resolvedData` memo
- Event dates: `"August 4"` or `"Jan 5"` format, parsed via `parseEventDate` in `lib/events.ts` with year inference (past months roll to next year)
- ISO dates: `"2026-08-03"` format, used in `TimetableSheetMeta.isoDate`

### Concurrent modification

- No optimistic updates — all mutations wait for server response before updating local state
- No conflict detection if two users edit the same item simultaneously — last write wins

### localStorage quota exceeded

- ⚠️ Not handled — `localStorage.setItem` throws `QuotaExceededError` when storage is full
- No try/catch around any `setItem` call
- Would crash the page

### Stale data

- Build-time JSON (`timetable.json`, etc.) is bundled — updates require Vercel rebuild
- The 30s polling on `/lost-found` keeps items fresh, but other pages require manual refresh
- `/api/timetable` is `force-dynamic` but the server still reads from `require()`-bundled JSON — the data only changes when GitHub Actions commits new `public/data/timetable.json` and Vercel rebuilds

## 9. Security Flags ⚠️

### Critical

| # | Issue | Files | Impact |
|---|-------|-------|--------|
| S1 | **Anonymous PATCH on lost-found items** — generic update branch in `PATCH /api/lost-found/[id]` (lines 191-326) has NO auth check. Anyone can overwrite title/description/location/contactInfo/category/imageUrl/isResolved/resolvedBy/resolutionImageUrl/date on ANY item. | `src/app/api/lost-found/[id]/route.ts:191-326` | Anonymously mutate any lost/found item |
| S2 | **Anonymous AI-driven item resolution** — `POST /api/lost-found/verify` allows anonymous callers to drive auto-resolution via AI image verification. Anyone with an item ID + image URL can get an item auto-resolved. | `src/app/api/lost-found/verify/route.ts:7-179` | Anonymous item resolution |
| S3 | **Anonymous self-verification of claims** — `POST /api/lost-found/claim/verify-hold` requires only the claim UUID (sent via email but not cryptographically protected). Anyone with a claimId can self-verify. | `src/app/api/lost-found/claim/verify-hold/route.ts:6-69` | Anonymous claim self-verification |
| S4 | **SSRF in image verification** — `POST /api/lost-found/verify` fetches `originalImageUrl` server-side with no URL allowlist. | `src/app/api/lost-found/verify/route.ts:7-179` | Server-side request forgery |
| S5 | **Email enumeration** — `GET /api/lost-found/claim/user-claims?email=X` exposes which items a user has claimed on, with no auth. | `src/app/api/lost-found/claim/user-claims/route.ts:6-32` | Privacy violation |
| S6 | **Privacy leak in claim emails** — `sendClaimRecordedEmail`, `sendNewClaimNotificationToOthers`, `sendClaimNotificationToReporter` all embed ALL claimer emails in the email body, visible to every recipient. | `src/lib/email.ts:31-296` | Email address leak to all claimers |
| S7 | **Prompt-injection vector** — `POST /api/smart-search` accepts arbitrary client-supplied `items` array passed to AI without sanitization. Attacker can craft item titles/descriptions to manipulate AI suggestions. | `src/app/api/smart-search/route.ts:5-105` | AI manipulation |
| S8 | **Stale email URLs** — All email verification links point to `https://fast-isb-exams.vercel.app/lost-found?verifyClaimId=...` — wrong deployment alias. Live target is `https://fast-nuces-isb.vercel.app`. | `src/lib/email.ts:31` | Verification links broken |
| S9 | **Public Supabase RLS** — All 4 tables allow public SELECT/INSERT/UPDATE/DELETE. Server uses anon key (no service-role bypass). All DB writes are subject to RLS. | `supabase_schema.sql:39-83` | Anonymous DB writes |
| S10 | **Hardcoded admin identity** — `admin/page.tsx:931,624` stores `resolvedBy: 'ammarasad321993'` regardless of actual login. Audit trail is fake. | `src/app/admin/page.tsx:624,931` | Fake audit trail |
| S11 | **Hidden admin shortcut** — `Ctrl+Shift+A` global keyboard shortcut navigates to `/admin` (undocumented in UI). | `src/components/GlobalShortcuts.tsx:13-16` | Discoverable admin URL |
| S12 | **Admin dashboard code shipped to all browsers** — `/admin` page is purely client-side gated. The dashboard source code (including all admin-only logic and Supabase queries) is in the JS bundle. | `src/app/admin/page.tsx:536-547` | Source code leak |
| S13 | **Admin token is deterministic** — `admin_session` = `base64(ADMIN_USERNAME:ADMIN_PASSWORD)`. Constant per-deploy. No rotation, no JWT, no signing secret. | `src/lib/admin.ts:17-24` | Token replay |
| S14 | **No rate-limiting anywhere** — No rate-limit on admin login (brute-force possible), no rate-limit on lost-found item creation (spam), no rate-limit on AI endpoints (cost abuse). | All API routes | Abuse vectors |
| S15 | **No CSRF protection** — Admin mutations rely solely on cookie auth, no CSRF token. | All admin-gated routes | CSRF attacks |
| S16 | **Cron auth bypassed in dev** — `GET /api/lost-found/cron/reminders` only checks `Bearer CRON_SECRET` when `NODE_ENV === 'production'`. Dev mode is open. | `src/app/api/lost-found/cron/reminders/route.ts:13-15` | Open cron in dev |
| S17 | **`contactInfo` corruption** — Force-lowercasing on insert corrupts phone numbers. | `src/app/api/lost-found/route.ts:130` | Data corruption |
| S18 | **`resolved_by` overloaded** — Stores `'admin'`, `'Claimant verified (email)'`, `'claimerId:lostItemId'`, `'ammarasad321993'`. Brittle parsing in `/resolution` GET. | Multiple routes | Data integrity risk |
| S19 | **Server-side file read in request path** — `POST /api/lost-found/handoff` does `fs.readFileSync('docs/campus_map_rules.md')` synchronously on every request. | `src/app/api/lost-found/handoff/route.ts:46-104` | Performance / blocking |
| S20 | **`sonner.tsx` latent crash** — Imports `next-themes` (not in `package.json`). Safe only because never imported. | `src/components/ui/sonner.tsx:1-25` | Latent crash if ever imported |
| S21 | **Lost & Found Storage bucket is public-write** — Anyone can upload files to `lost_found_images` bucket. No file size/type validation server-side. | `supabase_schema.sql:84-95` | Storage abuse |
| S22 | **Admin settings write via anon key** — `admin/page.tsx:286` calls `supabase.from('semester_settings').update({...})` using the anon client. Works only because RLS allows public UPDATE. | `src/app/admin/page.tsx:286` | Anonymous settings modification |

### Informational

| # | Issue | Files |
|---|-------|-------|
| S23 | `getAdminSessionToken()` returns literal `'invalid-session-token'` if env vars unset — all admin-gated routes return 401 (correct fail-closed behavior, but distinct error pattern). | `src/lib/admin.ts:17-24` |
| S24 | No CSP headers set (only `Cache-Control` on `/data/:path*`). | `next.config.js:5-12` |
| S25 | `verifyAdminCredentials` uses non-constant-time string compare (minor timing-attack surface, low severity). | `src/lib/admin.ts:26-30` |
| S26 | `_document.tsx` is dead Pages Router code in an App Router project — could mask missing `app/` files if mistakenly referenced. | `src/pages/_document.tsx:1-13` |
| S27 | `tsconfig.json` excludes `scripts/` from type-checking — Python-coupled TS scripts could have type errors that don't surface in CI. | `tsconfig.json:1-41` |

## 10. Verification Commands

To verify the issues above:

```bash
# S1 — anonymous item mutation
curl -X PATCH https://fast-nuces-isb.vercel.app/api/lost-found/<ITEM_UUID> \
  -H "Content-Type: application/json" \
  -d '{"title":"hacked"}'
# Expected: 200 { item: {...} } — confirms vulnerability

# S5 — email enumeration
curl 'https://fast-nuces-isb.vercel.app/api/lost-found/claim/user-claims?email=test@example.com'
# Expected: 200 { itemIds: [] } — confirms endpoint is public

# S13 — admin token predictability
# Knowing ADMIN_USERNAME and ADMIN_PASSWORD (if leaked), base64-encode them
# and set as admin_session cookie — full admin access

# S22 — anonymous settings modification (via anon Supabase key)
# Use the public NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
# (visible in client bundle) to directly UPDATE semester_settings
```

⚠️ Do NOT run destructive verification commands against the live deployment.
