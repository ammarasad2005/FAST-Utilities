---
doc: 07-UI-BLUEPRINTS/08-semester
generated: 2026-08-09T16:05:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# UI Blueprint — `/semester` (Academic Calendar)

**Page file:** `src/app/semester/page.tsx:1-544`
**Render mode:** `'use client'` (`src/app/semester/page.tsx:1`)
**Layout:** Mounted inside root `src/app/layout.tsx`. Pure display page (no interactive elements beyond ThemeToggle).

## Blueprint Convention Legend

```
┌─┐│└┘├┤┬┴┼   Box-drawing characters for layout containers
╭─╮│╰╯          Rounded-card corners
─ │ · ·         Horizontal / vertical / dotted dividers
◉ Label         Interactive element (button / link / input)
🔍 (icon emoji) lucide-react icon
{state guard}   Conditional render
[link → /path]  Navigation target
```

## Desktop (≥1024px) — Default State

`src/app/semester/page.tsx:183-225` renders the desktop branch (`hidden md:flex`). Three-column layout: COLUMN 1 Key Dates (flex-[1.2]), COLUMN 2 Holidays (flex-[0.6], hidden below `lg`), COLUMN 3 Monthly Calendars (sticky aside, flex-[1]).

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo]                                                                                🌓 │  ← Header (sticky)
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  FAST NUCES · Islamabad · Signed Jan 8, 2026                                                                    │
│  Semester Schedule — Spring 2026.                                                                                │
│                                                                                                                  │
│  ┌── COLUMN 1: Key Dates (flex-[1.2]) ──┬── COLUMN 2: Holidays (flex-[0.6]) ──┬── COLUMN 3: Calendars (sticky) ┐│
│  │                                       │                                      │                              ││
│  │  KEY DATES AT A GLANCE                │  HOLIDAYS                            │  MONTHLY CALENDARS           ││
│  │  ● Start     First day of classes     │  ● Kashmir Day                       │  ┌─ Legend ───────────────┐  ││
│  │    03 Feb 2026                        │    05 Feb 2026                       │  │ ■ Classes start/Last   │  ││
│  │  ● Deadline  Add & Drop of courses    │  ● Pakistan Day                      │  │ ■ Exam period          │  ││
│  │    10 Feb 2026                        │    23 Mar 2026                       │  │ ■ Deadline             │  ││
│  │  ● Sessional 1  First Sessional Exam  │  ● Eid-ul-Fitr (lunar)               │  │ ■ Holiday              │  ││
│  │    10 Mar – 12 Mar 2026               │    03 Apr – 05 Apr 2026              │  │ ■ Today                 │  ││
│  │  ● Results    First Sessional results │  ● Eid-ul-Adha (lunar)               │  └─────────────────────────┘  ││
│  │    20 Mar 2026                        │    17 Jun – 19 Jun 2026              │  ┌── January 2026 ──────┐     ││
│  │  ● Sessional 2  Second Sessional Exam │  ● Independence Day                  │  │ Su Mo Tu We Th Fr Sa │     ││
│  │    14 Apr – 16 Apr 2026               │    14 Aug 2026                       │  │              1  2  3  │     ││
│  │  ● Finals    Final Examinations       │  ● Iqbal Day                         │  │  4  5  6  7  8  9 10 │     ││
│  │    12 May – 20 May 2026               │    09 Nov 2026                       │  │ 11 12 13 14 15 16 17 │     ││
│  │  ● End       Last day of classes      │  ● Quaid-e-Azam Day                  │  │ …                    │     ││
│  │    09 May 2026                        │    25 Dec 2026                       │  └──────────────────────┘     ││
│  │  …                                    │  …                                   │  ┌── February 2026 ─────┐    ││
│  │  (animated entrance — items fade in)  │                                      │  │ Su Mo Tu We Th Fr Sa │    ││
│  │  (timeline-line scaleY animation)     │                                      │  │  1  2  3  4  5  6  7 │    ││
│  │  (markers scale-in 60ms apart)        │                                      │  │ …                    │    ││
│  │                                       │                                      │  └──────────────────────┘    ││
│  └───────────────────────────────────────┴──────────────────────────────────────┴──────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Mobile (≤430px) — Default State

`src/app/semester/page.tsx:173-181` renders the mobile branch (`md:hidden`). Single-column scroll: MobileHero → KeyDatesSection → CalendarsSection → HolidaysSection.

```
┌─────────────────────────────────┐
│ [logo]                  🌓 ◉    │  ← Header (sticky)
├─────────────────────────────────┤
│ FAST NUCES · Islamabad          │  ← MobileHero (line 230-244)
│                                 │
│ Semester Schedule               │
│ Spring 2026.                    │
│ Signed Jan 8, 2026              │
├─────────────────────────────────┤
│ KEY DATES AT A GLANCE           │  ← KeyDatesSection (timeline)
│ ● Start     First day of class  │
│   03 Feb 2026                   │
│ ● Deadline  Add & Drop          │
│   10 Feb 2026                   │
│ ● Sessional 1  First Sessional  │
│   10 Mar – 12 Mar 2026          │
│ …                               │
├─────────────────────────────────┤
│ MONTHLY CALENDARS               │  ← CalendarsSection (grid-cols-2 md:grid-cols-3)
│ Legend (5 swatches)             │
│ ┌──Jan 26──┐ ┌──Feb 26──┐       │
│ │ Su Mo Tu │ │ Su Mo Tu │       │  ← 2-col grid on mobile (grid-cols-2)
│ │  We Th Fr│ │  We Th Fr│       │
│ │  Sa      │ │  Sa      │       │
│ │ 1  2  3  │ │ 1  2  3  │       │
│ │ …        │ │ …        │       │
│ └──────────┘ └──────────┘       │
│ ┌──Mar 26──┐ ┌──Apr 26──┐       │
│ …                               │
├─────────────────────────────────┤
│ HOLIDAYS                        │  ← HolidaysSection (grid-cols-1 sm:grid-cols-2)
│ ● Kashmir Day   05 Feb 2026     │
│ ● Pakistan Day  23 Mar 2026     │
│ ● Eid-ul-Fitr (lunar) 03 Apr    │
│ …                               │
└─────────────────────────────────┘
                  ↑ FloatingMenu (mobile FAB)
```

## Key Interactive Elements (annotated)

This is a **purely display page** — the only interactive elements are global ones mounted by root layout.

| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Header logo `<Link href="/">` | n/a (Next `<Link>`) | Soft-navigate to `/` | `src/components/Header.tsx:20` |
| Header `<ThemeToggle>` | `toggleTheme()` | Cycles `data-theme` attribute (no nav) | `src/components/ThemeToggle.tsx` |
| Header GitHub icon (mobile only) | n/a (`<a target="_blank">`) | External navigate to GitHub | `src/components/Header.tsx:46-55` |
| Header LinkedIn icon (mobile only) | n/a (`<a target="_blank">`) | External navigate to LinkedIn | `src/components/Header.tsx:56-66` |
| FloatingMenu items (mobile) | various | Navigate to one of 7 destinations | `src/components/FloatingMenu.tsx` |
| Navbar items (desktop) | various | Navigate to one of 5 destinations | `src/components/Navbar.tsx` |
| `<GlobalShortcuts>` | `Ctrl+Shift+A` → `/admin`; `Ctrl+Shift+Z` → browser back | Keyboard shortcuts | `src/components/GlobalShortcuts.tsx` |

No page-local handlers — no `useState` for inputs, no `useRouter`, no `onClick` defined inside `SemesterPlanPage`.

## Conditional States

### `{!mounted}` — pre-hydration
```
CalendarsSection is hidden until mounted=true (line 178 + 212).
This avoids SSR timezone mismatches in the calendar grids.
KeyDatesSection + HolidaysSection render immediately (they're static).
```

### Day classification (per-cell color coding)
```
classifyDay(y, m, d) returns one of:
  - 'today'         → solid accent-cs bg, white text, font-weight 600
  - 'classes-start' → solid accent-ds bg, white text, font-weight 600
  - 'exam'          → accent-cs-bg, accent-cs text
  - 'deadline'      → accent-ee-bg, accent-ee text
  - 'holiday'       → accent-cy-bg, accent-cy text
  - 'normal'        → transparent bg, secondary text
  - 'empty'         → fully transparent (used for cells before day 1)
Source: src/app/semester/page.tsx:131-165.
```

### Key Dates timeline animation
```
On mount, KeyDatesSection triggers a staggered animation:
  - timeline-line scaleY 0→1 over 700ms ease-out
  - each timeline-item fades in 60ms apart (setAnimatedItems via setTimeout)
  - each timeline-marker scales in 0→1 over 300ms
Source: src/app/semester/page.tsx:271-281, 285-310.
```

### Visible months auto-derivation
```
deriveVisibleMonths(semesterCalendar) scans ALL dates in keyDates + holidays + academicRanges,
then walks month-by-month from earliest to latest (capped at 12 months).
Handles year boundaries (e.g., Fall 2026 spans Aug 2026 → Jan 2027).
Falls back to (current month ± 1) if JSON contains no usable dates.
Source: src/app/semester/page.tsx:379-432.
```

### Key Date badge mapping
```
KEY_DATE_BADGES (line 39-51) maps event labels to short badges:
  'First day of classes'              → 'Start'
  'Add & Drop of courses / labs'      → 'Deadline'
  'Semester Freeze'                   → 'Deadline'
  'First Sessional Examination'       → 'Sessional 1'
  'First Sessional results announced' → 'Results'
  'Second Sessional Examination'      → 'Sessional 2'
  'Second Sessional results announced'→ 'Results'
  'Last day of classes'               → 'End'
  'Course withdrawal deadline / Makeup week' → 'Deadline'
  'Final Examinations'                → 'Finals'
  'Final Examination results announced' → 'Results'
Falls back to 'Info' if label not in map.
```

## Breakpoint Behavior

| Breakpoint | What changes | Source |
|------------|--------------|--------|
| `md:` (768px) | Toggle between mobile (`md:hidden` main at line 173) and desktop (`hidden md:flex` div at line 183). Calendar grid switches from `grid-cols-2` (mobile) to `md:grid-cols-3` (desktop). | `src/app/semester/page.tsx:173,183,462` |
| `lg:` (1024px) | COLUMN 2 (Holidays) becomes visible (`hidden lg:flex` at line 197). Three-column desktop layout activates: Key Dates (flex-[1.2]) + Holidays (flex-[0.6]) + Calendars (sticky aside, flex-[1]). Compact calendar variant activates inside the aside: `compact ? 'grid-cols-1 xl:grid-cols-2'`. | `src/app/semester/page.tsx:197,202,462` |
| `sm:` (640px) | KeyDatesSection timeline rows switch from `flex-col` to `sm:flex-row sm:items-center`. HolidaysSection grid switches from `grid-cols-1` to `sm:grid-cols-2`. | `src/app/semester/page.tsx:341,518` |
| `xl:` (1280px) | Compact calendar grid goes 1→2 columns (`xl:grid-cols-2`). | `src/app/semester/page.tsx:462` |
| CalendarsSection compact mode | When rendered inside the desktop aside (compact=true, hideLabel=true), uses smaller `p-3` padding and `grid-cols-1 xl:grid-cols-2` (vs `p-4` + `grid-cols-2 md:grid-cols-3` standalone). | `src/app/semester/page.tsx:434-511` |

## Screenshot References

- Desktop default: `[screenshot: desktop/07-semester.png]`
- Mobile default: `[screenshot: mobile/07-semester.png]`

## State Transitions

This page has **no internal state machine** — it's a static display. The only state is `mounted` (set to true on first useEffect), which gates the CalendarsSection render to prevent SSR/hydration timezone mismatches.

### Data flow

```
semesterCalendarRaw (build-time JSON import)
  ↓
semesterCalendar: SemesterCalendar
  ↓
KEY_DATES = keyDates.map(event => ({
  badge: KEY_DATE_BADGES[label] ?? 'Info',
  type: mapKeyDateType(event),  // 'exam' | 'deadline' | 'info' | 'milestone'
  label: event.label,
  date: formatDateRange(event.date, event.endDate, true),
}))
  ↓
HOLIDAYS = holidays.map(h => ({ name: h.label, date: formatDateRange(...), lunar: h.type === 'religious' }))
  ↓
examDays / deadlineDays / holidayDays / classStartDays Sets (built from ranges, used by classifyDay)
  ↓
CalendarsSection renders months × days, each cell styled via DAY_STYLES[classifyDay(y, m, d)]
```

### Navigation

```
/semester ──click:back chevron (none here)──► (no back chevron on this page; rely on global nav)
/semester ──click:Navbar HOME──► /
/semester ──click:Navbar COURSES──► /timetable/custom
/semester ──click:Navbar ROOMS──► /rooms
/semester ──click:Navbar FACULTY──► /faculty
/semester ──click:Navbar LOST & FOUND──► /lost-found
/semester ──click:FloatingMenu item (mobile)──► varies
/semester ──keyboard:Ctrl+Shift+A──► /admin
/semester ──keyboard:Ctrl+Shift+Z──► browser back
/semester ──click:header logo──► /
```
