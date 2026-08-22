---
doc: 07-UI-BLUEPRINTS/03-schedule
generated: 2026-08-09T16:05:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# UI Blueprint — `/schedule` (Exam Finder)

**Page file:** `src/app/schedule/page.tsx:1-243`
**Render mode:** `'use client'` (`src/app/schedule/page.tsx:1`)
**Layout:** Mounted inside root `src/app/layout.tsx`. Page wraps inner component in `<Suspense>` (`src/app/schedule/page.tsx:233-242`) because it uses `useSearchParams()`.

## Blueprint Convention Legend

```
┌─┐│└┘├┤┬┴┼   Box-drawing characters for layout containers
╭─╮│╰╯          Rounded-card corners
─ │ · ·         Horizontal / vertical / dotted dividers
◉ Label         Interactive element (button / link / input)
[placeholder]   Text-input field
🔍 (icon emoji) lucide-react icon
{state guard}   Conditional render
[link → /path]  Navigation target
```

## Desktop (≥1024px) — Default State (regular semester, `?batch=2024&school=FSC&dept=CS`)

`src/app/schedule/page.tsx:85-229` renders the layout. Three regions: sticky `<Header>` (with back chevron + dept chip + ExportButton), desktop-only left `<aside>` sidebar (w-56 lg:w-64), main list area with sticky `<SearchBar>`.

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo]  ◁ [CS] Batch 2024                                            ⤓ Export  🐼 in 🌓 │  ← Header (sticky)
├─────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR (md+)   │  ┌─ SearchBar (sticky top-14) ────────────────────────────────────────────────────────────┐  │
│ Batch           │  │ 🔍 [Search by course, date…]                                                   │  │
│ 2024            │  └────────────────────────────────────────────────────────────────────────────────────────┘  │
│                 │                                                                                                │
│ Department      │  MONDAY, 12 MAY                                                                                 │
│ CS              │  ┌──────────────┬──────────────┬──────────────┐                                                  │
│                 │  │ ◉ ExamCard   │ ◉ ExamCard   │ ◉ ExamCard   │  ← 3-col grid (lg:grid-cols-3)                │
│ ─────────       │  │ CS-101 …     │ EE-201 …     │ AI-301 …     │                                                  │
│ Found           │  └──────────────┴──────────────┴──────────────┘                                                  │
│ 6 exams         │                                                                                                │
│                 │  WEDNESDAY, 14 MAY                                                                              │
│ ─────────       │  ┌──────────────┬──────────────┐                                                                │
│ Change filters  │  │ ◉ ExamCard   │ ◉ ExamCard   │                                                                │
│ ⤓ Export        │  └──────────────┴──────────────┘                                                                │
│                 │                                                                                                │
└─────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Summer mode (`?batch=Summer`) — desktop
```
Header chip becomes orange "SUMMER" + subtitle "Summer 2026 Exams".
Sidebar shows "Semester: Summer 2026" + "Scope: All Courses" instead of Batch/Department.
Footer link label changes to "Change courses".
Data source: summer_schedule.json (bundled at build time).
Source: src/app/schedule/page.tsx:100-126, 137-166.
```

## Mobile (≤430px) — Default State (regular semester)

`src/app/schedule/page.tsx:85-229` mobile branch is the same DOM (no `md:hidden` split — only the `<aside>` is `hidden md:flex`). Single-column layout below sticky header.

```
┌─────────────────────────────────────┐
│ [logo]  ◁ [CS] Batch 2024      ⤓ 🌓 │  ← Header (sticky)
├─────────────────────────────────────┤
│ 🔍 [Search by course, date…]        │  ← SearchBar (sticky top-14)
├─────────────────────────────────────┤
│ 6 exams found                       │  ← mobile-only result count (md:hidden, line 191-193)
├─────────────────────────────────────┤
│ MONDAY, 12 MAY                      │
│ ┌──────────────┬──────────────┐     │
│ │ ◉ ExamCard   │ ◉ ExamCard   │     │  ← 1-col stack (single column on mobile,
│ └──────────────┴──────────────┘     │     md:grid md:grid-cols-2 lg:grid-cols-3 at line 204)
│ WEDNESDAY, 14 MAY                   │
│ ┌──────────────┐                    │
│ │ ◉ ExamCard   │                    │
│ └──────────────┘                    │
└─────────────────────────────────────┘
                  ↑ FloatingMenu (mobile FAB)
```

## Key Interactive Elements (annotated)

| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Back chevron button | `() => router.back()` | Browser back | `src/app/schedule/page.tsx:90-98` |
| `<ExportButton>` (header rightActions) | opens export menu inside component | Triggers PNG/PDF/ICS export of `filtered` exams via `POST /api/export-image` | `src/app/schedule/page.tsx:88`, `src/components/ExportButton.tsx` |
| `<ExportButton variant="sidebar">` (sidebar footer) | opens same menu | Same as above | `src/app/schedule/page.tsx:180`, `src/components/ExportButton.tsx` |
| `<SearchBar>` | `setQuery` from `useState` | Filters `filtered` via `filterExams`/`filterSummerExams` query param | `src/app/schedule/page.tsx:188`, `src/components/SearchBar.tsx` |
| "Change filters" / "Change courses" link | `() => router.push('/')` | Soft-nav to landing | `src/app/schedule/page.tsx:174-179` |
| `<ExamCard>` | `() => setSelected(exam)` | Opens `<ExamDetail>` drawer with selected exam | `src/app/schedule/page.tsx:206-211` |
| `<ExamDetail onClose>` | `() => setSelected(null)` | Closes the detail drawer | `src/app/schedule/page.tsx:222-228` |
| Header logo | n/a | Soft-nav to `/` | `src/components/Header.tsx:20` |

## Conditional States

### `{filtered.length === 0}` — EmptyState
```
Desktop + mobile render <EmptyState query={query} batch={batch} dept={dept} /> (src/app/schedule/page.tsx:196-198).
EmptyState shows a friendly message + suggestion to change filters / clear search.
```

### `{isSummer === true}` — Summer mode
```
- Header chip switches to "SUMMER" (orange) + "Summer 2026 Exams"
- Sidebar Batch/Department rows replaced with "Semester: Summer 2026" + "Scope: All Courses"
- Data source: summer_schedule.json (vs regular_schedule.json)
- Filter logic: filterSummerExams() reads selectedCourses from localStorage 'fsc_summer_courses'
- Triggered by localStorage 'fsc_active_semester' === 'summer' (line 34-40)
- Note: NO supabase re-check on this page (unlike /home and /timetable which call /api/timetable)
```

### `<ExamDetail>` open (mobile bottom-sheet / desktop right panel)
```
Mobile: full-width bottom sheet (useMobileSwipe + drag handle + Escape handler)
Desktop: 96-wide right-side panel anchored below header (md:top-14 md:right-0 md:w-96)
Shows: full exam details (course, date, time, room, sections, school, batch)
Has: close button + "Back to list" implicit by clicking backdrop
Source: src/components/ExamDetail.tsx
```

### Suspense fallback (initial URL parse)
```
<div className="min-h-dvh flex items-center justify-center">
  <p>Loading…</p>
</div>
Shown briefly before useSearchParams() resolves (src/app/schedule/page.tsx:233-242).
```

## Breakpoint Behavior

| Breakpoint | What changes | Source |
|------------|--------------|--------|
| `md:` (768px) | Desktop sidebar `<aside className="hidden md:flex md:w-56 lg:w-64">` appears. Exam list grid switches from single-column stack to `md:grid md:grid-cols-2 lg:grid-cols-3`. Mobile-only result count `<p className="md:hidden …">` hides. | `src/app/schedule/page.tsx:136,191-193,204` |
| `lg:` (1024px) | Sidebar widens `md:w-56 lg:w-64`. Grid columns go 2→3. | `src/app/schedule/page.tsx:136,204` |
| `<ExamDetail>` responsive | `md:bottom-0 md:top-14 md:left-auto md:right-0 md:w-96` (right-rail on desktop); mobile = bottom sheet. | `src/components/ExamDetail.tsx` |
| `<Header>` responsive | `px-5 md:px-10`; sticky `top-0 z-50`; height `3.75rem`. | `src/components/Header.tsx:14-17` |

## Screenshot References

- Desktop summer mode: `[screenshot: desktop/03-schedule-summer.png]`
- Desktop exam detail drawer: `[screenshot: desktop/03b-schedule-exam-detail.png]`
- Mobile summer mode: `[screenshot: mobile/03-schedule-summer.png]`

## State Transitions

### URL → filter pipeline

```
Mount (?batch=2024&school=FSC&dept=CS):
  └─ useEffect sets isSummer from localStorage 'fsc_active_semester' (src/app/schedule/page.tsx:34-40)
       isSummer=false → allExams = regular_schedule.json (build-time bundled)
       isSummer=true  → allExams = summer_schedule.json (build-time bundled)

useMemo (filtered) depends on [isSummer, allExams, batch, school, dept, query]:
  ├─ if isSummer:
  │    selectedCourses = Object.keys(JSON.parse(localStorage['fsc_summer_courses']))
  │    filtered = filterSummerExams(allExams, {query, selectedCourses}).sort(sortByChronological)
  └─ else:
       filtered = filterExams(allExams, {batch, school, department: dept, query}).sort(sortByChronological)

useMemo (grouped) = groupByDay(filtered) → [{label: 'Monday, 12 May', entries: [...]}]
```

### Interaction state machine

```
Default (list view, no drawer)
  ├─ click exam card ──setSelected(exam)──► <ExamDetail> opens
  │                                            ├─ Escape / backdrop click ──► setSelected(null)
  │                                            └─ close button ──► setSelected(null)
  ├─ type in search bar ──setQuery──► filtered re-computes (re-renders list)
  ├─ click "Change filters/courses" ──router.push('/')──► Landing
  ├─ click <ExportButton> ──► modal opens (PNG/PDF/ICS export)
  └─ click back chevron ──router.back()──► browser back (likely /home)
```

### URL parameter contract

```
Required (regular mode):  ?batch=2024&school=FSC&dept=CS
Required (summer mode):   ?batch=Summer  (school+dept ignored)
Optional:                 (none)

If batch missing → allExams filtered against empty batch → likely empty list → <EmptyState>
If dept missing → defaults to 'CS' (line 30: params?.get('dept') ?? 'CS')
```
