---
doc: 07-UI-BLUEPRINTS/07-custom
generated: 2026-08-09T16:05:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# UI Blueprint — `/custom` (Custom Exam Builder)

**Page file:** `src/app/custom/page.tsx:1-891`
**Render mode:** `'use client'` (`src/app/custom/page.tsx:1`)
**Layout:** Mounted inside root `src/app/layout.tsx`. Page wraps inner component in `<Suspense>` (`src/app/custom/page.tsx` outer wrapper).

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

## Desktop (≥1024px) — Default State (no rows built yet)

Two-column layout: LEFT `<aside>` (w-[350px] lg:w-[400px]) holds collapsible RowEditor list + Bundle management + Save/Build buttons; RIGHT (`flex-1`) holds the empty/preview area.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo]  ◁ Custom Exams                                                              ⤓ Export  🌓 │  ← Header (sticky)
├────────────────────────────────┬─────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR (desktop only)         │  Main list area                                                          │
│ ┌──────────────────────────┐   │                                                                          │
│ │ Your Courses     ▾       │   │  ┌── empty state ────────────────────────────────────────────────────┐  │
│ │ (expand to add courses) │   │  │   📋                                                                │  │
│ └──────────────────────────┘   │  │   Add your course rows above, then tap "Save & Find Exams"        │  │
│ ─                              │  │   to see your schedule.                                            │  │
│ SAVED SETS                     │  └────────────────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────┐       │                                                                          │
│ │ ◉ Bundle "Sem 6"     │       │                                                                          │
│ │   Load | Generate    │       │                                                                          │
│ └──────────────────────┘       │                                                                          │
│ ─                              │                                                                          │
│ {saved?} N exams found         │                                                                          │
│ [Find Exams] [Save Bundle]     │                                                                          │
│ {saved?} ⤓ Export              │                                                                          │
└────────────────────────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### "Your Courses" expanded (RowEditor list)
```
┌───────────────────────────────────────┐
│ Your Courses                  ▴       │
├───────────────────────────────────────┤
│ ┌─ RowEditor ───────────────────────┐ │
│ │ BATCH     DEPT     COURSE CODE    │ │
│ │ [2024 ▾]  [CS ▾]   [______]      │ │
│ │                [× Remove]         │ │
│ └───────────────────────────────────┘ │
│ ┌─ RowEditor ───────────────────────┐ │
│ │ BATCH     DEPT     COURSE CODE    │ │
│ │ [2024 ▾]  [EE ▾]   [______]      │ │
│ │                [× Remove]         │ │
│ └───────────────────────────────────┘ │
│ ┄┄┄ Add another course  ┄┄┄┄┄┄┄┄┄┄┄ │
└───────────────────────────────────────┘
```

### After "Find Exams" (`saved=true`) — main display
```
┌─ SearchBar (sticky top-14) ───────────────────────────┐
│ 🔍 [Search by course, date…]                          │
└────────────────────────────────────────────────────────┘

MONDAY, 12 MAY
┌─────────────┬─────────────┬─────────────┐
│ ◉ ExamCard  │ ◉ ExamCard  │ ◉ ExamCard  │   ← md:grid-cols-3
└─────────────┴─────────────┴─────────────┘

WEDNESDAY, 14 MAY
┌─────────────┬─────────────┐
│ ◉ ExamCard  │ ◉ ExamCard  │
└─────────────┴─────────────┘
```

## Mobile (≤430px) — Default State

```
┌─────────────────────────────────────┐
│ [logo] ◁ Custom Exams          🌓   │  ← Header (sticky)
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │  ← mobile-only collapsible
│ │ Your Courses               ▴    │ │     (border-b, px-4 py-4)
│ │ Tap to collapse                 │ │
│ ├─────────────────────────────────┤ │
│ │ [RowEditor]                     │ │
│ │ [RowEditor]                     │ │
│ │ ┄ Add another course ┄          │ │
│ │                                 │ │
│ │ [Find Exams] [Save Bundle]      │ │
│ ├─────────────────────────────────┤ │
│ │ SAVED SETS                  📥  │ │
│ │ ┌───────────────────────────┐   │ │
│ │ │ ◉ Bundle "Sem 6"          │   │ │
│ │ └───────────────────────────┘   │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│  📋                                  │
│  Add your course rows above, then   │
│  tap "Save & Find Exams"…           │
└─────────────────────────────────────┘
                  ↑ FloatingMenu (mobile FAB)
```

## Key Interactive Elements (annotated)

| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Back chevron | `() => router.push('/')` | Soft-nav to landing | `src/app/custom/page.tsx` (Header) |
| `<ExportButton>` (header rightActions) | opens export menu | PNG/PDF/ICS export of `filtered` (only when `saved=true`) | `src/components/ExportButton.tsx` |
| `<ExportButton variant="sidebar">` | same | Same | (sidebar footer) |
| "Your Courses" collapsible header (desktop + mobile) | `setIsDesktopClassesExpanded(prev => !prev)` / `setIsMobileClassesExpanded(...)` | Toggles RowEditor list visibility | (same pattern as /timetable/custom) |
| RowEditor batch `<select>` | `onUpdate` → `updateRow(row.id, patch)` | Updates row.batch; resets stream/code | `src/app/custom/page.tsx` |
| RowEditor dept `<select>` | `onUpdate` → `updateRow(row.id, patch)` | Updates row.stream | (RowEditor) |
| RowEditor course-code `<input>` | `onUpdate` → `updateRow(row.id, {code: val})` | Updates row.code (uppercased on filter) | (RowEditor) |
| RowEditor "× Remove" button | `onRemove` → `removeRow(row.id)` | Removes row from `rows` (min 1) | `src/app/custom/page.tsx` |
| "Add another course" button | `addRow` | Appends new blank row | `src/app/custom/page.tsx` |
| "Find Exams" / "Update View" button | `handleSave` | Validates rows; sets `saved=true`; computes `filtered` from `findExams` of all rows | `src/app/custom/page.tsx` |
| "Save Bundle" button | `() => setIsSaving(true)` | Opens Save Bundle dialog | `src/app/custom/page.tsx` |
| "Update {bundleName}" button (when `editingBundleId` set) | `handleUpdateBundle` | Updates existing bundle in `bundles` + localStorage `fsc_custom_exam_bundles` | `src/app/custom/page.tsx` |
| BundleCard "Load" button | `onLoad` → `loadBundle(bundle, false)` | Replaces `rows` with bundle's rows (no auto-find) | `src/app/custom/page.tsx` |
| BundleCard "Generate" button | `onGenerate` → `loadBundle(bundle, true)` | Replaces `rows` AND triggers `handleSave` (auto-finds) | `src/app/custom/page.tsx` |
| BundleCard rename confirm | `onRenameConfirm` → `handleRenameBundle(bundle.id, tempName)` | Renames bundle in `bundles` + localStorage | `src/app/custom/page.tsx` |
| BundleCard delete | `onDelete` → `handleDeleteBundle(e, bundle.id)` | Removes bundle from `bundles` + localStorage | `src/app/custom/page.tsx` |
| Save Bundle dialog "Save Bundle" button | `handleCreateBundle` | Creates new bundle with `newBundleName`; persists to localStorage; closes dialog | `src/app/custom/page.tsx` |
| Save Bundle dialog "Cancel" | `() => setIsSaving(false)` | Closes dialog | `src/app/custom/page.tsx` |
| Save Bundle dialog input Enter | `e.key === 'Enter' && handleCreateBundle()` | Same as Save click | `src/app/custom/page.tsx` |
| `<SearchBar>` | `setQuery` | Free-text filter (only when `saved=true`) | `src/components/SearchBar.tsx` |
| `<ExamCard>` click | `() => setSelected(exam)` | Opens `<ExamDetail>` drawer | `src/app/custom/page.tsx` |
| `<ExamDetail onClose>` | `() => setSelected(null)` | Closes the detail drawer | `src/app/custom/page.tsx` |
| Header logo | n/a | Soft-nav to `/` | `src/components/Header.tsx:20` |

## Conditional States

### `{!saved}` — Empty preview area
```
Centered placeholder:
   📋
   Add your course rows above, then tap "Save & Find Exams" to see your schedule.
```

### `{saved === true && filtered.length === 0}`
```
<EmptyState query={query} batch="" dept="CS" />
```

### `{anyError}` — Validation error
```
"Fill all highlighted fields first." text below RowEditor list.
Triggered when saved===false && any row has errorBatch/errorStream/errorCode.
```

### `{isSaving === true}` — Save Bundle dialog
```
Centered modal (z-50, backdrop blur):
  ┌──────────────────────────────────┐
  │ Save Course Bundle               │
  │ Give this set of courses a name  │
  │ like "Semester 6" or "Fall 26".  │
  │                                  │
  │ [e.g. My Schedule_____________]  │  ← autoFocus, Enter submits
  │                                  │
  │ [Cancel]      [Save Bundle]      │
  └──────────────────────────────────┘
```

### `{editingBundleId !== null}` — editing an existing bundle
```
"Save Bundle" button label changes to "Update '{bundleName}...'"
Clicking it calls handleUpdateBundle (updates in place instead of creating new).
```

### `{selected !== null}` — `<ExamDetail>` drawer
```
Mobile: bottom sheet (drag handle, backdrop, Escape handler)
Desktop: 96-wide right-side panel anchored below header (md:top-14 md:right-0 md:w-96)
Shows: full exam details (course, date, time, room, sections, school, batch)
Source: src/components/ExamDetail.tsx
```

### No summer mode logic
```
Unlike /timetable/custom, this page does NOT have explicit summer-mode branching.
It always uses regular_schedule.json (build-time bundled).
Even in summer mode, summer exam filtering happens via /schedule?batch=Summer, not here.
```

## Breakpoint Behavior

| Breakpoint | What changes | Source |
|------------|--------------|--------|
| `md:` (768px) | Desktop sidebar `<aside className="hidden md:flex md:w-[350px] lg:w-[400px]">` appears. Mobile-only collapsible "Your Courses" + Bundle card hides (`md:hidden`). SearchBar appears (only when `saved=true`). Exam-card grid switches from single-col stack to `md:grid md:grid-cols-2 lg:grid-cols-3`. | `src/app/custom/page.tsx` |
| `lg:` (1024px) | Sidebar widens `md:w-[350px] lg:w-[400px]`. Exam-card grid goes 2→3 columns. | `src/app/custom/page.tsx` |
| `sm:` (640px) | Button font sizes `text-[10px] sm:text-xs` adjust. | `src/app/custom/page.tsx` |
| `<ExamDetail>` responsive | Mobile bottom sheet; desktop right rail (`md:top-14 md:right-0 md:w-96`). | `src/components/ExamDetail.tsx` |
| Suspense wrapper | Wraps CustomPageInner in `<Suspense>` to satisfy Next.js 14 App Router. | `src/app/custom/page.tsx` |

## Screenshot References

- Desktop default (no preview state): `[screenshot: desktop/05-timetable-custom.png]` (companion UI; /custom has no dedicated desktop screenshot in the audit set)
- Mobile default: (no dedicated mobile screenshot — uses same pattern as `/timetable/custom`)

## State Transitions

### Lifecycle: mount → add rows → find exams → save bundle

```
Mount:
  useEffect:
    ├─ localStorage 'fsc_custom_exam_bundles' → setBundles
    ├─ localStorage 'fsc_semester_name' → setSemesterName
    ├─ async loadSemesterSettings() → supabase.from('semester_settings').select('semester_name').eq('id',1).single()
    └─ setIsLoaded(true)
  useEffect (persist):
    whenever bundles changes AND isLoaded:
      localStorage.setItem('fsc_custom_exam_bundles', JSON.stringify(bundles))
  useEffect (click-outside rename):
    if renamingId set, window click → setRenamingId(null)

User adds rows / picks batches+depts+codes / clicks "Find Exams":
  handleSave():
    ├─ validate each row (set errorBatch/errorStream/errorCode flags)
    ├─ if any error: setSaved(false); anyError=true; bail
    └─ else: setSaved(true) → triggers re-render with exam list

User clicks "Save Bundle":
  setIsSaving(true) → dialog opens
  On confirm:
    ├─ handleCreateBundle() / handleUpdateBundle()
    │   ├─ new bundle: bundles.push({id, name, rows}); editingBundleId = new bundle.id
    │   └─ update bundle: replace in-place
    └─ localStorage.setItem('fsc_custom_exam_bundles', JSON.stringify(bundles))

User clicks BundleCard "Load":
  loadBundle(bundle, false):
    ├─ setRows(bundle.rows.map(clone))
    ├─ setSaved(false)
    ├─ setEditingBundleId(bundle.id)
    └─ expand both mobile + desktop editor

User clicks BundleCard "Generate":
  loadBundle(bundle, true):
    ├─ setRows(bundle.rows.map(clone))
    ├─ setSaved(true)  ← auto-finds immediately
    ├─ setEditingBundleId(bundle.id)
    └─ collapse both mobile + desktop editor
```

### Interaction state machine

```
Empty (no rows, no preview)
  ├─ click "Your Courses" header ──setIsDesktopClassesExpanded(true)──► RowEditor list visible
  ├─ click "Add another course" ──addRow()──► new blank row appended
  ├─ click "Find Exams" ──handleSave()──► if valid: saved=true, filtered shown
  │                                       if invalid: anyError=true, errors highlighted
  ├─ click "Save Bundle" ──setIsSaving(true)──► Save Bundle dialog opens
  │       ├─ type name + Enter/click "Save Bundle" ──handleCreateBundle()──► bundle added, editingBundleId set
  │       └─ click "Cancel" ──setIsSaving(false)──► close dialog
  ├─ click BundleCard "Load" ──loadBundle(b, false)──► rows replaced, saved=false
  ├─ click BundleCard "Generate" ──loadBundle(b, true)──► rows replaced, saved=true (auto-find)
  ├─ click BundleCard rename ──setRenamingId(b.id)──► inline rename input
  │       └─ confirm ──handleRenameBundle(b.id, tempName)──► bundle.name updated + localStorage
  ├─ click BundleCard delete ──handleDeleteBundle──► bundle removed + localStorage
  ├─ click exam card ──setSelected(exam)──► <ExamDetail> drawer
  ├─ click Export ──► <ExportButton> modal (only when saved=true)
  └─ click back chevron ──router.push('/')──► Landing
```

### URL parameter contract

```
None. The page reads ONLY from localStorage:
  - fsc_custom_exam_bundles (persisted bundle library)
  - fsc_semester_name (for subtitle)
```

### Filter pipeline

```
allExams = require('../../../public/data/regular_schedule.json')  (build-time bundle)
availableBatches = unique batches from allExams (sorted reverse)

filtered = useMemo:
  rows.flatMap(findExams) → all matching ExamEntry[]
    .filter(by query: courseCode/date/time/room/etc.)
    .sort(sortByChronological)

grouped = groupByDay(filtered) → [{label: 'Monday, 12 May', entries: [...]}]
```
