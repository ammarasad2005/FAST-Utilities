---
doc: 07-UI-BLUEPRINTS/04-timetable
generated: 2026-08-09T16:05:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# UI Blueprint — `/timetable` (Weekly Class Schedule)

**Page file:** `src/app/timetable/page.tsx:1-1637`
**Render mode:** `'use client'` (`src/app/timetable/page.tsx:1`)
**Layout:** Mounted inside root `src/app/layout.tsx`. Page wraps inner component in `<Suspense>` (`src/app/timetable/page.tsx:1629-1637`) because it uses `useSearchParams()`.

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

## Desktop (≥1024px) — Default State (regular semester, `?batch=2024&dept=CS&section=A`, viewMode='list')

`src/app/timetable/page.tsx:790-1380` renders the layout. Sticky `<Header>` (with back chevron + dept chip + Makeup Days button + ExportButton), desktop-only left `<aside>` (w-56 lg:w-64), main area with sticky search/view-toggle bar + day sections.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo]  ◁ [CS] Batch 2024 · Section A    📅 August Makeup Days                        ⤓ Export   🌓 │  ← Header (sticky)
├──────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR      │  ┌─ Sticky top-14 search bar ────────────────────────────────────────────────────────────────────┐ │
│ Semester     │  │ 🔍 [Search…]  [☰ List │ ⊞ Grid]   (mobile repeats here w/ Repeats toggle)                  │ │
│ Spring 2026  │  └────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│              │                                                                                                    │
│ Batch        │  ┌─ "TODAY" highlight ring (gradient border) ───────────────────────────────────────────────┐    │
│ 2024         │  │ TODAY (WEDNESDAY · 12 MAY)                                                          │    │
│              │  │ ┌─────────────┬─────────────┬─────────────┐                                         │    │
│ Department   │  │ │ ◉ TimetableCard │ ◉ TimetableCard │ ◉ TimetableCard │   (md:grid-cols-3)            │    │
│ CS           │  │ └─────────────┴─────────────┴─────────────┘                                         │    │
│              │  └────────────────────────────────────────────────────────────────────────────────────────────┘    │
│ Section      │                                                                                                    │
│ A            │  THURSDAY · 13 MAY                                                                                  │
│              │  ┌─────────────┬─────────────┬─────────────┐                                         │                    │
│ Found        │  │ ◉ Card      │ ◉ Card      │ ◉ Card      │                                         │                    │
│ 5 slots      │  └─────────────┴─────────────┴─────────────┘                                         │                    │
│              │                                                                                                    │
│ ────────     │  FRIDAY · 14 MAY                                                                                    │
│ View         │  ┌─────────────┬─────────────┐                                                     │                    │
│ [◉ List]     │  │ ◉ Card      │ ◉ Card      │                                                     │                    │
│ [◯ Grid]     │  └─────────────┴─────────────┘                                                     │                    │
│              │                                                                                                    │
│ Repeat Cours │                                                                                                    │
│ [Excluded ●] │                                                                                                    │
│              │                                                                                                    │
│ ────────     │                                                                                                    │
│ [Save Prefs] │                                                                                                    │
│ Change filter│                                                                                                    │
│ ⤓ Export     │                                                                                                    │
└──────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Grid view (`viewMode='grid'`, desktop) — `src/app/timetable/page.tsx:1480-1637`
```
Replaces ListView with a calendar-style time grid (min-w-[980px], horizontal scroll on small screens):
┌──────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Time │  MON    │  TUE    │ WED✦    │  THU    │  FRI    │  ← day headers, WED highlighted if today
├──────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ 08:00│         │ ┌─────┐ │         │         │ ┌─────┐ │
│      │         │ │CS101│ │         │         │ │EE201│ │
│ 09:30│         │ └─────┘ │         │         │ └─────┘ │
│ 11:00│ ┌─────┐ │         │ ┌─────┐ │         │         │
│      │ │AI301│ │         │ │DS201│ │         │         │
│ 12:30│ └─────┘ │         │ └─────┘ │         │         │
│ 14:00│         │         │         │         │ ┌─────┐ │
│      │         │         │         │         │ │CY401│ │
│ 15:30│         │ ┌─────┐ │         │         │ └─────┘ │
│      │         │ │SE101│ │         │         │         │
│ 17:00│         │ └─────┘ │         │         │         │
└──────┴─────────┴─────────┴─────────┴─────────┴─────────┘
✦ Conflict cards get red bg (#fef2f2); repeat courses get amber left border + striped pattern.
Each class cell is a <button onClick={() => onSelect(e)}>.
```

### Summer mode (`isSummer=true`)
```
- Header chip becomes "SUMMER" + subtitle shows semesterName (e.g., "Summer 2026")
- Sidebar replaces Batch/Department/Section with single "Semester: Summer 2026" row
- "Repeat Courses" toggle hidden (summer has no repeats)
- Save Preferences button hidden
- entries are fetched from GET /api/timetable on mount (src/app/timetable/page.tsx:333-345)
- summerDisplayName() resolves catalog aliases for course names
```

## Mobile (≤430px) — Default State (regular, viewMode='list')

`src/app/timetable/page.tsx:980-1050` shows the mobile-specific sticky bar (search + Repeats toggle + view-mode 2-icon toggle). Below: day sections with single-column stack (`flex flex-col`, becomes grid at md).

```
┌─────────────────────────────────────┐
│ [logo] ◁ [CS] Batch 24 · Sec A  ⤓ 🌓│  ← Header (sticky)
├─────────────────────────────────────┤
│ 🔍 [Search…]  [Repeats] [☰][⊞]      │  ← sticky top-14 (mobile-only Repeats + view-toggle)
├─────────────────────────────────────┤
│ [Save Prefs]  Saved!                │  ← mobile-only "Save Prefs" inline strip (md:hidden)
├─────────────────────────────────────┤
│ ┌─ TODAY ring ───────────────────┐  │
│ │ TODAY (WED · 12 MAY)           │  │
│ │ ┌──────────────────────────┐   │  │
│ │ │ ◉ TimetableCard          │   │  │  ← single column on mobile
│ │ └──────────────────────────┘   │  │
│ └────────────────────────────────┘  │
│ THURSDAY · 13 MAY                   │
│ ┌──────────────────────────┐        │
│ │ ◉ Card                   │        │
│ └──────────────────────────┘        │
└─────────────────────────────────────┘
                  ↑ FloatingMenu (mobile FAB)
```

## Key Interactive Elements (annotated)

| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Back chevron | `() => router.back()` | Browser back | `src/app/timetable/page.tsx:803-812` |
| "📅 {Month} Makeup Days" button | `() => setIsMakeupSidebarOpen(true)` | Opens `<MakeupDaysSidebar>` drawer | `src/app/timetable/page.tsx:832-838` |
| `<TimetableExportButton>` (header rightActions) | opens export menu | PNG/PDF/ICS export of `filtered` | `src/app/timetable/page.tsx:797`, `src/components/TimetableExportButton.tsx` |
| `<TimetableExportButton variant="sidebar">` | same | Same | `src/app/timetable/page.tsx:971` |
| `<SearchBar>` | `setQuery` | Free-text filter | `src/app/timetable/page.tsx:1019` |
| View toggle (sidebar) `[List] [Grid]` | `setViewMode(v)` | Switches between ListView / GridView | `src/app/timetable/page.tsx:901-913` |
| Mobile view toggle `☰` / `⊞` | `setViewMode(v)` | Same | `src/app/timetable/page.tsx:1051-1067` |
| Repeat Courses toggle (sidebar `role="switch"`) | `handleToggleRepeats(!includeRepeats)` | Toggles `includeRepeats`; if off, also clears all `repeat` manual sections | `src/app/timetable/page.tsx:920-932`, `727-743` |
| Mobile Repeats toggle | same | Same | `src/app/timetable/page.tsx:1030-1044` |
| Save Preferences button (sidebar + mobile) | `persistResultPreferences` | Writes `{sectionByCourse, removedCourseKeys}` to `fsc_timetable_results_preferences_v1[${batch}\|${dept}]`; sets `saveFeedback='Saved!'` | `src/app/timetable/page.tsx:946-949,1073-1080` |
| "Change filters/courses" link | `() => router.push('/')` | Soft-nav to landing | `src/app/timetable/page.tsx:960-964` |
| `<TimetableCard>` click | `() => onSelect(entry)` → `setSelected(entry)` | Opens `<TimetableDetail>` drawer | `src/app/timetable/page.tsx:1366-1369` |
| `<TimetableCard>` remove (×) button | `onRemove={() => removeCourseByKey(makeCourseKey(entry))}` (or `removeSummerCourse(entry.courseName)` in summer) | Removes course from `effectiveSectionByCourse` / adds to `removedCourseKeys`; updates `filtered` | `src/app/timetable/page.tsx:1361-1363` |
| `<TimetableCard>` section dropdown | `onChangeSection={(nextSection) => updateCourseSection(...)}` | Updates `manualSectionByCourse[key]` | `src/app/timetable/page.tsx:1364-1365` |
| GridView class cell `<button>` | `() => onSelect(e)` → `setSelected(e)` | Opens `<TimetableDetail>` drawer | `src/app/timetable/page.tsx:1602-1604` |
| Electives / Others expand button (batch 2022 only) | `setIsOtherCoursesExpanded(!isOtherCoursesExpanded)` | Toggles elective-groups panel | `src/app/timetable/page.tsx:1118-1133` |
| Elective section pill (batch 2022) | `toggleOtherCourse(item.courseKey, item.section)` | Adds/removes elective course to manual selections | `src/app/timetable/page.tsx:1157-1166` |
| Repeat prompt "Include Repeats" CTA | `handleEnableRepeatsFromPrompt()` | Enables repeats + restores selected repeat course | `src/app/timetable/page.tsx:780-789` |
| Repeat prompt "Cancel" | `setRepeatPromptCourse(null)` | Dismisses prompt | `src/app/timetable/page.tsx:1300-1305` |
| `<TimetableDetail onClose>` | `() => setSelected(null)` | Closes drawer | `src/app/timetable/page.tsx:1378-1385` |
| `<MakeupDaysSidebar onClose>` | `() => setIsMakeupSidebarOpen(false)` | Closes sidebar | `src/app/timetable/page.tsx:1388-1393` |
| Header logo | n/a | Soft-nav to `/` | `src/components/Header.tsx:20` |

## Conditional States

### `{isSummer === true}`
```
- See "Summer mode" callout above.
- Sidebar hides Batch/Department/Section rows + Save Preferences button + Repeat Courses toggle
- entries state comes from /api/timetable (fetched in useEffect, src/app/timetable/page.tsx:328-345)
```

### `{filtered.length === 0}` — EmptyState
```
Renders <EmptyState message={...} />.
Message variants:
  - If query present: 'No classes matching "${query}" for ${dept} Section ${section}, Batch ${batch}.'
  - If allEntries.length === 0: 'No timetable data yet. Run the Python script…'
  - Else: 'No timetable found for ${dept} Section ${section}, Batch ${batch}.'
Source: src/app/timetable/page.tsx:1321-1334.
```

### `{currentMonthMakeupDays.length > 0}` — Makeup Days button appears
```
"📅 {currentMonthName} Makeup Days" button appears in header next to subtitle (amber pill).
Clicking opens <MakeupDaysSidebar> drawer listing dated sheets that fall in the next 30 days but NOT current week.
Source: src/app/timetable/page.tsx:831-838.
```

### `{batch === '2022'}` — Electives / Others panel
```
A collapsible "Electives / Others" panel appears above the day-list (only for batch 2022).
Header: blue icon + "ELECTIVES / OTHERS" + count badge + chevron.
When expanded: 4-column grid (G-I / G-II / G-III / Others) showing elective courses with section pills.
Source: src/app/timetable/page.tsx:1099-1300.
```

### `{repeatPromptCourse !== null}` — Repeat prompt modal
```
Centered modal prompting user to enable Repeats:
  ┌─────────────────────────────────────┐
  │ This is a Repeat Course             │
  │ To see it in your timetable, please │
  │ enable the "Repeat Courses" toggle. │
  │                                     │
  │ [Include Repeats]  [Cancel]         │
  └─────────────────────────────────────┘
Triggered when user manually selects a repeat-course section while includeRepeats=false.
Source: src/app/timetable/page.tsx:1270-1309 (modal), 780-789 (handler).
```

### `{selected !== null}` — `<TimetableDetail>` drawer
```
Mobile: bottom sheet (drag handle, backdrop, escape)
Desktop: right-rail panel (md:w-96, anchored top-14)
Shows: full class details (course, time, room, teacher, day, section) + section picker
Source: src/components/TimetableDetail.tsx
```

### `{isMakeupSidebarOpen === true}` — `<MakeupDaysSidebar>` drawer
```
Mobile: bottom sheet
Desktop: right-rail panel
Lists upcoming dated makeup sheets (next 30 days, not current week)
Source: src/components/MakeupDaysSidebar.tsx
```

### `{saveFeedback}` — Save Preferences confirmation
```
Sidebar: small "Saved!" text appears below Save Preferences button for ~2s
Mobile: inline strip shows same text
Source: src/app/timetable/page.tsx:951-953, 1080-1082.
```

### Loading / Suspense
```
Suspense fallback (src/app/timetable/page.tsx:1629-1637):
  <div className="min-h-dvh flex items-center justify-center">
    <p>Loading…</p>
  </div>

Summer fetch in-flight (loadingSummer=true):
  - No loading skeleton; entries default to allEntries until /api/timetable returns
  - On fetch error, falls back to allEntries (line 341-345)
```

## Breakpoint Behavior

| Breakpoint | What changes | Source |
|------------|--------------|--------|
| `md:` (768px) | Desktop sidebar `<aside className="hidden md:flex md:w-56 lg:w-64">` appears. Day-list grid switches from `flex flex-col` to `md:grid md:grid-cols-2 lg:grid-cols-3`. Mobile-only inline "Save Preferences" strip hides (`md:hidden`). Mobile-only view-toggle icons hide (`md:hidden`). Sidebar view-toggle becomes visible. | `src/app/timetable/page.tsx:848,1046,1051,1073,204` (via ListView at line 1532) |
| `lg:` (1024px) | Sidebar widens `md:w-56 lg:w-64`. Grid columns go 2→3. | `src/app/timetable/page.tsx:848,204` |
| GridView min-width | `min-w-[980px]` triggers horizontal scroll on viewports <980px wide (including mobile landscape). | `src/app/timetable/page.tsx:1510` |
| `<TimetableDetail>` responsive | Mobile bottom sheet; desktop `md:top-14 md:right-0 md:w-96` right rail. | `src/components/TimetableDetail.tsx` |
| `<MakeupDaysSidebar>` responsive | Mobile bottom sheet; desktop right rail. | `src/components/MakeupDaysSidebar.tsx` |
| Header Makeup Days pill | `text-[10px] md:text-xs` — slightly larger on desktop. | `src/app/timetable/page.tsx:834` |

## Screenshot References

- Desktop default (list view): `[screenshot: desktop/04-timetable.png]`
- Mobile default: `[screenshot: mobile/04-timetable.png]`

## State Transitions

### URL → filter pipeline

```
Mount (?batch=2024&dept=CS&section=A):
  useEffect (src/app/timetable/page.tsx:305-350):
    ├─ localStorage 'fsc_semester_name' → setSemesterName
    ├─ async loadSemesterSettings() → supabase.from('semester_settings').select('semester_name').eq('id',1).single()
    ├─ localStorage 'fsc_active_semester' === 'summer'?
    │    └─ setIsSummer(true); setLoadingSummer(true)
    │       fetch('/api/timetable', {cache:'no-store'}) → setEntries + setSummerCatalog
    │       localStorage 'fsc_summer_courses' → setSummerSelections
    └─ else: setIsSummer(false); setEntries(allEntries)

Derived state:
  contextEntries    = entries.filter(e.batch=batch && isDepartmentMatch(e.department, dept))
  defaultEntries    = filterTimetable(entries, {batch, department: dept, section, query:'', includeRepeats})
  defaultSectionByCourse = map of courseKey → first matching section
  courseSectionsByKey = map of courseKey → set of all sections (for dropdown)
  effectiveSectionByCourse = useMemo merging default + manualSectionByCourse - removedCourseKeys
  filtered = summer? summerFiltered : filtered by query + includeRepeats + effectiveSectionByCourse
  grouped = groupByDayTimetable(filtered)
  reorderedGrouped = reorder: today first, then by isoDate / DAYS_ORDER index
  conflicts = detectConflicts(filtered, includeRepeats)
```

### Persistent preferences

```
preferenceScopeKey = `${batch}|${dept}` (e.g., "2024|CS")

On mount: localStorage['fsc_timetable_results_preferences_v1'] parsed →
  if scopeKey present: setManualSectionByCourse + setRemovedCourseKeys

On Save Preferences click:
  localStorage.setItem('fsc_timetable_results_preferences_v1', JSON.stringify({
    [scopeKey]: { sectionByCourse: manualSectionByCourse, removedCourseKeys }
  }))
  setSaveFeedback('Saved!') (auto-clears after timeout? No — remains until next save)
```

### Interaction state machine

```
Default (list view, no drawer)
  ├─ click class card ──setSelected(entry)──► <TimetableDetail> opens
  │                                            ├─ Escape / backdrop ──► setSelected(null)
  │                                            └─ close button ──► setSelected(null)
  ├─ click "Makeup Days" pill ──setIsMakeupSidebarOpen(true)──► <MakeupDaysSidebar> opens
  ├─ click Repeats toggle ──handleToggleRepeats(t)──► if t=false: clear all repeat keys from manualSectionByCourse
  ├─ try to select repeat course while Repeats=false ──setRepeatPromptCourse({key, section})──► modal
  │       ├─ click "Include Repeats" ──handleEnableRepeatsFromPrompt()──► enable repeats + add course
  │       └─ click "Cancel" ──setRepeatPromptCourse(null)──► dismiss
  ├─ click view toggle [List]/[Grid] ──setViewMode──► ListView / GridView swap
  ├─ type in search ──setQuery──► filtered re-computes
  ├─ click "Save Preferences" ──persistResultPreferences()──► localStorage write + saveFeedback="Saved!"
  ├─ click "Change filters" ──router.push('/')──► Landing
  ├─ click Export ──► <TimetableExportButton> modal (PNG/PDF/ICS)
  └─ click back chevron ──router.back()──► browser back (likely /home?feature=timetable)
```

### URL parameter contract

```
Required (regular): ?batch=2024&dept=CS&section=A
Required (summer):  ?batch=Summer  (dept+section ignored; uses fsc_summer_courses localStorage)
Optional:           (none)

If batch missing → empty filter → EmptyState
If dept missing → defaults to 'CS' (line 72)
If section missing → empty filter → EmptyState
```
