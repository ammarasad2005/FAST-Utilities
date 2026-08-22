---
doc: 07-UI-BLUEPRINTS/09-faculty
generated: 2026-08-09T16:05:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# UI Blueprint — `/faculty` (Faculty Directory)

**Page file:** `src/app/faculty/page.tsx:1-413`
**Render mode:** `'use client'` (`src/app/faculty/page.tsx:1`)
**Layout:** Mounted inside root `src/app/layout.tsx`. Page reads `?dept=X` from `window.location.search` directly (NOT `useSearchParams()`), so no Suspense wrapper needed.

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

## Desktop (≥1024px) — Default State (activeDept='ALL', viewMode='list', page 1)

`src/app/faculty/page.tsx:94-396` renders the layout. Sticky `<Header>` (with back chevron + "Faculty Directory" label + count). Two-column body: LEFT `<aside>` (w-56 lg:w-64) with dept list + total; RIGHT main area with search input + result header + 4-col grid of `<FacultyCard>`s.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo]  ◁ 👥 Faculty Directory  312 faculty                                                    🌓 │  ← Header (sticky)
├──────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR      │  Search bar (sticky below header)                                                                              │
│ DEPARTMENTS  │  🔍 [Search by name, title, email, office…]                                                  ✕               │
│              │                                                                                                                │
│ ◉ All Faculty│  ──────── 312 results · page 1/13 ──────── [⊞ grid] [☰ list]   (mobile toggle)                              │
│   312        │                                                                                                                │
│ ◯ CS    45   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                                                       │
│ ◯ AI    38   │  │ Faculty  │ │ Faculty  │ │ Faculty  │ │ Faculty  │  ← lg:grid-cols-3 xl:grid-cols-4                     │
│ ◯ DS    32   │  │ Card     │ │ Card     │ │ Card     │ │ Card     │                                                       │
│ ◯ CY    28   │  │ ◉ click  │ │ ◉ click  │ │ ◉ click  │ │ ◉ click  │                                                       │
│ ◯ SE    35   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘                                                       │
│ ◯ EE    42   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                                                       │
│ ◯ CE    30   │  │ Card     │ │ Card     │ │ Card     │ │ Card     │                                                       │
│ ◯ SH    25   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘                                                       │
│ ◯ AF    18   │  … (24 per page)                                                                                          │
│ ◯ MS    19   │                                                                                                                │
│              │  ← Prev   1  2  3  …  13   Next →                                                                           │
│ TOTAL        │                                                                                                                │
│ 312 faculty  │                                                                                                                │
└──────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### `<FacultyDetail>` drawer open (desktop right-rail)
```
Right-rail panel (md:w-96, anchored top-14 right-0):
┌─────────────────────────────────────┐
│ ─── drag handle (mobile only) ───   │
│ ✕ Close                             │
│ ┌─ avatar ─┐                        │
│ │   👤    │                         │
│ └──────────┘                        │
│ Dr. Ahmad Khan                      │
│ Professor                           │
│ CS Department                       │
│                                     │
│ 📧 ahmad.khan@nu.edu.pk             │
│ 🏢 Office: CS-204                   │
│ 📞 +92-51-…                         │
│ 🔗 Personal page                    │
└─────────────────────────────────────┘
```

## Mobile (≤430px) — Default State (viewMode='list')

`src/app/faculty/page.tsx:213-253` renders mobile-specific dept filter strip (horizontal scroll, sticky below header). Main area shows single-column list (or grid w/ snap-x on small screens).

```
┌─────────────────────────────────┐
│ [logo] ◁ Faculty Directory  🌓 │  ← Header (sticky)
├─────────────────────────────────┤
│ 🔍 [Search by name, title…]    │
├─────────────────────────────────┤
│ [All][CS][AI][DS][CY][SE][EE]→ │  ← mobile-only dept pills (horizontal scroll, md:hidden)
├─────────────────────────────────┤
│ ──── 312 results ──── [⊞][☰]   │  ← mobile-only result header + view toggle
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ ◉ FacultyCard               │ │  ← single column in list mode
│ │  Dr. Ahmad Khan             │ │
│ │  Professor · CS Dept        │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ◉ FacultyCard               │ │
│ └─────────────────────────────┘ │
│ … (24 per page)                 │
├─────────────────────────────────┤
│  ← Prev  1  2  3  …  13  Next → │
└─────────────────────────────────┘
                  ↑ FloatingMenu (mobile FAB)
```

### Mobile viewMode='grid'
```
Horizontal snap-x carousel, 85vw per card:
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ ◉ FacultyCard│ │ ◉ FacultyCard│ │ ◉ FacultyCard│   ← snap-x snap-mandatory
│  Dr. Khan    │ │  Dr. Ali     │ │  Dr. Fatima  │       w-[85vw] shrink-0
└──────────────┘ └──────────────┘ └──────────────┘
```

## Key Interactive Elements (annotated)

| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Back chevron | `() => router.push('/')` | Soft-nav to landing | `src/app/faculty/page.tsx:100-108` |
| Search `<input type="search">` | `e => setQuery(e.target.value)` | Free-text filter (name/title/email/office) | `src/app/faculty/page.tsx:194-201` |
| Search clear ✕ button | `() => setQuery('')` | Clears search | `src/app/faculty/page.tsx:202-209` |
| Sidebar "All Faculty" button | `() => handleDeptChange('ALL')` | Sets activeDept=ALL; scrolls grid to top | `src/app/faculty/page.tsx:136-146` |
| Sidebar dept button (per dept) | `() => handleDeptChange(key)` | Sets activeDept=key; scrolls grid to top | `src/app/faculty/page.tsx:148-170` |
| Mobile dept pill "All" | `() => handleDeptChange('ALL')` | Same | `src/app/faculty/page.tsx:213-227` |
| Mobile dept pill (per dept) | `() => handleDeptChange(key)` | Same | `src/app/faculty/page.tsx:228-252` |
| Mobile view-mode toggle [⊞ grid] / [☰ list] | `setViewMode('grid')` / `setViewMode('list')` | Toggles FacultyCard layout | `src/app/faculty/page.tsx:269-285` |
| Pagination "← Prev" button | `() => goToPage(page - 1)` | Goes to previous page; disabled on page 1; scrolls to top | `src/app/faculty/page.tsx:336-344` |
| Pagination page-number button | `() => goToPage(p)` | Goes to clicked page | `src/app/faculty/page.tsx:346-369` |
| Pagination "Next →" button | `() => goToPage(page + 1)` | Goes to next page; disabled on last page | `src/app/faculty/page.tsx:371-379` |
| `<FacultyCard onClick>` (mobile list mode) | `() => setSelected(member)` | Opens `<FacultyDetail>` drawer | `src/app/faculty/page.tsx:312-318` |
| `<FacultyCard onClick>` (desktop grid mode) | `() => setSelected(member)` | Same | `src/app/faculty/page.tsx:320-327` |
| `<FacultyDetail onClose>` | `() => setSelected(null)` | Closes drawer | `src/app/faculty/page.tsx:388-394` |
| Empty-state "Clear filters" link | `() => { setQuery(''); setActiveDept('ALL'); }` | Resets both filters | `src/app/faculty/page.tsx:295-300` |
| Header logo | n/a | Soft-nav to `/` | `src/components/Header.tsx:20` |

## Conditional States

### `{filtered.length === 0}` — Empty state
```
Centered "∅" + message + "Clear filters" link:
   ∅
   No faculty found matching your search.
   Try a different name, title, or department.
   Clear filters  ← link
Source: src/app/faculty/page.tsx:289-301.
```

### `{totalPages > 1}` — Pagination controls
```
Below grid:
   ← Prev   1  2  3  …  13   Next →
Page list built by buildPageList(current, total) helper (src/app/faculty/page.tsx:400-413).
Ellipsis shown when total > 7 and current is far from edges.
Source: src/app/faculty/page.tsx:333-381.
```

### `{selected !== null}` — `<FacultyDetail>` drawer
```
Mobile: bottom sheet (drag handle, backdrop, Escape handler)
Desktop: right-rail panel (md:w-96, anchored top-14 right-0)
Shows: avatar, name, title, dept, email, office, phone, personal page link
Source: src/components/FacultyDetail.tsx
```

### `{activeDept !== 'ALL'}` — dept filter active
```
Sidebar shows the active dept with accent-color bg + boxShadow + 1px ring.
Mobile pills show the same accent-color styling.
filtered list = ALL_MEMBERS.filter(m => m.deptKey === activeDept)
Source: src/app/faculty/page.tsx:53-58, 152-170.
```

### URL `?dept=X` pre-selection
```
On mount, useEffect reads window.location.search (NOT useSearchParams):
  const params = new URLSearchParams(window.location.search)
  const deptParam = params.get('dept')
  if (deptParam && DEPT_ORDER.includes(deptParam)) setActiveDept(deptParam)
Source: src/app/faculty/page.tsx:42-50.
This is set by /home?feature=faculty clicking a dept pill → router.push('/faculty?dept=X').
```

## Breakpoint Behavior

| Breakpoint | What changes | Source |
|------------|--------------|--------|
| `md:` (768px) | Desktop sidebar `<aside className="hidden md:flex md:w-56 lg:w-64">` appears. Mobile-only dept filter strip hides (`md:hidden`). Result-header mobile text + view toggle hide (`sm:hidden` for count, `md:hidden` for toggle). FacultyCard grid switches from `flex overflow-x-auto snap-x` (mobile carousel) to `md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`. Mobile `<div className="md:hidden h-full">` (mobile FacultyCard) hides; `<div className="hidden md:block h-full">` (desktop FacultyCard, always grid) shows. | `src/app/faculty/page.tsx:130,213,258,264,270,303-329` |
| `lg:` (1024px) | Sidebar widens `md:w-56 lg:w-64`. FacultyCard grid goes 2→3 columns (`lg:grid-cols-3`). | `src/app/faculty/page.tsx:130,306` |
| `xl:` (1280px) | FacultyCard grid goes 3→4 columns (`xl:grid-cols-4`). | `src/app/faculty/page.tsx:306` |
| `sm:` (640px) | Result-count text appears on mobile (`hidden sm:inline-block` at line 258). | `src/app/faculty/page.tsx:258` |
| `<FacultyDetail>` responsive | Mobile bottom sheet; desktop right rail (`md:top-14 md:right-0 md:w-96`). | `src/components/FacultyDetail.tsx` |
| `<FacultyCard>` mobile carousel | In grid mode on mobile: `w-[85vw] shrink-0 snap-center` with horizontal scroll. At `md+`, switches to grid layout. | `src/app/faculty/page.tsx:303-309` |
| Pagination | `flex flex-wrap` so wraps on narrow screens. | `src/app/faculty/page.tsx:335` |

## Screenshot References

- Desktop default (All Faculty, list mode): `[screenshot: desktop/08-faculty.png]`
- Desktop faculty detail drawer: `[screenshot: desktop/08b-faculty-detail.png]`
- Mobile default: `[screenshot: mobile/08-faculty.png]`

## State Transitions

### URL → filter pipeline

```
Mount (?dept=CS):
  useEffect (src/app/faculty/page.tsx:42-50):
    └─ window.location.search → params.get('dept')
       └─ if valid → setActiveDept('CS')

filtered = useMemo (line 53-58):
  list = activeDept === 'ALL' ? ALL_MEMBERS : ALL_MEMBERS.filter(m => m.deptKey === activeDept)
  return searchFaculty(list, query)
    (searchFaculty matches name, title, email, office, deptKey — case-insensitive)

totalPages = max(1, ceil(filtered.length / 24))
pageMembers = filtered.slice((page-1)*24, page*24)

useEffect (line 61): filtered changes → setPage(1)  (reset to first page)

handleDeptChange(dept):
  setActiveDept(dept)
  requestAnimationFrame(() => gridRef.current?.scrollIntoView({behavior:'smooth', block:'start'}))

goToPage(next):
  setPage(next)
  requestAnimationFrame(() => gridRef.current?.scrollIntoView({behavior:'smooth', block:'start'}))
```

### Interaction state machine

```
Default (All Faculty, page 1, list view)
  ├─ type in search ──setQuery──► filtered re-computes; page resets to 1
  ├─ click search ✕ ──setQuery('')──► cleared
  ├─ click sidebar dept ──handleDeptChange(dept)──► activeDept set; grid scrolls to top; page=1
  ├─ click mobile dept pill ──handleDeptChange(dept)──► same
  ├─ click view toggle (mobile) ──setViewMode──► grid carousel / list stack
  ├─ click page number / Prev / Next ──goToPage──► page changes; grid scrolls to top
  ├─ click FacultyCard ──setSelected(member)──► <FacultyDetail> drawer opens
  │                                     ├─ Escape / backdrop ──► setSelected(null)
  │                                     └─ close button ──► setSelected(null)
  ├─ click "Clear filters" (empty state) ──setQuery('') + setActiveDept('ALL')──► reset
  ├─ click back chevron ──router.push('/')──► Landing
  └─ click header logo ──router.push('/')──► Landing
```

### URL parameter contract

```
Optional: ?dept={CS|AIDS|SE|CY|EE|CE|SH|AF|MS}
  - Read via window.location.search (NOT useSearchParams) — no Suspense needed
  - If invalid or absent → activeDept stays 'ALL'

The dept key 'AIDS' (not 'AI') is used for the URL param to match the DEPT_ORDER array.
Sidebar button labels also use 'AIDS' (line 24).
```
