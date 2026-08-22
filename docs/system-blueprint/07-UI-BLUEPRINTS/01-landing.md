---
doc: 07-UI-BLUEPRINTS/01-landing
generated: 2026-08-09T16:05:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# UI Blueprint — `/` (Landing)

**Page file:** `src/app/page.tsx:1-531`
**Render mode:** `'use client'` (`src/app/page.tsx:1`)
**Layout:** Mounted inside root `src/app/layout.tsx` (which globally renders `<Navbar>` desktop pill, `<FloatingMenu>` mobile FAB, `<FeedbackWidget>`, `<GlobalShortcuts>`, `<Toaster>`, `<Analytics>`, `<SpeedInsights>`).

## Blueprint Convention Legend

```
┌─┐│└┘├┤┬┴┼   Box-drawing characters for layout containers
╭─╮│╰╯          Rounded-card corners (used for elevated cards)
─ │ · ·         Horizontal / vertical / dotted dividers
◉ Label         Interactive element (button / link / input)
[placeholder]   Text-input field
🔍 (icon emoji) lucide-react icon shown in actual UI
▮▮▮            Spinner / loading / typing cursor
────  CONTAINER LABEL  ────  Section annotation
{state guard}   Conditional render (e.g., {mounted}, {isSummerMode})
[link → /path]  Navigation target on click
```

## Desktop (≥1024px) — Default State

`src/app/page.tsx:354-528` renders the desktop branch (class `hidden md:flex`). Two-column split: LEFT (42% / 40% at `lg`) holds hero + `<DesktopTicker>` + social links; RIGHT (flex-1) holds 8 feature cards in a 2-col / 3-col grid.

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ╭───────────────────────────────────────────────────────────────────────────────────────────────────────────╮ │
│ │  ◉ [logo.png] (→ /)                                  FAST NUCES · Islamabad Campus · Spring 2026  🔑  │ │  ← Header (sticky)
│ ╰───────────────────────────────────────────────────────────────────────────────────────────────────────────╯ │
├───────────────────────────────────────────────────┬───────────────────────────────────────────────────────────┤
│  LEFT 42% (px-10 lg:px-16 xl:px-20)              │  RIGHT flex-1 (px-10 lg:px-16 xl:px-20, overflow-y-auto) │
│  ┌─ dot-grid texture (opacity .35) ──────────┐   │                                                           │
│  │  FAST NUCES, ISB — Unified Portal         │   │   FEATURES                                                │
│  │                                            │   │   ┌──────────────┬──────────────┬──────────────┐         │
│  │  Your campus,                              │   │   │ ◉ Timetable  │ ◉ Optimizer  │ ◉ Exam Finder│         │
│  │  at a glance.                             │   │   │  (accent-cs) │  (accent-cy) │  (accent-ee) │         │
│  │                                            │   │   │  Description.│  Description.│  Description.│         │
│  │  A unified utility layer for FAST Isb     │   │   │              │              │              │         │
│  │  students. Timetables, exam schedules,    │   │   ├──────────────┼──────────────┼──────────────┤         │
│  │  room availability, faculty info,         │   │   │ ◉ Free Rooms │ ◉ Faculty    │ ◉ Semester   │         │
│  │  semester plan and the events calendar —  │   │   │  (accent-ds) │  (accent-se) │  (accent-af) │         │
│  │  all in one place.▮                       │   │   │              │              │              │         │
│  │  (typing animation; 20ms/char)            │   │   ├──────────────┴──────────────┴──────────────┤         │
│  │                                            │   │   │ ◉ Campus Events        │ ◉ Lost & Found          │  │
│  │  ┌─ <DesktopTicker> (mounted=true) ─────┐  │   │   │  (accent-ba)           │  (accent-lf)            │  │
│  │  │  ⏱ 14:32  · Next: CS-101 @ 15:00     │  │   │   │                        │                         │  │
│  │  │  Today's classes (5)                  │  │   │   └────────────────────────┴────────────────────────┘  │
│  │  └────────────────────────────────────────┘  │   │                                                           │
│  │                                            │   │   ─── FAST NUCES · Islamabad Campus · Spring 2026 🔑 ─── │
│  │  🐙 GitHub  ◉ (→ github.com/…)             │   │   (footer, same as mobile)                                │
│  │  in  LinkedIn ◉ (→ linkedin.com/…)         │   │                                                           │
│  └────────────────────────────────────────────┘   │                                                           │
└───────────────────────────────────────────────────┴───────────────────────────────────────────────────────────┘
                                                                                                                  ← FloatingMenu (mobile only, hidden here)
                                                                                                                  ← Navbar desktop pill (global, mounted by layout)
```

## Mobile (≤430px) — Default State

`src/app/page.tsx:275-349` renders the mobile branch (`md:hidden`). Single-column scrollable list, 2-col grid of square feature cards.

```
┌─────────────────────────────────────┐
│ [logo]                  🐙 in 🌓 ◉  │  ← Header (sticky, h-15)
├─────────────────────────────────────┤
│  FAST NUCES, ISB                    │
│                                     │
│  Your campus,                       │
│  at a glance.                       │
│                                     │
│  A unified utility layer for FAST   │
│  Isb students. Timetables, exam     │
│  schedules, room availability…      │
│  (static — no typing anim on mobile)│
│                                     │
│  ┌──────────┬──────────┐            │
│  │ ◉Timetable│◉Optimizer│           │  ← 2-col grid, square cards (aspect-1/1)
│  ├──────────┼──────────┤            │
│  │ ◉Exams   │ ◉Rooms   │            │
│  ├──────────┼──────────┤            │
│  │ ◉Faculty │ ◉Semestr │            │
│  ├──────────┼──────────┤            │
│  │ ◉Events  │ ◉Lost&Fnd│            │
│  └──────────┴──────────┘            │
│                                     │
│  FAST NUCES · Islamabad · Spring 26 │
│                            🔑 ◉     │
└─────────────────────────────────────┘
                          ↑ FloatingMenu (FAB) mounted by layout
```

## Key Interactive Elements (annotated)

| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Feature card `id='timetable'` | `handleFeatureClick('timetable', false)` | `router.push('/home?feature=timetable')` | `src/app/page.tsx:255-268` |
| Feature card `id='optimizer'` | `handleFeatureClick('optimizer', false)` | `router.push('/timetable/optimizer')` | `src/app/page.tsx:261-262` |
| Feature card `id='exams'` | `handleFeatureClick('exams', false)` | `router.push('/home?feature=exams')` | `src/app/page.tsx:265-266` |
| Feature card `id='rooms'` | `handleFeatureClick('rooms', false)` | `router.push('/home?feature=rooms')` | `src/app/page.tsx:265-266` |
| Feature card `id='faculty'` | `handleFeatureClick('faculty', false)` | `router.push('/home?feature=faculty')` | `src/app/page.tsx:265-266` |
| Feature card `id='semester'` | `handleFeatureClick('semester', false)` | `router.push('/semester')` | `src/app/page.tsx:257-258` |
| Feature card `id='events'` | `handleFeatureClick('events', false)` | `router.push('/events')` | `src/app/page.tsx:259-260` |
| Feature card `id='lost-found'` | `handleFeatureClick('lost-found', false)` | `router.push('/lost-found')` | `src/app/page.tsx:263-264` |
| Header logo `<Link href="/">` | n/a (Next `<Link>`) | Soft-navigate to `/` | `src/components/Header.tsx:20` |
| Header GitHub icon (mobile) | n/a (`<a target="_blank">`) | External navigate to GitHub | `src/components/Header.tsx:46-55` |
| Header LinkedIn icon (mobile) | n/a (`<a target="_blank">`) | External navigate to LinkedIn | `src/components/Header.tsx:56-66` |
| Header `<ThemeToggle>` | `toggleTheme()` | Cycles `data-theme` attribute (no nav) | `src/components/ThemeToggle.tsx` |
| Desktop GitHub `<a>` | n/a | External navigate | `src/app/page.tsx:411-424` |
| Desktop LinkedIn `<a>` | n/a | External navigate | `src/app/page.tsx:425-438` |
| Footer 🔑 `<a href="/admin">` | n/a (raw `<a>`) | Hard navigate to `/admin` | `src/app/page.tsx:516-522` (desktop), `339-345` (mobile) |
| Feature card `onMouseOver` (desktop) | inline style mutation | Sets boxShadow + borderColor + translateY(-2px) | `src/app/page.tsx:460-466` |
| Feature card `onMouseOut` (desktop) | inline style mutation | Resets boxShadow + borderColor + transform | `src/app/page.tsx:467-471` |

## Conditional States

### `{!mounted}` — pre-hydration (desktop only)
```
LEFT column omits <DesktopTicker> entirely (mounted && <DesktopTicker/>) at src/app/page.tsx:398-407.
The space remains; the ticker is filled in on first paint.
```

### `{isSummerMode}` — summer semester (currently live as of 2026-08-09)
```
- DesktopTicker receives `summerCoursesList` instead of allTimetableEntries
- `summerSelections` (from localStorage 'fsc_summer_courses') + `summerCatalog` are passed in
- Semester name badge in footer shows "Summer 2026" (set via setSemesterName from supabase check)
- Triggered in src/app/page.tsx:200-239 via dynamic import('@/lib/supabase') + .from('semester_settings').eq('id',1).single()
- If localStorage 'fsc_active_semester' === 'summer', a GET /api/timetable is fired immediately (line 189-198) before supabase check completes
```

### `{isTypingComplete === false}` — typing animation in progress
```
Desktop hero shows a 2px-wide blinking cursor (animate-pulse) right of displayText.
Source: src/app/page.tsx:391-393.
Mobile hero shows full INTRO_TEXT immediately (no typing animation on mobile, src/app/page.tsx:290-292).
```

### `{f.placeholder === true}` — "Coming Soon" feature
```
Currently NO feature has placeholder=true (all 8 set to false at src/app/page.tsx:18-143).
If set, the card would render a "Coming Soon" badge and be disabled (cursor-not-allowed + opacity-50).
```

### Loading / Error states
```
- No loading skeleton; landing renders immediately (build-time JSON bundle).
- Supabase check failure (line 235-237) is silently caught: console.error + falls back to localStorage value.
- /api/timetable fetch failure (line 197) is silently caught: console.error.
```

## Breakpoint Behavior

| Breakpoint | What changes | Source |
|------------|--------------|--------|
| `md:` (768px) | Toggle between `<main className="md:hidden">` mobile branch and `<div className="hidden md:flex">` desktop branch. Header shows the GitHub/LinkedIn icon pair on mobile (`md:hidden`) but they migrate to the LEFT desktop column (`hidden md:flex`) at `md`. | `src/app/page.tsx:275,354` + `src/components/Header.tsx:46-66` |
| `lg:` (1024px) | Desktop LEFT column width shifts from `w-[42%] lg:w-[40%]` (slightly narrower). Card grid goes from `grid-cols-2 lg:grid-cols-3`. Horizontal padding grows `px-10 lg:px-16`. | `src/app/page.tsx:362,449` |
| `xl:` (1280px) | Horizontal padding grows again to `xl:px-20`. No structural change. | `src/app/page.tsx:362,443` |
| Global `Navbar` (desktop pill) | Mounted globally by `layout.tsx`; only visible on `md+` per `src/components/Navbar.tsx` (Stage Light Nav). | `src/app/layout.tsx:62-88`, `src/components/Navbar.tsx` |
| Global `FloatingMenu` (mobile FAB) | Mounted globally by `layout.tsx`; only visible below `md`. | `src/app/layout.tsx`, `src/components/FloatingMenu.tsx` |

## Screenshot References

- Desktop default: `[screenshot: desktop/01-landing.png]` (in `/home/z/my-project/workspace/exam-table-audit/screenshots/desktop/`)
- Mobile default: `[screenshot: mobile/01-landing.png]`

## State Transitions

```
Default (/) ──click:Timetable card──► /home?feature=timetable
Default (/) ──click:Optimizer card──► /timetable/optimizer
Default (/) ──click:Exams card──────► /home?feature=exams
Default (/) ──click:Rooms card──────► /home?feature=rooms
Default (/) ──click:Faculty card────► /home?feature=faculty
Default (/) ──click:Semester card───► /semester
Default (/) ──click:Events card─────► /events
Default (/) ──click:Lost & Found────► /lost-found
Default (/) ──click:footer 🔑───────► /admin  (hard <a> nav, full reload)
Default (/) ──keyboard:Ctrl+Shift+A─► /admin  (via <GlobalShortcuts>)
Default (/) ──keyboard:Ctrl+Shift+Z─► browser back  (via <GlobalShortcuts>)
Default (/) ──click:Navbar HOME─────► / (no-op when already there)
Default (/) ──click:Navbar COURSES──► /timetable/custom
Default (/) ──click:Navbar ROOMS────► /rooms
Default (/) ──click:Navbar FACULTY──► /faculty
Default (/) ──click:Navbar LOST&FND─► /lost-found
```

### Internal React state machine (no URL change)

```
mount → useEffect runs once (src/app/page.tsx:175-240):
  ├─ localStorage.getItem('fsc_user_config')  → setUserConfig
  ├─ localStorage.getItem('fsc_custom_bundles') → setBundles
  ├─ localStorage.getItem('fsc_semester_name') → setSemesterName
  ├─ localStorage.getItem('fsc_active_semester') === 'summer' ?
  │    └─ setIsSummerMode(true)
  │       + fetch('/api/timetable', {cache:'no-store'})
  │           → setSummerCoursesList + setSummerCatalog
  │       + localStorage.getItem('fsc_summer_courses') → setSummerSelections
  └─ checkSemesterType() async IIFE:
       └─ await import('@/lib/supabase')
          supabase.from('semester_settings').select('*').eq('id',1).single()
          └─ if data.semester_type === 'summer':
              setIsSummerMode(true)
              localStorage.setItem('fsc_active_semester', 'summer')
              setSemesterName(data.semester_name)  + persist to localStorage
              fetch('/api/timetable') → setSummerCoursesList + setSummerCatalog
          └─ else:
              setIsSummerMode(false)
              setSummerCoursesList([])

Typing animation useEffect (src/app/page.tsx:243-253):
  ├─ setInterval every 20ms, setDisplayText(INTRO_TEXT.slice(0, i++))
  └─ clears interval + setIsTypingComplete(true) when i > INTRO_TEXT.length
```
