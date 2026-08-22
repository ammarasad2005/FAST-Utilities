---
doc: 07-UI-BLUEPRINTS/02-home
generated: 2026-08-09T16:05:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# UI Blueprint — `/home` (Setup Hub)

**Page file:** `src/app/home/page.tsx:1-1236`
**Render mode:** `'use client'` (`src/app/home/page.tsx:1`)
**Layout:** Mounted inside root `src/app/layout.tsx` (global Navbar / FloatingMenu / FeedbackWidget / GlobalShortcuts / Toaster).

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
{state guard}   Conditional render
[link → /path]  Navigation target on click
```

## Desktop (≥1024px) — Default State (feature=timetable, mode=default)

`src/app/home/page.tsx:1013-1209` renders the desktop branch (`hidden md:flex`). Header carries the 4-tab feature toggle (`src/app/home/page.tsx:1019-1037`). Below that, a two-column split: LEFT 50% (`w-1/2 lg:w-[55%]`) hero+typing+`<DesktopTicker>`+social links; RIGHT (`flex-1`) renders a gradient-bordered form card with all selectors.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo]    [ ◉ Timetable │ ◉ Exam Finder │ ◉ Free Rooms │ ◉ Faculty Info ]              🐼 in 🌓 ◉  │ ← Header + feature toggle
├───────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────┤
│ LEFT 50% / lg:55%  (px-10 lg:px-16 xl:px-24)      │ RIGHT flex-1 (flex items-center justify-center px-10 lg:px-16)│
│ ┌─ dot-grid texture ──────────────────────────┐   │                                                                │
│ │ FAST Isb Utilities — Timetable Portal       │   │  ╭── gradient border (purple-orange) ───────────────────╮     │
│ │                                              │   │  │ ┌── form card (max-w-sm, p-8 lg:p-10) ──────────────┐ │     │
│ │ Find your                                    │   │  │ │  MODE                                              │ │     │
│ │ class timetable.                             │   │  │ │  [◉ Default Courses] [◉ Custom Courses]            │ │     │
│ │                                              │   │  │ │                                                    │ │     │
│ │ Select your batch, department and section.   │   │  │ │  BATCH YEAR                                        │ │     │
│ │ Your weekly class timetable — every slot,    │   │  │ │  [───────── 2024 ▾]                                │ │     │
│ │ room, and timing — instantly.▮              │   │  │ │                                                    │ │     │
│ │                                              │   │  │ │  DEPARTMENT (5 FSC pills)                          │ │     │
│ │ ┌─ <DesktopTicker> ─────────────────────┐   │   │  │ │  [CS] [AI] [DS] [CY] [SE]                          │ │     │
│ │ │ ⏱ 14:32 · Next: CS-101 @ 15:00         │   │   │  │ │  Computer Science                                  │ │     │
│ │ └────────────────────────────────────────┘   │   │  │ │                                                    │ │     │
│ │                                              │   │  │ │  SECTION (pills)                                   │ │     │
│ │ 🐙 GitHub    in LinkedIn                     │   │  │ │  [A] [B] [BX] [A1] …                              │ │     │
│ └──────────────────────────────────────────────┘   │  │ │                                                    │ │     │
│                                                    │  │ │  [Save these Preferences]  (only if userConfig)    │ │     │
│                                                    │  │ │  [View my timetable →]   ← #cta-button             │ │     │
│                                                    │  │ └────────────────────────────────────────────────────┘ │     │
│                                                    │  │  Time-Table for Spring 2026.                          │     │
│                                                    │  ╰───────────────────────────────────────────────────────╯     │
└───────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────┘
```

### Feature = `rooms` (desktop)
```
RIGHT card replaces mode/batch/dept/section selectors with a single roomsCard (src/app/home/page.tsx:551-570):
  📌 Free Rooms Finder
  The Free Rooms Finder works across all batches and departments.
  Pick a day & time slot — or generate a full weekly vacancy calendar.
CTA label becomes "Find Free Rooms →"
```

### Feature = `faculty` (desktop)
```
RIGHT card replaces form with 9 dept pill-buttons in 3-col grid (src/app/home/page.tsx:1155-1172):
  [CS] [AIDS] [SE]
  [CY]  [EE]  [CE]
  [SH]  [AF]  [MS]
Clicking any pill → router.push(`/faculty?dept=${d}`)
CTA label becomes "Browse Faculty →"
```

### Feature = `exams` + summer mode (desktop)
```
RIGHT card renders summerCheckboxList (src/app/home/page.tsx:718-830):
  ┌─────────────────────────────────────┐
  │ Select Exam Courses                 │
  │ [FSC (12)] [FSM (3)] [FSE (2)]      │ ← school tabs (only if >1 school has courses)
  │                                     │
  │ ☐ Algorithm Analysis      [A ▾]     │
  │ ☐ Database Systems        [A ▾]     │
  │ ☐ Operating Systems       [B ▾]     │
  │ ☐ Computer Networks       [BX ▾]    │
  │  …                                  │
  └─────────────────────────────────────┘
CTA label becomes "View my exams →"  (routes to /schedule?batch=Summer)
```

## Mobile (≤430px) — Default State (feature=timetable, mode=default)

`src/app/home/page.tsx:917-1008` renders mobile branch (`md:hidden`). Header (no children) + 4-button sub-header toggle + hero + selectors + CTA.

```
┌─────────────────────────────────┐
│ [logo]                🐼 in 🌓 │  ← Header (no centre children on mobile)
├─────────────────────────────────┤
│ [◉Timetable│◉Exams│◉Rooms│◉Fac.]│  ← 4-button feature sub-header (src/app/home/page.tsx:926-943)
├─────────────────────────────────┤
│ Find your                       │
│ class timetable.                │
│ ─────────────────               │
│                                 │
│ MODE                            │
│ [◉ Default] [◉ Custom]          │
│ All classes for your batch…     │
│                                 │
│ BATCH YEAR                      │
│ [───── 2024 ▾]                  │
│                                 │
│ DEPARTMENT                      │
│ [CS] [AI] [DS] [CY] [SE]        │
│ Computer Science                │
│                                 │
│ SECTION                         │
│ [A] [B] [BX] [A1]              │
│                                 │
│ [Save these Preferences]        │  ← only if userConfig present
│ [View my timetable →]           │  ← #cta-button (h-13)
└─────────────────────────────────┘
                  ↑ FloatingMenu (mobile FAB)
```

### Mobile — feature=`exams` summer mode
```
┌─────────────────────────────────┐
│ …header + sub-header…           │
├─────────────────────────────────┤
│ Find your exam schedule.        │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Select Exam Courses         │ │  ← scrollable (max-h-[300px])
│ │ [FSC (12)] [FSM (3)] [FSE]  │ │
│ │ ☐ Algo Analysis    [A ▾]    │ │
│ │ ☐ DB Systems       [A ▾]    │ │
│ │ …                            │ │
│ └─────────────────────────────┘ │
│ [View my exams →]               │
└─────────────────────────────────┘
```

## Key Interactive Elements (annotated)

| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Desktop feature toggle button `id=desktop-feature-{f}` | `() => { setFeature(f); setMode('default'); }` | Switches active feature tab | `src/app/home/page.tsx:1020-1036` |
| Mobile feature sub-header button | `() => { setFeature(f); setMode('default'); }` | Switches active feature tab | `src/app/home/page.tsx:927-942` |
| Mode toggle (`default`/`custom`) | `setMode(m)` | Toggles mode; affects which CTA route is taken | `src/app/home/page.tsx:519-536` |
| Batch `<select id=batch-select>` | `e => { setBatch(e.target.value); setDept(''); setSection(''); }` | Resets downstream selectors | `src/app/home/page.tsx:582-590` |
| School `<select id=school-select>` (exams only) | `e => { setSchool(s); if (s!=='-') setDept(SCHOOL_DEPARTMENTS[s][0]); else setDept(''); }` | Auto-picks first dept for school | `src/app/home/page.tsx:610-619` |
| Department pill (exams + timetable) | `() => setDept(d)` (via `<DepartmentPill onClick>`) | Selects dept; resets section in timetable mode | `src/app/home/page.tsx:647,663` |
| Section pill (timetable only) | `() => setSection(s)` | Selects section | `src/app/home/page.tsx:690` |
| Save Preferences button (`prefButton`) | `userConfig ? clearPreferences : savePreferences` | Writes/removes `fsc_user_config` localStorage | `src/app/home/page.tsx:832-843` |
| CTA button `id=cta-button` | `handleSubmit` | Routes per feature/mode (see transitions) | `src/app/home/page.tsx:383-420,881-905` |
| Faculty feature dept pill (mobile + desktop) | `() => router.push(\`/faculty?dept=${d}\`)` | Soft-nav to faculty with pre-selected dept | `src/app/home/page.tsx:974,1161` |
| Summer course checkbox | `handleToggleSummerCourse(sheetName, defaultSection)` | Toggles entry in `selectedSummerCourses` | `src/app/home/page.tsx:330-340` |
| Summer course section `<select>` | `handleSummerSectionChange(sheetName, val)` | Updates section for selected course | `src/app/home/page.tsx:342-347` |
| Summer school tab button | `() => setSelectedSummerSchool(schoolCode)` | Switches school tab in summer exams view | `src/app/home/page.tsx:739-756` |
| Exclusivity error modal "Got it" button | `() => setExclusivityError(null)` | Closes modal | `src/app/home/page.tsx:1224-1230` |
| Header logo `<Link href="/">` | n/a | Soft-nav to `/` | `src/components/Header.tsx:20` |
| Header ThemeToggle | `toggleTheme()` | Cycles `data-theme` | `src/components/ThemeToggle.tsx` |

## Conditional States

### `{isSummerMode === true}` — site-wide summer flag
```
- Replaces batch/school/dept/section selectors with summerCheckboxList
- CTA for exams routes to /schedule?batch=Summer (instead of /schedule?batch&school&dept)
- CTA for timetable routes to /timetable (no query — schedule reads from fsc_summer_courses localStorage)
- Triggered by checkSemesterType() in src/app/home/page.tsx:158-195 via supabase.from('semester_settings').eq('id',1).single()
```

### `{mode === 'custom'}`
```
- Hides batchSelector, schoolSelector, deptPills, sectionPills (they all gate on `mode === 'default'`)
- CTA for exams routes to /custom
- CTA for timetable routes to /timetable/custom
- Mode selector still visible (showing "Custom Courses" active)
```

### `{userConfig !== null}` (timetable feature, default mode)
```
- Replaces batchSelector/schoolSelector/deptPills/sectionPills with userConfigView (src/app/home/page.tsx:846-878)
  - Shows a 3-cell grid: [batch | dept(accent) | section(accent)] (read-only)
- prefButton label switches to "Clear Saved Preferences" (red border)
```

### `{feature === 'rooms'}`
```
- modeSelector hidden (mode irrelevant for rooms)
- Rooms card replaces form (see Desktop subsection above)
- CTA label = "Find Free Rooms →"; ctaDisabled = false; routes to /rooms
```

### `{feature === 'faculty'}`
```
- modeSelector hidden
- Faculty dept-pill grid replaces form (9 depts in 3-col)
- CTA label = "Browse Faculty →"; ctaDisabled = false; routes to /faculty
```

### `{exclusivityError !== null}` — modal overlay (z-50)
```
┌────────────────────────────────────┐
│         ⚠️ Action Required          │
│                                    │
│  Oops! You already have some Saved │
│  Bundles in the Custom Courses     │
│  section. To save these default    │
│  preferences, please go back and   │
│  clear your custom bundles first…  │
│                                    │
│        [    Got it    ]            │
└────────────────────────────────────┘
Triggered when savePreferences() detects non-empty fsc_custom_bundles (src/app/home/page.tsx:426-437, 1210-1233)
```

### `{selectedSummerSchool}` empty for chosen feature
```
If summerAvailableSchools doesn't include selectedSummerSchool, useEffect auto-switches
to first available school (src/app/home/page.tsx:321-327).
```

### `{!isTypingComplete}` — typing animation
```
Desktop hero shows blinking cursor (animate-pulse) right of displayText.
Mobile hero shows full INTRO_TEXT immediately (no animation, src/app/home/page.tsx:947-959).
Reset whenever `feature` changes (useEffect dep, src/app/home/page.tsx:202-212).
```

## Breakpoint Behavior

| Breakpoint | What changes | Source |
|------------|--------------|--------|
| `md:` (768px) | Toggle between mobile (`md:hidden` main at line 917) and desktop (`hidden md:flex` div at line 1013). Header centre feature toggle exists in BOTH branches but styled differently (h-10 mobile / h-8 desktop). | `src/app/home/page.tsx:917,1013` |
| `lg:` (1024px) | Desktop LEFT column `w-1/2` → `lg:w-[55%]`. Padding `px-10` → `lg:px-16` → `xl:px-24`. | `src/app/home/page.tsx:1046` |
| `sm:` (640px) | Department pills: `grid-cols-3 sm:grid-cols-5` (5-across on ≥640px). | `src/app/home/page.tsx:645,661` |
| Mobile-only sub-header | 4-button feature toggle is `flex` on mobile (src/app/home/page.tsx:926), desktop replaces it with header-centre nav (line 1019). | `src/app/home/page.tsx:919-944` |
| `Suspense fallback={null}` | Wraps `<FeatureActivator>` (which uses `useSearchParams()`) to satisfy Next.js 14 App Router. | `src/app/home/page.tsx:911-913` |

## Screenshot References

- Desktop default (timetable tab): `[screenshot: desktop/02-home.png]`
- Desktop exams tab: `[screenshot: desktop/02b-home-exams.png]`
- Mobile default (timetable tab): `[screenshot: mobile/02-home.png]`
- Mobile exams tab: `[screenshot: mobile/02b-home-exams.png]`

## State Transitions

### CTA routing matrix (`handleSubmit`, `src/app/home/page.tsx:383-420`)

```
{feature='rooms'}                    → router.push('/rooms')
{feature='faculty'}                  → router.push('/faculty')
{feature='exams',  summer=true}      → router.push('/schedule?batch=Summer')
{feature='exams',  summer=false, mode='default'} → router.push('/schedule?batch=X&school=Y&dept=Z')
{feature='exams',  summer=false, mode='custom'}  → router.push('/custom')
{feature='timetable', summer=true}   → router.push('/timetable')   (reads fsc_summer_courses localStorage)
{feature='timetable', summer=false, mode='default'} → router.push('/timetable?batch=X&dept=Y&section=Z')
{feature='timetable', summer=false, mode='custom'}  → router.push('/timetable/custom')
```

### Page-level state machine

```
URL ?feature=X ──useSearchParams()──► FeatureActivator sets feature=X on mount (line 57-67)
                                  └─ if X invalid, feature stays 'timetable' (default)

feature change ──useEffect──► reset displayText + isTypingComplete=false + re-run typing anim
                              (src/app/home/page.tsx:202-212)

mode change ────────────────► if mode='default' && userConfig → show userConfigView (read-only)
                              else if mode='default' → show batch/school/dept/section selectors
                              else (mode='custom') → show neither (CTA goes to /custom or /timetable/custom)

batch/dept change ─────────► useEffect resets section='' (unless userConfig loaded, line 358-363)
feature change to 'exams' ─► useEffect re-validates batch against batches[] (line 368-371)
summer mode + 'exams' ─────► useEffect auto-switches selectedSummerSchool if current has 0 courses (line 321-327)

savePreferences() ─────────► if fsc_custom_bundles non-empty → setExclusivityError(msg), bail
                              else → localStorage.setItem('fsc_user_config', config); setUserConfig(config)

clearPreferences() ────────► localStorage.removeItem('fsc_user_config'); setUserConfig(null)
                              setBatch('-'); setSchool('-'); setDept(''); setSection('')

URL ?feature=faculty + click dept pill ─► router.push('/faculty?dept=X')
```
