---
doc: 07-UI-BLUEPRINTS/11-events
generated: 2026-08-09T16:05:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# UI Blueprint — `/events` (Campus Events Calendar)

**Page file:** `src/app/events/page.tsx:1-382`
**Render mode:** `'use client'` (`src/app/events/page.tsx:1`)
**Layout:** Mounted inside root `src/app/layout.tsx`. Page does NOT wrap in Suspense (no `useSearchParams()`).

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

`src/app/events/page.tsx:242-379` renders the desktop branch (`hidden md:flex`). Two-column grid: LEFT main content (hero + `<EventsCalendar>`); RIGHT sticky aside (Ongoing + Upcoming events).

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo]                                                                                🌓 │  ← Header (sticky)
├─────────────────────────────────────────────────────────────────────────┬────────────────────────────────┤
│ LEFT (minmax(0,1fr))                                                     │ RIGHT aside (360px, sticky xl:top-20)│
│                                                                          │                                    │
│  FAST NUCES · Islamabad                                                  │  ┌── Ongoing Events ─────────────┐  │
│                                                                          │  │ ● Event Name                  │  │  ← only if ongoingEvents > 0
│  Campus Events                                                           │  │   10:00 – 11:30               │  │
│                                                                          │  │   📍 Auditorium               │  │
│  Student-relevant events at Campus, updated weekly. Browse this month    │  │   📅 Add to calendar           │  │
│  and next month at full scale.                                           │  └────────────────────────────────┘  │
│                                                                          │                                    │
│  ╔═══ EventsCalendar (rounded-3xl, gradient bg) ═══════════════════════╗  │  ┌── Upcoming Snapshot ────────┐  │
│  ║  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐                       ║  │  │ Event Name                   │  │
│  ║  │ Su  │ Mo  │ Tu  │ We  │ Th  │ Fr  │ Sa  │                       ║  │  │  May 12 · 14:00              │  │
│  ║  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                       ║  │  │  📍 Library 1st Floor        │  │
│  ║  │     │  1  │  2  │  3  │  4  │  5  │  6  │                       ║  │  │  📅                          │  │
│  ║  │     │     │     │     │     │     │     │  ← day cells          ║  │  ├──────────────────────────────┤  │
│  ║  │  7  │  8● │  9  │ 10  │ 11  │ 12  │ 13  │     (dot = has event) ║  │  │ Event Name                   │  │
│  ║  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                       ║  │  │  May 15 · 11:00              │  │
│  ║  │ 14  │ 15  │ 16  │ 17  │ 18  │ 19  │ 20  │                       ║  │  │  📍 CS Department            │  │
│  ║  │     │     │     │     │     │     │     │                       ║  │  │  📅                          │  │
│  ║  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                       ║  │  └──────────────────────────────┘  │
│  ║  │ 21  │ 22  │ 23  │ 24  │ 25  │ 26  │ 27  │                       ║  │  (max-h-[54dvh] overflow-auto)     │
│  ║  │     │     │     │     │     │     │     │                       ║  │                                    │
│  ║  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                       ║  │                                    │
│  ║  │ 28  │ 29  │ 30  │ 31  │     │     │     │                       ║  │                                    │
│  ║  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘                       ║  │                                    │
│  ╚════════════════════════════════════════════════════════════════════╝  │                                    │
└──────────────────────────────────────────────────────────────────────────┴────────────────────────────────────┘
```

### `<EventsCalendar>` day cell click → `<EventDayDetail>` drawer
```
Mobile: bottom sheet
Desktop: right-rail panel (md:w-96, anchored top-14 right-0)
Shows: full list of events for that calendar day with name, time, location, "Add to calendar" button per event.
Source: src/components/EventsCalendar.tsx (EventDayDetail subcomponent).
```

## Mobile (≤430px) — Default State

`src/app/events/page.tsx:105-240` renders the mobile branch (`md:hidden`). Single-column scroll: hero + 3-cell stats grid + `<EventsCalendar>` + Ongoing Snapshot + Upcoming Snapshot (6 events).

```
┌─────────────────────────────────┐
│ [logo]                  🌓 ◉    │  ← Header (sticky)
├─────────────────────────────────┤
│ FAST NUCES · Islamabad          │  ← hero (events-panel-enter animation)
│                                 │
│ Campus Events                   │
│                                 │
│ Student-relevant events at      │
│ Campus, updated weekly.         │
├─────────────────────────────────┤
│ ┌─────┬─────┬─────┐             │  ← 3-col stats grid
│ │THIS │NEXT │TRAC│             │
│ │MONTH│MONTH│KED │             │
│ │ 12  │  8  │ 10 │             │
│ └─────┴─────┴─────┘             │
├─────────────────────────────────┤
│ ╔═══ EventsCalendar ═════════╗  │  ← same calendar component, narrower
│ ║  Su Mo Tu We Th Fr Sa      ║  │
│ ║   1  2  3  4  5  6         ║  │
│ ║   7  8● 9 10 11 12 13      ║  │  ← dots indicate event days
│ ║  …                         ║  │
│ ╚════════════════════════════╝  │
├─────────────────────────────────┤
│ ONGOING SNAPSHOT                │  ← only if ongoingEvents.length > 0
│ ● Seminar on AI                 │
│   10:00 – 11:30                 │
│   📍 Auditorium                 │
│   📅                            │
├─────────────────────────────────┤
│ UPCOMING SNAPSHOT               │
│ Event Name                      │
│  May 12 · 14:00                 │
│ 📍 Library 1st Floor            │
│ 📅                              │
│ Event Name 2                    │
│  May 15 · 11:00                 │
│ 📍 CS Department                │
│ 📅                              │
│ … (up to 6 on mobile)           │
└─────────────────────────────────┘
                  ↑ FloatingMenu (mobile FAB)
```

## Key Interactive Elements (annotated)

| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Calendar day cell (in `<EventsCalendar>`) | `onSelect(dayEvents)` (inside `EventsCalendar`) | Opens `<EventDayDetail>` drawer via portal | `src/components/EventsCalendar.tsx` |
| Per-event "📅 Add to calendar" button (mobile ongoing) | `() => downloadEventsICS([event], \`${event.event_name.slice(0,20)}.ics\`)` | Downloads .ics file for that single event | `src/app/events/page.tsx:174-180` |
| Per-event "📅 Add to calendar" button (mobile upcoming) | `() => downloadEventsICS([event], ...)` | Same | `src/app/events/page.tsx:223-229` |
| Per-event "📅 Add to calendar" button (desktop ongoing) | same | Same | `src/app/events/page.tsx:309-315` |
| Per-event "📅 Add to calendar" button (desktop upcoming) | same | Same | `src/app/events/page.tsx:358-364` |
| `<EventDayDetail onClose>` (inside `<EventsCalendar>`) | closes drawer | Closes day-detail drawer | `src/components/EventsCalendar.tsx` |
| Header logo | n/a | Soft-nav to `/` | `src/components/Header.tsx:20` |
| Header `<ThemeToggle>` | `toggleTheme()` | Cycles `data-theme` | `src/components/ThemeToggle.tsx` |

## Conditional States

### `{ongoingEvents.length > 0}` — Ongoing Snapshot visible
```
Both mobile and desktop render the Ongoing section ONLY if there are events happening RIGHT NOW
  (eventDate === todayStart AND currentMinutes ∈ [range.start, range.end[)
Ongoing events shown with pulsing emerald dot (animate-pulse).
Source: src/app/events/page.tsx:76-88, 137-189 (mobile), 272-325 (desktop).
```

### `{ongoingEvents.length === 0}` — Ongoing section hidden
```
Only Upcoming Snapshot visible.
The upcoming section is gated only by ongoingEvents.length in mobile (line 137).
Desktop: ongoing is conditionally rendered, upcoming always renders (line 272-374).
```

### `{upcomingEvents.length === 0}` — No upcoming events
```
Upcoming Snapshot renders but with empty list (no fallback message).
Source: src/app/events/page.tsx:192-238 (mobile), 327-373 (desktop).
```

### `<EventDayDetail>` drawer open
```
Triggered by clicking a calendar day cell with events.
Mobile: bottom sheet (drag handle, backdrop, Escape)
Desktop: right-rail panel
Shows: list of that day's events, each with name + time + location + "Add to calendar" button
Source: src/components/EventsCalendar.tsx (EventDayDetail subcomponent using useMobileSwipe).
```

### Clock ticking (60s interval)
```
useEffect sets up a 60-second interval to update clockMs state.
This causes ongoingEvents + upcomingEvents to re-compute every minute.
Source: src/app/events/page.tsx:64-67.
```

### CSS animations on mount
```
Multiple elements use animationDelay staggered for entrance:
  - 'events-panel-enter' on hero text + stats grid
  - 'events-hero-enter' on main heading + EventsCalendar container
  - 'events-item-enter' on each event article
Delays: 20ms, 60ms, 110ms, 160ms, 220ms, 260ms, 330ms, etc.
Source: src/app/events/page.tsx:108-373 (inline style={{ animationDelay: ... }}).
Keyframes defined in src/app/globals.css (animation classes referenced).
```

## Breakpoint Behavior

| Breakpoint | What changes | Source |
|------------|--------------|--------|
| `md:` (768px) | Toggle between mobile (`md:hidden` main at line 105) and desktop (`hidden md:flex` div at line 242). Mobile renders EventsCalendar + Ongoing + Upcoming all stacked; desktop splits into 2-col grid `[minmax(0,1fr)_360px]`. | `src/app/events/page.tsx:105,242` |
| `lg:` (1024px) | Desktop horizontal padding grows `px-7 lg:px-12 xl:px-16`. Vertical padding `py-8 lg:py-10`. | `src/app/events/page.tsx:245` |
| `xl:` (1280px) | Desktop grid activates 2-col layout: `grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]`. Aside becomes sticky (`xl:sticky xl:top-20`). | `src/app/events/page.tsx:246,271` |
| `<EventsCalendar>` responsive | Component renders its own responsive grid internally (7-col calendar). Day cells shrink to fit available width. | `src/components/EventsCalendar.tsx` |
| `<EventDayDetail>` responsive | Mobile bottom sheet; desktop right rail. | `src/components/EventsCalendar.tsx` |
| Upcoming list scroll | Desktop aside has `max-h-[54dvh] overflow-auto pr-1` to scroll independently. Mobile shows up to 6 items without scroll. | `src/app/events/page.tsx:205,339` |

## Screenshot References

- Desktop default: `[screenshot: desktop/10-events.png]`
- Mobile default: `[screenshot: mobile/10-events.png]`

## State Transitions

### Lifecycle: mount → clock tick → fetch events → render snapshots

```
Mount:
  clockMs = Date.now()   ← initial
  now = new Date(clockMs)
  todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  {current, next} = getCurrentAndNextMonth(now)

  useEffect (src/app/events/page.tsx:64-67):
    setInterval(() => setClockMs(Date.now()), 60_000)
    return () => clearInterval(timer)

Events data:
  currentMonthEvents = Object.values(getEventsForMonth(current.month, current.year, now)).flat()
  nextMonthEvents = Object.values(getEventsForMonth(next.month, next.year, now)).flat()
  Both pulled from /data/student_events.json (build-time bundled, via @/lib/events)

Derived lists:
  ongoingEvents = currentMonthEvents.filter(eventDate === todayStart AND currentMinutes ∈ [range.start, range.end[)
                  .sort(by parseStartMinutes)
  ongoingKeys = Set of getEventKey(event) for ongoing

  upcomingEvents = [...currentMonthEvents, ...nextMonthEvents]
                   .filter(eventDate >= todayStart AND !ongoingKeys.has(event))
                   .sort(by dayDiff then by startMinutes)
                   .slice(0, 10)   ← desktop shows all 10, mobile shows first 6
```

### Interaction state machine

```
Default (calendar + snapshots visible)
  ├─ click calendar day cell (with events) ──onSelect(dayEvents)──► <EventDayDetail> drawer opens
  │       ├─ Escape / backdrop / swipe down ──► drawer closes
  │       └─ close button ──► drawer closes
  ├─ click "📅 Add to calendar" on any event ──downloadEventsICS([event], filename)──► .ics file downloads
  ├─ clock tick (every 60s) ──setClockMs──► ongoingEvents + upcomingEvents re-compute
  ├─ click back chevron (none on this page) ──► (use global Navbar/FloatingMenu)
  ├─ click Navbar HOME ──► /
  ├─ click Navbar COURSES ──► /timetable/custom
  ├─ click Navbar ROOMS ──► /rooms
  ├─ click Navbar FACULTY ──► /faculty
  ├─ click Navbar LOST & FOUND ──► /lost-found
  ├─ click FloatingMenu item (mobile) ──► varies
  ├─ keyboard: Ctrl+Shift+A ──► /admin
  ├─ keyboard: Ctrl+Shift+Z ──► browser back
  └─ click header logo ──► /
```

### URL parameter contract

```
None. Page reads no query params.
Data source: /data/student_events.json (build-time bundled via @/lib/events).
Weekly refresh: GitHub Actions workflow scrapes FAST Slate portal and commits to repo.
Vercel redeploy required for live site to reflect new events (no auto-redeploy webhook confirmed — see 11-OPEN-QUESTIONS).
```
