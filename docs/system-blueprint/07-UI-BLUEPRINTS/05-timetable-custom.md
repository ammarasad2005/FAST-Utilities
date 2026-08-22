---
doc: 07-UI-BLUEPRINTS/05-timetable-custom
generated: 2026-08-09T16:05:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# UI Blueprint — `/timetable/custom` (Custom Timetable Builder)

**Page file:** `src/app/timetable/custom/page.tsx:1-1520`
**Render mode:** `'use client'` (`src/app/timetable/custom/page.tsx:1`)
**Layout:** Mounted inside root `src/app/layout.tsx`. Page is NOT wrapped in Suspense (does not call `useSearchParams()` directly — receives preview via localStorage `fsc_timetable_preview`).

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

## Desktop (≥1024px) — Default State (no preview loaded, no rows built yet)

`src/app/timetable/custom/page.tsx:578-1520` renders the layout. Two-column: LEFT `<aside>` (w-[350px] lg:w-[400px]) holds collapsible RowEditor list + Bundle management + Save/Build buttons; RIGHT (`flex-1`) holds the preview display area (SearchBar + ListView or GridView).

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo]  ◁ Custom Timetable    📅 August Makeup Days                                  ⤓ Export  🌓 │  ← Header (sticky)
├────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR (desktop only)         │  Main display area                                                                │
│ ┌──────────────────────────┐   │                                                                                   │
│ │ Your Classes     ▾       │   │  ┌── empty state ──────────────────────────────────────────────────────────────┐ │
│ │ (expand to add courses) │   │  │                                                                                │ │
│ └──────────────────────────┘   │  │   📋                                                                           │ │
│ ─                              │  │   Add your class selections, then tap "Build Timetable"                       │ │
│ SAVED SETS                     │  │   to generate your schedule. You can also "Save as Bundle" to keep this       │ │
│ ┌──────────────────────┐       │  │   set for later.                                                              │ │
│ │ ◉ Bundle "Sem 6"     │       │  │                                                                                │ │
│ │   Load | Generate    │       │  └────────────────────────────────────────────────────────────────────────────────┘ │
│ └──────────────────────┘       │                                                                                   │
│ ┌──────────────────────┐       │  (Once "Build Timetable" clicked, this area shows the day-grouped ListView)      │
│ │ ◉ Bundle "Repeat Set"│       │                                                                                   │
│ └──────────────────────┘       │                                                                                   │
│ ─                              │                                                                                   │
│ {saved?} 5 slots found         │                                                                                   │
│ [Build Timetable] [Save Bundle]│                                                                                   │
└────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────┘
```

### "Your Classes" expanded (RowEditor list)
```
┌───────────────────────────────────────┐
│ Your Classes                  ▴       │
├───────────────────────────────────────┤
│ ┌─ RowEditor ───────────────────────┐ │
│ │ BATCH     DEPT     TYPE           │ │
│ │ [2024 ▾]  [CS ▾]   [regular ▾]    │ │
│ │ COURSE: [─ Select Course ─ ▾]     │ │
│ │                [× Remove]         │ │
│ └───────────────────────────────────┘ │
│ ┌─ RowEditor ───────────────────────┐ │
│ │ BATCH     DEPT     TYPE           │ │
│ │ [2024 ▾]  [CS ▾]   [repeat ▾]     │ │
│ │ COURSE: [─ Select Course ─ ▾]     │ │
│ │                [× Remove]         │ │
│ └───────────────────────────────────┘ │
│ ┄┄┄ Add another course  ┄┄┄┄┄┄┄┄┄┄┄ │
└───────────────────────────────────────┘
```

### After "Build Timetable" (`saved=true`) — main display
```
┌─ SearchBar (sticky top-14) ───────────────────────────┐
│ 🔍 [Search…]                            [☰][⊞] (mobile)│
└────────────────────────────────────────────────────────┘

TODAY (WED · 12 MAY)
┌─────────────┬─────────────┬─────────────┐
│ ◉ Card      │ ◉ Card      │ ◉ Card      │   ← md:grid-cols-3
└─────────────┴─────────────┴─────────────┘

THURSDAY · 13 MAY
┌─────────────┬─────────────┐
│ ◉ Card      │ ◉ Card      │
└─────────────┴─────────────┘
```

### Grid view (`viewMode='grid'`)
Same as `/timetable` GridView — calendar-style time grid with day columns × time slots, class cells as `<button>`.

## Mobile (≤430px) — Default State

`src/app/timetable/custom/page.tsx:942-1100` renders the mobile branch (sidebar becomes a top-positioned collapsible panel + Bundle management card). Below: empty/preview state.

```
┌─────────────────────────────────────┐
│ [logo] ◁ Custom Timetable    ⤓  🌓 │  ← Header (sticky)
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │  ← mobile-only collapsible
│ │ Your Classes               ▴    │ │     (border-b, px-4 py-4)
│ │ Tap to collapse                 │ │
│ ├─────────────────────────────────┤ │
│ │ [RowEditor]                     │ │
│ │ [RowEditor]                     │ │
│ │ ┄ Add another course ┄          │ │
│ │                                 │ │
│ │ [Build Timetable] [Save Bundle] │ │
│ ├─────────────────────────────────┤ │
│ │ SAVED SETS                  📥  │ │
│ │ ┌───────────────────────────┐   │ │
│ │ │ ◉ Bundle "Sem 6"          │   │ │
│ │ └───────────────────────────┘   │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│  📋                                  │
│  Add your class selections, then    │
│  tap "Build Timetable"…             │
└─────────────────────────────────────┘
                  ↑ FloatingMenu (mobile FAB)
```

## Key Interactive Elements (annotated)

| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Back chevron | `() => router.push('/')` | Soft-nav to landing | `src/app/timetable/custom/page.tsx:592-601` |
| "📅 {Month} Makeup Days" button | `() => setIsMakeupSidebarOpen(true)` | Opens `<MakeupDaysSidebar>` | `src/app/timetable/custom/page.tsx:611-617` |
| `<TimetableExportButton>` (header) | opens export menu | PNG/PDF/ICS export of `filtered` (only when `saved=true`) | `src/app/timetable/custom/page.tsx:586` |
| `<TimetableExportButton variant="sidebar">` | same | Same | `src/app/timetable/custom/page.tsx:749` |
| "Your Classes" collapsible header (desktop + mobile) | `() => setIsDesktopClassesExpanded(prev => !prev)` / `setIsMobileClassesExpanded(...)` | Toggles RowEditor list visibility | `src/app/timetable/custom/page.tsx:626-647,946-965` |
| RowEditor batch/dept/type/course `<select>` | `onUpdate` → `updateRow(row.id, patch)` | Updates row state; resets downstream fields | `src/app/timetable/custom/page.tsx:660` (RowEditor receives `onUpdate`) |
| RowEditor "× Remove" button | `onRemove` → `removeRow(row.id)` | Removes row from `rows` | `src/app/timetable/custom/page.tsx:664` |
| "Add another course" button | `addRow` | Appends new blank row (clones last row's batch/dept/type) | `src/app/timetable/custom/page.tsx:683-691,1003-1011` |
| "Build Timetable" / "Update View" button | `handleSave` | Validates rows; sets `saved=true`; computes `filtered` from `findClasses` of all rows | `src/app/timetable/custom/page.tsx:731,1035` |
| "Save Bundle" button | `() => setIsSaving(true)` | Opens Save Bundle dialog | `src/app/timetable/custom/page.tsx:743,1046` |
| "Update {bundleName}" button (when `editingBundleId` set) | `handleUpdateBundle` | Updates existing bundle in `bundles` + localStorage `fsc_custom_bundles` | `src/app/timetable/custom/page.tsx:735,1039` |
| BundleCard "Load" button | `onLoad` → `loadBundle(bundle, false)` | Replaces `rows` with bundle's rows (no auto-build) | `src/app/timetable/custom/page.tsx:706` |
| BundleCard "Generate" button | `onGenerate` → `loadBundle(bundle, true)` | Replaces `rows` AND triggers `handleSave` (auto-builds) | `src/app/timetable/custom/page.tsx:707` |
| BundleCard rename confirm | `onRenameConfirm` → `handleRenameBundle(bundle.id, tempName)` | Renames bundle in `bundles` + localStorage | `src/app/timetable/custom/page.tsx:702` |
| BundleCard delete | `onDelete` → `handleDeleteBundle(e, bundle.id)` | Removes bundle from `bundles` + localStorage | `src/app/timetable/custom/page.tsx:704` |
| Save Bundle dialog "Save Bundle" button | `handleCreateBundle` | Creates new bundle with `newBundleName`; persists to localStorage; closes dialog | `src/app/timetable/custom/page.tsx:1185-1195` |
| Save Bundle dialog "Cancel" | `() => setIsSaving(false)` | Closes dialog | `src/app/timetable/custom/page.tsx:1180` |
| Save Bundle dialog input Enter | `e.key === 'Enter' && handleCreateBundle()` | Same as Save click | `src/app/timetable/custom/page.tsx:1175` |
| `<SearchBar>` | `setQuery` | Free-text filter (only when `saved=true`) | `src/app/timetable/custom/page.tsx:915` |
| View toggle (mobile) `[☰][⊞]` | `setViewMode(v)` | Switches ListView / GridView | `src/app/timetable/custom/page.tsx:921-936` |
| `<TimetableCard>` click | `() => onSelect(entry)` → `setSelected(entry)` | Opens `<TimetableDetail>` drawer | `src/app/timetable/custom/page.tsx:1130` |
| GridView class cell `<button>` | `() => onSelect(e)` → `setSelected(e)` | Opens `<TimetableDetail>` drawer | (GridViewCustom in same file) |
| `<TimetableDetail onClose>` | `() => setSelected(null)` | Closes drawer | `src/app/timetable/custom/page.tsx:1155-1160` |
| Exclusivity error "Got it" button | `() => setExclusivityError(null)` | Closes modal | `src/app/timetable/custom/page.tsx:1233-1242` |
| `<MakeupDaysSidebar onClose>` | `() => setIsMakeupSidebarOpen(false)` | Closes sidebar | `src/app/timetable/custom/page.tsx:1246-1251` |
| Header logo | n/a | Soft-nav to `/` | `src/components/Header.tsx:20` |

## Conditional States

### `{!saved}` — Empty preview area
```
Desktop + mobile show a friendly placeholder:
   📋
   Add your class selections, then tap "Build Timetable"…
Source: src/app/timetable/custom/page.tsx:988-997.
```

### `{saved === true && filtered.length === 0}` — Build returned 0 matches
```
<EmptyState message="No classes found for the selected rows." />
Source: src/app/timetable/custom/page.tsx:998-1000.
```

### `{anyError}` — Validation error
```
"Fill all highlighted fields first." text appears below RowEditor list.
Triggered when saved===false && any row has errorBatch/errorStream/errorCategory/errorSelection.
Source: src/app/timetable/custom/page.tsx:575,683-685,1029-1031.
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
Source: src/app/timetable/custom/page.tsx:1156-1198.
```

### `{exclusivityError !== null}` — Exclusivity error modal (z-100)
```
Same modal pattern as /home page: yellow warning gradient header, "Action Required" title,
descriptive message, "Got it" button.
Triggered when handleSave detects localStorage 'fsc_user_config' is set
(prevents having both default prefs + custom bundles simultaneously).
Source: src/app/timetable/custom/page.tsx:1199-1242.
```

### `{editingBundleId !== null}` — editing an existing bundle
```
"Save Bundle" button label changes to "Update '{bundleName}...'"
Clicking it calls handleUpdateBundle (updates in place instead of creating new).
Source: src/app/timetable/custom/page.tsx:735-741,1039-1044.
```

### Preview handoff from optimizer
```
On mount, localStorage['fsc_timetable_preview'] is parsed.
If present (set by /timetable/optimizer → "Preview Timetable" link):
  - setRows(previewRows)
  - setSaved(true)   ← immediately shows preview
  - setIsDesktopClassesExpanded(false) + setIsMobileClassesExpanded(false)
  - setEditingBundleId(null)
  - localStorage.removeItem('fsc_timetable_preview')  ← one-shot, cleaned up
Source: src/app/timetable/custom/page.tsx:280-301.
```

### Summer mode
```
- RowEditor hides Dept + Type selectors (only Year shown — defaults to 'Summer')
- timetableEntries fetched from GET /api/timetable on mount (src/app/timetable/custom/page.tsx:269-276)
- summerCatalog populated for displayName resolution
- Source: src/app/timetable/custom/page.tsx:262-276, RowEditor isSummer check
```

### `{currentMonthMakeupDays.length > 0}` — Makeup Days pill in header
```
Same pattern as /timetable — amber pill button in header subtitle area.
Source: src/app/timetable/custom/page.tsx:609-616.
```

### `{selected !== null}` — `<TimetableDetail>` drawer
```
Same drawer pattern as /timetable page.
Source: src/app/timetable/custom/page.tsx:1154-1160.
```

### `{isMakeupSidebarOpen === true}` — `<MakeupDaysSidebar>` drawer
```
Same drawer pattern as /timetable page.
Source: src/app/timetable/custom/page.tsx:1245-1251.
```

## Breakpoint Behavior

| Breakpoint | What changes | Source |
|------------|--------------|--------|
| `md:` (768px) | Desktop sidebar `<aside className="hidden md:flex md:w-[350px] lg:w-[400px]">` appears. Mobile-only collapsible "Your Classes" + Bundle card hides (`md:hidden`). SearchBar + view-toggle appear (only when `saved=true`). Day-list grid switches from single-col to `md:grid md:grid-cols-2 lg:grid-cols-3`. | `src/app/timetable/custom/page.tsx:622,910,921,944,1097` |
| `lg:` (1024px) | Sidebar widens `md:w-[350px] lg:w-[400px]`. Day-list grid goes 2→3 columns. | `src/app/timetable/custom/page.tsx:622,1097` |
| `sm:` (640px) | Button font sizes `text-[10px] sm:text-xs` adjust. | `src/app/timetable/custom/page.tsx:732,740` |
| `<TimetableDetail>` responsive | Mobile bottom sheet; desktop right rail (`md:top-14 md:right-0 md:w-96`). | `src/components/TimetableDetail.tsx` |
| `<MakeupDaysSidebar>` responsive | Mobile bottom sheet; desktop right rail. | `src/components/MakeupDaysSidebar.tsx` |

## Screenshot References

- Desktop default (preview state): `[screenshot: desktop/05-timetable-custom.png]`
- Mobile default: `[screenshot: mobile/05-timetable-custom.png]`

## State Transitions

### Lifecycle: mount → preview handoff → build → save

```
Mount:
  useEffect (src/app/timetable/custom/page.tsx:262-323):
    ├─ localStorage 'fsc_active_semester' === 'summer' → setIsSummer(true)
    │    + fetch('/api/timetable', {cache:'no-store'}) → setTimetableEntries + setSummerCatalog
    ├─ localStorage 'fsc_timetable_preview' present?
    │    └─ YES: setRows(previewRows); setSaved(true); collapse editor
    │            localStorage.removeItem('fsc_timetable_preview')   ← one-shot
    │            setIsLoaded(true); return  ← skip bundle loading
    │    └─ NO:  localStorage 'fsc_custom_bundles' → setBundles
    │            localStorage 'fsc_semester_name' → setSemesterName
    │            setRows([makeRow(`${baseId}-0`, isSummerMode)])   ← 1 blank row
    │            async loadSemesterSettings() → supabase check
    │            setIsLoaded(true)
    └─ useEffect persist (line 327-330): whenever bundles changes AND isLoaded,
         localStorage.setItem('fsc_custom_bundles', JSON.stringify(bundles))

User adds rows / picks courses / clicks "Build Timetable":
  handleSave():
    ├─ validate each row (set errorBatch/errorStream/errorCategory/errorSelection flags)
    ├─ if any error: setSaved(false); setAnyError; bail
    ├─ else: setSaved(true) → triggers re-render with ListView/GridView
    └─ filtered = useMemo: rows.flatMap(findClasses).filter(...) → grouped by day

User clicks "Save Bundle":
  setIsSaving(true) → dialog opens
  On confirm:
    ├─ handleCreateBundle() / handleUpdateBundle()
    │   ├─ new bundle: bundles.push({id, name, rows}); editingBundleId = new bundle.id
    │   └─ update bundle: replace in-place
    └─ localStorage.setItem('fsc_custom_bundles', JSON.stringify(bundles))

User clicks BundleCard "Load":
  loadBundle(bundle, false):
    ├─ setRows(bundle.rows.map(clone))
    ├─ setSaved(false)  ← user must click Build Timetable
    ├─ setEditingBundleId(bundle.id)
    └─ collapse mobile editor

User clicks BundleCard "Generate":
  loadBundle(bundle, true):
    ├─ setRows(bundle.rows.map(clone))
    ├─ setSaved(true)   ← auto-builds immediately
    ├─ setEditingBundleId(bundle.id)
    └─ collapse mobile editor
```

### Interaction state machine

```
Empty (no rows, no preview)
  ├─ mount with fsc_timetable_preview ──► Preview state (saved=true, editor collapsed)
  ├─ click "Your Classes" header ──setIsDesktopClassesExpanded(true)──► RowEditor list visible
  ├─ click "Add another course" ──addRow()──► new blank row appended
  ├─ click "Build Timetable" ──handleSave()──► if valid: saved=true, filtered shown
  │                                            if invalid: anyError=true, errors highlighted
  ├─ click "Save Bundle" ──setIsSaving(true)──► Save Bundle dialog opens
  │       ├─ type name + Enter/click "Save Bundle" ──handleCreateBundle()──► bundle added, editingBundleId set
  │       └─ click "Cancel" ──setIsSaving(false)──► close dialog
  ├─ click BundleCard "Load" ──loadBundle(b, false)──► rows replaced, saved=false
  ├─ click BundleCard "Generate" ──loadBundle(b, true)──► rows replaced, saved=true (auto-build)
  ├─ click BundleCard rename ──setRenamingId(b.id)──► inline rename input
  │       └─ confirm ──handleRenameBundle(b.id, tempName)──► bundle.name updated + localStorage
  ├─ click BundleCard delete ──handleDeleteBundle──► bundle removed + localStorage
  ├─ click class card ──setSelected(entry)──► <TimetableDetail> drawer
  ├─ click "Makeup Days" pill ──setIsMakeupSidebarOpen(true)──► <MakeupDaysSidebar> drawer
  ├─ click "Change filters" (none here) — instead click back chevron ──router.push('/')
  ├─ click Export ──► <TimetableExportButton> modal (only when saved=true)
  └─ try save bundle while fsc_user_config exists ──setExclusivityError(msg)──► Exclusivity modal
```

### URL parameter contract

```
None. The page reads ONLY from localStorage:
  - fsc_active_semester (read on mount; sets isSummer)
  - fsc_timetable_preview (one-shot handoff from /timetable/optimizer)
  - fsc_custom_bundles (persisted bundle library)
  - fsc_semester_name (for subtitle)
  - fsc_user_config (checked in handleSave to trigger exclusivity error)
```
