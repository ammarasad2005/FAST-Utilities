---
doc: 03-API-REFERENCE
generated: 2026-08-09T15:50:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# 03 — API Reference

17 logical routes across 21 files under `src/app/api/`. Two use `runtime = 'edge'` (`schedule`, `export-image`); the remaining 15 are Node-runtime serverless functions with `dynamic = 'force-dynamic'`.

Shared libraries:
- `src/lib/admin.ts:1-39` — admin auth (cookie `admin_session` = `base64(ADMIN_USERNAME:ADMIN_PASSWORD)`)
- `src/lib/email.ts:1-296` — Nodemailer Gmail SMTP (5 functions, silent no-op if env unset, all errors swallowed)
- `src/lib/supabase.ts:1-6` — Supabase client (anon key, RLS-restricted)
- `src/lib/exam-catalog.ts:1-87` — merges FSM/FSE exam-only courses into summer catalog
- `src/lib/timetable-filter.ts` — `flattenTimetable`, `findMatchingCatalogEntry`, `extractTimeFromCourseName`

---

### `GET /api/schedule`
- **File:** `src/app/api/schedule/route.ts:9-27`
- **Auth required:** ❌ no — fully anonymous
- **Request:**
  - Headers: none
  - Query params: `{ batch: string (required), dept: string (required, server upper-cases it) }`
  - Body: none
- **Response:**
  - 200: `ExamEntry[]` (filtered array — see `04-DATA-MODELS-AND-SCHEMA.md` for shape)
  - 400: `{ error: 'batch and dept required' }` — when either param missing
- **Server-side logic:**
  1. Read `searchParams.batch` + `searchParams.dept` (uppercased) from `req.nextUrl`
  2. Return 400 if either missing
  3. In-memory filter `require('../../../../public/data/regular_schedule.json')` (loaded at module init)
  4. Return filtered array as JSON
- **DB/external calls:** none — local JSON file only
- **Env vars referenced:** none
- **Notable behaviors:** `runtime = 'edge'`. Sets `Cache-Control: s-maxage=3600, stale-while-revalidate=86400`. **No `dynamic = 'force-dynamic'`** (only route without it — relies on edge caching).
- **Live example** [live-crawl: 2026-08-09]: `GET /api/schedule?batch=2024&dept=CS` → 200, 1717 bytes, ~2.3s

---

### `GET /api/timetable`
- **File:** `src/app/api/timetable/route.ts:316-399`
- **Auth required:** ❌ no
- **Request:**
  - Headers: none
  - Query params: none
  - Body: none
- **Response:**
  - 200: `{ entries: TimetableEntry[], catalog: SummerCourseCatalogEntry[] }`
  - 500: `{ error: 'Failed to retrieve timetable data' }` — caught exception, falls back to local JSON
- **Server-side logic:**
  1. Query `supabase.from('semester_settings').select('*').eq('id', 1).single()`
  2. If error or no settings → `serveLocalFallback()` (flatten local `timetable.json`, merge `summer_schedule.json` exam-only courses via `mergeExamOnlyCourses`)
  3. If settings exist, set `isSummer = settings.semester_type === 'summer'`
  4. Read local `public/data/timetable.json`, flatten via `flattenTimetable`. If summer, filter to `batch === 'Summer'`.
  5. If summer: inspect `settings.course_mappings`. If empty/null → normalize `courseName` and auto-build catalog. If non-empty → whitelist entries by matching catalog (only visible non-hidden entries kept; `courseName` rewritten to canonical `sheetName`).
  6. If summer: `catalog = mergeExamOnlyCourses(catalog)` — adds FSM/FSE exam-only courses and tags FSC entries with `school`
  7. Return `{ entries, catalog }`
  8. On any uncaught exception → `serveLocalFallback()`
- **DB/external calls:**
  - **Supabase:** `semester_settings` (read, `id=1`)
  - Local file reads: `public/data/timetable.json` (via `require`), `public/data/summer_schedule.json` (via `require` in `lib/exam-catalog.ts`)
- **Env vars referenced:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Notable behaviors:** `dynamic = 'force-dynamic'`. File also defines (but does NOT export) helpers `extractSheetInfo`, `parseCSV`, `processCSVRows`, `autoBuildCatalog` — leftover from earlier Google Sheets CSV fetching. No caching headers.
- **Live example** [live-crawl: 2026-08-09]: `GET /api/timetable` → 200, 16648 bytes, ~1.9s. Response shape:
  ```json
  {
    "entries": [
      { "courseName": "AP", "batch": "Summer", "department": "CS", "section": "B",
        "day": "Monday", "time": "08:30-10:15", "room": "D-304", "type": "lecture",
        "category": "regular", "rescheduled": false, "exam": false,
        "isElective": false, "electiveGroup": null, "cancelled": false, "reserved": false }
    ],
    "catalog": [
      { "hidden": false, "sheetName": "AP", "displayName": null,
        "school": "FSC", "examOnly": false }
    ]
  }
  ```
  Observed: 52 entries, 25 catalog entries (13 examOnly for FSM/FSE).

---

### `POST /api/feedback` and `GET /api/feedback`
- **File:** `src/app/api/feedback/route.ts:8-84`
- **Auth required:**
  - POST: ❌ no (public submission)
  - GET: ✅ yes — `isAdminAuthenticated(request)` (cookie `admin_session`)
- **Request (POST):**
  - Headers: `Content-Type: application/json` (implicit)
  - Body:
    ```ts
    {
      email?: string,         // optional, stored trimmed or null
      category: 'bug_report' | 'suggestion' | 'review' | 'inquiry',
      rating: string | number,  // parseInt'd; must be 1..5
      content: string         // required, trimmed
    }
    ```
- **Request (GET):** Cookie `admin_session=<token>`; no body
- **Response:**
  - POST 200: `{ success: true, feedback: <campus_feedback row> }`
  - POST 400: `{ error: string }` — content missing/empty, category missing/invalid, or rating out of range
  - POST 500: `{ error: string }` — Supabase insert error or unexpected throw
  - GET 200: `{ feedback: <campus_feedback row>[] }` (newest first; empty array if no rows)
  - GET 401: `{ error: 'Unauthorized' }` — admin cookie missing/invalid
  - GET 500: `{ error: string }` — Supabase fetch error
- **DB/external calls:** Supabase `campus_feedback` (POST insert + select; GET select all)
- **Env vars referenced:** `ADMIN_USERNAME`, `ADMIN_PASSWORD` (via `@/lib/admin`); Supabase env vars
- **Notable behaviors:** `dynamic = 'force-dynamic'`. **No rate-limit** on public POST — anonymous spam vector.

---

### `DELETE /api/feedback/[id]`
- **File:** `src/app/api/feedback/[id]/route.ts:8-42`
- **Auth required:** ✅ yes — `isAdminAuthenticated(request)` (cookie `admin_session`)
- **Request:**
  - Headers: `Cookie: admin_session=<token>`
  - URL path param: `id: string` (feedback row UUID)
  - Body: none
- **Response:**
  - 200: `{ success: true }`
  - 400: `{ error: 'Feedback ID is required.' }` (only if `id` empty string — Next.js routing always provides non-empty)
  - 401: `{ error: 'Unauthorized' }`
  - 500: `{ error: string }`
- **Server-side logic:** Verify admin → read `id` from params → `supabase.from('campus_feedback').delete().eq('id', id)` → return success
- **DB/external calls:** Supabase `campus_feedback` (delete)
- **Env vars referenced:** `ADMIN_USERNAME`, `ADMIN_PASSWORD`; Supabase env vars

---

### `POST /api/smart-search`
- **File:** `src/app/api/smart-search/route.ts:5-105`
- **Auth required:** ❌ no
- **Request:**
  - Body:
    ```ts
    {
      query: string,
      items: Array<{
        id?: string, title?: string, description?: string,
        category?: string, location?: string, type?: string,
        createdAt?: string, isResolved?: boolean
      }>
    }
    ```
- **Response:**
  - 200 (AI available): `{ suggestions: Suggestion[], alternatives: string[], aiSuggestion: string | null, source: 'ai' }`
  - 200 (no token / AI fetch fails): `{ suggestions: Suggestion[], alternatives: string[], source: 'local' }`
  - 200 (empty items): `{ suggestions: [], alternatives: [] }`
  - 400: `{ error: 'Query is required' }`
  - 500: `{ error: 'Smart search failed' }`
- **Server-side logic:**
  1. Parse body. 400 if `query` missing/non-string.
  2. If `items` empty → short-circuit 200 empty.
  3. Filter out `isResolved` items. Tokenize query (words >2 chars). Score each item (title +3/word, desc +2/word, category +2/word, location +1/word). Sort desc, take top 5 → `suggestions`. Top 10 categories dedup → up to 4 `alternatives`.
  4. If `GITHUB_TOKEN` set → POST to `https://models.github.ai/inference/chat/completions` (model `gpt-4o-mini`, response_format `json_object`). On success, return with `source: 'ai'`.
  5. On failure or missing token → return local-only result with `source: 'local'`.
- **DB/external calls:** GitHub Models AI chat completions. **No DB calls** — operates entirely on client-supplied `items` array.
- **Env vars referenced:** `GITHUB_TOKEN`
- **Notable behaviors:** ⚠️ **Prompt-injection vector**: client-supplied items are passed to AI without sanitization. An attacker can craft item titles/descriptions to manipulate AI suggestions.

---

### `GET /api/admin/check`
- **File:** `src/app/api/admin/check/route.ts:6-9`
- **Auth required:** ❌ no (the route IS the auth check)
- **Request:** optional `Cookie: admin_session=<token>`
- **Response:** 200 `{ authenticated: boolean }`
- **Logic:** Call `isAdminAuthenticated(request)` → return boolean
- **Notable behaviors:** Publicly exposes whether the requester is logged in as admin
- **Live example** [live-crawl: 2026-08-09]: `GET /api/admin/check` → 200, 23 bytes, `{"authenticated":false}`

---

### `POST /api/admin/login`
- **File:** `src/app/api/admin/login/route.ts:6-48`
- **Auth required:** ❌ no (pre-auth route)
- **Request:**
  - Body: `{ username: string, password: string }`
- **Response:**
  - 200: `{ success: true }` — also sets `admin_session` cookie (httpOnly, secure in prod, sameSite=lax, path=/, maxAge=86400s = 24h)
  - 400: `{ error: 'Username and password are required' }`
  - 401: `{ error: 'Invalid username or password' }`
  - 500: `{ error: 'Internal server error' }`
- **Server-side logic:**
  1. Parse body. 400 if `username` or `password` missing.
  2. `verifyAdminCredentials(username, password)` — plain string compare to env `ADMIN_USERNAME`/`ADMIN_PASSWORD`.
  3. 401 if invalid.
  4. `token = getAdminSessionToken()` = `base64('username:password')`.
  5. Build response with `{ success: true }` and set `admin_session` cookie.
- **Env vars referenced:** `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `NODE_ENV`
- **Notable behaviors:** ⚠️ Token is deterministic (base64 of credentials) — constant per-deploy. No rate-limit, no lockout, no CSRF, no IP binding.

---

### `POST /api/admin/logout`
- **File:** `src/app/api/admin/logout/route.ts:5-20`
- **Auth required:** ❌ no (clears cookie regardless of caller)
- **Request:** none
- **Response:** 200 `{ success: true }` — also overwrites `admin_session` with empty value + `expires: new Date(0)` (immediate expiry)
- **Notable behaviors:** Cookie attributes match login cookie (httpOnly, secure in prod, sameSite=lax, path=/). No auth check — anyone can call logout.

---

### `POST /api/admin/refetch-timetable`
- **File:** `src/app/api/admin/refetch-timetable/route.ts:6-63`
- **Auth required:** ✅ yes — `isAdminAuthenticated(request)`
- **Request:** Cookie `admin_session=<token>`; no body
- **Response:**
  - 200: `{ success: true, message: 'GitHub Actions workflow triggered successfully. The timetable will regenerate, commit, and redeploy in a few minutes.' }`
  - 401: `{ error: 'Unauthorized' }`
  - 500: `{ error: 'GitHub Personal Access Token (GITHUB_TOKEN) is not configured in environment variables.' }` (token missing)
  - 500: `{ error: 'GitHub API error: <statusText>', details: <errorText> }` (GitHub API non-2xx; status = GitHub's HTTP status)
  - 500: `{ error: string }` (fetch threw)
- **Server-side logic:**
  1. Verify admin → 401
  2. Read `GITHUB_TOKEN`. 500 with explicit message if missing.
  3. POST to `https://api.github.com/repos/ammarasad2005/FAST-Utilities/actions/workflows/update-timetable.yml/dispatches` with headers `Accept: application/vnd.github+json`, `Authorization: Bearer <token>`, `X-GitHub-Api-Version: 2022-11-28`, `User-Agent: FAST-ISB-Schedule-Platform`, body `{ ref: 'main' }`.
  4. If response not OK → 500 with GitHub's status text.
  5. Otherwise return success message.
- **DB/external calls:** GitHub REST API (workflow dispatch)
- **Env vars referenced:** `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `GITHUB_TOKEN`
- **Notable behaviors:** No rate-limit (admin could spam dispatches). Propagates GitHub's HTTP status code directly to client.

---

### `GET /api/lost-found` and `POST /api/lost-found`
- **File:** `src/app/api/lost-found/route.ts:7-207`
- **Auth required:** ❌ no (both methods public)
- **Request (GET):**
  - Query params (all optional): `{ type?: 'lost' | 'found', category?: string, search?: string, resolved?: 'true' | 'false' }`
- **Request (POST):**
  - Body:
    ```ts
    {
      type: 'lost' | 'found',                  // required
      category: 'Electronics' | 'Documents' | 'Accessories' | 'Clothing' | 'Keys' | 'Bags' | 'Books' | 'Other',
      title: string,                           // ≥3 chars
      description: string,                     // ≥5 chars
      location: string,                        // ≥2 chars
      date: string,                            // ISO date, required
      handoffNote?: string,
      parsedFoundAt?: string,
      parsedSubmittedAt?: string,
      rawFoundAt?: string,
      rawSubmittedAt?: string,
      contactInfo?: string,                    // ⚠️ lowercased + trimmed before insert (corrupts phone numbers)
      reporterName?: string,
      imageUrl?: string
    }
    ```
- **Response:**
  - GET 200: `{ items: MappedItem[] }` — MappedItem is camelCase-mapped row of `lost_found_items`
  - GET 500: `{ error: 'Failed to fetch items' }`
  - POST 201: `{ item: MappedItem }`
  - POST 400: `{ error: string }` — type missing/invalid, category missing, title <3, description <5, location <2, date missing, category not in whitelist
  - POST 500: `{ error: 'Failed to create item' }`
- **DB/external calls:** Supabase `lost_found_items` (GET select; POST insert + select single)
- **Notable behaviors:** `dynamic = 'force-dynamic'`. ⚠️ **No auth on POST** — anyone can create items. ⚠️ `contactInfo` is force-lowercased (corrupts phone numbers like `+92 300 1234567`). POST returns 201 (every other mutation in codebase returns 200).
- **Live example** [live-crawl: 2026-08-09]: `GET /api/lost-found` → 200, 713 bytes. Single item:
  ```json
  { "id": "e341abb9-9450-4df8-b39c-7e2f6937f930", "type": "lost",
    "category": "Accessories", "title": "Scientific calculator FX 991ES PLUS 2ND EDITION",
    "description": "I lost my calculator somewhere...",
    "location": "Margala IT Lab", "handoffNote": null,
    "parsedFoundAt": "Margala IT Lab", "rawFoundAt": "Probably in margala IT lab",
    "date": "2026-06-05T00:00:00+00:00", "contactInfo": "abdmxf@gmail.com",
    "reporterName": "Abdullah Abdul Munaf", "isResolved": false, "resolvedBy": null,
    "imageUrl": null, "resolutionImageUrl": null,
    "createdAt": "2026-06-08T06:38:26.554321+00:00",
    "updatedAt": "2026-06-08T06:38:26.554321+00:00" }
  ```

---

### `GET /api/lost-found/[id]`, `PATCH /api/lost-found/[id]`, `DELETE /api/lost-found/[id]`
- **File:** `src/app/api/lost-found/[id]/route.ts:14-373`
- **Auth required:**
  - GET: ❌ no
  - PATCH: ⚠️ **Partial** — `body.action === 'admin-toggle-resolved'` branch requires admin; `body.action === 'claim'` branch and the generic update branch are **anonymous**
  - DELETE: ✅ yes (`isAdminAuthenticated`)
- **Request:**
  - URL path param: `id: string` (UUID)
  - PATCH Body — admin-toggle-resolved: `{ action: 'admin-toggle-resolved', isResolved: boolean, resolvedBy?: string }`
  - PATCH Body — claim: `{ action: 'claim', claimerId: string, claimerEmail?: string, lostItemId?: string }`
  - PATCH Body — generic update (⚠️ ANONYMOUS): `{ title?, description?, location?, contactInfo?, category?, imageUrl?, isResolved?, resolvedBy?, resolutionImageUrl?, date? }`
  - DELETE: Cookie `admin_session=<token>`
- **Response:**
  - GET 200: `{ item: MappedItem & { claims: Claim[] } }` (claims filtered to exclude status `'unclaimed'`)
  - GET 404: `{ error: 'Item not found' }`
  - GET 500: `{ error: 'Failed to fetch item' }`
  - PATCH 200 (admin-toggle-resolved): `{ item: PartialMappedItem }`
  - PATCH 200 (claim): `{ success: true, claimId: string }`
  - PATCH 200 (generic update): `{ item: PartialMappedItem }`
  - PATCH 401: `{ error: 'Unauthorized' }` (admin-toggle-resolved without admin)
  - PATCH 400: `{ error: 'You have already registered a pending claim...' }` (duplicate pending claim)
  - PATCH 404: `{ error: 'Item not found' }` (generic update or admin-toggle on missing id)
  - PATCH 500: `{ error: 'Failed to update item' }`
  - DELETE 200: `{ success: true }`
  - DELETE 401: `{ error: 'Unauthorized' }`
  - DELETE 404: `{ error: 'Item not found' }`
  - DELETE 500: `{ error: 'Failed to delete item' }`
- **Server-side logic:**
  - **GET:** Join `lost_found_items` with `lost_found_claims(*)` filtered to id. Map camelCase; filter out unclaimed claims.
  - **PATCH admin-toggle-resolved:** Verify admin → update `is_resolved` + `resolved_by` on item. If newly resolved, fetch pending claims and email each claimer via `sendVerificationRequestEmail`.
  - **PATCH claim:** Optional email duplicate-pending check on `lost_found_claims`. Insert new claim with status `'pending'`. If email provided: fetch item title/contact/type, fetch all pending claims for the item, then (a) `sendClaimRecordedEmail` to current claimer, (b) `sendNewClaimNotificationToOthers` to each other claimer, (c) if item is `found` and reporter email looks valid, `sendClaimNotificationToReporter`.
  - **PATCH generic:** ⚠️ Fetch existing item (404 if missing). Build `updateData` from any present body fields. Update item. If `isResolved === true` and item type is `found`: fetch claims → look up linked lost item id (from claim or fallback by email) → mark found item's `resolved_by` as `'claimerId:lostItemId'` → mark linked lost item as resolved with `resolved_by` `'claimerId:foundItemId'` → mark matching claim `'verified'`. Send verification-request emails to remaining pending claims.
  - **DELETE:** Verify admin → fetch existing (404 if missing) → delete row.
- **DB/external calls:**
  - Supabase: `lost_found_items` (select/update/delete), `lost_found_claims` (select/insert/update)
  - Email (via `@/lib/email`): `sendVerificationRequestEmail`, `sendClaimRecordedEmail`, `sendNewClaimNotificationToOthers`, `sendClaimNotificationToReporter`
- **Env vars referenced:** `ADMIN_USERNAME`, `ADMIN_PASSWORD`, Supabase env vars, `GMAIL_USER`, `GMAIL_APP_PASSWORD`
- **Notable behaviors:** ⚠️ **MAJOR SECURITY HOLE**: the generic PATCH branch (lines 191–326) allows anonymous callers to overwrite title/description/location/contactInfo/category/imageUrl/isResolved/resolvedBy/resolutionImageUrl/date on any item — only the admin-toggle-resolved branch checks auth. `resolved_by` column overloaded as structured `'claimerId:linkedItemId'` string (parsed by `/resolution` GET). Code at line 285 comments "might be blocked by RLS, which is fine" — relies on RLS but admits it may fail silently.

---

### `GET /api/lost-found/[id]/resolution`
- **File:** `src/app/api/lost-found/[id]/resolution/route.ts:6-414`
- **Auth required:** ❌ no
- **Request:** URL path param `id: string`
- **Response:**
  - 200:
    ```ts
    {
      claim: { id: string, claimerId: string, claimerEmail: string,
               status: 'verified', createdAt: string },
      foundItem: MappedItem | null,
      lostItem: MappedItem | null
    }
    ```
  - 404: `{ error: 'Item not found' }`
  - 500: `{ error: string }`
- **Server-side logic:**
  1. Fetch selected item by id (404 if missing).
  2. **Tier 1:** Query `lost_found_claims` with `.or('item_id.eq.<id>,lost_item_id.eq.<id>')`. Pick first `status==='verified'` claim or first claim overall.
  3. **Tier 2:** Parse `resolved_by` for `'claimerId:linkedItemId'` format; extract UUID-length linked id.
  4. **Tier 3:** Parse `resolved_by` for embedded email (parenthesized or bare).
  5. **Tier 4:** If still no linked item and we have a claimer email → fetch candidates of opposite type that are `is_resolved=true` → filter by email appearing in their `resolved_by` (lost) or by exact `contact_info` match (found) → score by time proximity (15-min window = +10), title keyword overlap ×2, description overlap ×1 → pick best.
  6. **Tier 5:** Final fallback — keyword-overlap scoring against all resolved opposite-type items (title ×4 + description ×2 + 15-min time bonus, must beat score 2).
  7. Synthesize `claimerEmail` from `lostItem.contactInfo` or `foundItem.contactInfo` if missing.
- **DB/external calls:** Supabase `lost_found_items` (multiple selects), `lost_found_claims` (select by `or` filter)
- **Notable behaviors:** Most complex handler (~415 lines). Synthesizes claim id (`'resolved-<8-char-prefix>'`) if no DB claim found. Hardcodes fallback email `fast.student@isb.nu.edu.pk`. Performs 4–5 sequential DB queries per request.

---

### `POST /api/lost-found/verify`
- **File:** `src/app/api/lost-found/verify/route.ts:7-179`
- **Auth required:** ❌ no ⚠️
- **Request:**
  - Body:
    ```ts
    {
      originalImageUrl: string,        // required, public URL
      resolutionImageBase64: string,   // required, base64 (data: prefix optional)
      itemId: string,                  // required (found item UUID)
      claimId?: string                 // optional
    }
    ```
- **Response:**
  - 200 (AI success): `{ match: boolean, confidence: number, reasoning: string }` — if `match && confidence ≥ 75`, also mutates DB
  - 200 (token missing): `{ match: false, confidence: 0, error: 'GitHub token not configured' }` (note: 200, not 500)
  - 400: `{ error: 'Images and item ID are required' }`
  - 500: `{ error: string, confidence: 0, match: false, reasoning: 'Technical Error: <msg>' }`
- **Server-side logic:**
  1. Parse body. 400 if `originalImageUrl`, `resolutionImageBase64`, or `itemId` missing.
  2. Read `GITHUB_TOKEN`. If missing → return 200 with `match:false, confidence:0, error:'GitHub token not configured'`.
  3. Fetch original image bytes from URL → base64. Strip data: prefix from claimant image.
  4. POST to `https://models.github.ai/inference/chat/completions` (model `gpt-4o-mini`, vision-capable messages with two `image_url` parts, `response_format: json_object`, `temperature: 0.1`). Prompt asks for `{ match, confidence (0-100), reasoning }`.
  5. Normalize AI response (defensive casing).
  6. **If `match && confidence ≥ 75`:** If `claimId` provided, fetch claim, resolve `claimerId` + `lostItemId` (with email-based fallback). Mark found item resolved (`resolved_by = 'claimerId:lostItemId'` or just `claimerId`). If linked lost item id resolved, mark it resolved (`resolved_by = 'claimerId:foundItemId'`) and set claim status `'verified'` (silently fails on RLS).
  7. Return normalized `{ match, confidence, reasoning }`.
- **DB/external calls:**
  - GitHub Models AI (vision request)
  - Supabase: `lost_found_claims` (select, update), `lost_found_items` (update — found item, lost item)
  - External fetch: `originalImageUrl` (any HTTP URL — ⚠️ SSRF risk)
- **Env vars referenced:** `GITHUB_TOKEN`, Supabase env vars
- **Notable behaviors:** ⚠️ **MAJOR ABUSE VECTOR**: anonymous callers can drive AI-driven DB mutations — anyone knowing an item ID + image URL can get an item auto-resolved. Original image URL fetched server-side without allowlist (SSRF). Token-missing path returns 200 instead of 500.

---

### `POST /api/lost-found/handoff`
- **File:** `src/app/api/lost-found/handoff/route.ts:46-104`
- **Auth required:** ❌ no
- **Request:**
  - Body: `{ foundAt?: string, handedOffTo?: string }` (OR legacy field `note` for `foundAt`)
- **Response:**
  - 200 (AI success): `{ foundAt: string, submittedAt: string }`
  - 200 (token missing): `{ foundAt: <input or 'Not specified'>, submittedAt: <input or 'Not specified'> }`
  - 500: `{ error: 'Failed to process location' }`
- **Server-side logic:**
  1. Parse body. Accept `body.foundAt || body.note` (backward-compat) and `body.handedOffTo`.
  2. Read `GITHUB_TOKEN`. If missing → return inputs as-is (with `'Not specified'` defaults).
  3. Load behavior guide from `docs/campus_map_rules.md` (synchronously via `fs.readFileSync`).
  4. Build two system prompts (one for "where found" label, one for "where handed off" label), each prefixed with the guide.
  5. Run both LLM extractions in parallel via `Promise.allSettled`. Each call: POST to `https://models.github.ai/inference/chat/completions`, model `gpt-4o-mini`, `temperature: 0`, `max_tokens: 80`.
  6. If a call fulfilled → use LLM output; else fall back to input string or `'Not specified'`.
  7. Return `{ foundAt, submittedAt }`.
- **DB/external calls:**
  - GitHub Models AI (two parallel chat completions)
  - Filesystem: `fs.readFileSync(path.join(process.cwd(), 'docs/campus_map_rules.md'))` — synchronous read on every request
- **Env vars referenced:** `GITHUB_TOKEN`
- **Notable behaviors:** Synchronous file read on request path. Despite field name, `submittedAt` is set from `handedOffTo` input. LLM errors degrade to raw input.

---

### `GET /api/lost-found/claim/details`
- **File:** `src/app/api/lost-found/claim/details/route.ts:6-51`
- **Auth required:** ❌ no
- **Request:** Query `{ claimId: string (required) }`
- **Response:**
  - 200:
    ```ts
    {
      claim: {
        id: string, claimerId: string, claimerEmail: string,
        status: string,
        item: { id, type, category, title, description, location, isResolved, imageUrl } | null
      }
    }
    ```
  - 400: `{ error: 'Claim ID is required' }`
  - 404: `{ error: 'Claim not found' }`
  - 500: `{ error: string }`
- **DB/external calls:** Supabase `lost_found_claims` (select with FK join to `lost_found_items`)
- **Notable behaviors:** Exposes claimant email to anyone with the claim ID (UUIDs are guess-resistant but not auth)

---

### `POST /api/lost-found/claim/sync`
- **File:** `src/app/api/lost-found/claim/sync/route.ts:6-114`
- **Auth required:** ❌ no
- **Request:** Body `{ foundItemId: string (required), claimerEmail: string (required) }`
- **Response:**
  - 200 (match): `{ match: true, matchId: string, confidence: number, matchedItem: { title, description } }`
  - 200 (no match): `{ match: false, message: 'We found your reports, but none seem to match this item...' }`
  - 200 (no lost reports): `{ match: false, message: 'No active lost reports found for this email. Please report your item as lost first.' }`
  - 400: `{ error: 'Found item ID and email are required' }`
  - 404: `{ error: 'Found item not found' }`
  - 500: `{ error: 'AI matching unavailable' }` (token missing — NO local fallback)
  - 500: `{ error: string }`
- **Server-side logic:**
  1. Parse body. 400 if `foundItemId` or `claimerEmail` missing.
  2. Fetch found item by id. 404 if missing.
  3. Fetch active (`is_resolved=false`) lost items where `contact_info === claimerEmail.toLowerCase().trim()`. If empty → 200 with "no active lost reports".
  4. Read `GITHUB_TOKEN`. 500 with `'AI matching unavailable'` if missing.
  5. POST to GitHub Models AI with system prompt listing semantic-equivalence rules and JSON schema `{ matchId, confidence }`.
  6. If `matchId` valid and `confidence ≥ 80` → return 200 with matched item details.
  7. Else return 200 with "no match".
- **DB/external calls:**
  - Supabase: `lost_found_items` (select found by id; select lost by type+is_resolved+contact_info)
  - GitHub Models AI (chat completions, JSON mode)
- **Notable behaviors:** ⚠️ **Privacy concern**: exposes a user's lost-item reports to anyone who knows their email. Only route that hard-fails on missing AI token.

---

### `POST /api/lost-found/claim/unclaim`
- **File:** `src/app/api/lost-found/claim/unclaim/route.ts:7-53`
- **Auth required:** ❌ no — but caller must know the claim's email
- **Request:** Body `{ claimId: string (required), email: string (required) }`
- **Response:**
  - 200: `{ success: true }`
  - 400: `{ error: 'Claim ID and email are required' }`
  - 400: `{ error: 'Email address does not match the email associated with this claim. Claim cannot be undone.' }`
  - 404: `{ error: 'Claim not found' }`
  - 500: `{ error: string }`
- **Server-side logic:**
  1. Parse body. 400 if `claimId` or `email` missing.
  2. Fetch claim joined to `lost_found_items` by id. 404 if not found.
  3. Compare `claim.claimer_email` (case-insensitive trimmed) to input email. 400 if mismatch.
  4. Update claim `status = 'unclaimed'`.
  5. `sendUnclaimNotification(claim.claimer_email, item.title)` via Gmail SMTP.
- **DB/external calls:** Supabase `lost_found_claims` (select+join, update); Email `sendUnclaimNotification`
- **Env vars referenced:** `GMAIL_USER`, `GMAIL_APP_PASSWORD`, Supabase env vars

---

### `GET /api/lost-found/claim/user-claims`
- **File:** `src/app/api/lost-found/claim/user-claims/route.ts:6-32`
- **Auth required:** ❌ no
- **Request:** Query `{ email: string (required) }`
- **Response:**
  - 200: `{ itemIds: string[] }` — UUIDs of items the user has pending claims on
  - 400: `{ error: 'Email is required' }`
  - 500: `{ error: string }`
- **DB/external calls:** Supabase `lost_found_claims` (select by email+status)
- **Notable behaviors:** ⚠️ Email-only enumeration — anyone can probe which items a user has claimed on.

---

### `POST /api/lost-found/claim/verify-hold`
- **File:** `src/app/api/lost-found/claim/verify-hold/route.ts:6-69`
- **Auth required:** ❌ no ⚠️
- **Request:** Body `{ claimId: string (required), resolutionImageUrl?: string }`
- **Response:**
  - 200: `{ success: true }`
  - 400: `{ error: 'Claim ID is required' }` OR `{ error: 'This claim has already been cancelled/unclaimed.' }` (when status is `'unclaimed'`)
  - 404: `{ error: 'Claim not found' }`
  - 500: `{ error: string }`
- **Server-side logic:**
  1. Parse body. 400 if `claimId` missing.
  2. Fetch claim by id. 404 if missing. 400 if status is `'unclaimed'`.
  3. Update claim `status = 'verified'`.
  4. Update associated found item (`item_id`): set `is_resolved = true`, `resolved_by` = `claimer_id:lost_item_id` if linked else `'Claimant verified (<claimer_email>)'`, `resolution_image_url` = `resolutionImageUrl || null`.
  5. If `claim.lost_item_id` exists → also mark that lost item resolved with `resolved_by = 'claimer_id:found_item_id'`.
  6. Return `{ success: true }`.
- **DB/external calls:** Supabase `lost_found_claims` (select, update), `lost_found_items` (update — found and linked lost)
- **Notable behaviors:** ⚠️ **No email verification** before marking items resolved — anyone with a `claimId` (UUID) can self-verify. The `resolved_by` value `'Claimant verified (<email>)'` is later parsed by `/resolution` GET Tier 3.

---

### `GET /api/lost-found/cron/reminders`
- **File:** `src/app/api/lost-found/cron/reminders/route.ts:7-53`
- **Auth required:** ⚠️ Partial — checks `Authorization: Bearer ${CRON_SECRET}` header **only when `NODE_ENV === 'production'`**. In dev mode, completely open.
- **Request:** Headers `Authorization: Bearer <CRON_SECRET>` (required in production)
- **Response:**
  - 200 (no pending claims): `{ message: 'No pending claims found.' }`
  - 200 (sent reminders): `{ message: 'Cron job run successfully. Sent <N> reminders.', sentCount: number }`
  - 401: `'Unauthorized'` (plain text, not JSON)
  - 500: `{ error: string }`
- **Server-side logic:**
  1. If `NODE_ENV === 'production'` and `Authorization` header ≠ `Bearer ${CRON_SECRET}` → 401 plain text.
  2. Select all pending claims joined with `lost_found_items!lost_found_claims_item_id_fkey(*)`.
  3. If empty → 200 `'No pending claims found.'`.
  4. For each pending claim, if associated item is not resolved → `sendVerificationRequestEmail(claimer_email, item.title, claim.id, origin)`, increment counter.
- **DB/external calls:**
  - Supabase: `lost_found_claims` (select with FK join)
  - Email: `sendVerificationRequestEmail` per pending claim
- **Env vars referenced:** `NODE_ENV`, `CRON_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, Supabase env vars
- **Notable behaviors:** Scheduled via `vercel.json` twice: `0 5 * * 1-5` (Mon–Fri 05:00 UTC) and `0 13 * * 0` (Sun 13:00 UTC). 401 response is plain text (inconsistent with other routes). `origin` derived from request URL — if Vercel routes the cron through a different host the email verification links may be wrong.

---

### `POST /api/export-image`
- **File:** `src/app/api/export-image/route.tsx:7-174`
- **Auth required:** ❌ no
- **Request:**
  - Body:
    ```ts
    {
      entries: TimetableEntry[],
      config?: { isCustom?: boolean, subtitle?: string, semesterName?: string }
    }
    ```
- **Response:**
  - 200: `image/png` (binary) — `ImageResponse` from `next/og`, width 1200, dynamic height `max(800, entries.length * 150 + 250)`
  - 400: `'Invalid entries'` (plain text) — `entries` missing or not array
  - 500: `'Failed to generate image'` (plain text)
- **Server-side logic:**
  1. Parse JSON body. 400 if `entries` missing/non-array.
  2. Compute image height.
  3. Build JSX (header with FAST NUCES Isb + semester title, table header row with Date/Day/Course/[Dept]/Time, per-entry row with date parsing + day-of-week computation, footer with generation date).
  4. Return `ImageResponse` (1200×height PNG).
- **DB/external calls:** none
- **Env vars referenced:** none
- **Notable behaviors:** `runtime = 'edge'`. Uses `next/og`. **Only `.tsx` route file** (others are `.ts`). Response body is binary image. ⚠️ Error responses use plain text strings, not the `{ error: string }` convention used elsewhere. No auth — anyone can submit large `entries` arrays (potential memory/DoS vector). Default semester label hardcoded `'Spring 2026 Finals'`.
