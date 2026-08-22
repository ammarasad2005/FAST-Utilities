---
doc: 06-COMPONENT-INVENTORY
generated: 2026-08-09T16:10:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# 06 — Component Inventory

37 components total: 23 application components + 11 UI primitives + 3 hooks. Total ~7,100 LOC.

## 1. Application Components (23)

### Layout & Global Mounts (mounted in `src/app/layout.tsx`)

| Component | File | LOC | Render | Props | Purpose |
|-----------|------|-----|--------|-------|---------|
| `Navbar` | `src/components/Navbar.tsx:1-162` | 162 | `'use client'` | none | Desktop-only (hidden md:flex) floating pill nav with 5 tabs (Rooms, Lost & Found, Home, Faculty, Courses). Uses framer-motion `layoutId` for "stage light" magic-move animation between active tabs (spotlight cone + beam + underline glow). Active tab detected via `usePathname()`. |
| `FloatingMenu` | `src/components/FloatingMenu.tsx:1-633` | 633 | `'use client'` | none | Mobile-only (md:hidden) FAB that expands into a virtualized circular arc menu with 7 items (drag/wheel to scroll). Uses `pointer-events: auto` only when open. Includes "Open X" toast notification on navigation. ~290 lines of CSS-in-JS injected via `<style>`. |
| `FeedbackWidget` | `src/components/FeedbackWidget.tsx:1-318` | 318 | `'use client'` | none | Right-edge vertical-text trigger button that opens a slide-out full-height panel. 5-emoji rating, 4 categories (Suggestion/Bug Report/Review/Inquiry). Submits to `POST /api/feedback`. Shows success animation panel. |
| `GlobalShortcuts` | `src/components/GlobalShortcuts.tsx:1-29` | 29 | `'use client'` | none | No UI — invisible global keyboard listener. `Ctrl+Shift+A` → `/admin` (hidden admin backdoor, undocumented in UI). `Ctrl+Shift+Z` → `router.back()`. |
| `ThemeToggle` | `src/components/ThemeToggle.tsx:1-22` | 22 | `'use client'` | none | Slider-toggle UI for light/dark mode. `checked={!isDark}`. Uses `useTheme()` from `@/lib/theme`. CSS classes from `globals.css`. |
| `Header` | `src/components/Header.tsx:1-71` | 71 | `'use client'` | `{ children?: ReactNode, rightActions?: ReactNode }` | Sticky top bar (`sticky top-0 z-50`) with `glass-header-laser` class. 3-column flex: logo (60-100px) \| centered children (flex-1) \| actions (60-100px). Always renders social icons on mobile, `ThemeToggle` on right. Used by ALL 13 pages. |

### Feature Components

| Component | File | LOC | Render | Props | Purpose |
|-----------|------|-----|--------|-------|---------|
| `DesktopTicker` | `src/components/DesktopTicker.tsx:1-602` | 602 | `'use client'` | `{ allTimetableEntries, userConfig, bundles, isSummer?, summerSelections?, summerCatalog? }` | Desktop-only (hidden md:block) hero clock + next-up ticker. Updates `now` every 1s. Shows live clock in JetBrains Mono. Computes ongoing/next class via duplicated sheet-date resolution algorithm (~210 lines, also in `timetable/page.tsx`). Shows "Critical Conflict" red badge if multiple classes overlap. |
| `TimetableOptimizer` | `src/components/TimetableOptimizer.tsx:1-1107` | 1107 | `'use client'` | none | Self-contained CSP solver. Configuration form (input mode toggle, optimization goal, 6 weighted sliders for custom mode). Backtracking algorithm `O(S^N)` with no memoization. Returns top 15 ranked schedules. Renders "Top Schedules" with Fit Score %, Comfort %, Off-Days count, badges (Midday Break, Fatigue, Focus), "Preview Timetable" link per option. |
| `EventsCalendar` | `src/components/EventsCalendar.tsx:1-540` | 540 | `'use client'` | `{ initialMonth?, initialYear?, compact? }` | Monthly calendar grid (7-col). Day cells clickable → `EventDayDetail` (rendered via `createPortal` to `document.body` — only component using portal). Month navigation clamped to current + next month only. ICS export at 3 levels (per-event, per-day, per-month). |
| `FloatingMenu` (dup) | — | — | — | — | (Already listed in global mounts) |

### Card / Detail Components

| Component | File | LOC | Render | Props | Purpose |
|-----------|------|-----|--------|-------|---------|
| `ExamCard` | `src/components/ExamCard.tsx:1-74` | 74 | `'use client'` | `{ exam: ExamEntry, dept: string, onClick: () => void }` | Button-styled card with 5px left strip in dept accent. Shows courseCode, courseName, time, day, daysUntil countdown (via `CountdownBadge`). Summer-only: shows `room` and `sections` fields. |
| `ExamDetail` | `src/components/ExamDetail.tsx:1-124` | 124 | `'use client'` | `{ exam, dept, onClose }` | Mobile-drawer (85dvh) / desktop right panel. 4-row detail grid (Date, Time, Batch, Department). "Add to calendar (.ics)" button → `generateICS(exam)`. Countdown callout. |
| `TimetableCard` | `src/components/TimetableCard.tsx:1-201` | 201 | `'use client'` | `{ entry, dept, conflicting?, isRepeat?, onClick, onRemove?, onChangeSection?, availableSections?, displayName? }` | Button-styled card with strip color: red for conflict, tertiary for cancelled, accent for normal. 5 badge states (cancelled → repeat → conflicting → exam → rescheduled → else Lecture/Lab). Footer with "Change Section" dropdown + "Remove ×" button. |
| `TimetableDetail` | `src/components/TimetableDetail.tsx:1-133` | 133 | `'use client'` | `{ entry, dept, onClose, isSummer?, displayName? }` | Mobile-drawer (85dvh) / desktop right panel. 7-row detail grid (Day, Time, Room, Type, Section, Batch, Category). Cancelled class shows red "🚫 Canceled class" callout. "Add to calendar (.ics)" button. |
| `FacultyCard` | `src/components/FacultyCard.tsx:1-174` | 174 | `'use client'` | `{ member: FacultyMember & { deptKey }, priority?, viewMode?: 'grid'\|'list', onClick }` | Two modes: grid (4:3 photo on top) or list (compact horizontal). Initials fallback if image fails. `getFacultyRank(member.status) <= 2` → accent border + "HOD" badge. LinkedIn badge in bottom-right if present. Eager/lazy loading toggle via `priority` prop. |
| `FacultyDetail` | `src/components/FacultyDetail.tsx:1-185` | 185 | `'use client'` | `{ member, onClose }` | Mobile-drawer (90dvh) / desktop right panel (400px). Photo with 4px accent-color glow. Rows: Office, Email (mailto:), LinkedIn (if present), FAST Profile (external link). |
| `ResolutionDetail` | `src/components/ResolutionDetail.tsx:1-298` | 298 | `'use client'` | `{ foundItem, lostItem, claim, onBack }` | Side-by-side Found/Lost report cards with emerald gradient connection line + ShieldCheck badge (desktop only). "VERIFIED BY AI" badge on possession proof image. Framer-motion entrance animations. ⚠️ Imports `LostFoundItem` type from `@/app/lost-found/page` (brittle). |
| `MakeupDaysSidebar` | `src/components/MakeupDaysSidebar.tsx:1-102` | 102 | `'use client'` | `{ onClose, makeupDays: TimetableSheetMeta[], monthName }` | Mobile-drawer (60dvh — shorter than others) / desktop right panel. Lists makeup days with day name + sheetName + date. |

### Utility / Small Components

| Component | File | LOC | Render | Props | Purpose |
|-----------|------|-----|--------|-------|---------|
| `SearchBar` | `src/components/SearchBar.tsx:1-37` | 37 | (no directive) | `{ value, onChange }` | Search icon + text input + clear button. `aria-label="Search exams"`. |
| `EmptyState` | `src/components/EmptyState.tsx:1-28` | 28 | (no directive) | `{ query, batch, dept, message? }` | Centered "∅" empty-set symbol. Custom message override. "Go back" button → `window.history.back()`. |
| `CountdownBadge` | `src/components/CountdownBadge.tsx:1-17` | 17 | (no directive) | `{ days: number }` | "TODAY" / "1d" / "Nd". Red urgent styling if ≤2 days. Returns `null` if `days < 0`. |
| `DepartmentPill` | `src/components/DepartmentPill.tsx:1-38` | 38 | (no directive) | `{ dept, selected, onClick }` | Pill button with hardcoded accent map for 11 departments. `aria-pressed={selected}`. `active:scale-95` tap feedback. |
| `ExportButton` | `src/components/ExportButton.tsx:1-128` | 128 | `'use client'` | `{ entries: ExamEntry[], variant?: 'header'\|'sidebar', config? }` | Dropdown with 4 export options: PNG (calls `POST /api/export-image`), ICS, XLSX, CSV. ⚠️ Duplicates Supabase `semester_settings` fetch on mount (parent pages already do this). |
| `TimetableExportButton` | `src/components/TimetableExportButton.tsx:1-72` | 72 | `'use client'` | `{ entries: TimetableEntry[], variant?: 'header'\|'sidebar', isSummer? }` | Dropdown with 3 export options: ICS (recurring weekly, 8 or 16 weeks), XLSX, CSV. ~70% duplicated with `ExportButton`. |

## 2. UI Primitives (`src/components/ui/`)

All use `cn()` from `@/lib/utils` (= `twMerge(clsx(...))`). Modern `React.ComponentProps<typeof RadixPrimitive>` pattern (no forwardRef except legacy `toast.tsx`).

| Primitive | File | LOC | Radix Package | Variants | Used? |
|-----------|------|-----|---------------|----------|-------|
| `Button` + `buttonVariants` | `ui/button.tsx:1-59` | 59 | `@radix-ui/react-slot` | variant: `default`/`destructive`/`outline`/`secondary`/`ghost`/`link`; size: `default`/`sm`/`lg`/`icon`; `asChild` prop | ⚠️ `Button` itself NEVER rendered — only `buttonVariants()` used by `alert-dialog` |
| `Input` | `ui/input.tsx:1-21` | 21 | (none) | none | ❌ Dead code |
| `Toast` + variants | `ui/toast.tsx:1-129` | 129 | `@radix-ui/react-toast` | variant: `default`/`destructive` | ✅ Used by `toaster.tsx` |
| `Toaster` | `ui/toaster.tsx:1-35` | 35 | (composes `toast.tsx`) | none | ✅ Used by `app/layout.tsx` |
| `AlertDialog` + 10 sub-components | `ui/alert-dialog.tsx:1-157` | 157 | `@radix-ui/react-alert-dialog` | none (Action uses `buttonVariants()` default; Cancel uses `buttonVariants({ variant: 'outline' })`) | ✅ Used by `lost-found/page.tsx`, `admin/page.tsx` |
| `Dialog` + 10 sub-components | `ui/dialog.tsx:1-143` | 143 | `@radix-ui/react-dialog` | `showCloseButton` prop on Content | ❌ Dead code |
| `Tooltip` + 4 sub-components | `ui/tooltip.tsx:1-61` | 61 | `@radix-ui/react-tooltip` | none (auto-wraps in `TooltipProvider` with `delayDuration=0`) | ❌ Dead code |
| `Progress` | `ui/progress.tsx:1-31` | 31 | `@radix-ui/react-progress` | none | ❌ Dead code |
| `Avatar` + 3 sub-components | `ui/avatar.tsx:1-53` | 53 | `@radix-ui/react-avatar` | none | ❌ Dead code |
| `ScrollArea` + `ScrollBar` | `ui/scroll-area.tsx:1-58` | 58 | `@radix-ui/react-scroll-area` | `orientation` on ScrollBar | ❌ Dead code |
| `AspectRatio` | `ui/aspect-ratio.tsx:1-11` | 11 | `@radix-ui/react-aspect-ratio` | none | ❌ Dead code |
| `Toaster` (sonner) | `ui/sonner.tsx:1-25` | 25 | `sonner` | none | ❌ Dead code AND ⚠️ would crash — imports `next-themes` (not in `package.json`) |

**Dead UI primitives**: 6 of 11 (`progress`, `avatar`, `scroll-area`, `aspect-ratio`, `tooltip`, `dialog`, `input`) plus `sonner.tsx` (would crash if imported). Strong cleanup candidate.

## 3. Hooks (`src/hooks/`)

| Hook | File | LOC | Returns | Purpose |
|------|------|-----|---------|---------|
| `useMobileSwipe` | `src/hooks/useMobileSwipe.ts:1-258` | 258 | `{ drawerRef, handleRef, backdropRef, closeDrawer }` | Mobile-only (guards `window.innerWidth >= 768`) swipe-to-close drawer. Two-state machine (`'default'` ↔ `'full'`). Rubber-band physics. Velocity-tracked flick detection (0.4 px/ms threshold). Spring-eased close animation (280ms cubic-bezier). Initial height set synchronously to prevent flash. Used by 7 detail drawer components + `/rooms` page directly. |
| `useIsMobile` | `src/hooks/use-mobile.ts:1-19` | 19 | `boolean` (initially `undefined` for SSR safety) | `matchMedia('(max-width: 767px)')` listener. Breakpoint at 768px (matches Tailwind `md:`). Used by `lost-found/page.tsx` only. |
| `useToast` + `toast` + `reducer` | `src/hooks/use-toast.ts:1-194` | 194 | `{ toasts, toast, dismiss }` | Module-scope singleton pattern (`memoryState` + `listeners` at module scope). `toast()` callable from outside React. `TOAST_LIMIT = 1` (new toasts replace old). `TOAST_REMOVE_DELAY = 1000000` (16.7 min — likely typo for 1000ms). Used by `FeedbackWidget`, `admin/page.tsx`, `lost-found/page.tsx`, `ui/toaster.tsx`. |

## 4. Cross-cutting Patterns

### Mobile Drawer Boilerplate (duplicated 6×)

The following 6 components all implement the same mobile-drawer pattern with `useMobileSwipe`:
1. `FacultyDetail` (defaultHeightStr: '90dvh')
2. `TimetableDetail` (defaultHeightStr: '85dvh')
3. `ExamDetail` (defaultHeightStr: '85dvh')
4. `MakeupDaysSidebar` (defaultHeightStr: '60dvh')
5. `EventsCalendar.EventDayDetail` (defaultHeightStr: '85dvh')
6. `TimetableOptimizer` verify drawer (defaultHeightStr: '60dvh')

Plus `src/app/rooms/page.tsx` uses `useMobileSwipe` directly (defaultHeightStr: '85dvh').

Each duplicates:
- `useMobileSwipe({ onClose, defaultHeightStr })` hook call
- `useEffect` for body scroll lock (`document.body.style.overflow = 'hidden'`)
- `useEffect` for Escape key handler
- Identical responsive drawer className: `fixed z-40 bottom-0 left-0 right-0 rounded-t-2xl ... md:bottom-0 md:top-14 md:left-auto md:right-0 md:w-96 md:rounded-none md:rounded-l-2xl md:max-h-[calc(100dvh-56px)] animate-in slide-in-from-bottom-4 md:slide-in-from-right-4`
- Identical drag handle bar markup
- Identical backdrop markup
- Identical close button SVG (X icon path `M1 1l12 12M13 1L1 13`)

Strong candidate for `<DetailDrawer title onClose>{children}</DetailDrawer>` wrapper component.

### Accent Color System

11 departments each have CSS variables in `globals.css`:
- `--accent-<code>` (e.g., `--accent-cs: #1D4ED8`)
- `--accent-<code>-bg` (light tint surface, e.g., `--accent-cs-bg: #EFF6FF`)
- `--accent-rgb-<code>` (RGB triplet for `rgba()` opacity)

| Code | Hex | Department |
|------|-----|------------|
| `cs` | #1D4ED8 | Computer Science |
| `ai` | #7C3AED | Artificial Intelligence |
| `ds` | #0F766E | Data Science |
| `cy` | #B45309 | Cyber Security |
| `se` | #BE185D | Software Engineering |
| `bba` | #1D4ED8 | Bachelor of Business Admin (same as CS) |
| `af` | #047857 | Accounting and Finance |
| `ba` | #D97706 | Business Analytics |
| `ft` | #9333EA | FinTech |
| `ee` | #E11D48 | Electrical Engineering |
| `ce` | #0284C7 | Computer Engineering |
| `lf` | #EA580C | Lost & Found (orange) |

Components read via `var(--accent-${dept.toLowerCase()})` and `var(--accent-${dept.toLowerCase()}-bg)`.

⚠️ `DepartmentPill.tsx:7-19` has a hardcoded map for 11 depts — adding a new dept requires editing BOTH this map AND the CSS variables in `globals.css`.

⚠️ `lib/faculty.ts` `DEPT_ACCENT` has questionable mappings: `MS → 'bba'` and `SH → 'ds'` (no MS or SH accent defined in CSS).

### Two Parallel CSS Token Systems

| Token Family | Used By | Example |
|--------------|---------|---------|
| Custom hex (`--color-bg`, `--accent-cs`, `--shadow-card`) | Bespoke components (Header, cards, drawers) | `bg-[var(--color-bg)]` |
| Shadcn oklch (`--background`, `--primary`, `--card`) | Radix UI primitives (AlertDialog, Toast) | `bg-background`, `text-foreground` |

Components must consciously pick which system to use; no unification plan.

## 5. Component → Page Usage Matrix

| Component | Used By Pages |
|-----------|---------------|
| `Header` | All 13 pages |
| `ThemeToggle` | All 13 pages (via Header + directly in 7 pages) |
| `DesktopTicker` | `/` (landing), `/home` |
| `Navbar` | All pages (global mount in `layout.tsx`) — desktop only |
| `FloatingMenu` | All pages (global mount) — mobile only |
| `FeedbackWidget` | All pages (global mount) |
| `GlobalShortcuts` | All pages (global mount) |
| `ExamCard` | `/schedule`, `/custom` |
| `ExamDetail` | `/schedule`, `/custom` |
| `TimetableCard` | `/timetable`, `/timetable/custom` |
| `TimetableDetail` | `/timetable`, `/timetable/custom` |
| `TimetableExportButton` | `/timetable`, `/timetable/custom` |
| `ExportButton` | `/schedule`, `/custom` |
| `SearchBar` | `/schedule`, `/custom`, `/timetable`, `/timetable/custom` |
| `EmptyState` | `/schedule`, `/custom`, `/timetable`, `/timetable/custom` |
| `DepartmentPill` | `/home` only |
| `MakeupDaysSidebar` | `/timetable`, `/timetable/custom` |
| `FacultyCard` | `/faculty` |
| `FacultyDetail` | `/faculty` |
| `EventsCalendar` | `/events` |
| `TimetableOptimizer` | `/timetable/optimizer` |
| `ResolutionDetail` | `/lost-found` |
| `CountdownBadge` | (internal — used by `ExamCard`) |
