---
doc: 00-INDEX
generated: 2026-08-09T15:40:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# FAST NUCES Isb Utilities — System Blueprint

> **Machine-readable documentation set** for the Next.js application deployed at
> https://fast-nuces-isb.vercel.app (repo: https://github.com/ammarasad2005/FAST-Utilities).
> Audited against commit `c3f582d` (2026-08-07). Live crawl performed 2026-08-09.

## Executive Summary (15-line orientation)

FAST NUCES Isb Utilities is a single-deploy Next.js 14 (App Router) client-side SPA for FAST NUCES Islamabad students, combining 8 features behind a unified portal: weekly Timetable, Timetable Optimizer (CSP backtracking solver), Exam Finder, Free Rooms lookup, Faculty Directory, Semester Calendar, Campus Events, and a Lost & Found marketplace with AI-assisted verification. All 13 pages are `'use client'` — no server components — and the app is effectively a build-time-bundled SPA with Vercel serverless routes for DB persistence. The backend is Supabase (Postgres + Storage) accessed via the anon key (so RLS is the only auth barrier for public mutations) plus a Nodemailer Gmail integration and GitHub Models AI (`gpt-4o-mini`) for 4 features (smart search, image verification, location parsing, claim semantic matching). Auth is a custom cookie scheme: `admin_session` = `base64(ADMIN_USERNAME:ADMIN_PASSWORD)` with no rotation, no CSRF, no rate-limit. Two hourly GitHub Actions workflows regenerate `timetable.json` and weekly scrape `student_events.json` from FAST's Slate portal; both commit to `main` and trigger Vercel redeploy. Summer vs regular semester is gated by a single `semester_settings` row in Supabase (id=1). The Lost & Found page is 6553 lines (largest file in repo) and is the most feature-dense view: 30+ localStorage helpers, AI-driven claim verification, 4-step report wizard, polling every 30s for new items. Five of 17 API routes enforce admin auth; the rest are anonymous. Six of 11 shadcn/ui primitives are dead code. The site is currently in Summer 2026 mode.

## How to Read This Documentation

This doc set is optimized for **autonomous AI agents** that need to (a) modify or extend the codebase, (b) predict runtime behavior, or (c) reproduce the UI pixel-accurately. Every factual claim cites either a `path/to/file.ts:LINE` reference (static) or a `[live-crawl]` annotation (dynamic). Where evidence is incomplete, the claim is flagged `[INFERRED]` and listed in `11-OPEN-QUESTIONS-AND-ASSUMPTIONS.md`.

### File ordering — read in this sequence if unfamiliar:

| # | File | Purpose |
|---|------|---------|
| 0 | `00-INDEX.md` | This file — TOC, glossary, conventions |
| 1 | `01-ARCHITECTURE.md` | Stack, deployment, system-level diagram |
| 2 | `02-ROUTING-AND-NAVIGATION.md` | All 13 routes + navigation graph (Mermaid + ASCII) |
| 3 | `03-API-REFERENCE.md` | All 17 API routes with request/response schemas |
| 4 | `04-DATA-MODELS-AND-SCHEMA.md` | TS types, Supabase schema, JSON file shapes, ER diagram |
| 5 | `05-DATA-FLOW-AND-SEQUENCES.md` | Per-user-journey sequence diagrams (Mermaid + ASCII trace) |
| 6 | `06-COMPONENT-INVENTORY.md` | All 23 components + 11 UI primitives + 3 hooks |
| 7 | `07-UI-BLUEPRINTS/` | ASCII wireframes per page (desktop + mobile) with handler annotations |
| 8 | `08-RESPONSIVE-BEHAVIOR.md` | Breakpoint behavior per page |
| 9 | `09-STATE-MANAGEMENT.md` | localStorage map, server state, context providers |
| 10 | `10-ERROR-HANDLING-AND-EDGE-CASES.md` | API error envelopes, UI fallbacks, security flags |
| 11 | `11-OPEN-QUESTIONS-AND-ASSUMPTIONS.md` | Anything not fully verified |
| 12 | `12-VERIFICATION-LOG.md` | What was tested, when, against which commit/URL |
| - | `PROGRESS.md` | Working audit ledger (kept as audit trail) |

### Glossary — Canonical Names

| Term | Definition | Source |
|------|------------|--------|
| **FSC** | Faculty of Computing Sciences — departments CS, AI, DS, CY, SE | `src/lib/types.ts:14` |
| **FSM** | Faculty of Management Sciences — departments BBA, AF, BA, FT | `src/lib/types.ts:14` |
| **FSE** | Faculty of Engineering — departments EE, CE | `src/lib/types.ts:14` |
| **Batch** | Student cohort year (e.g., "2024"); also literal `"Summer"` for summer semester | `src/lib/types.ts:7` |
| **Section** | Class sub-group label (e.g., "A", "BX", "A1") | `src/lib/types.ts:60` |
| **TimetableEntry** | A single weekly class slot (course, day, time, room, section, etc.) | `src/lib/types.ts:57` |
| **ExamEntry** | A single exam slot (date, time, courseCode, batch, dept, school, room, sections) | `src/lib/types.ts:1` |
| **SummerCourseCatalogEntry** | Course catalog row for summer mode — `sheetName`, `displayName`, `hidden`, `examOnly`, `school` | `src/lib/types.ts:137` |
| **examOnly** | Flag for FSM/FSE courses that exist only in exam schedule, not weekly timetable | `src/lib/exam-catalog.ts:47` |
| **Sheet** | One day's worth of timetable data, named after weekday (e.g., "Monday") or with date suffix "Monday (03 Aug)" for makeup days | `src/lib/types.ts:77` |
| **Makeup Day** | A dated sheet replacing the regular weekly sheet for a weekday — typically for rescheduled classes | `src/lib/types.ts:82` |
| **FAST PM Heuristic** | Time-parsing rule: hours 1-7 in 24-h strings are treated as PM (so "01:00" → 13:00) — applied because FAST classes run 8:30 AM–5:15 PM | `src/lib/timetable-filter.ts:202-205` |
| **Bundle** | User-saved collection of custom courses for exam or timetable custom views (persisted in `fsc_custom_bundles` or `fsc_custom_exam_bundles`) | `src/app/timetable/custom/page.tsx` |
| **Lost & Found Item** | A row in `lost_found_items` Supabase table — either type `'lost'` or `'found'` | `supabase_schema.sql:2` |
| **Claim** | A row in `lost_found_claims` — a user's assertion that a found item belongs to them; status `pending`/`verified`/`unclaimed` | `supabase_schema.sql:29` |
| **Resolution Pair** | A matched lost+found item pair, displayed in `/lost-found` history view | `src/components/ResolutionDetail.tsx` |
| **Semester Settings** | Singleton row (id=1) in `semester_settings` controlling summer/regular mode, Google Sheets URL, course mappings | `supabase_schema.sql:126` |
| **Admin Session** | Cookie `admin_session` = `base64(ADMIN_USERNAME:ADMIN_PASSWORD)` — set on `/api/admin/login`, verified by `isAdminAuthenticated()` | `src/lib/admin.ts:17-24` |
| **Persistent User ID** | Random ID stored in `lf-user-id` localStorage, used as `claimerId` in lost-found claims | `src/app/lost-found/page.tsx` (getPersistentUserId) |
| **Live Ticker** | The DesktopTicker component on the landing page — shows current time, ongoing/next class | `src/components/DesktopTicker.tsx` |
| **Floating Menu** | Mobile-only circular arc menu — FAB expands into 7-item virtualized carousel | `src/components/FloatingMenu.tsx` |
| **Stage Light Nav** | Desktop-only bottom floating pill nav (5 tabs: Rooms, Lost & Found, Home, Faculty, Courses) | `src/components/Navbar.tsx` |

### Conventions Used Throughout

- **File references**: `path/to/file.ts:LINE_START-LINE_END` (e.g., `src/lib/admin.ts:17-24`)
- **API references**: `` `METHOD /api/path` `` (e.g., `` `GET /api/timetable` ``)
- **Storage keys**: `fsc_*` (general app) or `lf-*` (lost-found specific)
- **Env vars**: `ALL_CAPS_WITH_UNDERSCORES` — names only, never values
- **Screenshot references**: `[screenshot: desktop/01-landing.png]` — files in `/home/z/my-project/workspace/exam-table-audit/screenshots/`
- **Live behavior**: `[live-crawl: 2026-08-09T15:35]` — observed at this timestamp
- **Inferred claims**: `[INFERRED]` — not directly verified; see `11-OPEN-QUESTIONS-AND-ASSUMPTIONS.md`
- **Security flags**: ⚠️ SECURITY — callout in dedicated security section

### Repo Quick Facts

| Attribute | Value |
|-----------|-------|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 3.4 + custom CSS variables (oklch + hex dual-token system) |
| UI primitives | Radix UI + custom shadcn-style wrappers (11 primitives, 6 unused) |
| Forms | react-hook-form + zod 4 |
| Animations | framer-motion + tailwindcss-animate + custom keyframes |
| Data | Supabase (Postgres + Storage, anon-key client) + build-time JSON bundles |
| Email | Nodemailer + Gmail SMTP |
| AI | GitHub Models (`gpt-4o-mini`) — `models.github.ai/inference/chat/completions` |
| Auth | Custom cookie scheme (`admin_session`, base64 of `username:password`) |
| Hosting | Vercel (serverless functions + 2 cron jobs) |
| CI | GitHub Actions (2 workflows: hourly timetable, weekly events) |
| Package manager | npm |
| Total source LOC | ~29,068 (91 files under `src/`) |
| Largest file | `src/app/lost-found/page.tsx` (6,553 lines) |
| Audited commit | `c3f582d` (2026-08-07 07:18 UTC) |
| Live crawl | 2026-08-09 15:35–15:37 UTC+5 |
