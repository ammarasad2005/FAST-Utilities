---
doc: 08-RESPONSIVE-BEHAVIOR
generated: 2026-08-09T16:12:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# 08 — Responsive Behavior

## 1. Tailwind Breakpoint Configuration

Per `tailwind.config.ts:1-67` — uses Tailwind defaults (no custom `screens`):

| Prefix | Min-width | Typical device |
|--------|-----------|----------------|
| (default) | 0 | Mobile portrait (≤430px) |
| `sm:` | 640px | Mobile landscape / small tablet |
| `md:` | 768px | Tablet / small laptop |
| `lg:` | 1024px | Laptop |
| `xl:` | 1280px | Desktop |
| `2xl:` | 1536px | Large desktop |

The primary breakpoint is `md:` (768px) — almost every page renders entirely separate React trees for `<md:hidden>` (mobile) and `<hidden md:flex>` (desktop).

## 2. Mobile Detection Hooks

| Hook | File | Breakpoint | Used By |
|------|------|------------|---------|
| `useMobileSwipe` | `src/hooks/useMobileSwipe.ts:1-258` | 768px (guards `window.innerWidth >= 768`) | 7 detail drawer components + `/rooms` page directly |
| `useIsMobile` | `src/hooks/use-mobile.ts:1-19` | 768px (`matchMedia('(max-width: 767px)')`) | `/lost-found` page only |

Both hooks use 768px as the mobile/desktop boundary (matches Tailwind `md:`).

## 3. Per-Page Responsive Behavior

| Page | Mobile Pattern | Desktop Pattern | Primary Breakpoint | Notes |
|------|----------------|-----------------|---------------------|-------|
| `/` (landing) | Separate tree: `<main className="md:hidden">` — 2-col feature grid, intro text, footer with 🔑 | Separate tree: `<div className="hidden md:flex">` — 2-col hero+features (42%/58% split), dot-grid texture + ambient blur glows, DesktopTicker (live clock) | `md:` (768px) | Desktop also uses `lg:` (40%) and `xl:` (px-20) for refinement |
| `/home` | Separate tree: feature subheader pill-bar (timetable/exams/rooms/faculty), big H1, form card with mode/batch/school/dept/section selectors, CTA | Separate tree: Header with feature toggle (centre nav), left hero column (with dot-grid + ambient blurs + DesktopTicker + socials), right gradient-bordered form card | `md:` (768px) | Faculty quick-buttons shown in both mobile and desktop |
| `/schedule` | Single tree: `<Header>`, sticky search, `#print-area` with `md:grid md:grid-cols-2 lg:grid-cols-3` | Same tree, grid kicks in at `md:` and `lg:` | `md:` (768px) for grid; `lg:` (1024px) for 3-col | Sidebar `aside.hidden.md:flex` appears at md: |
| `/timetable` | Single tree: sticky search with mobile view/repeats toggles inline | Same tree, sidebar `aside.hidden.md:flex.md:w-56.lg:w-64` appears | `md:` (768px) for sidebar; `lg:` (1024px) for wider sidebar | GridView: sticky time column + day headers, absolute-positioned class blocks |
| `/timetable/custom` | Single tree: editor in `<div className="md:hidden">` section | Same tree, sidebar `aside.hidden.md:flex.md:w-[350px].lg:w-[400px]` | `md:` (768px) | Wider sidebar than other pages |
| `/timetable/optimizer` | Single tree: max-w-5xl container, form fields stack vertically | Same tree, layout adapts naturally | (no major breakpoint) | Verification drawer uses `useMobileSwipe` (60dvh) |
| `/custom` | Single tree: editor in `md:hidden` section | Same tree, sidebar `aside.hidden.md:flex.md:w-[350px].lg:w-[400px]` | `md:` (768px) | Mirror of `/timetable/custom` |
| `/semester` | Separate tree: MobileHero + KeyDatesSection (timeline) + CalendarsSection + HolidaysSection | Separate tree: DesktopHero + 3-col grid (`lg:flex-row`) — Col1: KeyDates (flex 1.2), Col2: Holidays (hidden lg:flex, flex 0.6), Col3: Calendars (lg:sticky lg:top-20) | `md:` (768px) for layout swap; `lg:` (1024px) for 3-col | CalendarsSection: `grid-cols-2 md:grid-cols-3` |
| `/faculty` | Single tree: mobile dept filter strip (horizontal scroll), grid `grid-cols-1`, mobile-only view-mode toggle (grid=list) | Same tree, sidebar `aside.hidden.md:flex.md:w-56.lg:w-64` with dept buttons, grid `md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` | `md:` (768px) for sidebar + 2-col grid; `lg:` for 3-col; `xl:` for 4-col | PAGE_SIZE=24, only current page renders `<img>` |
| `/rooms` | Single tree: hero, control card, results | Same tree, sidebar `aside.hidden.md:flex.md:w-56.lg:w-64` | `md:` (768px) for sidebar | RoomDetail uses `useMobileSwipe` (85dvh) on mobile, right panel on desktop |
| `/events` | Separate tree: hero, 3-col stats, EventsCalendar, ongoing+upcoming snapshots (mobile shows 6 upcoming) | Separate tree: grid `xl:grid-cols-[minmax(0,1fr)_360px]` — left: hero + EventsCalendar; right: Ongoing + Upcoming (`xl:sticky xl:top-20`, scrollable max-h-[54dvh]) | `md:` (768px) for layout swap; `xl:` (1280px) for 2-col with sidebar | EventsCalendar grid: 7-col, mobile cells 54px tall, desktop 132px tall |
| `/lost-found` | Single tree with massive conditional rendering. SubViews: list, detail, report, history, resolution. Mobile: NotificationBell = right-side drawer | Same tree. Desktop: NotificationBell = absolute dropdown. FilterSidebar = left column (always visible) | `md:` (768px) | ItemCard grid: mobile horizontal snap-scroll OR vertical list (toggle); desktop always grid |
| `/admin` | Single tree: login screen centered, dashboard tabs stack | Same tree: login centered, dashboard tabs top bar, 5-card stats grid `grid-cols-2 md:grid-cols-5` | `md:` (768px) | Settings form: 2-col on `sm:`, single col on mobile |

## 4. Global Mount Behavior

Per `src/app/layout.tsx:62-88`:

| Component | Mobile | Desktop | Source |
|-----------|--------|---------|--------|
| `Navbar` | ❌ Hidden (`hidden md:flex` in `Navbar.tsx:34`) | ✅ Floating pill nav, bottom-centered | `src/components/Navbar.tsx:34` |
| `FloatingMenu` | ✅ FAB with arc menu (`md:hidden` in `FloatingMenu.tsx:355`) | ❌ Hidden | `src/components/FloatingMenu.tsx:355` |
| `FeedbackWidget` | ✅ Right-edge vertical trigger | ✅ Same | Always rendered |
| `GlobalShortcuts` | ✅ (invisible) | ✅ (invisible) | Always rendered |
| `Header` (per-page) | ✅ Always | ✅ Always | Mobile shows GitHub+LinkedIn icons in header; desktop shows them in page footer |
| `ThemeToggle` | ✅ In Header | ✅ In Header | Always rendered |
| `Toaster` | ✅ Radix toast | ✅ Radix toast | Always rendered |
| `DesktopTicker` | ❌ Hidden (`hidden md:block` in `DesktopTicker.tsx:395`) | ✅ Live clock + next class | Only on `/` and `/home` |

## 5. Mobile Drawer Pattern (detail panels)

7 components + `/rooms` page use `useMobileSwipe` hook for swipe-to-close drawers.

**Mobile (≤768px):**
- Bottom sheet, default height per `defaultHeightStr` prop (60dvh, 85dvh, or 90dvh)
- Drag handle bar at top
- Touch swipe down to close (with rubber-band physics + velocity-tracked flick)
- Two-state machine: 'default' ↔ 'full' (100dvh)
- Body scroll lock (`document.body.style.overflow = 'hidden'`)
- Escape key handler
- Backdrop tap to close

**Desktop (≥768px):**
- Right-side panel (`md:right-0 md:w-96` or `md:w-[400px]`)
- Top-aligned (`md:top-14` — below sticky header)
- Max height `md:max-h-[calc(100dvh-56px)]` (header is 56px / h-13)
- Slide-in from right animation
- `useMobileSwipe` functions are no-ops on desktop

| Component | defaultHeightStr | Desktop width |
|-----------|------------------|---------------|
| `FacultyDetail` | 90dvh | 400px |
| `TimetableDetail` | 85dvh | 96 (384px) |
| `ExamDetail` | 85dvh | 96 (384px) |
| `MakeupDaysSidebar` | 60dvh | 96 (384px) |
| `EventsCalendar.EventDayDetail` | 85dvh | 400px |
| `TimetableOptimizer` verify drawer | 60dvh | 96 (384px) |
| `/rooms` RoomDetail | 85dvh | 96 (384px) |

## 6. Print Stylesheet

`src/styles/globals.css:900-934` defines `@media print` rules:

- Hide: header, footer, navbar, FloatingMenu, FeedbackWidget, all buttons, lightbox
- Show: only `.print-area` element
- Set: black text on white bg, 12pt font
- Reset: all animations to none

Only `/schedule` page wraps its content in `<div id="print-area">` (line 215), so print works only for exam schedules.

## 7. Reduced Motion Support

`src/styles/globals.css:337-342` defines `@media (prefers-reduced-motion: reduce)`:

- All animations: `animation-duration: 0.01ms`
- All transitions: `transition-duration: 0.01ms`
- Animation iteration count: 1
- Scroll behavior: auto

This silences all 14 custom keyframe animations + Tailwind animation utilities.

## 8. Safe Area Insets (mobile notches)

`src/styles/globals.css` defines:
- `.pt-safe-top { padding-top: env(safe-area-inset-top); }`
- `.pb-safe-bottom { padding-bottom: env(safe-area-inset-bottom); }`

Used by mobile layouts to avoid notches/home indicators.

## 9. Viewport Meta

Per `src/app/layout.tsx:55-60`:

```ts
export const viewport = {
  themeColor: '#FAFAF8',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',  // enables safe-area-inset
};
```

## 10. Dark Mode Trigger Paths

⚠️ Three dark-mode entry paths exist — only 2 trigger Tailwind `dark:` utilities:

| Path | Triggers CSS vars? | Triggers Tailwind `dark:`? | Source |
|------|-------------------|---------------------------|--------|
| JS-toggled `<html data-theme="dark">` | ✅ | ✅ | `src/lib/theme.tsx:21` (set by ThemeToggle) |
| System pref `@media (prefers-color-scheme: dark)` | ✅ (when `:not([data-theme="light"])`) | ❌ | `src/styles/globals.css:161-208` |
| Time-of-day heuristic (6 PM–6 AM = dark) | ✅ (sets `data-theme="dark"`) | ✅ | `src/lib/theme.tsx:21` (default if no localStorage) |

**Consequence**: A user with system-dark preference who has never toggled the theme gets CSS-variable dark mode (backgrounds, text colors) but NOT Tailwind `dark:` utility classes (which some pages use for fine-grained styling like `dark:text-rgba(255,255,255,0.88)`). Result: partial dark mode.

## 11. Verified Breakpoint Behaviors (live crawl)

| Page | Breakpoint tested | Observed behavior | Screenshot |
|------|-------------------|-------------------|------------|
| `/` | 1440×900 (desktop) | 2-col split: hero+clock left (42%), feature grid right (58%) with 3-col grid | `desktop/01-landing.png` |
| `/` | 390×844 (iPhone 14) | Single column: intro text + 2-col feature grid + footer with 🔑 | `mobile/01-landing.png` |
| `/home` | 1440×900 | 2-col split: hero+clock left, form card right | `desktop/02-home.png` |
| `/home?feature=exams` | 1440×900 | Same layout, exams tab active (summer mode shows school tabs + checklist) | `desktop/02b-home-exams.png` |
| `/schedule?batch=Summer` | 1440×900 | Sidebar + 3-col exam grid | `desktop/03-schedule-summer.png` |
| `/schedule?batch=Summer` | 390×844 | No sidebar, single col exam list | `mobile/03-schedule-summer.png` |
| `/timetable` | 1440×900 | Sidebar + list view (empty in summer without selections) | `desktop/04-timetable.png` |
| `/timetable/custom` | 1440×900 | Wide sidebar (400px) + results area | `desktop/05-timetable-custom.png` |
| `/timetable/optimizer` | 1440×900 | max-w-5xl container with form | `desktop/06-timetable-optimizer.png` |
| `/semester` | 1440×900 | 3-col grid: keydates / holidays / calendars | `desktop/07-semester.png` |
| `/faculty` | 1440×900 | Sidebar + 4-col faculty grid | `desktop/08-faculty.png` |
| `/rooms` | 1440×900 | Sidebar + control card + results placeholder | `desktop/09-rooms.png` |
| `/events` | 1440×900 | 2-col split: calendar left, snapshots right (xl:grid-cols-[1fr_360px]) | `desktop/10-events.png` |
| `/lost-found` | 1440×900 | Top stats + filter sidebar + item grid + 30s-polling notification bell | `desktop/11-lost-found.png` |
| `/lost-found` | 390×844 | Same content stacked, NotificationBell = right drawer | `mobile/11-lost-found.png` |
| `/admin` | 1440×900 | Centered login card with orange accent | `desktop/12-admin-login.png` |
