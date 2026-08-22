---
doc: 09-STATE-MANAGEMENT
generated: 2026-08-09T16:14:00+05:00
repo_commit: c3f582d
live_url_snapshot: 2026-08-09T15:35:00+05:00
confidence: verified
---

# 09 — State Management

The app uses **no Redux/Zustand/Jotai/React Query/SWR**. State is split across 4 mechanisms:

1. **React `useState` / `useReducer`** — local component state (every page has 5–45+ state vars)
2. **localStorage** — persistent client state (15+ keys, see `04-DATA-MODELS-AND-SCHEMA.md` §4)
3. **React Context** — only `ThemeProvider` (single context for the whole app)
4. **Module-scope singletons** — `useToast` (`memoryState` + `listeners` at module scope), and module-scope `require()`s of build-time JSON

No server actions. No cookies for user state (only `admin_session` for auth). No URL search params for state except where noted.

## 1. React Context Providers

### `ThemeProvider` (`src/lib/theme.tsx:1-53`)

The ONLY context provider in the app. Mounted in `src/app/layout.tsx:75`.

```tsx
type Theme = 'light' | 'dark';
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // Read localStorage 'fsc-theme'
    const saved = localStorage.getItem('fsc-theme');
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      // Time-of-day heuristic
      const hour = new Date().getHours();
      const isNight = hour >= 18 || hour < 6;
      setTheme(isNight ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', isNight ? 'dark' : 'light');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('fsc-theme', next);
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

**Used by:**
- `ThemeToggle.tsx` — reads `theme` + `toggleTheme`
- `Navbar.tsx`, `FloatingMenu.tsx`, `home/page.tsx` — read `theme` for gradient/color theming

**localStorage key:** `fsc-theme` (values: `'light'` | `'dark'`)

**Attribute on `<html>`:** `data-theme="light"` or `data-theme="dark"`

## 2. Module-Scope Singletons

### `useToast` Singleton (`src/hooks/use-toast.ts:1-194`)

Module-scope state shared across all `useToast()` instances:

```ts
let count = 0;                                    // incrementing ID counter
let memoryState: State = { toasts: [] };          // singleton state
const listeners: Array<(state: State) => void> = []; // subscriber list
const toastTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

const TOAST_LIMIT = 1;          // only 1 toast visible (new replaces old)
const TOAST_REMOVE_DELAY = 1000000;  // ⚠️ 16.7 minutes — likely typo for 1000ms
```

**`toast({...props})`** — callable from outside React (used by FeedbackWidget, admin, lost-found). Dispatches `ADD_TOAST` with auto-generated id. Returns `{ id, dismiss, update }`.

**`useToast()`** — subscribes to `listeners`, returns `{ toasts, toast, dismiss }`.

### Module-Scope JSON Loading

Several lib modules load build-time JSON at module scope (runs once on first import):

| Module | Load statement | Loaded data |
|--------|----------------|-------------|
| `src/lib/exam-catalog.ts:29` | `require('../../public/data/summer_schedule.json')` | 26 ExamEntry[] |
| `src/lib/events.ts:1` | `import rawEvents from '../../public/data/student_events.json'` | 31 StudentEvent[] |
| `src/lib/supabase.ts:6` | `createClient(url, anonKey)` | Supabase client (side-effecting — crashes if env missing) |
| `src/lib/email.ts:5-9` | `nodemailer.createTransport({...})` if env set, else `null` | Gmail SMTP transporter |

### Module-Scope Page Data

Pages also load JSON at module scope (runs once per page mount, but bundled at build time):

| Page | Load statement | Data |
|------|----------------|------|
| `src/app/page.tsx:10` | `require('../../public/data/timetable.json')` | RawTimetableJSON |
| `src/app/home/page.tsx` | `require('regular_schedule.json')`, `require('timetable.json')` | both |
| `src/app/schedule/page.tsx` | `require('regular_schedule.json')`, `require('summer_schedule.json')` | both |
| `src/app/timetable/page.tsx` | `require('timetable.json')` | RawTimetableJSON |
| `src/app/timetable/custom/page.tsx` | `require('../../../../public/data/timetable.json')` | RawTimetableJSON |
| `src/app/rooms/page.tsx` | `require('../../../public/data/timetable.json')` | RawTimetableJSON |
| `src/app/semester/page.tsx` | `import semesterCalendarRaw from '../../../public/data/semester_calendar.json'` | calendar object |
| `src/app/faculty/page.tsx` | `require('../../../public/data/faculty/faculty_data.json')` | 9-dept faculty array |
| `src/components/TimetableOptimizer.tsx` | `require('../../public/data/timetable.json')` | RawTimetableJSON |

## 3. localStorage Key Catalog

See `04-DATA-MODELS-AND-SCHEMA.md` §4 for the full table. Summary:

### General App Keys (`fsc_*`) — 8 keys
| Key | Shape | Pages that READ | Pages that WRITE |
|-----|-------|-----------------|------------------|
| `fsc_user_config` | `{batch, school, dept, section}` | `/`, `/home`, `DesktopTicker`, `/timetable/custom` (exclusivity check) | `/home` |
| `fsc_active_semester` | `'regular' \| 'summer'` | `/`, `/home`, `/timetable`, `/timetable/custom`, `/rooms`, `/custom`, `/lost-found` (Footer), `/timetable/optimizer` | All same pages (after Supabase fetch) |
| `fsc_semester_name` | `string` | All pages that read `fsc_active_semester` + `ExportButton` | All pages that write `fsc_active_semester` |
| `fsc_summer_courses` | `Record<sheetName, section>` | `/home` (summer), `/schedule?batch=Summer`, `/timetable` | `/home`, `/timetable` |
| `fsc_custom_bundles` | `Bundle[]` | `/`, `/home` (exclusivity), `/timetable/custom` | `/timetable/custom` |
| `fsc_custom_exam_bundles` | `Bundle[]` | `/custom` | `/custom` |
| `fsc_timetable_preview` | `CourseRow[]` | `/timetable/custom` (one-shot, then REMOVED) | `/timetable/optimizer` |
| `fsc_timetable_results_preferences_v1` | `Record<"${batch}\|${dept}", TimetableResultPreference>` | `/timetable`, `DesktopTicker` | `/timetable` |
| `fsc-theme` | `'light' \| 'dark'` | `lib/theme.tsx` on mount | `lib/theme.tsx` `toggleTheme()` |

### Lost & Found Keys (`lf-*`) — 15 keys
| Key | Shape | Used for |
|-----|-------|----------|
| `lf-user-id` | `string` (random) | Persistent user ID = claimerId |
| `lf-my-reports` | `string[]` (item UUIDs) | Items this user has reported |
| `lf-recently-viewed` | `string[]` (capped 20) | Recently viewed items carousel |
| `lf-bookmarks` | `string[]` | Saved/bookmarked items |
| `lf-last-visit` | `string` (epoch millis) | Last visit — for "new since visit" notifications |
| `lf-view-counts` | `Record<itemId, number>` | Per-item view count (grows unbounded) |
| `lf-urgent-items` | `string[]` | Items user marked as urgent |
| `lf-feedback` | `Record<itemId, string>` | Per-item private feedback notes |
| `lf-onboarded` | `'true'` | Has seen onboarding carousel |
| `lf-item-claims-${itemId}` | `Array<Claim>` | Per-item local claim cache (grows unbounded) |
| `lf-item-comments-${itemId}` | `Array<Comment>` | Per-item local comment thread (grows unbounded) |
| `lf-activity-feed` | `Array<Activity>` (capped 20) | Activity feed entries |
| `lf-notifications` | `Array<Notification>` (capped 30) | Generated notifications |
| `lf-pending-urgent` | (unclear) | [INFERRED] Staging for urgent items pending server confirmation |
| `lf-claimer-email` | `string` | User's preferred email for claims |

## 4. Per-Page State Summary

### `/` (landing) — `src/app/page.tsx:1-531`

8 `useState` calls:
- `displayText`, `isTypingComplete` (typing animation)
- `userConfig`, `bundles`, `mounted`, `isSummerMode`, `semesterName`, `summerCoursesList`, `summerSelections`, `summerCatalog`

3 `useEffect` calls:
- Mount: read localStorage, dynamic import supabase, fetch `/api/timetable` (if summer)
- Typing animation interval
- `checkSemesterType()` async function

### `/home` — `src/app/home/page.tsx:1-1236`

13+ `useState` calls:
- `feature`, `mode`, `isSummerMode`, `summerCoursesList`, `summerCatalog`, `selectedSummerCourses`, `selectedSummerSchool`, `semesterName`, `batch`, `school`, `dept`, `section`, `displayText`/`isTypingComplete`, `userConfig`, `isConfigLoaded`, `exclusivityError`, `bundles`

Multiple `useEffect` for: localStorage init, Supabase semester check, typing animation.

### `/timetable` — `src/app/timetable/page.tsx:1-1637`

12+ `useState` calls:
- `query`, `selected`, `viewMode` ('list'|'grid'), `includeRepeats`, `manualSectionByCourse`, `removedCourseKeys`, `isOtherCoursesExpanded`, `saveFeedback`, `repeatPromptCourse`, `isMakeupSidebarOpen`
- `entries`, `isSummer`, `semesterName`, `summerSelections`, `summerCatalog`, `loadingSummer`

Key `useMemo`s:
- `resolvedData` (~200 lines) — parses dated vs undated sheets, assigns to current/next week
- `filtered` — applies `filterTimetable` + manual overrides + removed courses
- `conflictKeys` — `detectConflicts(filtered)`
- `grouped` — `groupByDayTimetable(filtered)`

### `/lost-found` — `src/app/lost-found/page.tsx:1-6553`

**Largest state footprint in the codebase.** 45+ `useState` calls in `LostFoundView` alone:

| Category | State vars |
|----------|-----------|
| Items & loading | `items`, `loading`, `selectedItem`, `recentlyViewedIds`, `bookmarkedIds`, `urgentIds`, `viewCounts`, `newSinceVisit` |
| Filters | `typeFilter`, `categoryFilter`, `searchQuery`, `debouncedSearchQuery`, `showFilters`, `showResolved`, `sortBy`, `showMyReports`, `showBookmarked`, `dateRange`, `locationZoneFilter`, `showMyClaims`, `showArchived` |
| My activity | `myReportedIds`, `myClaimedItemIds`, `activityFeed` |
| View modes | `viewMode`, `showOnboarding`, `focusedItemIndex`, `selectedQuickActionItem` |
| Smart search | `smartSearchResults`, `smartSearchLoading`, `duplicateWarning` |
| Claim flow | `claimerEmailPromptOpen`, `tempClaimerEmail`, `loadingClaims`, `storedClaimerEmail` |
| Resolution | `resolutionPair`, `loadingResolution` |
| Verify-hold | `showVerifyHoldDialog`, `verifyClaimId` |
| SubView | `subView` (in parent `LostFoundPage`): 'list' | 'detail' | 'report' | 'history' | 'resolution' |

Plus 30+ localStorage helper functions (lines 306-625).

### `/admin` — `src/app/admin/page.tsx:1-1821`

30+ `useState` calls:
- Auth: `checkingAuth`, `authenticated`, `usernameInput`, `passwordInput`, `loginLoading`, `loginError`
- View: `adminView` ('items'|'feedback'|'settings')
- Items tab: `items`, `loadingItems`, `searchQuery`, `categoryFilter`, `typeFilter`, `statusFilter`, `itemToDelete`, `deleteConfirmOpen`
- Feedback tab: `feedbackList`, `loadingFeedback`, `feedbackSearchQuery`, `feedbackCategoryFilter`, `feedbackRatingFilter`, `feedbackToDelete`, `feedbackDeleteConfirmOpen`
- Settings tab: `semesterType`, `semesterName`, `bypassCoursesConfig`, `googleSheetsUrl`, `courseMappings`, `summerCatalog`, `regularMappings`, `overrideCourseMappings`, `sheetNameMappings`, `activeBatchTab`, `newCourseInput`, `savingSettings`, `loadingSettings`, `refreshingCatalog`, `refetchingTimetable`
- Action loading: `actionLoading` (string | null)

## 5. URL Search Params as State

| Page | Param | State effect |
|------|-------|--------------|
| `/home` | `?feature=X` | Sets active feature tab on mount (via `useSearchParams` inside Suspense-wrapped `FeatureActivator`) |
| `/schedule` | `?batch&school&dept` | Initial filter values (via `useSearchParams`) |
| `/timetable` | `?batch&dept&section` | Initial filter values (via `useSearchParams`) |
| `/faculty` | `?dept=X` | Initial dept filter (via `window.location.search` — NOT `useSearchParams`) |
| `/lost-found` | `?verifyClaimId=X` | Auto-opens `VerifyHoldDialog` on mount (via `useSearchParams` inside Suspense-wrapped `LostFoundView`) |

## 6. Cookies

Only one cookie is used: `admin_session`.

| Attribute | Value |
|-----------|-------|
| Name | `admin_session` |
| Value | `base64(${ADMIN_USERNAME}:${ADMIN_PASSWORD})` |
| HttpOnly | true |
| Secure | `process.env.NODE_ENV === 'production'` |
| SameSite | lax |
| Path | / |
| Max-Age | 86400 (24 hours) on login; `expires: new Date(0)` on logout |

Set by `POST /api/admin/login` (`src/app/api/admin/login/route.ts:33-43`). Cleared by `POST /api/admin/logout` (`src/app/api/admin/logout/route.ts:13-19`). Verified by `isAdminAuthenticated()` (`src/lib/admin.ts:32-38`).

⚠️ Token is **deterministic** — same base64 of credentials for every admin session until env vars change. No rotation, no JWT, no signing secret.

## 7. Server State (Supabase)

The app does NOT use React Query or SWR for server state caching. Each component fetches what it needs, often duplicating work:

### Duplicated `/api/timetable` fetches

| Trigger | Where |
|---------|-------|
| `/` mount (summer mode) | `src/app/page.tsx:189` |
| `/` mount (after Supabase check confirms summer) | `src/app/page.tsx:219` |
| `/home` mount (summer mode) | `src/app/home/page.tsx` (similar pattern) |
| `/timetable` mount (summer mode) | `src/app/timetable/page.tsx:334` |
| `/timetable/custom` mount (summer mode) | `src/app/timetable/custom/page.tsx:327` |
| `/timetable/optimizer` mount (summer mode) | `src/components/TimetableOptimizer.tsx` |

### Duplicated Supabase `semester_settings` fetches

| Trigger | Where |
|---------|-------|
| `/api/timetable` server handler | `src/app/api/timetable/route.ts:316` |
| `/` mount (dynamic import supabase) | `src/app/page.tsx:203` |
| `/home` mount | `src/app/home/page.tsx:160` |
| `/timetable` mount | `src/app/timetable/page.tsx:312` |
| `/timetable/custom` mount | `src/app/timetable/custom/page.tsx:378` |
| `/rooms` mount | `src/app/rooms/page.tsx:400` |
| `/custom` mount | `src/app/custom/page.tsx:104` |
| `/lost-found` Footer sub-component mount | `src/app/lost-found/page.tsx:789` |
| `ExportButton` mount (duplicates parent page's fetch) | `src/components/ExportButton.tsx` |

**Total**: Every page navigation in summer mode triggers 2–4 Supabase round-trips. Should be extracted to a shared `useSemesterSettings()` hook.

## 8. Polling & Real-Time

### Polling

| Page | Endpoint | Interval | Purpose |
|------|----------|----------|---------|
| `/lost-found` | `GET /api/lost-found?t=${Date.now()}` | 30 seconds | New-item count badge in `LostFoundPage` (line 6423). Runs indefinitely. |

### Real-Time

- No websockets
- No Server-Sent Events (SSE)
- All other "real-time" data requires manual page refresh

### Live Clock

`DesktopTicker` (`src/components/DesktopTicker.tsx`) updates `now` state every 1 second via `setInterval(1000)`. Recomputes ongoing/next class on each tick.

## 9. State Persistence Patterns

### Auto-persist on change (via `useEffect`)

| Page | State | Effect |
|------|-------|--------|
| `/timetable/custom` | `bundles` | `useEffect(() => localStorage.setItem('fsc_custom_bundles', JSON.stringify(bundles)), [bundles])` |
| `/custom` | `bundles` | Same pattern with `fsc_custom_exam_bundles` |
| `/timetable` | `manualSectionByCourse`, `removedCourseKeys` | `persistResultPreferences()` (manual call on Save button click) |
| `/home` | `selectedSummerCourses` | Manual writeBack on each `handleToggleSummerCourse` |

### One-shot handoff (via localStorage)

| From | To | Key | Pattern |
|------|----|-----|---------|
| `/timetable/optimizer` | `/timetable/custom` | `fsc_timetable_preview` | Write on "Preview Timetable" click; read on `/timetable/custom` mount, then `localStorage.removeItem` |

## 10. State Cleanup Concerns

| Concern | Details |
|---------|---------|
| Unbounded growth | `lf-view-counts` (per-item), `lf-item-claims-${itemId}` (per-item), `lf-item-comments-${itemId}` (per-item) — all grow as user browses more items |
| No versioning | No `version` field in any localStorage payload — schema changes would silently break old payloads |
| No cleanup | No `localStorage.removeItem` calls except `fsc_timetable_preview` (one-shot handoff) and theme toggle |
| No quota handling | `setItem` throws on quota exceeded — would crash page (no try/catch) |
| Module-scope JSON loading | `require()` at module scope runs once per page mount, but the JSON is bundled at build time so it's already in the JS bundle. The `require` call is essentially free. |

## 11. Hydration Considerations

### Theme hydration

`src/app/layout.tsx:67` sets `suppressHydrationWarning` on `<html>` because:
- Server renders with `theme='light'` (default `useState`)
- Client may flip to `'dark'` after `useEffect` reads localStorage
- The `data-theme` attribute on `<html>` changes → hydration mismatch warning suppressed

### Live clock hydration

`DesktopTicker` (`src/components/DesktopTicker.tsx:395-407`):
- `mounted` state initially `false`
- `useEffect` sets `mounted = true` after mount
- `!mounted` renders hidden 180px placeholder div (prevents SSR/client time mismatch)
- `mounted` renders actual clock with current time

### Typing animation hydration

`/` (landing) and `/home` use `setInterval(20ms)` to typewriter-effect the intro text. The animation starts after mount, so SSR renders empty `displayText=''` and client progressively fills it.

### `useIsMobile` hydration

`src/hooks/use-mobile.ts:1-19` returns `undefined` on first render (SSR-safe), then updates to actual value after mount. Consumers must handle the `undefined` state.
