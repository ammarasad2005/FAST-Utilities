---
doc: 07-UI-BLUEPRINTS/13-admin
generated: 2026-08-09T16:05:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# UI Blueprint — `/admin` (Admin Console)

**Page file:** `src/app/admin/page.tsx:1-1821`
**Render mode:** `'use client'` (`src/app/admin/page.tsx:1`)
**Layout:** Mounted inside root `src/app/layout.tsx`. Page is **gated** (client-side only): on mount it calls `GET /api/admin/check`; if `{authenticated: false}`, renders login form instead of dashboard. ⚠️ Dashboard source (including all admin logic) ships to every browser — auth is purely a UI gate.

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

## Desktop (≥1024px) — Default State — Login Screen (`{!authenticated}`)

`src/app/admin/page.tsx:786-916` renders the login form (centered card, max-w-md).

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo]                                                                                🌓 │  ← Header (sticky, no centre children)
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                  │
│                                  ╭── glowing orange gradient (top-right) ──╮                                    │
│                                  │                                                                          │                                    │
│                                  │              ⚠️                                                          │                                    │
│                                  │        Admin Login                                                       │                                    │
│                                  │   FAST ISB Lost & Found Control Portal                                  │                                    │
│                                  │                                                                          │                                    │
│                                  │  👤 LOGIN ID                                                            │                                    │
│                                  │  [Enter administrative ID_______________]                                │                                    │
│                                  │                                                                          │                                    │
│                                  │  🔒 SECRET PASSWORD                                                     │                                    │
│                                  │  [•••••••••••••••••••••••••••••••••••]                                  │                                    │
│                                  │                                                                          │                                    │
│                                  │  {loginError? red banner with ⚠️ icon and message}                      │                                    │
│                                  │                                                                          │                                    │
│                                  │  ╔══════════════════════════════════════╗                                │                                    │
│                                  │  ║     🔒 Authenticate Portal            ║                                │                                    │
│                                  │  ╚══════════════════════════════════════╝                                │                                    │
│                                  │                                                                          │                                    │
│                                  │  ──────────────────────────────────────────                              │                                    │
│                                  │  ◁ Back to Public Hub                                                    │                                    │
│                                  ╰──────────────────────────────────────────────────────────────────────────╯                                    │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### `{checkingAuth === true}` — Auth-check loading screen
```
Full-screen spinner:
        ↻ (spinning RefreshCw, orange)
   Verifying Admin Credentials...
Source: src/app/admin/page.tsx:770-778.
```

### `{loginError !== ''}` — Login error banner
```
Inline red banner inside login form (animate height):
  ⚠️ {loginError message}
Common errors:
  - 'Both username and password are required.'
  - 'Invalid credentials.'  (from /api/admin/login 401)
  - 'Server error. Please try again.'  (catch block)
Source: src/app/admin/page.tsx:887-895.
```

## Desktop (≥1024px) — Authenticated Dashboard (`{authenticated}`) — `adminView='items'`

`src/app/admin/page.tsx:917+` renders the dashboard. Three-tab interface: Belongings Database / Student Suggestions / Semester Settings.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo]                                                                                🌓 │  ← Header (sticky)
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                  │
│  ● Admin Console                              [↻ Refresh]  [⤴ Exit Portal]                                      │
│  Logged in securely as ammarasad321993                                                                          │
│                                                                                                                  │
│  ┌── Tab Selector ──────────────────────────────────────────────────────────────────────────────────────────┐    │
│  │ 📄 Belongings Database (42)  │ 💬 Student Suggestions (15)  │ ⚙️ Semester Settings                       │    │
│  └──────────────────────────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                                                  │
│  ┌── Statistics Grid (5 cards) ─────────────────────────────────────────────────────────────────────────┐       │
│  │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                                       │       │
│  │ │ 42      │ │ 18      │ │ 24      │ │ 12      │ │ 30      │  ← Total/Lost/Found/Resolved/Active   │       │
│  │ │Total    │ │Lost     │ │Found    │ │Resolv✓  │ │Active ⚠│                                       │       │
│  │ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘                                       │       │
│  └────────────────────────────────────────────────────────────────────────────────────────────────────────┘       │
│                                                                                                                  │
│  ┌── Controls bar (search + filters) ────────────────────────────────────────────────────────────────┐       │
│  │ 🔍 [Search database by title, description, location…]                            ✕               │       │
│  │                [Category ▾]  [Type ▾]  [Status ▾]                                                  │       │
│  └────────────────────────────────────────────────────────────────────────────────────────────────────┘       │
│                                                                                                                  │
│  ┌── Items Records Database (42 listed) ─────────────────────────────────────────────────────────────┐       │
│  │ ┌────────────────────────────────────────────────────────────────────────────┬───────────────────┐    │       │
│  │ │ [img] [LOST] [Electronics] [Active]                                        │ [Mark Resolved]  │    │       │
│  │ │ Black Wallet                                                                │ [Delete]         │    │       │
│  │ │ Lost near cafeteria…                                                        │                  │    │       │
│  │ │ 📍 Cafeteria  📅 9 Aug  👤 i231234@…                                        │                  │    │       │
│  │ ├────────────────────────────────────────────────────────────────────────────┼───────────────────┤    │       │
│  │ │ [img] [FOUND] [Documents] [Resolved ✓]                                     │ [Re-activate]    │    │       │
│  │ │ National ID Card                                                            │ [Delete]         │    │       │
│  │ │ Found in library…                                                           │                  │    │       │
│  │ │ 📍 Library  📅 8 Aug  👤 anonymous                                          │                  │    │       │
│  │ └────────────────────────────────────────────────────────────────────────────┴───────────────────┘    │       │
│  │ …                                                                                                     │       │
│  └────────────────────────────────────────────────────────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### `{filteredItems.length === 0}` — Empty state (items tab)
```
Centered inside Items Records Database:
   🔍 (animate-bounce, orange)
   No database entries found
   Try widening your query filter conditions
Source: src/app/admin/page.tsx:1230-1237.
```

### Delete confirmation dialog (`deleteConfirmOpen === true`)
```
AlertDialog:
┌──────────────────────────────────────────┐
│ Confirm Deletion                         │
│                                          │
│ Are you sure you want to permanently     │
│ delete "Black Wallet"? This action       │
│ cannot be undone.                        │
│                                          │
│ [Cancel]    [Yes, Delete Permanently]    │
└──────────────────────────────────────────┘
On confirm: handleDeleteConfirm() → DELETE /api/lost-found/{id}
  → on success: toast 'Item Deleted'; setItems(filter out)
Source: src/app/admin/page.tsx:698-720, AlertDialog markup inline.
```

## Desktop (≥1024px) — Authenticated Dashboard — `adminView='feedback'`

`src/app/admin/page.tsx:~1400-1560` renders the feedback tab.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo]                                                                                🌓 │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ● Admin Console                              [↻ Refresh]  [⤴ Exit Portal]                                      │
│                                                                                                                  │
│  ┌── Tab Selector ──────────────────────────────────────────────────────────────────────────────────────────┐    │
│  │ 📄 Belongings Database (42)  │ 💬 Student Suggestions (15)  │ ⚙️ Semester Settings                       │    │
│  └──────────────────────────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                                                  │
│  ┌── Controls bar ─────────────────────────────────────────────────────────────────────────────────────┐       │
│  │ 🔍 [Search feedback…]                                    [Category ▾]  [Rating ▾]                    │       │
│  └────────────────────────────────────────────────────────────────────────────────────────────────────────┘       │
│                                                                                                                  │
│  ┌── Student Suggestions Log (15 submissions) ────────────────────────────────────────────────────────┐       │
│  │ ┌────────────────────────────────────────────────────────────────────────────┬───────────────────┐    │       │
│  │ │ 🐛 [Bug Report]  😄 Rating: 5/5                                             │ [Delete]         │    │       │
│  │ │ "The timetable page crashes when I…"                                        │                  │    │       │
│  │ │ 👤 i231234@isb.nu.edu.pk  📅 9 Aug, 14:32                                   │                  │    │       │
│  │ ├────────────────────────────────────────────────────────────────────────────┼───────────────────┤    │       │
│  │ │ 💡 [Suggestion]  😐 Rating: 3/5                                              │ [Delete]         │    │       │
│  │ │ "Would love a dark mode toggle on the…"                                     │                  │    │       │
│  │ │ 👤 Anonymous Student  📅 8 Aug, 11:15                                       │                  │    │       │
│  │ └────────────────────────────────────────────────────────────────────────────┴───────────────────┘    │       │
│  │ …                                                                                                     │       │
│  └────────────────────────────────────────────────────────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### `{filteredFeedback.length === 0}` — Empty state (feedback tab)
```
Centered inside Student Suggestions Log:
   💬 (animate-bounce, orange)
   No feedback entries found
   No suggestions registered under these filters yet
Source: src/app/admin/page.tsx:1525-1532.
```

### Feedback delete confirmation (`feedbackDeleteConfirmOpen === true`)
```
Same AlertDialog pattern as items:
  Confirm Deletion
  Are you sure you want to permanently delete this feedback submission?
  [Cancel]    [Yes, Delete Permanently]
On confirm: handleFeedbackDeleteConfirm() → DELETE /api/feedback/{id}
Source: src/app/admin/page.tsx:722-760.
```

## Desktop (≥1024px) — Authenticated Dashboard — `adminView='settings'`

`src/app/admin/page.tsx:1560-1821` renders the settings tab. Single column, max-w-3xl.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [logo]                                                                                🌓 │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ● Admin Console                              [↻ Refresh]  [⤴ Exit Portal]                                      │
│                                                                                                                  │
│  ┌── Tab Selector ──────────────────────────────────────────────────────────────────────────────────────────┐    │
│  │ 📄 Belongings Database (42)  │ 💬 Student Suggestions (15)  │ ⚙️ Semester Settings                       │    │
│  └──────────────────────────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                                                  │
│  ┌── Semester Configurations (max-w-3xl) ─────────────────────────────────────────────────────────────┐       │
│  │                                                                                                  │       │
│  │  Active Semester Selector                                                                        │       │
│  │  [───── Regular Semester ▾]   (or Summer Semester)                                               │       │
│  │                                                                                                  │       │
│  │  Active Semester Name                                                                            │       │
│  │  [Spring 2026____________________]                                                               │       │
│  │  Name used globally across all headers, footers, lists, and pages.                              │       │
│  │                                                                                                  │       │
│  │  Google Sheets URL                                                                               │       │
│  │  [https://docs.google.com/spreadsheets/d/…/edit#gid=…____________________________________]       │       │
│  │  URL of the Google Sheet containing the timetable data.                                         │       │
│  │                                                                                                  │       │
│  │  [↻ Hard Refetch Timetable]   (disabled if no URL)                                              │       │
│  │  Triggers /api/admin/refetch-timetable → fires GitHub Actions update-timetable.yml workflow     │       │
│  │                                                                                                  │       │
│  │  Explicit Sheet Name Mappings (Optional)                                                        │       │
│  │  ┌──────────────┬──────────────┐                                                                 │       │
│  │  │ Monday       │ Tuesday      │                                                                 │       │
│  │  │ [Auto-det…]  │ [Auto-det…]  │                                                                 │       │
│  │  ├──────────────┼──────────────┤                                                                 │       │
│  │  │ Wednesday    │ Thursday     │                                                                 │       │
│  │  │ [__________] │ [__________] │                                                                 │       │
│  │  ├──────────────┼──────────────┤                                                                 │       │
│  │  │ Friday       │ Saturday     │                                                                 │       │
│  │  │ [__________] │ [__________] │                                                                 │       │
│  │  └──────────────┴──────────────┘                                                                 │       │
│  │                                                                                                  │       │
│  │  {semesterType === 'regular' ?                                                                  │       │
│  │    Course → Batch/Dept Mappings                                                                 │       │
│  │    [☑ Use Admin Mappings]  [Load from Code]                                                     │       │
│  │    ┌── Batch Tabs ──────────────────────────────┐                                               │       │
│  │    │ [2025] [2024] [2023] [2022]                │                                               │       │
│  │    └────────────────────────────────────────────┘                                               │       │
│  │    ┌── CS ──────────────────────────────────────┐                                               │       │
│  │    │ [Programming Fundamentals ×] [OOP ×] …     │                                               │       │
│  │    │ [Add course name…] [+]                      │                                               │       │
│  │    └────────────────────────────────────────────┘                                               │       │
│  │    ┌── SE ──────────────────────────────────────┐                                               │       │
│  │    │ …                                          │                                               │       │
│  │    └────────────────────────────────────────────┘                                               │       │
│  │    (5 dept rows: CS, SE, AI, DS, CY)                                                            │       │
│  │  :                                                                                                │       │
│  │    Summer Course Catalog                                                                         │       │
│  │    [↻ Refresh Summer Catalog from Google Sheets]                                                │       │
│  │    ┌── Catalog entries (editable rows) ───────────────────────────────────────────────────┐      │       │
│  │    │ SheetName | DisplayName | Hidden ☐ | ExamOnly ☐ | School [FSC ▾]                     │      │       │
│  │    │ [Add new row]                                                                          │      │       │
│  │    └──────────────────────────────────────────────────────────────────────────────────────┘      │       │
│  │  }                                                                                                │       │
│  │                                                                                                  │       │
│  │  ╔════════════════════════════════════════════════╗                                              │       │
│  │  ║       💾 Save Settings                         ║                                              │       │
│  │  ╚════════════════════════════════════════════════╝                                              │       │
│  └──────────────────────────────────────────────────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### `{loadingSettings === true}` — Settings loading spinner
```
Inside settings card:
   ↻ (spinning RefreshCw, orange)
   Loading current settings...
Source: src/app/admin/page.tsx:1604-1609.
```

### `{savingSettings === true}` — Save button spinner
```
"Save Settings" button shows spinning RefreshCw + is disabled during the supabase update.
Source: src/app/admin/page.tsx:handleSaveSettings.
```

### `{refreshingCatalog === true}` — Summer catalog refresh spinner
```
"Refresh Summer Catalog" button shows spinning RefreshCw during Google Sheets CSV fetch + parse.
Source: src/app/admin/page.tsx:handleRefreshSummerCatalog.
```

### `{refetchingTimetable === true}` — Hard refetch spinner
```
"Hard Refetch Timetable" button shows spinning RefreshCw during POST /api/admin/refetch-timetable.
Source: src/app/admin/page.tsx:handleHardRefetchTimetable.
```

## Mobile (≤430px) — Default State

Login screen and dashboard both render in single-column stack. Tab selector wraps. Statistics grid switches to 2-col (`grid-cols-2 lg:grid-cols-5`). Controls bar switches to `flex-col md:flex-row`.

```
┌─────────────────────────────────┐
│ [logo]                  🌓 ◉    │  ← Header (sticky)
├─────────────────────────────────┤
│ ● Admin Console                 │
│ Logged in as ammarasad321993    │
│ [↻ Refresh] [⤴ Exit Portal]    │
├─────────────────────────────────┤
│ [📄 DB (42)] [💬 Sugg (15)]     │  ← tab selector wraps
│ [⚙️ Settings]                   │
├─────────────────────────────────┤
│ ┌────┬────┐                     │  ← 2-col stats grid
│ │ 42 │ 18 │                     │
│ │Tot │Lost│                     │
│ ├────┼────┤                     │
│ │ 24 │ 12 │                     │
│ │Fnd │Res │                     │
│ ├────┼────┤                     │
│ │ 30 │    │                     │
│ │Act │    │                     │
│ └────┴────┘                     │
├─────────────────────────────────┤
│ 🔍 [Search…]                    │
│ [Category ▾] [Type ▾] [Status ▾]│  ← wraps on mobile
├─────────────────────────────────┤
│ ┌── item row ──────────────────┐│  ← single column, full-width
│ │ [img] [LOST] [Electronics]   ││
│ │ Black Wallet                 ││
│ │ …                            ││
│ │ [Mark Resolved] [Delete]     ││  ← buttons stack below on mobile
│ └──────────────────────────────┘│
│ …                               │
└─────────────────────────────────┘
                  ↑ FloatingMenu (mobile FAB)
```

## Key Interactive Elements (annotated)

### Login screen
| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Username input | `e => setUsernameInput(e.target.value)` | Sets username state | `src/app/admin/page.tsx:851-857` |
| Password input | `e => setPasswordInput(e.target.value)` | Sets password state | `src/app/admin/page.tsx:870-876` |
| "Authenticate Portal" submit button | `handleLogin` (form onSubmit) | POST /api/admin/login → on success: setAuthenticated(true); fetchItems + fetchFeedback + fetchSettings | `src/app/admin/page.tsx:566-590,893-907` |
| "Back to Public Hub" link | `() => router.push('/lost-found')` | Soft-nav to lost-found | `src/app/admin/page.tsx:910-916` |

### Dashboard shell
| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| "Refresh" button | `() => { fetchItems(); fetchFeedback(); fetchSettings(); }` | Re-fetches all 3 data sources | `src/app/admin/page.tsx:929-937` |
| "Exit Portal" button | `handleLogout` | POST /api/admin/logout → on success: setAuthenticated(false); clear state | `src/app/admin/page.tsx:592-615,943-951` |
| Tab "Belongings Database" | `() => setAdminView('items')` | Switches to items tab | `src/app/admin/page.tsx:956-963` |
| Tab "Student Suggestions" | `() => setAdminView('feedback')` | Switches to feedback tab | `src/app/admin/page.tsx:965-972` |
| Tab "Semester Settings" | `() => setAdminView('settings')` | Switches to settings tab | `src/app/admin/page.tsx:974-981` |
| Header logo | n/a | Soft-nav to `/` | `src/components/Header.tsx:20` |

### Items tab
| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Search input | `e => setSearchQuery(e.target.value)` | Free-text filter | `src/app/admin/page.tsx:1099-1107` |
| Search clear ✕ | `() => setSearchQuery('')` | Clears search | `src/app/admin/page.tsx:1108-1112` |
| Category `<select>` | `e => setCategoryFilter(e.target.value)` | Filters by category | `src/app/admin/page.tsx:1117-1126` |
| Type `<select>` | `e => setTypeFilter(e.target.value)` | Filters by 'all'/'lost'/'found' | `src/app/admin/page.tsx:1129-1141` |
| Status `<select>` | `e => setStatusFilter(e.target.value)` | Filters by 'all'/'active'/'resolved' | `src/app/admin/page.tsx:1144-1156` |
| "Mark Resolved" / "Re-activate Item" button | `() => handleToggleResolve(item)` | PATCH /api/lost-found/{id} { action: 'admin-toggle-resolved', isResolved: !current, resolvedBy: 'ammarasad321993' } | `src/app/admin/page.tsx:617-649,1320-1333` |
| "Delete" button | `() => handleDeleteTrigger(item)` | Opens delete confirmation dialog | `src/app/admin/page.tsx:692-696,1335-1340` |
| Delete dialog "Cancel" | `() => setDeleteConfirmOpen(false)` | Closes dialog | (AlertDialog) |
| Delete dialog "Yes, Delete Permanently" | `handleDeleteConfirm` | DELETE /api/lost-found/{id} → on success: toast; setItems(filter out) | `src/app/admin/page.tsx:698-720` |

### Feedback tab
| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Search input | `e => setFeedbackSearchQuery(e.target.value)` | Free-text filter | `src/app/admin/page.tsx:1460-1468` |
| Category `<select>` | `e => setFeedbackCategoryFilter(e.target.value)` | Filters by 'All'/'bug_report'/'suggestion'/'review'/'inquiry' | `src/app/admin/page.tsx:1473-1482` |
| Rating `<select>` | `e => setFeedbackRatingFilter(e.target.value)` | Filters by 'All'/'5'/'4'/'3'/'2'/'1' | `src/app/admin/page.tsx:1495-1506` |
| "Delete Submission" button | `() => handleFeedbackDeleteTrigger(item)` | Opens feedback delete dialog | `src/app/admin/page.tsx:722-728,1568-1573` |
| Feedback delete dialog "Cancel" | `() => setFeedbackDeleteConfirmOpen(false)` | Closes dialog | (AlertDialog) |
| Feedback delete dialog "Yes, Delete Permanently" | `handleFeedbackDeleteConfirm` | DELETE /api/feedback/{id} → on success: toast; setFeedbackList(filter out) | `src/app/admin/page.tsx:730-760` |

### Settings tab
| Element | Handler | Action | File:Line |
|---------|---------|--------|-----------|
| Active Semester `<select>` | `e => setSemesterType(e.target.value)` | Sets 'regular' / 'summer' | `src/app/admin/page.tsx:1623-1630` |
| Semester Name input | `e => setSemesterName(e.target.value)` | Sets semester name | `src/app/admin/page.tsx:1639-1645` |
| Google Sheets URL input | `e => setGoogleSheetsUrl(e.target.value)` | Sets URL | `src/app/admin/page.tsx:1657-1663` |
| "Hard Refetch Timetable" button | `handleHardRefetchTimetable` | POST /api/admin/refetch-timetable (fires GitHub Actions workflow) | `src/app/admin/page.tsx:1515-1530` |
| Sheet Name Mapping input (per day) | `e => setSheetNameMappings(prev => ({...prev, [day]: val}))` | Sets explicit sheet name override | `src/app/admin/page.tsx:1716-1722` |
| "Use Admin Mappings" checkbox (regular only) | `e => setOverrideCourseMappings(e.target.checked)` | Toggles whether Python script uses admin mappings or hardcoded VALID_COURSES_MAP | `src/app/admin/page.tsx:1755-1760` |
| "Load from Code" button (regular only) | `() => setRegularMappings(JSON.parse(JSON.stringify(HARDCODED_VALID_COURSES_MAP)))` | Resets admin mappings to hardcoded defaults | `src/app/admin/page.tsx:1762-1768` |
| Batch tab button (regular only) | `() => setActiveBatchTab(batch)` | Switches active batch tab (2025/2024/2023/2022) | `src/app/admin/page.tsx:1779-1788` |
| Course pill × button (regular only) | inline filter removal | Removes course from `regularMappings[batch][dept]` | `src/app/admin/page.tsx:1801-1809` |
| Add course input + Enter / "+ Add" button (regular only) | adds course | Appends to `regularMappings[batch][dept]` | `src/app/admin/page.tsx:1817-1845` |
| "Refresh Summer Catalog from Google Sheets" (summer only) | `handleRefreshSummerCatalog` | Fetches Google Sheets CSV per day, parses, merges into `summerCatalog` state | `src/app/admin/page.tsx:329-450` |
| Summer catalog row edit (sheetName/displayName/hidden/examOnly/school) | `updateSummerCatalogEntry(index, updates)` | Updates entry in `summerCatalog` state | `src/app/admin/page.tsx:522-528` |
| "Save Settings" button | `handleSaveSettings` (form onSubmit) | supabase.from('semester_settings').update(payload).eq('id',1) → on success: toast 'Settings Saved' | `src/app/admin/page.tsx:218-285` |

## Conditional States

### `{checkingAuth === true}` — Auth check in flight
```
Full-screen spinner (orange RefreshCw animate-spin) + "Verifying Admin Credentials..." text.
Mounted by src/app/admin/page.tsx:770-778.
Triggered on mount before GET /api/admin/check resolves.
```

### `{!authenticated}` — Login form (default state)
```
Centered card with shield icon, login form, error banner slot, "Authenticate Portal" button, "Back to Public Hub" link.
Source: src/app/admin/page.tsx:786-916.
```

### `{authenticated === true}` — Dashboard (3 tabs)
```
Header strip: green pulse dot + "Admin Console" + username + Refresh + Exit buttons.
Tab selector: 3 tabs with item/feedback counts in parentheses.
Active tab content renders below.
Source: src/app/admin/page.tsx:917-1821.
```

### `{adminView === 'items'}`
```
Statistics grid (5 cards) + Controls bar + Items Records Database list.
Each item row: thumbnail + badges (type/category/status) + title + description + meta + action buttons.
Empty state if filteredItems.length === 0.
```

### `{adminView === 'feedback'}`
```
Controls bar (search + category + rating) + Student Suggestions Log.
Each feedback row: category badge + rating emoji + content + meta + Delete button.
Empty state if filteredFeedback.length === 0.
```

### `{adminView === 'settings'}`
```
Single-column form (max-w-3xl):
  - Active Semester selector (regular/summer)
  - Semester Name input
  - Google Sheets URL input
  - Hard Refetch Timetable button
  - Explicit Sheet Name Mappings (6 day inputs)
  - {semesterType === 'regular' ? Course Mappings editor (batch tabs + dept rows + course pills) }
  - {semesterType === 'summer' ? Summer Course Catalog editor (editable rows) }
  - Save Settings button
```

### `{loginError !== ''}` — Login error banner
```
Red banner inside login form (animate height auto):
  ⚠️ {loginError}
Common errors:
  - 'Both username and password are required.'
  - 'Invalid credentials.'  (from /api/admin/login 401)
  - 'Server error. Please try again.'  (catch block)
Source: src/app/admin/page.tsx:887-895.
```

### `{deleteConfirmOpen === true}` — Item delete dialog
```
AlertDialog centered modal:
  Title: "Confirm Deletion"
  Body: 'Are you sure you want to permanently delete "{item.title}"? This action cannot be undone.'
  Buttons: [Cancel]  [Yes, Delete Permanently]
```

### `{feedbackDeleteConfirmOpen === true}` — Feedback delete dialog
```
Same AlertDialog pattern.
On confirm: DELETE /api/feedback/{id}
```

### `{loadingItems === true}` / `{loadingFeedback === true}` / `{loadingSettings === true}`
```
- loadingItems: actionLoading spinner per-row (RefreshCw animate-spin) on the affected item
- loadingFeedback: same per-feedback-row
- loadingSettings: full-form spinner ("Loading current settings...") replaces form fields
```

### `{actionLoading === item.id}` — per-row spinner
```
When admin clicks Mark Resolved / Delete on a specific item, that row's action button shows
a spinning RefreshCw instead of the icon, and is disabled.
Other rows remain interactive.
Source: src/app/admin/page.tsx:1319-1322 (and similar for feedback).
```

### `{savingSettings === true}` — Save button disabled + spinner
```
"Save Settings" button shows spinning RefreshCw and is disabled during the supabase update.
Source: src/app/admin/page.tsx:handleSaveSettings (sets savingSettings=true at start, false in finally).
```

### `{refetchingTimetable === true}` — Hard Refetch in flight
```
"Hard Refetch Timetable" button shows spinning RefreshCw + label "Refetching Timetable..." and is disabled.
POST /api/admin/refetch-timetable dispatches the GitHub Actions update-timetable.yml workflow.
Source: src/app/admin/page.tsx:1515-1530, handler at ~line 488-520.
```

### `{refreshingCatalog === true}` — Summer catalog refresh in flight
```
"Refresh Summer Catalog" button shows spinning RefreshCw + is disabled.
handleRefreshSummerCatalog:
  1. Extracts spreadsheetId from googleSheetsUrl
  2. For each day in [Monday..Saturday]:
     fetch `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${day}`
  3. Parses CSV (handles quotes), grid OR flat-table format
  4. Merges into summerCatalog state
Source: src/app/admin/page.tsx:329-450.
```

## Breakpoint Behavior

| Breakpoint | What changes | Source |
|------------|--------------|--------|
| `md:` (768px) | Controls bar switches from `flex-col md:flex-row`. Settings sheet-name mappings grid stays `grid-cols-2` (no change). | `src/app/admin/page.tsx:1079,1167` |
| `lg:` (1024px) | Statistics grid switches from `grid-cols-2 lg:grid-cols-5`. Item row layout switches from `flex-col lg:flex-row lg:items-center`. Feedback row layout switches from `flex-col lg:flex-row lg:items-start`. | `src/app/admin/page.tsx:989,1213,1543` |
| `sm:` (640px) | No structural change. | n/a |
| Settings form | Always `max-w-3xl mx-auto` (centered, single-column). No responsive variant. | `src/app/admin/page.tsx:1560` |
| Login card | Always `max-w-md` centered. | `src/app/admin/page.tsx:786` |
| `<AlertDialog>` modals | Centered with backdrop blur on all sizes. | `src/components/ui/alert-dialog.tsx` |
| Header | Standard sticky `top-0 z-50 h-[3.75rem]`. | `src/components/Header.tsx:14-17` |

## Screenshot References

- Desktop login screen: `[screenshot: desktop/12-admin-login.png]`
- Mobile login screen: `[screenshot: mobile/12-admin-login.png]`
- (Dashboard screenshots not in audit set — login-only)

## State Transitions

### Auth state machine

```
Mount:
  useEffect (src/app/admin/page.tsx:561-565):
    checkAuth():
      GET /api/admin/check → {authenticated: boolean}
      └─ if true: setAuthenticated(true); fetchItems + fetchFeedback + fetchSettings
      └─ if false: setAuthenticated(false)
      └─ finally: setCheckingAuth(false)

Login form submission:
  handleLogin(e):
    e.preventDefault()
    if (!usernameInput.trim() || !passwordInput): setLoginError('Both username and password are required.'); return
    setLoginLoading(true)
    POST /api/admin/login { username, password }
      └─ 200: setAuthenticated(true); toast 'Welcome back!'; fetchItems + fetchFeedback + fetchSettings
      └─ 401: setLoginError(data.error || 'Invalid credentials.')
      └─ catch: setLoginError('Server error. Please try again.')
      └─ finally: setLoginLoading(false)

Logout:
  handleLogout():
    POST /api/admin/logout
      └─ 200: setAuthenticated(false); setUsernameInput(''); setPasswordInput(''); setItems([]); setFeedbackList([])
              toast 'Logged Out'
```

### Tab state machine

```
authenticated === true:
  adminView state: 'items' (default) | 'feedback' | 'settings'

  click tab "Belongings Database" ──setAdminView('items')──► items tab renders
  click tab "Student Suggestions" ──setAdminView('feedback')──► feedback tab renders
  click tab "Semester Settings"   ──setAdminView('settings')──► settings tab renders

Each tab fetches its own data on first authentication (fetchItems, fetchFeedback, fetchSettings all called in checkAuth success branch).
"Refresh" button re-fetches all 3 regardless of active tab.
```

### Items tab action flow

```
User clicks "Mark Resolved" on active item:
  handleToggleResolve(item):
    setActionLoading(item.id)
    PATCH /api/lost-found/{id} { action: 'admin-toggle-resolved', isResolved: true, resolvedBy: 'ammarasad321993' }
      └─ 200: toast 'Marked Resolved'; setItems(prev.map(...toggle isResolved))
      └─ !200: toast 'Action Failed'
      └─ finally: setActionLoading(null)

User clicks "Re-activate Item" on resolved item:
  Same handler — toggles isResolved to false.

User clicks "Delete":
  handleDeleteTrigger(item): setItemToDelete(item); setDeleteConfirmOpen(true)

User confirms delete:
  handleDeleteConfirm():
    setActionLoading(itemToDelete.id); setDeleteConfirmOpen(false)
    DELETE /api/lost-found/{itemToDelete.id}
      └─ 200: toast 'Item Deleted'; setItems(filter out)
      └─ !200: toast 'Delete Failed'
      └─ finally: setActionLoading(null); setItemToDelete(null)
```

### Settings tab save flow

```
User edits any field (semesterType, semesterName, googleSheetsUrl, sheetNameMappings, overrideCourseMappings, regularMappings, summerCatalog):
  Local state updates only — NO auto-save.

User clicks "Save Settings":
  handleSaveSettings(e):
    e.preventDefault()
    setSavingSettings(true)
    ── if semesterType === 'regular':
          parse courseMappings JSON (legacy field) → must be valid array
    ── if semesterType === 'summer':
          parsedMappings = summerCatalog (array)
    payload = {
      semester_type, semester_name, bypass_courses_config, google_sheets_url,
      override_course_mappings, regular_course_mappings, sheet_name_mappings, updated_at
    }
    if parsedMappings !== undefined: payload.course_mappings = parsedMappings

    supabase.from('semester_settings').update(payload).eq('id', 1)
      └─ !error: toast 'Settings Saved'
      └─ error: toast 'Save Failed'
      └─ finally: setSavingSettings(false)

Note: ⚠️ SECURITY — this writes directly via the anon-key Supabase client (src/app/admin/page.tsx:286).
Works only because RLS on semester_settings appears to allow public UPDATE.
```

### Hard refetch flow

```
User clicks "Hard Refetch Timetable":
  handleHardRefetchTimetable():
    setRefetchingTimetable(true)
    POST /api/admin/refetch-timetable
      └─ 200: toast 'Timetable refetch triggered. Vercel will rebuild in ~2 min.'
      └─ !200: toast 'Failed to trigger refetch'
      └─ finally: setRefetchingTimetable(false)

The API route fires a GitHub Actions workflow_dispatch on the update-timetable.yml workflow.
This causes the Python script to re-run, commit timetable.json to main, which triggers Vercel redeploy.
Source: src/app/admin/page.tsx:~488-520, src/app/api/admin/refetch-timetable/route.ts.
```

### URL parameter contract

```
None. /admin reads no query params.
Auth state is purely client-side (cookie admin_session set by /api/admin/login).
No middleware — entire dashboard source ships to browser regardless of auth.
```
