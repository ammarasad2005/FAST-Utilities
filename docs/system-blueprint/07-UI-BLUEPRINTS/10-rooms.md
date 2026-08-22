---
doc: 07-UI-BLUEPRINTS/10-rooms
generated: 2026-08-09T16:05:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# UI Blueprint — `/rooms` (Free Rooms Finder)

**Page file:** `src/app/rooms/page.tsx:1-633`
**Render mode:** `'use client'` (`src/app/rooms/page.tsx:1`)
**Layout:** Mounted inside root `src/app/layout.tsx`. No Suspense wrapper (doesn't use `useSearchParams()`).

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

## Desktop (≥1024px) — Default State (viewMode=null, no results yet)

`src/app/rooms/page.tsx:432-633` renders the layout. Sticky `<Header>` (with back chevron + "Free Rooms Finder" label). Two-column body: LEFT `<aside>` (w-56 lg:w-64) with stats + how-it-works; RIGHT main area with hero + control card (Option A specific slot + Option B full calendar).

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo]  ◁ 📍 Free Rooms Finder                                                                                  🌓 │  ← Header (sticky)
├──────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR      │  Find a free room.                                                                                │
│              │  Real-time vacancy data for Spring 2026.                                                          │
│ FEATURE      │  Click any cell below to view a beautified list of available rooms.                              │
│ Room Finder  │                                                                                                   │
│              │  ╔══════════════════════════════════════════════════════════════════════════════════════════════╗ │
│ ROOMS TRACKED│  ║ Control Card                                                                                ║ │
│ 87           │  ║                                                                                              ║ │
│ unique rooms │  ║ OPTION A — SPECIFIC SLOT                                                                    ║ │
│              │  ║   Day            Time Slot                                                                  ║ │
│ HOW IT WORKS │  ║   [───── ▾]     [───── ▾]                                                                  ║ │
│ • Pick day & │  ║   [◉ Find Free Rooms →]                                                                     ║ │
│   slot, or   │  ║                                                                                              ║ │
│   click cell │  ║   ───────────── or ─────────────                                                            ║ │
│ • Green =    │  ║                                                                                              ║ │
│   100% free  │  ║ OPTION B — FULL WEEK CALENDAR                                                               ║ │
│ • Yellow =   │  ║   [Generate Full Calendar View]                                                             ║ │
│   30 min+    │  ╚══════════════════════════════════════════════════════════════════════════════════════════════╝ │
│   free       │                                                                                                   │
└──────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Specific-slot results (`viewMode='specific'`) — `src/app/rooms/page.tsx:120-270`
```
Below control card, the SpecificResults component renders:

────── Monday · 08:00–09:20 ──────

╔═══ Fully Vacant (12) ═══════════════════════════════════╗
║ ─ Academic Block                                         ║
║   [Room 101] [Room 102] [Room 103] [Room 104] …          ║  ← green RoomPills
║ ─ Library                                                ║
║   [Library 1st Floor]                                    ║
╚═════════════════════════════════════════════════════════╝

╔═══ Partially Vacant (5) ════════════════════════════════╗
║ ─ Academic Block                                         ║
║   [Room 201] [Room 202]                                  ║  ← yellow RoomPills
║ ─ Cafeteria                                              ║
║   [Cafeteria]                                            ║
╚═════════════════════════════════════════════════════════╝
```

### Calendar-grid view (`viewMode='calendar'`) — `src/app/rooms/page.tsx:272-432`
```
Below control card, the CalendarGrid component renders:

────── Full Week — Weekly Map ──────

┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Time    │  Mon    │  Tue    │  Wed    │  Thu    │  Fri    │  ← sticky thead
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ 08:00   │ [R101]  │ [R102]  │ [R103]  │ [R104]  │ [R105]  │  ← cell shows up to 4 green + 2 yellow
│         │ [R201]  │ [R202]  │ [R203]  │ [R204]  │ [R205]  │     "View all rooms →" hint if more
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ 09:30   │ [R101]  │ —       │ [R301]  │ [R302]  │ [R101]  │
│         │ …       │         │ …       │         │ …       │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ …       │ …       │ …       │ …       │ …       │ …       │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
Legend: ■ Fully vacant  ■ Partial free

Clicking any cell opens <RoomDetail> drawer with full room list for that day+slot.
```

### `<RoomDetail>` drawer open (desktop right-rail / mobile bottom sheet)
```
┌─────────────────────────────────────┐
│ ─── drag handle (mobile only) ───   │
│ Monday · 08:00–09:20       ✕        │
├─────────────────────────────────────┤
│ Fully Vacant (12)                  │
│ ─ Academic Block                   │
│   [Room 101] [Room 102] …          │
│ ─ Library                          │
│   [Library 1st Floor]              │
│                                    │
│ Partially Vacant (5)               │
│ ─ Academic Block                   │
│   [Room 201] [Room 202]            │
└─────────────────────────────────────┘
```

## Mobile (≤430px) — Default State

`src/app/rooms/page.tsx:432-633` mobile branch is the same DOM (no `md:hidden` split — only the `<aside>` is `hidden md:flex`). Single-column layout below sticky header.

```
┌─────────────────────────────────┐
│ [logo] ◁ Free Rooms Finder   🌓 │  ← Header (sticky)
├─────────────────────────────────┤
│ Find a free room.               │  ← hero blurb
│ Real-time vacancy data for      │
│ Spring 2026.                    │
│                                 │
│ ╔═══════════════════════════╗   │  ← control card (single col stack on mobile)
│ ║ OPTION A — SPECIFIC SLOT  ║   │
│ ║  Day           Time Slot  ║   │
│ ║  [───── ▾]    [───── ▾]   ║   │
│ ║  [Find Free Rooms →]      ║   │
│ ║                           ║   │
│ ║  ─────── or ───────       ║   │
│ ║                           ║   │
│ ║ OPTION B — FULL WEEK      ║   │
│ ║  [Generate Full Calendar] ║   │
│ ╚═══════════════════════════╝   │
├─────────────────────────────────┤
│ (results render below when      │
│  viewMode !== null)             │
└─────────────────────────────────┘
                  ↑ FloatingMenu (mobile FAB)
```

## Key Interactive Elements (annotated)

| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Back chevron | `() => router.push('/')` | Soft-nav to landing | `src/app/rooms/page.tsx:444-452` |
| Day `<select id=day-select>` | `e => handleDropdownChange('day', e.target.value)` | Sets `selectedDay`; resets `viewMode=null` | `src/app/rooms/page.tsx:540-549` |
| Time-slot `<select id=slot-select>` | `e => handleDropdownChange('slot', e.target.value)` | Sets `selectedSlot`; resets `viewMode=null` | `src/app/rooms/page.tsx:560-569` |
| "Find Free Rooms →" button | `handleFindRooms` | If selectedDay && selectedSlot: setViewMode('specific') | `src/app/rooms/page.tsx:525-527` |
| "Generate Full Calendar View" button | `() => setViewMode('calendar')` | Switches to calendar grid view | `src/app/rooms/page.tsx:582-588` |
| Calendar cell `<td onClick>` | `() => onSelect(cell)` → `setSelectedCell(cell)` | Opens `<RoomDetail>` drawer for that day+slot | `src/app/rooms/page.tsx:399-419` |
| `<RoomDetail onClose>` | `() => setSelectedCell(null)` | Closes drawer | `src/app/rooms/page.tsx:621` |
| Header logo | n/a | Soft-nav to `/` | `src/components/Header.tsx:20` |

## Conditional States

### `{viewMode === null}` — Default (no results yet)
```
Only the control card is visible. Hero blurb + Option A selectors + Option B calendar button.
No results rendered below.
```

### `{viewMode === 'specific'}` — SpecificResults shown
```
SpecificResults component renders below control card (src/app/rooms/page.tsx:120-270):
  - Header strip: "────── {Day} · {SlotLabel} ──────"
  - If no results: centered "∅ No rooms with at least 30 minutes free found for this slot."
  - Else: Fully Vacant card (green) + Partially Vacant card (yellow), each with rooms grouped by block
```

### `{viewMode === 'calendar'}` — CalendarGrid shown
```
CalendarGrid component renders below control card (src/app/rooms/page.tsx:272-432):
  - Header strip: "────── Full Week — Weekly Map ──────"
  - Horizontal-scrollable table (min-w-[980px])
  - 7 columns: Time + 6 day columns (Mon-Sat, skipping Sat if no Saturday data)
  - 7 rows: STANDARD_SLOTS (08:00, 09:30, 11:00, 12:30, 14:00, 15:30, 17:00)
  - Each cell shows up to 4 green RoomPills + up to 2 yellow RoomPills
  - "View all rooms →" hint if more
  - Click cell → opens <RoomDetail> drawer
```

### `{selectedCell !== null}` — `<RoomDetail>` drawer
```
Mobile: bottom sheet (drag handle via useMobileSwipe, backdrop, Escape handler)
Desktop: right-rail panel (md:w-96, anchored top-14 right-0)
Shows: day+slot header + Fully Vacant + Partially Vacant lists grouped by block
Source: src/app/rooms/page.tsx:619-622, useMobileSwipe hook.
```

### `{!canSearch}` — Find Free Rooms button disabled
```
Disabled until both selectedDay && selectedSlot are set.
Styled with bg-subtle + tertiary text + cursor-not-allowed.
Source: src/app/rooms/page.tsx:571-580.
```

### Empty results in SpecificResults
```
If fullyVacant.length === 0 && partiallyVacant.length === 0:
  Centered "∅ No rooms with at least 30 minutes free found for this slot."
Source: src/app/rooms/page.tsx:204-211.
```

### Saturday column conditional
```
ACTIVE_DAYS filters DAYS_OF_WEEK to skip Saturday if timetableRaw.__meta__.days doesn't include it.
Source: src/app/rooms/page.tsx:26-35.
```

## Breakpoint Behavior

| Breakpoint | What changes | Source |
|------------|--------------|--------|
| `md:` (768px) | Desktop sidebar `<aside className="hidden md:flex md:w-56 lg:w-64">` appears. Control card day/slot selectors switch from single-column stack to `sm:grid-cols-2` (still single col below 640px). | `src/app/rooms/page.tsx:484,528` |
| `lg:` (1024px) | Sidebar widens `md:w-56 lg:w-64`. | `src/app/rooms/page.tsx:484` |
| `sm:` (640px) | Day/Slot selectors switch from `grid-cols-1` to `sm:grid-cols-2`. | `src/app/rooms/page.tsx:528` |
| CalendarGrid table | `min-w-[980px]` triggers horizontal scroll on screens <980px wide (including mobile landscape). Sticky Time column + sticky thead. | `src/app/rooms/page.tsx:296` |
| `<RoomDetail>` responsive | Mobile bottom sheet (drag handle, swipe-to-close via useMobileSwipe); desktop right rail. | `src/hooks/useMobileSwipe.ts:1-258` |
| Hero blurb | `text-3xl md:text-4xl` — larger on desktop. | `src/app/rooms/page.tsx:514` |

## Screenshot References

- Desktop default (no results): `[screenshot: desktop/09-rooms.png]`
- Mobile default: `[screenshot: mobile/09-rooms.png]`

## State Transitions

### Lifecycle: mount → select slot → find rooms → view detail

```
Mount:
  useEffect (src/app/rooms/page.tsx:404-418):
    async loadSemesterSettings() → supabase.from('semester_settings').select('semester_name').eq('id',1).single()
    └─ setSemesterName(data.semester_name) + localStorage.setItem('fsc_semester_name', ...)

ROOM_CALENDAR = buildRoomCalendar(timetableRaw)   ← computed once at module load (line 24)
ACTIVE_DAYS = DAYS_OF_WEEK.filter(...)             ← Saturday conditional (line 26-35)

State: selectedDay, selectedSlot, viewMode (null | 'specific' | 'calendar'), selectedCell (CalendarCell | null)

User selects day + slot:
  handleDropdownChange(type, value):
    if type === 'day' → setSelectedDay(value)
    else → setSelectedSlot(value)
    setViewMode(null)   ← reset prior results on any change

User clicks "Find Free Rooms →":
  handleFindRooms():
    if (selectedDay && selectedSlot) setViewMode('specific')

User clicks "Generate Full Calendar View":
  setViewMode('calendar')

User clicks a calendar cell:
  onSelect(cell) → setSelectedCell(cell) → opens <RoomDetail> drawer

User clicks <RoomDetail> close / backdrop / Escape:
  setSelectedCell(null) → drawer closes
```

### Interaction state machine

```
Default (viewMode=null, no selections)
  ├─ select day ──handleDropdownChange('day', val)──► selectedDay set; viewMode=null
  ├─ select slot ──handleDropdownChange('slot', val)──► selectedSlot set; viewMode=null
  ├─ click "Find Free Rooms" (disabled if !canSearch) ──handleFindRooms──► viewMode='specific' → SpecificResults
  ├─ click "Generate Full Calendar" ──setViewMode('calendar')──► viewMode='calendar' → CalendarGrid
  ├─ click calendar cell ──setSelectedCell──► <RoomDetail> drawer opens
  │       ├─ Escape / backdrop / swipe down ──► setSelectedCell(null)
  │       └─ close button ──► setSelectedCell(null)
  ├─ change day or slot while results visible ──handleDropdownChange──► viewMode=null (results cleared)
  ├─ click back chevron ──router.push('/')──► Landing
  └─ click header logo ──router.push('/')──► Landing
```

### Room availability logic (delegated to `@/lib/room-logic`)

```
buildRoomCalendar(timetableRaw):
  For each room (extracted from all entries' room field):
    For each day in DAYS_OF_WEEK:
      For each STANDARD_SLOT (80-min block):
        Compute how many minutes the room is free during that slot.
        If fully free → add to fullyVacant list for that day+slot
        If ≥30 min free → add to partiallyVacant list for that day+slot

buildFullCalendar(ROOM_CALENDAR):
  Returns CalendarCell[][] indexed [dayIdx][slotIdx]
  Each cell has: { day, slot, fullyVacant: string[], partiallyVacant: string[] }

groupRoomsByBlock(rooms):
  Partitions a room list into blocks (Academic Block, Library, Cafeteria, Sports Area, Parking)
  using locationZoneMap (src/app/rooms/page.tsx:166-184)
```
