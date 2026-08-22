---
doc: 07-UI-BLUEPRINTS/06-timetable-optimizer
generated: 2026-08-09T16:05:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# UI Blueprint — `/timetable/optimizer` (CSP Timetable Optimizer)

**Page files:**
- `src/app/timetable/optimizer/page.tsx:1-47` (thin shell wrapper)
- `src/components/TimetableOptimizer.tsx:1-1107` (the actual optimizer UI + CSP backtracking solver)

**Render mode:** `'use client'` (`src/app/timetable/optimizer/page.tsx:1`)
**Layout:** Mounted inside root `src/app/layout.tsx`. Page wraps inner component in `<Suspense>` (`src/app/timetable/optimizer/page.tsx:37-46`).

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

## Desktop (≥1024px) — Default State (inputMode='custom', no results yet)

`src/app/timetable/optimizer/page.tsx:30-32` wraps `<TimetableOptimizer />` in a `max-w-5xl` container with `px-4 md:px-8 py-8 md:py-10 pb-[200px]`.

`src/components/TimetableOptimizer.tsx:543-1107` renders the actual UI:
- H2 title "Advanced Timetable Optimizer"
- Two-column flex-row (lg:flex-row) Optimization Goal + Section Constraints (line 555-744)
- Centered Input Mode toggle (Custom / Default)
- Course input area (custom mode: RowEditor list; default mode: Batch/Dept/Proceed)
- "Find the Best Schedules" CTA button (line 763-782)
- Optional Default Courses Verification Drawer
- Results display (top 15 ranked options)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo]  ◁ Timetable Optimifier                                                          🌓 │  ← Header (sticky)
├──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                          │
│  Advanced Timetable Optimizer                                                                            │
│  Configure the exact batch, department, and type for every course you plan to take. (5-Day Week Mode).  │
│                                                                                                          │
│  ┌─ Optimization Goal (flex-1) ──────────────┬─ Section Constraints (flex-1) ───────────────────────┐  │
│  │ ⊙ Maximize Off-Days                        │ ☐ I want to lock in preferred sections manually    │  │
│  │   Crams classes into fewest days possible. │                                                     │  │
│  │                                            │                                                     │  │
│  │ ⊙ Balanced (Recommended)                   │                                                     │  │
│  │   Maximizes off-days, gracefully accepts   │                                                     │  │
│  │   an extra campus day…                     │                                                     │  │
│  │                                            │                                                     │  │
│  │ ⊙ Minimize Workload                        │                                                     │  │
│  │   Absolute priority on balanced days…      │                                                     │  │
│  │                                            │                                                     │  │
│  │ ⊙ Custom Weights                           │                                                     │  │
│  │   Tune exactly how much you care…          │                                                     │  │
│  │   (sliders: early/late/midday/gaps/etc.)   │                                                     │  │
│  └────────────────────────────────────────────┴─────────────────────────────────────────────────────┘  │
│                                                                                                          │
│           [◉ Custom Courses]  [◯ Default Courses]                                                       │
│                                                                                                          │
│  ┌─ RowEditor (Year | Dept | Type | Course | Lock Sec | Remove) ────────────────────────────────────┐  │
│  │ [2024 ▾] [CS ▾] [regular ▾] [─ Select Course ─ ▾]  [Optimize Any ▾]  [Remove]                   │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌─ RowEditor ─────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ [2024 ▾] [CS ▾] [repeat ▾]   [─ Select Course ─ ▾]  [Optimize Any ▾]  [Remove]                  │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│   + Add Another Course                                                                                   │
│                                                                                                          │
│  ╔══════════════════════════════════════════════════════════════════════════════════════════════╗      │
│  ║                       ◉ Find the Best Schedules                                              ║      │
│  ╚══════════════════════════════════════════════════════════════════════════════════════════════╝      │
│                                                                                                          │
│  ── (no results yet) ──                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Results section (`result !== null`) — `src/components/TimetableOptimizer.tsx:985-1107`
```
Top Schedules (Balanced)
Found {N} valid combinations. Showing top 15.

╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
║ Rank #1   Fit Score: 100%                                                                        ║  ← isAbsoluteBest
║           Comfort: 95% · 3 Off-Days                                                              ║     (gradient border)
║           🕌 Midday Break Secured  🧠 Focus Maintained                              [Preview →] ║
║                                                                                                  ║
║   ┌──────────────────┬──────────────────┬──────────────────┐                                       ║
║   │ Course A   Sec B │ Course B   Sec A │ Course C   Sec C │  ← 3-col grid of schedule items      ║
║   └──────────────────┴──────────────────┴──────────────────┘                                       ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Rank #2   Fit Score: 92%                                                                         │
│           Comfort: 78% · 2 Off-Days                                                              │
│           ⚠️ Missed Midday Break (1x)  ⚠️ Morning Fatigue                            [Preview →] │
│   ┌──────────┬──────────┬──────────┐                                                             │
│   │ Course A │ Course B │ Course C │                                                             │
│   └──────────┴──────────┴──────────┘                                                             │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
… (up to 15 ranked options)
```

### Default Courses Verification Drawer (`isDefaultDrawerOpen=true`) — `src/components/TimetableOptimizer.tsx:879-963`
```
Desktop: right-rail panel (md:w-96, md:mt-14, md:h-[calc(100dvh-56px)])
Mobile: bottom sheet (h-[60dvh], drag handle, slide-in-from-bottom-4)

┌─────────────────────────────────────┐
│ Verify Courses              ✕       │
│ Uncheck courses you aren't taking   │
├─────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ │  ← grid-cols auto-fit minmax(140px,1fr)
│ │ ☑ Course│ │ ☑ Course│ │ ☑ Course│ │
│ │   A     │ │   B     │ │   C     │ │
│ │ regular │ │ regular │ │ repeat  │ │
│ └─────────┘ └─────────┘ └─────────┘ │
│ …                                   │
├─────────────────────────────────────┤
│      [   Verify & Continue    ]     │
└─────────────────────────────────────┘
```

## Mobile (≤430px) — Default State

Same DOM, but flex-col on the Optimization Goal/Section Constraints row (`flex-col lg:flex-row`). Course rows stack vertically (`flex-wrap lg:flex-nowrap`). Verification drawer becomes bottom sheet.

```
┌─────────────────────────────────┐
│ [logo] ◁ Timetable Optimizer  🌓│  ← Header (sticky)
├─────────────────────────────────┤
│ Advanced Timetable Optimizer    │
│ Configure the exact batch…      │
│                                 │
│ Optimization Goal               │
│ ⊙ Maximize Off-Days             │
│ ⊙ Balanced (Recommended)        │
│ ⊙ Minimize Workload             │
│ ⊙ Custom Weights                │
│                                 │
│ Section Constraints             │
│ ☐ Lock in preferred sections    │
│                                 │
│ [◉ Custom] [◯ Default]          │
│                                 │
│ ┌─ RowEditor ─────────────────┐ │  ← wraps; fields stack
│ │ [2024 ▾]                    │ │
│ │ [CS ▾]                      │ │
│ │ [regular ▾]                 │ │
│ │ [─ Select Course ── ▾]      │ │
│ │ [Remove]                    │ │
│ └─────────────────────────────┘ │
│  + Add Another Course           │
│                                 │
│ ╔═══════════════════════════╗   │
│ ║ ◉ Find the Best Schedules ║   │
│ ╚═══════════════════════════╝   │
└─────────────────────────────────┘
                  ↑ FloatingMenu (mobile FAB)
```

## Key Interactive Elements (annotated)

| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Back chevron (page header) | `() => router.push('/')` | Soft-nav to landing | `src/app/timetable/optimizer/page.tsx:15-23` |
| "Maximize Off-Days" radio | `() => { setOptimizationMode('max_off_days'); setResult(null); }` | Sets scoring strategy; clears prior results | `src/components/TimetableOptimizer.tsx:601-607` |
| "Balanced (Recommended)" radio | `() => { setOptimizationMode('balanced'); setResult(null); }` | Same | `src/components/TimetableOptimizer.tsx:620-626` |
| "Minimize Workload" radio | `() => { setOptimizationMode('min_workload'); setResult(null); }` | Same | `src/components/TimetableOptimizer.tsx:639-645` |
| "Custom Weights" radio | `() => { setOptimizationMode('custom'); setResult(null); }` | Same; also reveals 6 weight sliders | `src/components/TimetableOptimizer.tsx:662-668` |
| Custom weight slider (6 of them) | `() => handleWeightChange(key, parseInt(value, 10))` | Updates `customWeights[key]` (0-100) | `src/components/TimetableOptimizer.tsx:683-697` |
| "Lock in preferred sections" checkbox | `e => { setHasPreferences(e.target.checked); setResult(null); }` | Toggles per-row Section Lock dropdown visibility | `src/components/TimetableOptimizer.tsx:735-741` |
| Input Mode toggle [Custom / Default] | `() => { setInputMode(mode); setResult(null); }` | Switches course input area | `src/components/TimetableOptimizer.tsx:755-765` |
| RowEditor Year `<select>` | `e => updateRowField(idx, 'year', value)` | Updates row.year + resets dept/type/course | `src/components/TimetableOptimizer.tsx:769` |
| RowEditor Dept `<select>` (regular only) | `e => updateRowField(idx, 'dept', value)` | Updates row.dept + resets type/course | `src/components/TimetableOptimizer.tsx:783` |
| RowEditor Type `<select>` (regular only) | `e => updateRowField(idx, 'type', value)` | Updates row.type + resets course | `src/components/TimetableOptimizer.tsx:795` |
| RowEditor Course `<select>` | `e => updateRowField(idx, 'course', value)` | Updates row.course + resets preferredSection | `src/components/TimetableOptimizer.tsx:807` |
| RowEditor "Lock Section" `<select>` (when hasPreferences) | `e => updateRowField(idx, 'preferredSection', value)` | Locks row to a specific section | `src/components/TimetableOptimizer.tsx:821-828` |
| RowEditor "Remove" button | `() => removeCourse(idx)` | Removes row; if last row, replaces with default | `src/components/TimetableOptimizer.tsx:837-842` |
| "Add Another Course" link | `addCourse` | Appends new row cloning last row's batch/dept/type | `src/components/TimetableOptimizer.tsx:216-219,847-854` |
| Default mode Batch `<select>` | `e => setDefaultBatch(val) + reset selections` | Updates defaultBatch + clears verified courses | `src/components/TimetableOptimizer.tsx:874-887` |
| Default mode Dept `<select>` | `e => setDefaultDept(val) + reset` | Updates defaultDept + clears verified courses | `src/components/TimetableOptimizer.tsx:898-908` |
| Default mode "Proceed" button | `handleProceed` | Loads course list for batch+dept; opens verification drawer | `src/components/TimetableOptimizer.tsx:208-213,918-923` |
| Verification drawer course checkbox | `e => { toggle selected; setDefaultCourseSelections(newArr) }` | Toggles course inclusion | `src/components/TimetableOptimizer.tsx:940-947` |
| Verification drawer "Verify & Continue" button | `() => { setDefaultCoursesVerified(true); setIsDefaultDrawerOpen(false); }` | Closes drawer; enables "Find Best Schedules" | `src/components/TimetableOptimizer.tsx:955-961` |
| Verification drawer close ✕ | `verifyCloseDrawer()` (from useMobileSwipe) | Closes drawer; swipe-down on mobile | `src/components/TimetableOptimizer.tsx:931` |
| "Find the Best Schedules" / "Verify Courses to Proceed" CTA | `handleOptimize` | Runs CSP backtracking; sets `result` or `error` | `src/components/TimetableOptimizer.tsx:411-541,763-782` |
| Per-result "Preview Timetable" `<a href="/timetable/custom">` | `() => handlePreview(option.schedule)` | Writes `fsc_timetable_preview` to localStorage; opens `/timetable/custom` in new tab | `src/components/TimetableOptimizer.tsx:132-152,1057-1066` |
| Header logo | n/a | Soft-nav to `/` | `src/components/Header.tsx:20` |

## Conditional States

### `{inputMode === 'default'}`
```
- Course row list hidden
- Single batch + dept selector + "Proceed" button shown
- handleProceed() loads defaultCourseSelections + opens verification drawer
- CTA label = "Verify Courses to Proceed" (disabled) until defaultCoursesVerified=true
- CTA label changes to "Find the Best Schedules" after verification
Source: src/components/TimetableOptimizer.tsx:858-926.
```

### `{isSummer === true}`
```
- RowEditor hides Dept and Type selectors (only Year shown — defaults to 'Summer')
- Default-mode Dept selector hidden
- timetable data fetched from GET /api/timetable on mount (src/components/TimetableOptimizer.tsx:91-109)
- Triggered by localStorage 'fsc_active_semester' === 'summer'
```

### `{optimizationMode === 'custom'}` — Custom Weights sliders panel
```
Reveals 6 sliders (each 0-100):
  - Avoid Early Mornings (8:30 AM)
  - Avoid Late Afternoons (4:00 PM+)
  - Secure Midday Break
  - Minimize Unproductive Gaps
  - Avoid Fatigue (Back-to-Back)
  - Maximize Off-Days
Source: src/components/TimetableOptimizer.tsx:670-697.
```

### `{hasPreferences === true}` — Lock Section column appears in RowEditor
```
Each row gets an extra <select> labelled "Lock Section" (amber accent-ee styling).
Options: "Optimize Any" + all available sections for the selected course.
When locked, the CSP backtracking only tries that section for that course.
Source: src/components/TimetableOptimizer.tsx:817-834.
```

### `{isDefaultDrawerOpen === true}` — Verification drawer
```
Desktop: right-rail panel (md:w-96)
Mobile:  bottom sheet (h-[60dvh], drag handle via useMobileSwipe)
Shows: grid of all regular courses for selected batch+dept with checkboxes
Footer: "Verify & Continue" button → setDefaultCoursesVerified(true); close drawer
Source: src/components/TimetableOptimizer.tsx:879-963.
```

### `{error !== ''}` — Error banner
```
Red banner (red-500/10 bg, red-600 text) above results:
  ⚠️ {error message}
Common errors:
  - 'Please verify the course list before optimizing.'
  - 'Please select at least one course or a valid default batch/department.'
  - 'You have duplicate courses selected. Please remove them.'
  - "Data for '{course}' is missing."
  - 'No clash-free timetable exists within the 5-day workweek. Check your locked sections or selected courses.'
Source: src/components/TimetableOptimizer.tsx:969-974.
```

### `{result !== null}` — Results display
```
"Top Schedules ({mode label})" header + "Found {N} valid combinations. Showing top 15."
Up to 15 ranked option cards, each showing:
  - Rank #N badge (rank 1 highlighted with mode-color gradient border)
  - Fit Score: X%  (calibrated 60-100% scale)
  - Comfort: X%  (color: emerald >=90, amber >=70, rose <70)
  - {N} Off-Days
  - Midday Break badge (🕌 Secured or ⚠️ Missed (Nx))
  - Attention Span badge (🧠 Focus Maintained / ⚠️ Morning Fatigue / ⚠️ Afternoon Drain)
  - "Preview Timetable" link button → /timetable/custom (with fsc_timetable_preview localStorage handoff)
  - 3-col grid of all courses in the schedule with their assigned sections (locked sections show 🔒)
Source: src/components/TimetableOptimizer.tsx:976-1107.
```

### Suspense fallback
```
<div className="min-h-dvh flex items-center justify-center">
  <p>Loading…</p>
</div>
Source: src/app/timetable/optimizer/page.tsx:38-43.
```

## Breakpoint Behavior

| Breakpoint | What changes | Source |
|------------|--------------|--------|
| `md:` (768px) | Verification drawer switches from mobile bottom-sheet (`h-[60dvh]`, drag handle visible) to desktop right-rail (`md:w-96`, `md:mt-14`, `md:h-[calc(100dvh-56px)]`, `md:slide-in-from-right-4`). Drawer animation changes from slide-in-from-bottom to slide-in-from-right. | `src/components/TimetableOptimizer.tsx:884-890` |
| `lg:` (1024px) | Optimization Goal + Section Constraints row switches from `flex-col` to `lg:flex-row`. Vertical divider (`w-px bg-[var(--color-border)] hidden lg:block`) appears between columns. RowEditor row switches from `flex-wrap` to `lg:flex-nowrap` (single-line layout). | `src/components/TimetableOptimizer.tsx:555,753` |
| `xl:` (1280px) | Schedule items grid switches to `xl:grid-cols-3` (3 columns at top size; 2 at md, 1 at mobile). | `src/components/TimetableOptimizer.tsx:1069` |
| `useMobileSwipe` hook | Bottom-sheet drawer pattern with drag-to-close, body scroll lock, Escape key, backdrop tap. | `src/hooks/useMobileSwipe.ts:1-258` |

## Screenshot References

- Desktop default (custom mode, no results): `[screenshot: desktop/06-timetable-optimizer.png]`
- Mobile default: `[screenshot: mobile/06-timetable-optimizer.png]`

## State Transitions

### Lifecycle: mount → configure → optimize → preview handoff

```
Mount (src/components/TimetableOptimizer.tsx:91-172):
  ├─ localStorage 'fsc_active_semester' === 'summer' → setIsSummer(true)
  │    + fetch('/api/timetable', {cache:'no-store'}) → setDynamicTimetableData(nested) + setSummerCatalog
  └─ useEffect: if availableYears.length > 0, set defaults:
       setDefaultBatch(availableYears[0])
       setDefaultDept(first dept of that year)
       setSelectedCourses([{year, dept, type, course:'', preferredSection:''}])

User configures optimization mode + courses:
  ├─ click radio → setOptimizationMode + setResult(null)  (clears prior results)
  ├─ toggle hasPreferences → setHasPreferences + setResult(null)
  ├─ click input mode toggle → setInputMode + setResult(null)
  ├─ add/remove rows → setSelectedCourses
  ├─ per-row field change → updateRowField (resets downstream fields) + setResult(null)
  └─ (default mode) click "Proceed" → handleProceed:
       loadDefaultCoursesForVerification(batch, dept)   ← populates defaultCourseSelections
       setIsDefaultDrawerOpen(true)

User clicks "Find the Best Schedules" (handleOptimize):
  ├─ setError(''); setResult(null)
  ├─ gather coursesToOptimize (custom: from selectedCourses; default: from defaultCourseSelections)
  ├─ validate: coursesToOptimize.length > 0, no duplicates, all have data
  ├─ if invalid: setError(msg); return
  ├─ run backtrack() CSP solver:
  │    for each course, try every section; check isClash(currentSlots, newSlots)
  │    if no clash, push to currentSchedule + recurse
  │    at leaf: calculateWorkloadMetrics + customScore
  │    push to allValidSchedules
  ├─ if allValidSchedules empty: setError('No clash-free timetable exists…')
  └─ else:
       calculate penalty per mode (max_off_days / balanced / min_workload / custom)
       sort by penalty ascending
       compute fitScore = 100 - (penalty - minPenalty)/range * 40   (scales 60-100%)
       setResult({totalFound: allValidSchedules.length, options: top 15})

User clicks "Preview Timetable" on a ranked option:
  handlePreview(option.schedule):
    ├─ map each ScheduleItem to CourseRow-shaped object:
    │    {id: crypto.randomUUID(), batch, stream, category, selection: `${course} | ${section}`, errors: false}
    ├─ localStorage.setItem('fsc_timetable_preview', JSON.stringify(previewRows))
    └─ <a href="/timetable/custom" target="_blank"> opens new tab
       → /timetable/custom mounts, reads fsc_timetable_preview, auto-builds view
```

### Interaction state machine

```
Empty (no results, custom mode)
  ├─ click mode radio ──setOptimizationMode──► mode updated; result cleared
  ├─ toggle hasPreferences ──setHasPreferences──► Lock Section column appears/disappears
  ├─ switch to default mode ──setInputMode('default')──► course list hidden, batch/dept/Proceed shown
  │     └─ click "Proceed" ──handleProceed──► verification drawer opens
  │           ├─ toggle course checkboxes ──setDefaultCourseSelections──► drawer updates
  │           ├─ click "Verify & Continue" ──setDefaultCoursesVerified(true) + close drawer
  │           └─ click ✕ / swipe down / tap backdrop ──verifyCloseDrawer()──► drawer closes (not verified)
  ├─ add row ──addCourse()──► new row appended
  ├─ remove row ──removeCourse(idx)──► row removed (or replaced with default if last)
  ├─ change row field ──updateRowField──► row + downstream fields updated
  ├─ click "Find the Best Schedules" ──handleOptimize──► if valid: result={options}; if invalid: error banner
  │       └─ result.options.map(...) ──► ranked option cards render
  ├─ click "Preview Timetable" on option ──handlePreview──► localStorage write + open /timetable/custom in new tab
  ├─ click back chevron ──router.push('/')──► Landing
  └─ click header logo ──router.push('/')──► Landing
```

### CSP solver algorithm (high-level)

```
backtrack(courseIdx, currentSchedule, currentSlots):
  if courseIdx === coursesToOptimize.length:
    metrics = calculateWorkloadMetrics(currentSlots)
    push {activeDays, maxOffDays, workloadScore, comfortScore, ...customScore, schedule: [...currentSchedule]}
    return
  currentItem = coursesToOptimize[courseIdx]
  for each section in currentItem's available sections:
    if hasPreferences && currentItem.preferredSection && section !== preferredSection: skip
    newSlots = []
    for each (day, class) in section:
      parse time; newSlots.push({day, start, end})
    if !isClash(currentSlots, newSlots):
      push to currentSchedule (with isLocked flag)
      backtrack(courseIdx + 1, currentSchedule, [...currentSlots, ...newSlots])
      pop from currentSchedule

Penalty scoring per mode (line 510-535):
  max_off_days:    penalty = activeDays * 10000 + workloadScore
  min_workload:    penalty = workloadScore * 100 + activeDays
  balanced:        penalty = workloadScore + activeDays * 250
  custom:          penalty = customScore (weighted sum of metrics)

Fit score: 60-100% scale (line 530-535):
  if penaltyRange === 0: fitScore = 100
  else: fitScore = round(100 - (penalty - minPenalty) / penaltyRange * 40)
```
