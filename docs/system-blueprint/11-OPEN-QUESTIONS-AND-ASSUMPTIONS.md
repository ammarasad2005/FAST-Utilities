---
doc: 11-OPEN-QUESTIONS-AND-ASSUMPTIONS
generated: 2026-08-09T16:18:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: partially-verified
---

# 11 — Open Questions & Assumptions

Every claim in this documentation set is either:
- ✅ **Verified** — directly observed in source code (file:line cited) OR live deployment (screenshot/curl cited)
- ⚠️ **Partially verified** — source code confirms structure, but runtime behavior not directly tested
- ❓ **Inferred** — not directly verified; based on code patterns and conventions

This file lists everything in the ⚠️ and ❓ categories.

## 1. Inferred Claims (not directly verified)

### Architecture & Deployment

| # | Claim | Confidence | Reason not verified |
|---|-------|-----------|---------------------|
| I1 | All env vars are configured on Vercel | INFERRED | Cannot read secrets; only behavior will tell. Live API responses show Supabase, GitHub AI, and admin auth all work — so the required env vars ARE set. |
| I2 | `MAIN_PUSH_TOKEN` is a PAT scoped to `ammarasad2005/FAST-Utilities` repo only | INFERRED | Visible in workflow yaml but actual permissions depend on Vercel/GitHub secret config. |
| I3 | Vercel auto-detects Next.js framework (no `vercel.json` framework config) | INFERRED | No explicit framework config in `vercel.json`. |
| I4 | `runtime = 'edge'` routes (`schedule`, `export-image`) actually run on Vercel Edge Runtime | INFERRED | Code declares `runtime = 'edge'` but Vercel deployment config not directly inspected. |
| I5 | Vercel cron invocations succeed (would otherwise fail silently) | INFERRED | No direct observation of cron execution. Email failures are silent. |

### Database & Supabase

| # | Claim | Confidence | Reason not verified |
|---|-------|-----------|---------------------|
| D1 | `lost_found_claims` table has no UPDATE RLS policy | PARTIALLY VERIFIED | `supabase_schema.sql:68-82` shows only SELECT, INSERT, DELETE policies. But the `verify-hold` route appears to successfully UPDATE claim status — possibly because Supabase's RLS for UPDATE was added later, OR the comment is stale, OR the claim update is silently failing (consistent with the inline comments in other routes). |
| D2 | All RLS policies are permissive (anon key can do everything) | VERIFIED | `supabase_schema.sql:39-83` shows all policies use `USING (true)` or `WITH CHECK (true)`. |
| D3 | `lost_found_images` Storage bucket has no file size/type validation | INFERRED | `supabase_schema.sql:84-95` only defines bucket + public access policies. No MIME-type or size restriction visible. |
| D4 | `semester_settings` row id=1 is the only row that exists | INFERRED | Schema has `CHECK (id = 1)` constraint. The seed `INSERT ... ON CONFLICT (id) DO NOTHING` ensures exactly one row. |
| D5 | The Supabase project URL is `https://xxx.supabase.co` | NOT VERIFIED | Value not visible (env var). |

### AI / External Services

| # | Claim | Confidence | Reason not verified |
|---|-------|-----------|---------------------|
| A1 | `GITHUB_TOKEN` has permissions for both GitHub Models AI AND GitHub Actions workflow dispatch | INFERRED | Single token used for both purposes; actual scopes depend on Vercel secret config. |
| A2 | GitHub Models AI endpoint `https://models.github.ai/inference/chat/completions` accepts `gpt-4o-mini` model | VERIFIED | Code uses this URL and model; live API responses work (smart-search returns AI suggestions). |
| A3 | AI confidence threshold of 75 for `/api/lost-found/verify` is appropriate | INFERRED | Threshold is hardcoded; no documentation of calibration. |
| A4 | AI confidence threshold of 80 for `/api/lost-found/claim/sync` is appropriate | INFERRED | Same as above. |
| A5 | The Python scrapers (`all_courses_schedule.py`, `scrape_slate.py`, `filter_events.py`) run successfully in GitHub Actions | INFERRED | Workflow files exist; recurring "chore: auto-update ..." commits in git log confirm they run. Actual scraper internals not deeply audited. |

### Runtime Behavior

| # | Claim | Confidence | Reason not verified |
|---|-------|-----------|---------------------|
| R1 | `useMobileSwipe` drawer animations work on real mobile devices | PARTIALLY VERIFIED | Code inspected; live crawl used desktop browser at mobile viewport (not real mobile). Touch events not directly tested. |
| R2 | The 30s polling on `/lost-found` continues indefinitely | VERIFIED | Code at line 6423 has `setInterval(fetchNewItemCount, 30000)` with no cleanup until unmount. |
| R3 | `TimetableOptimizer` backtracking solver hangs for large course counts | INFERRED | Code has no early-termination; O(S^N) worst case. Not directly tested with large inputs. |
| R4 | `/timetable` page shows empty state when no summer courses are selected | VERIFIED | Live crawl confirmed — `/timetable` in summer mode without selections shows empty state (screenshot `desktop/04-timetable.png`). |
| R5 | `ExportButton` duplicates Supabase semester_settings fetch on every page that renders it | VERIFIED | Code at `src/components/ExportButton.tsx` shows `useEffect` on mount that fetches Supabase. |
| R6 | `verifyClaimId` URL parameter auto-opens `VerifyHoldDialog` on `/lost-found` | INFERRED | Code at `src/app/lost-found/page.tsx` shows `setShowVerifyHoldDialog(true)` on mount if param present. Not directly tested live (would require a real claim UUID). |

### Performance

| # | Claim | Confidence | Reason not verified |
|---|-------|-----------|---------------------|
| P1 | `/api/lost-found/[id]/resolution` performs 4-5 sequential DB queries per request | VERIFIED | Code at `src/app/api/lost-found/[id]/resolution/route.ts:6-414` shows 5 tiers of fallback queries. |
| P2 | `/admin` page recomputes 5 stats cards via `items.filter(...)` on every render (no `useMemo`) | VERIFIED | Code at `src/app/admin/page.tsx` shows direct `items.filter(...)` in JSX without `useMemo`. |
| P3 | `DesktopTicker` updates `now` state every 1s, causing re-render of clock + status computation | VERIFIED | Code at `src/components/DesktopTicker.tsx` shows `setInterval(1000)`. |
| P4 | `lost-found/page.tsx` polls `/api/lost-found` every 30s indefinitely, causing battery drain on mobile | VERIFIED | Code at line 6423. |

## 2. Open Questions (unverifiable from source alone)

### Questions about external configuration

| # | Question | How to verify |
|---|----------|---------------|
| Q1 | What are the actual values of `ADMIN_USERNAME` and `ADMIN_PASSWORD`? | Cannot verify — secrets. |
| Q2 | Is the `CRON_SECRET` set to a strong random value? | Cannot verify — secret. |
| Q3 | Does the Vercel deployment have function timeout configured above the default 10s? | Inspect Vercel project settings (not in repo). |
| Q4 | Are there Vercel Edge Function limits being hit (e.g., 1MB response size for `/api/export-image`)? | Check Vercel logs. |
| Q5 | Is the `lost_found_images` Storage bucket configured with a file size limit? | Inspect Supabase dashboard. |
| Q6 | Are there any Supabase database triggers (e.g., auto-update `updated_at`)? | Schema in repo doesn't show triggers; could exist in Supabase. |
| Q7 | What is the actual Vercel deployment URL alias configuration? Is `fast-isb-exams.vercel.app` (stale URL in `lib/email.ts`) still active? | Inspect Vercel project domains. |
| Q8 | Are there any Vercel Edge Middleware configs not in the repo? | Check for `vercel.json` middleware (none in repo). |

### Questions about runtime behavior

| # | Question | How to verify |
|---|----------|---------------|
| Q9 | Does the `verify-hold` endpoint actually succeed in updating `lost_found_claims` status, despite no UPDATE RLS policy? | Test live with a real claim UUID (do NOT do this destructively). |
| Q10 | What happens when two users simultaneously claim the same found item? | Race condition not handled in code — last write wins. |
| Q11 | What happens when admin deletes an item that has pending claims? | `lost_found_claims.item_id` has `ON DELETE CASCADE` — claims are deleted with the item. Email notifications are NOT sent. |
| Q12 | What happens if a user reports the same item twice (duplicate detection)? | `checkDuplicate()` in `lost-found/page.tsx:4803` uses exact + Levenshtein + word-overlap matching. If duplicate detected, shows warning banner but does NOT prevent submission. |
| Q13 | Does the `/api/lost-found/cron/reminders` cron actually run on schedule? | Vercel cron logs (not in repo). Email failures are silent. |
| Q14 | What happens if GitHub Actions workflow `update-timetable.yml` fails? | Workflow fails — `timetable.json` not updated — Vercel not redeployed. Old timetable remains live. No alerting. |
| Q15 | What happens if Python scraper fails to fetch Google Sheets? | Scraper would throw — workflow fails. No fallback. |
| Q16 | Does the `FloatingMenu` virtualized carousel work correctly with screen readers? | Not directly tested. The arc menu has no ARIA roles. |
| Q17 | Does the `useMobileSwipe` hook work correctly on iPad (which Apple considers desktop)? | `matchMedia('(max-width: 767px)')` returns false on iPad — iPad gets desktop layout but `useMobileSwipe` guards `window.innerWidth >= 768` returns early (no swipe). So iPad gets desktop right-panel drawers. |
| Q18 | What happens if a user has 100+ bookmarked items? | `lf-bookmarks` array grows unbounded. No pagination in `showBookmarked` filter. Could slow down filter computation. |

### Questions about data integrity

| # | Question | How to verify |
|---|----------|---------------|
| Q19 | Are there orphaned `lost_found_claims` rows (item_id references deleted item)? | Should not happen due to `ON DELETE CASCADE` on `item_id` FK. |
| Q20 | Are there `lost_found_claims` with `lost_item_id` referencing a deleted item? | Possible — `lost_item_id` FK has `ON DELETE SET NULL`, so deleting a lost item sets `lost_item_id` to NULL but keeps the claim. |
| Q21 | What's in `lost_found_claims` table right now? | Cannot query without admin access. |
| Q22 | Is the `resolved_by` column ever inconsistent (e.g., found item resolved but lost item not)? | Possible — `verify-hold` updates found item first, then lost item. If second update fails (RLS), found is resolved but lost is not. |
| Q23 | Does `contactInfo` always get lowercased? | Yes — `src/app/api/lost-found/route.ts:130` force-lowercases on insert. But `PATCH /api/lost-found/[id]` generic branch (line 191-326) does NOT lowercase. So an update can store mixed-case. |
| Q24 | What happens if `HARDCODED_VALID_COURSES_MAP` (in `src/lib/types.ts:159-188`) drifts from the actual Supabase `course_mappings`? | The "Load from Code" button in admin settings would pre-populate stale data. No automatic sync. |

### Questions about the build pipeline

| # | Question | How to verify |
|---|----------|---------------|
| Q25 | Does `prebuild` (`ts-node scripts/run-exam-parser.ts`) actually run before every Vercel build? | Should — Vercel respects `prebuild` npm script. Not directly verified. |
| Q26 | Does the `prebuild` script succeed if Supabase env vars are missing? | Yes — falls back to running BOTH parsers (regular + summer) per `scripts/run-exam-parser.ts` logic. |
| Q27 | What happens if `exam_schedule.xlsx` is missing during build? | `parse-excel.ts` would throw `XLSX.readFile` error — build fails. |
| Q28 | Does the `events:update` script work without `SLATE_USERNAME`/`SLATE_PASSWORD`? | No — `scrape_slate.py` requires these. Workflow would fail. |

## 3. Assumptions Made in This Documentation

### Assumed based on code patterns

| # | Assumption | Justification |
|---|-----------|---------------|
| A1 | The app is currently in Summer 2026 mode | Live crawl confirmed: `localStorage.fsc_active_semester === 'summer'`, `semesterName === 'Summer 2026'`, `/api/timetable` returns 52 summer entries with batch='Summer'. |
| A2 | All 13 pages are `'use client'` | `grep -r "'use client'" src/app/**/page.tsx` confirms — no server components. |
| A3 | No middleware exists | `src/middleware.ts` is absent. No `middleware` config in `next.config.js` or `vercel.json`. |
| A4 | No error boundaries exist | No `error.tsx` files anywhere under `src/app/`. |
| A5 | No server actions exist | No `'use server'` directives anywhere in `src/`. |
| A6 | No React Server Components are used | All pages have `'use client'` directive. |
| A7 | The `pg` package (in `package.json:61`) is only used by `scripts/setup-settings-db.ts` (one-off DB setup script) | Grep confirms — no `src/` file imports `pg`. |
| A8 | The `resend` package (in `package.json:68`) is unused | Grep confirms — no `src/` file imports `resend`. |
| A9 | The `recharts` package (in `package.json:67`) is unused | Grep confirms — no `src/` file imports `recharts`. |
| A10 | The `react-day-picker` package (in `package.json:63`) is unused | Grep confirms — no `src/` file imports `react-day-picker`. |
| A11 | The root-level `TimetableOptimizer.jsx` (26k single-file JSX) is orphaned | Grep confirms — no `src/` file imports it. The actual `TimetableOptimizer.tsx` is in `src/components/`. |
| A12 | The `scratch.mjs` and `patch_custom_exam.js` root files are dev utilities | No `src/` file imports them. |
| A13 | `cli-tool/exam_timetable.py` is a standalone CLI tool, not integrated into the app | No reference in `src/` or `scripts/`. |
| A14 | The `Screenshots/` directory contains old design screenshots | Not directly relevant to current deployment. |
| A15 | The `docs/end-user-guide.md`, `docs/timetable_analysis.md`, `docs/campus_map_rules.md` are user/developer documentation | `campus_map_rules.md` IS used at runtime by `POST /api/lost-found/handoff` (synchronous file read). |

### Assumed based on Next.js 14 conventions

| # | Assumption | Justification |
|---|-----------|---------------|
| A16 | `runtime = 'edge'` in a route file means the route runs on Vercel Edge Runtime | Next.js 14 convention. |
| A17 | `dynamic = 'force-dynamic'` means the route is server-rendered on every request (no static optimization) | Next.js 14 convention. |
| A18 | `app/api/<path>/route.ts` exports `GET`/`POST`/etc. functions are the route handlers | Next.js 14 App Router convention. |
| A19 | `app/<path>/page.tsx` is the page component for route `/<path>` | Next.js 14 App Router convention. |
| A20 | `app/layout.tsx` is the root layout | Next.js 14 App Router convention. |

## 4. Limitations of This Audit

### What was NOT done

1. **No load testing** — did not simulate concurrent users or high request volumes.
2. **No security penetration testing** — only static analysis of auth/RLS patterns. Did not actively exploit any vulnerability.
3. **No real mobile device testing** — only desktop browser at mobile viewport. Real touch events not tested.
4. **No real email verification flow** — would require a real lost-found item, claim, and email roundtrip.
5. **No GitHub Actions workflow execution** — only inspected workflow YAML; did not trigger or observe actual runs.
6. **No Supabase dashboard inspection** — only inspected schema in `supabase_schema.sql`; actual table data, triggers, and RLS behavior not directly verified.
7. **No Vercel deployment settings inspection** — only inferred from `vercel.json` and code behavior.
8. **No Python scraper deep audit** — `all_courses_schedule.py` (53k), `parse_summer_timetable.py` (25k), `scrape_slate.py` (12k), `filter_events.py` (7k) were not deeply audited. Only env var references and high-level purpose were extracted.
9. **No accessibility (a11y) audit** — only noted ARIA attributes that were obvious in source. Did not run screen readers or a11y scanners.
10. **No SEO audit** — only noted metadata in `layout.tsx`. No page-level `generateMetadata`.
11. **No bundle size analysis** — did not measure actual JS bundle size or chunk splitting.
12. **No performance profiling** — did not measure page load times, time-to-interactive, or runtime performance.
13. **No internationalization (i18n) audit** — app is English-only; no i18n framework in use.
14. **No testing framework audit** — no test files in `src/` (`grep -r "\\.test\\." src/` returns nothing). `playwright` is in devDependencies but only used by `scripts/capture-screenshots.js`.

### What was verified but not documented in detail

1. **All 91 source files under `src/`** were at least skimmed during the 4 parallel audit subagents (Tasks 1-a through 1-d).
2. **All 17 API routes** were directly tested via `curl` against the live deployment.
3. **All 13 page routes** were screenshotted at desktop (1440×900) and mobile (390×844) viewports.
4. **All 23 application components** were read in full.
5. **All 11 UI primitives** were read in full (6 confirmed dead code).
6. **All 3 hooks** were read in full.
7. **All 15 lib modules** were read in full.
8. **The global stylesheet** (`src/styles/globals.css`, 1117 lines) was read in full.
9. **The Supabase schema** (`supabase_schema.sql`) was read in full.

## 5. Recommendations for Future Verification

To increase confidence in the inferred claims:

1. **Run the test suite** — none exists; consider adding Playwright tests via the existing `playwright` devDependency.
2. **Set up Vercel monitoring** — already have `@vercel/analytics` and `@vercel/speed-insights` integrated; configure alerts for function timeouts and 5xx rates.
3. **Add Supabase database triggers** — to enforce `updated_at` auto-update and prevent some data integrity issues.
4. **Add RLS UPDATE policy for `lost_found_claims`** — currently relies on hopeful comments about silent failures; should be explicit.
5. **Migrate admin auth to JWT** — replace deterministic base64 token with rotating JWT signed by a secret.
6. **Add rate-limiting middleware** — at minimum on `POST /api/admin/login`, `POST /api/lost-found`, `POST /api/smart-search`, `POST /api/lost-found/verify`.
7. **Add CSRF protection** — for admin-gated mutations.
8. **Fix stale email URL** — change `'https://fast-isb-exams.vercel.app'` to `'https://fast-nuces-isb.vercel.app'` in `src/lib/email.ts:31`.
9. **Add error boundaries** — at minimum per route segment via `error.tsx` files.
10. **Extract shared `useSemesterSettings()` hook** — eliminates 8 duplicated Supabase fetches across pages.
11. **Extract shared `<DetailDrawer>` wrapper** — eliminates 6× mobile-drawer boilerplate duplication.
