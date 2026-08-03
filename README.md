<div align="center">

<img src="public/logo/logo.png" alt="FAST Isb Utilities Logo" width="80" />

# FAST Isb Utilities

**The unified campus companion for FAST NUCES Islamabad**

No more digging through messy Google Sheets. No more searching emails for exam schedules. No more peeking into rooms to check if they're free. Everything you need — in one place.

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge)](https://fast-nuces.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

</div>

---

## Navigation
- [The Problem](#the-problem)
- [What Is FAST Isb Utilities?](#what-is-fast-isb-utilities)
  - [Who Is It For?](#who-is-it-for)
- [Screenshots](#screenshots)
  - [Landing Page](#landing-page)
- [Features](#features)
  - [📅 Timetable Viewer](#timetable-viewer)
  - [📝 Exam Schedule Finder](#exam-schedule-finder)
  - [🎯 Custom Exams Builder](#custom-exams-builder)
  - [🗓️ Custom Timetable Builder](#custom-timetable-builder)
  - [🧠 Timetable Optimizer](#timetable-optimizer)
  - [🚪 Free Rooms Finder](#free-rooms-finder)
  - [👨‍🏫 Faculty Directory](#faculty-directory)
  - [🎪 Campus Events Calendar](#campus-events-calendar)
  - [📆 Semester Schedule](#semester-schedule)
  - [📦 Lost & Found](#lost-found)
  - [🏠 Configuration & Home Page](#configuration-home-page)
  - [🌗 Dark Mode & Theming](#dark-mode-theming)
  - [⌨️ Keyboard Shortcuts](#keyboard-shortcuts)
  - [📤 Export Options](#export-options)
- [How It Works](#how-it-works)
  - [User Workflow](#user-workflow)
  - [Custom Course Workflow](#custom-course-workflow)
  - [Timetable Optimizer Workflow](#timetable-optimizer-workflow)
  - [Data Flow](#data-flow)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Routes](#routes)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Available Scripts](#available-scripts)
- [Data Pipeline](#data-pipeline)
  - [Exam Schedule Pipeline](#exam-schedule-pipeline)
  - [Timetable Pipeline](#timetable-pipeline)
  - [Campus Events Pipeline](#campus-events-pipeline)
  - [Faculty & Semester Data](#faculty-semester-data)
- [Scheduled Automation](#scheduled-automation)
  - [Vercel Cron Jobs (Production)](#vercel-cron-jobs-production)
  - [GitHub Actions (Recommended for Data Updates)](#github-actions-data-updates)
- [Database Schema](#database-schema)
  - [`lost_found_items`](#lost-found-items)
  - [`lost_found_claims`](#lost-found-claims)
  - [`campus_feedback`](#campus-feedback)
- [Design Highlights](#design-highlights)
- [License & Usage](#license-usage)
  - [What You Can Do](#what-you-can-do)
  - [What You Cannot Do](#what-you-cannot-do)
- [Contributing](#contributing)
- [License](#license)


<a id="the-problem"></a>
## The Problem

Life at FAST NUCES Islamabad comes with a set of avoidable daily frustrations that every student knows too well:

- **Messy Timetables** — The official timetable is a single, colossal Google Sheet crammed with every section of every department of every batch. Finding your own schedule means scrolling endlessly and squinting through a wall of cells. It's neither quick to open on your phone, nor pleasant to navigate on a desktop.

- **Clustered Exam Schedules** — Exam dates arrive as a dense Excel file listing every course for every batch. Students have to manually search for their own papers, and those taking custom or cross-department courses are left piecing things together themselves.

- **No Room Availability Info** — Need a quiet place to study? Want to find an empty lab? Your only option is physically walking to the room and peeking in. There's no centralized way to know which rooms are free at any given time.

- **Faculty Info Is a Scavenger Hunt** — Looking for a professor's office? You're walking down hallways checking nameplates on every door. There's no publicly accessible directory with office rooms, emails, or profiles.

- **Campus Events Buried in Emails** — Events are announced via email blasts and WhatsApp groups. By the time mid-semester rolls around, that event notification is buried under dozens of other messages, and you've missed the deadline.

- **Semester Schedule? Good Luck** — The academic calendar with key dates, sessional schedules, and holidays is shared once at the start of the semester in an email or group chat, never to be found again when you actually need it.

- **Lost Items, No Recovery System** — Lose a laptop charger in the lab? Find someone's ID card in the cafeteria? There's no campus-wide system to report or recover lost items. It's all word of mouth.

- **No Way to Optimize Your Timetable** — Students taking courses across different departments or with elective choices have no way to find clash-free section combinations without manually cross-referencing multiple schedules.

**FAST Isb Utilities** exists to solve every single one of these problems.

---

<a id="what-is-fast-isb-utilities"></a>
## What Is FAST Isb Utilities?

FAST Isb Utilities is an all-in-one web platform purpose-built for the students of FAST NUCES Islamabad. It consolidates every essential campus utility — timetables, exam schedules, room availability, faculty directory, campus events, semester calendar, lost & found, and even a timetable optimizer — into a single, beautifully designed, mobile-first web application.

Instead of juggling between Google Sheets, email threads, WhatsApp groups, and physical scavenger hunts, students get everything they need in one place, accessible from any device, at any time.

<a id="who-is-it-for"></a>
### Who Is It For?

- **Students** of FAST NUCES Islamabad across all batches (2022–2025), departments (CS, AI, DS, CY, SE, EE, CE, SH, AF, MS), and schools (FSC, FSM, FSE) — whether you're following the standard cohort path or taking custom courses across departments.
- **Faculty & Staff** who need quick access to room availability, colleague directories, or campus event schedules.
- **Campus Administration** looking for a modern, student-friendly alternative to scattered Google Sheets and Excel files.

---

<a id="screenshots"></a>
## Screenshots

<a id="landing-page"></a>
### Landing Page

<p align="center">
  <img src="Screenshots/landing_page_desktop.png" alt="Landing Page - Desktop" width="65%" />
  &nbsp;&nbsp;
  <img src="Screenshots/landing_page_mobile.png" alt="Landing Page - Mobile" width="25%" />
</p>

---

<a id="features"></a>
## Features

<a id="timetable-viewer"></a>
### 📅 Timetable Viewer

View your weekly class schedule filtered by batch, department, and section. No more scrolling through a monolithic Google Sheet with hundreds of rows.

- **List View & Grid View** — Switch between a day-grouped list (with today pinned first) and a visual time-block calendar.
- **Section Override** — Swap individual courses to a different section if you're attending a cross-section class.
- **Course Removal** — Hide courses you've dropped or aren't taking.
- **Elective Handling** — Electives and "other" courses are separated into their own expandable section. Special handling for 2022 batch elective groups (G-I, G-II, G-III).
- **Repeat Courses Toggle** — Include or exclude repeat courses with a single toggle.
- **Conflict Detection** — Overlapping classes are automatically highlighted.
- **Export** — Download as CSV, Excel (.xlsx), ICS calendar, or PNG image.

<p align="center">
  <img src="Screenshots/timetable_page_desktop.png" alt="Timetable Viewer - Desktop" width="65%" />
  &nbsp;&nbsp;
  <img src="Screenshots/timetable_page_mobile.png" alt="Timetable Viewer - Mobile" width="25%" />
</p>

---

<a id="exam-schedule-finder"></a>
### 📝 Exam Schedule Finder

Find your exam dates instantly. Filter by batch, school, and department — or search by course code and name.

- **Day-Grouped Timeline** — Exams are organized chronologically by date, so you always know what's next.
- **Search** — Live search across course codes and names.
- **Exam Detail Panel** — Tap any exam to see full details in a slide-up panel (mobile) or side panel (desktop).
- **Export** — Download your filtered exam schedule as CSV, Excel, or ICS.

<p align="center">
  <img src="Screenshots/exam_schedule_desktop.png" alt="Exam Schedule - Desktop" width="65%" />
  &nbsp;&nbsp;
  <img src="Screenshots/exam_schedule_mobile.png" alt="Exam Schedule - Mobile" width="25%" />
</p>

---

<a id="custom-exams-builder"></a>
### 🎯 Custom Exams Builder

Taking courses across multiple departments or batches? Build your own custom exam schedule by selecting individual courses from any combination of batch, stream, and department.

- **Dynamic Row Editor** — Add as many courses as you need, each with its own batch/stream/department selectors.
- **Bundle System** — Save, name, and reuse course sets so you don't have to re-enter them every time.
- **Match Hints** — Each row shows how many exam slots were found for your selection, so you know if you've picked the right course.
- **Export** — Same export options as the standard exam finder.

<p align="center">
  <img src="Screenshots/custom_exams_desktop.png" alt="Custom Exams - Desktop" width="65%" />
  &nbsp;&nbsp;
  <img src="Screenshots/custom_exams_mobile.png" alt="Custom Exams - Mobile" width="25%" />
</p>

---

<a id="custom-timetable-builder"></a>
### 🗓️ Custom Timetable Builder

Same idea as Custom Exams, but for your weekly class schedule. Mix and match courses from any department and section.

- **Course Selection** — Pick batch, department, category (regular/repeat), course, and section for each row.
- **Bundle System** — Save named bundles of courses and load them anytime.
- **Conflict Detection** — Clashing time slots are immediately flagged.
- **Grid View** — Visual time-block calendar showing your custom schedule.
- **Today Highlight** — Current day highlighted with a gradient border.
- **Export** — CSV, Excel, ICS, and PNG image exports.

<p align="center">
  <img src="Screenshots/custom_timetable_desktop.png" alt="Custom Timetable - Desktop" width="65%" />
  &nbsp;&nbsp;
  <img src="Screenshots/custom_timetable_mobile.png" alt="Custom Timetable - Mobile" width="25%" />
</p>

---

<a id="timetable-optimizer"></a>
### 🧠 Timetable Optimizer

The crown jewel for students who want the perfect schedule. Enter your courses, and the optimizer uses a backtracking algorithm to find all clash-free section combinations — then ranks them by how comfortable your week would be.

- **Optimization Goals** — Choose from four modes:
  - **Maximize Off-Days** — Crams classes into the fewest days possible.
  - **Balanced (Recommended)** — Maximizes off-days, but adds an extra campus day if it avoids a brutal workload.
  - **Minimize Workload** — Prioritizes balanced days, avoids heavy gaps, and ensures time for midday breaks.
  - **Custom Weights** — Fine-tune exactly how much you care about early mornings, late afternoons, gaps, consecutive classes, midday breaks, and off-days using sliders.
- **Section Locking** — Lock specific sections for courses where you have no choice, and optimize the rest.
- **Comfort Score** — Each result shows a comfort score (0–100%) factoring in early classes, late classes, missed midday breaks, bad gaps, and consecutive class fatigue.
- **Fit Score** — Relative ranking across all valid combinations.
- **Preview to Custom Timetable** — One-click to send any optimized schedule to the Custom Timetable Builder for full editing and export.

<p align="center">
  <img src="Screenshots/optimizer_desktop.png" alt="Timetable Optimizer - Desktop" width="65%" />
  &nbsp;&nbsp;
  <img src="Screenshots/optimizer_mobile.png" alt="Timetable Optimizer - Mobile" width="25%" />
</p>

---

<a id="free-rooms-finder"></a>
### 🚪 Free Rooms Finder

Find empty rooms across campus without leaving your seat. The timetable data is inverted to show which rooms are free at any given time.

- **Specific Slot Mode** — Pick a day and time slot to see which rooms are available right now.
- **Full Calendar Mode** — Weekly grid showing room availability across all standard time slots.
- **Vacancy Status**:
  - 🟢 **Fully Vacant** — Completely free for the entire slot.
  - 🟡 **Partially Vacant** — At least 30 minutes of free time within the slot.
- **Room Grouping** — Rooms organized by block (A, B, C, D, Labs) for quick navigation.
- **Room Detail Panel** — Tap any room to see its full weekly occupancy schedule.

<p align="center">
  <img src="Screenshots/rooms_page_desktop.png" alt="Free Rooms - Desktop" width="65%" />
  &nbsp;&nbsp;
  <img src="Screenshots/rooms_page_mobile.png" alt="Free Rooms - Mobile" width="25%" />
</p>

---

<a id="faculty-directory"></a>
### 👨‍🏫 Faculty Directory

A searchable, filterable directory of all FAST Islamabad faculty members. No more wandering the corridors looking for an office.

- **9 Departments** — CS, AI & DS, SE, Cybersecurity, EE, CE, Sciences & Humanities, Accounting & Finance, Management Sciences.
- **Full-Text Search** — Search by name, title, email, or office room.
- **Department Filter** — Sidebar (desktop) or horizontal pills (mobile) to filter by department.
- **Grid & List Views** — Toggle between card grid and compact list (mobile).
- **Faculty Cards** — Each card shows name, title, department accent color, office, email, and profile link.
- **Faculty Detail** — Expanded view with full information.

<p align="center">
  <img src="Screenshots/faculty_page_desktop.png" alt="Faculty Directory - Desktop" width="65%" />
  &nbsp;&nbsp;
  <img src="Screenshots/faculty_page_mobile.png" alt="Faculty Directory - Mobile" width="25%" />
</p>

---

<a id="campus-events-calendar"></a>
### 🎪 Campus Events Calendar

Never miss a campus event again. Events are scraped from the official SLATE portal and displayed in a beautiful monthly calendar.

- **Monthly Calendar View** — Navigate month by month to see what's happening.
- **Ongoing Events** — Real-time detection of events happening right now (auto-refreshes every 60 seconds).
- **Upcoming Snapshot** — Quick view of the next 10 upcoming events.
- **Stats** — At-a-glance counts for this month, next month, and total tracked events.
- **ICS Download** — Add any event directly to your personal calendar.

<p align="center">
  <img src="Screenshots/events_page_desktop.png" alt="Campus Events - Desktop" width="65%" />
  &nbsp;&nbsp;
  <img src="Screenshots/events_page_mobile.png" alt="Campus Events - Mobile" width="25%" />
</p>

---

<a id="semester-schedule"></a>
### 📆 Semester Schedule

The full academic calendar with key dates, holidays, and monthly grids — always accessible, never buried in email.

- **Key Dates Timeline** — Animated, staggered timeline of important dates (sessionals, results, deadlines, finals).
- **Date Badges** — Color-coded badges: Start, Deadline, Sessional 1, Results, Sessional 2, Finals.
- **Monthly Calendar Grids** — Color-coded days: holidays (national & religious), class days, exam days, deadlines.
- **Academic Ranges** — Visual representation of the semester's academic phases.
- **Holidays Section** — Clearly listed with national/religious distinction.

<p align="center">
  <img src="Screenshots/semester_page_desktop.png" alt="Semester Schedule - Desktop" width="65%" />
  &nbsp;&nbsp;
  <img src="Screenshots/semester_page_mobile.png" alt="Semester Schedule - Mobile" width="25%" />
</p>

---

<a id="lost-found"></a>
### 📦 Lost & Found

A complete lost-and-found system for campus. Report items, browse listings, submit claims, and resolve returns — all in one place.

- **8 Categories** — Electronics, Documents, Accessories, Clothing, Keys, Bags, Books, Other.
- **Report Items** — Submit with photo (auto-compressed), campus zone location, date, and description.
- **Privacy-First** — Found item locations are hidden until you submit a claim, preventing exploitation.
- **Claims System** — Submit claims with your description and contact info.
- **Smart Search** — AI-powered search (GPT-4o-mini) for natural language queries like "blue USB drive near cafeteria".
- **Bookmarks** — Save items to check back on later.
- **Urgency Markers** — Flag high-priority items.
- **Resolution Workflow** — Mark items as resolved with optional proof photo.
- **Auto-Expiry** — Items older than 30 days are flagged; older than 60 days are archived.
- **Onboarding** — First-visit tips carousel for new users.

<p align="center">
  <img src="Screenshots/lost_found_page_desktop.png" alt="Lost & Found - Desktop" width="65%" />
  &nbsp;&nbsp;
  <img src="Screenshots/lost_found_page_mobile.png" alt="Lost & Found - Mobile" width="25%" />
</p>

---

<a id="configuration-home-page"></a>
### 🏠 Configuration & Home Page

The central hub where you pick your feature, set your filters, and configure your experience. Your preferences are saved locally so you never have to re-enter them.

- **Feature Selector** — Quick toggle between Timetable, Exams, Rooms, and Faculty.
- **Mode Selector** — Default Courses or Custom Courses mode.
- **Dynamic Filters** — Batch, school, department, and section selectors that adapt to your chosen feature.
- **Preferences Persistence** — All settings saved to localStorage for your next visit.
- **Desktop Ticker** — "Next Up" widget showing your upcoming classes.

<p align="center">
  <img src="Screenshots/home_page_desktop.png" alt="Home / Configuration - Desktop" width="65%" />
  &nbsp;&nbsp;
  <img src="Screenshots/home_page_mobile.png" alt="Home / Configuration - Mobile" width="25%" />
</p>

---

<a id="dark-mode-theming"></a>
### 🌗 Dark Mode & Theming

The entire platform supports light and dark themes with a single tap. System preference is detected automatically. Each department has its own accent color throughout the app for instant visual recognition.

---

<a id="keyboard-shortcuts"></a>
### ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Shift + A` | Open Admin Dashboard |
| `Ctrl + Shift + Z` | Go Back |

---

<a id="export-options"></a>
### 📤 Export Options

Every schedule view supports multiple export formats:

| Format | Use Case |
|--------|----------|
| **CSV** | Open in any spreadsheet app |
| **Excel (.xlsx)** | Formatted spreadsheet with styled headers |
| **ICS** | Import into Google Calendar, Apple Calendar, Outlook |
| **PNG Image** | Share as an image via WhatsApp, social media |

---

<a id="how-it-works"></a>
## How It Works

<a id="user-workflow"></a>
### User Workflow

```
1.  Open the app → Land on the home screen with feature cards
2.  Pick a feature (Timetable, Exams, Rooms, Faculty, etc.)
3.  Configure filters (batch, department, section) — saved locally for next visit
4.  Browse results → Tap items for detail views
5.  Export or share your filtered schedule
```

<a id="custom-course-workflow"></a>
### Custom Course Workflow

```
1.  Choose "Custom Courses" mode instead of "Default Courses"
2.  Add rows for each course you're taking (mix batches/departments freely)
3.  Save as a named "Bundle" for quick access later
4.  View your personalized schedule → Export
```

<a id="timetable-optimizer-workflow"></a>
### Timetable Optimizer Workflow

```
1.  Open Timetable Optimizer
2.  Enter your courses (or use Default mode to verify your department's courses)
3.  Choose an optimization goal (Max Off-Days, Balanced, Min Workload, or Custom Weights)
4.  Optionally lock specific sections you can't change
5.  Hit "Find the Best Schedules"
6.  Browse ranked results with comfort scores
7.  Preview any result → Sends to Custom Timetable Builder for editing and export
```

<a id="data-flow"></a>
### Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     DATA SOURCES                             │
│                                                              │
│  Python Scripts (scrape + parse)                             │
│   ├── all_courses_schedule.py → timetable.json               │
│   ├── scripts/scrape_slate.py → student_events.json          │
│   ├── scripts/filter_events.py → filtered events             │
│   └── scripts/parse-excel.ts → schedule.json (prebuild)      │
│                                                              │
│  Manual Curation                                             │
│   ├── semester_calendar.json (key dates, holidays)           │
│   └── faculty_data.json (9 departments)                      │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                  NEXT.JS BUILD TIME                          │
│                                                              │
│  JSON → require() at module level → Static data baked in     │
│  Prebuild script: parse-excel.ts runs before every build     │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                 CLIENT-SIDE PROCESSING                       │
│                                                              │
│  Timetable: flattenTimetable() → filterTimetable() →         │
│             groupByDay() → detectConflicts()                 │
│                                                              │
│  Rooms:     buildRoomCalendar() → getAvailableRooms()        │
│                                                              │
│  Faculty:   flattenFaculty() → searchFaculty()               │
│                                                              │
│  Events:    parseEventDate() → getEventsForMonth()           │
│                                                              │
│  All filtering, search, and pagination runs client-side      │
│  for instant results with zero API latency.                  │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                 SUPABASE (Real-time Data)                    │
│                                                              │
│  Lost & Found: items, claims, images (Storage)               │
│  Feedback: campus_feedback submissions                       │
│  Admin: session-based authentication                         │
│  Smart Search: GPT-4o-mini powered search                   │
└──────────────────────────────────────────────────────────────┘
```

---

<a id="tech-stack"></a>
## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + CSS Custom Properties (Design Tokens) |
| **UI Components** | Radix UI Primitives + shadcn/ui |
| **Database** | Supabase (PostgreSQL + Row Level Security + Storage) |
| **Auth** | Custom session-based admin auth (cookie/token) |
| **Animations** | Framer Motion |
| **Data Visualization** | Recharts |
| **Export** | ExcelJS (XLSX), file-saver (CSV), ICS calendar files |
| **Image Upload** | browser-image-compression → Supabase Storage |
| **Email** | Resend + Nodemailer |
| **AI** | GitHub Models (GPT-4o-mini) for smart search |
| **Analytics** | Vercel Analytics |
| **Hosting** | Vercel (Edge Functions + Cron Jobs) |
| **Data Pipeline** | Python scripts (scraping, Excel parsing) → static JSON |

---

<a id="project-structure"></a>
## Project Structure

```
Exam-Table/
├── public/
│   ├── data/                          # Static data files
│   │   ├── timetable.json             # Weekly class schedules (all batches/depts)
│   │   ├── schedule.json              # Exam schedule (all batches/depts)
│   │   ├── semester_calendar.json     # Academic calendar with key dates
│   │   ├── student_events.json        # Campus events from SLATE
│   │   └── faculty/                   # Faculty directory data
│   │       ├── faculty_data.json
│   │       ├── CS.json, AIDS.json, SE.json, ...
│   └── logo/                          # App logo and icon
├── src/
│   ├── app/                           # Next.js App Router pages
│   │   ├── page.tsx                   # Landing page
│   │   ├── home/page.tsx              # Feature selector / configuration
│   │   ├── timetable/page.tsx         # Timetable viewer
│   │   ├── timetable/custom/page.tsx  # Custom timetable builder
│   │   ├── timetable/optimizer/page.tsx # Timetable optimizer
│   │   ├── schedule/page.tsx          # Exam schedule finder
│   │   ├── custom/page.tsx            # Custom exam builder
│   │   ├── rooms/page.tsx             # Free rooms finder
│   │   ├── faculty/page.tsx           # Faculty directory
│   │   ├── events/page.tsx            # Campus events calendar
│   │   ├── semester/page.tsx          # Semester schedule
│   │   ├── lost-found/page.tsx        # Lost & Found system
│   │   ├── admin/page.tsx             # Admin dashboard
│   │   └── api/                       # API routes
│   │       ├── schedule/              # Exam schedule API (Edge)
│   │       ├── smart-search/          # AI-powered search
│   │       ├── feedback/              # Feedback submissions
│   │       ├── lost-found/            # Lost & Found CRUD + claims
│   │       ├── admin/                 # Admin auth (login/check/logout)
│   │       └── export-image/          # PNG export endpoint
│   ├── components/                    # Reusable UI components
│   │   ├── Header.tsx                 # Glass-morphism sticky header
│   │   ├── Navbar.tsx                 # Desktop floating bottom nav
│   │   ├── FloatingMenu.tsx           # Mobile radial FAB menu
│   │   ├── TimetableOptimizer.tsx     # Full optimizer component
│   │   ├── TimetableDetail.tsx        # Timetable detail panel
│   │   ├── ExamDetail.tsx             # Exam detail panel
│   │   ├── FacultyCard.tsx            # Faculty member card
│   │   ├── FacultyDetail.tsx          # Faculty detail panel
│   │   ├── EventsCalendar.tsx         # Monthly calendar component
│   │   ├── FeedbackWidget.tsx         # Side-pinned feedback form
│   │   ├── CountdownBadge.tsx         # Countdown days badge
│   │   ├── GlobalShortcuts.tsx        # Keyboard shortcuts handler
│   │   ├── ThemeToggle.tsx            # Light/Dark mode switch
│   │   ├── DesktopTicker.tsx          # "Next Up" class ticker
│   │   └── ui/                        # shadcn/ui primitives
│   ├── lib/                           # Business logic & utilities
│   │   ├── types.ts                   # TypeScript type definitions
│   │   ├── timetable-filter.ts        # Timetable flattening, filtering, conflicts
│   │   ├── room-logic.ts              # Room calendar builder & vacancy checker
│   │   ├── faculty.ts                 # Faculty search & ranking
│   │   ├── events.ts                  # Event date parsing & calendar logic
│   │   ├── export.ts                  # CSV, XLSX, ICS, PNG export
│   │   ├── supabase.ts               # Supabase client
│   │   ├── admin.ts                   # Admin auth helpers
│   │   ├── theme.tsx                  # Theme provider
│   │   ├── filter.ts                  # Generic filter utilities
│   │   └── utils.ts                   # General utilities
│   ├── hooks/                         # Custom React hooks
│   │   ├── useMobileSwipe.ts          # Swipe-to-close for mobile drawers
│   │   ├── use-mobile.ts              # Mobile detection
│   │   └── use-toast.ts              # Toast notifications
│   └── styles/
│       └── globals.css                # Design tokens, themes, animations
├── scripts/                           # Data pipeline scripts
│   ├── parse-excel.ts                 # Exam Excel → schedule.json
│   ├── scrape_slate.py                # SLATE portal events scraper
│   ├── filter_events.py               # Event relevance filter
│   └── capture-screenshots.js         # Automated screenshot capture
├── all_courses_schedule.py            # Timetable data generator
├── exam_schedule.xlsx                 # Source exam schedule Excel
├── supabase_schema.sql                # Database schema (tables + RLS)
├── vercel.json                        # Vercel cron job configuration
└── package.json
```

---

<a id="routes"></a>
## Routes

| Route | Description |
|---|---|
| `/` | Landing page with feature cards |
| `/home` | Feature selector & filter configuration |
| `/timetable` | Weekly class timetable viewer |
| `/timetable/custom` | Custom timetable builder |
| `/timetable/optimizer` | Timetable optimizer |
| `/schedule` | Exam schedule finder |
| `/custom` | Custom exam schedule builder |
| `/rooms` | Free rooms finder |
| `/faculty` | Faculty directory |
| `/events` | Campus events calendar |
| `/semester` | Semester academic calendar |
| `/lost-found` | Lost & Found system |
| `/admin` | Admin dashboard (password-protected) |
| `/api/schedule` | Filtered exam JSON (Edge) |
| `/api/smart-search` | AI-powered search endpoint |
| `/api/feedback` | Feedback CRUD |
| `/api/lost-found/*` | Lost & Found API (CRUD, claims, resolution) |
| `/api/admin/*` | Admin auth (login, check, logout) |

---

<a id="getting-started"></a>
## Getting Started

<a id="prerequisites"></a>
### Prerequisites

- Node.js 18+
- Python 3.8+ (for data pipeline scripts)
- A Supabase project (for Lost & Found and Feedback features)

<a id="installation"></a>
### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ammarasad2005/Exam-Table.git
   cd Exam-Table
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the project root:
   ```env
   # Supabase (required for Lost & Found + Feedback)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Admin authentication
   ADMIN_USERNAME=your_admin_username
   ADMIN_PASSWORD=your_admin_password

   # Smart Search (optional - enables AI-powered Lost & Found search)
   GITHUB_TOKEN=your_github_token

   # Event scraping (optional - for updating campus events)
   SLATE_USERNAME=your_slate_username
   SLATE_PASSWORD=your_slate_password
   SLATE_TOOL_BASE=your_slate_tool_base_url
   GROQ_API_KEY=your_groq_key

   # Email (optional - for Lost & Found notifications)
   RESEND_API_KEY=your_resend_key
   SMTP_HOST=your_smtp_host
   SMTP_PORT=587
   SMTP_USER=your_smtp_user
   SMTP_PASS=your_smtp_password
   ```

4. **Set up Supabase:**
   Run the SQL schema from `supabase_schema.sql` in your Supabase SQL editor. This creates the `lost_found_items`, `lost_found_claims`, and `campus_feedback` tables with Row Level Security policies, plus the `lost_found_images` storage bucket.

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   This runs the exam schedule parser first, then starts the Next.js dev server on `http://localhost:3000`.

---

<a id="available-scripts"></a>
## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Run parser + start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run type-check` | TypeScript type checking |
| `npm run lint` | Next.js linting |
| `npm run timetable:update` | Regenerate `timetable.json` from course data |
| `npm run events:scrape` | Scrape events from SLATE portal |
| `npm run events:filter` | Filter scraped events for student relevance |
| `npm run events:update` | Run scrape + filter in sequence |

---

<a id="data-pipeline"></a>
## Data Pipeline

<a id="exam-schedule-pipeline"></a>
### Exam Schedule Pipeline
```
exam_schedule.xlsx  →  scripts/parse-excel.ts  →  public/data/schedule.json
```
Runs automatically as a `prebuild` step before every build.

<a id="timetable-pipeline"></a>
### Timetable Pipeline
```
Google Sheets (course data)  →  all_courses_schedule.py  →  public/data/timetable.json
```
Run manually via `npm run timetable:update`.

<a id="campus-events-pipeline"></a>
### Campus Events Pipeline
```
SLATE Portal  →  scripts/scrape_slate.py  →  slate_calendar_events.json
             →  scripts/filter_events.py  →  public/data/student_events.json
```
Run manually via `npm run events:update`. Requires SLATE credentials and Groq API key.

<a id="faculty-semester-data"></a>
### Faculty & Semester Data
Manually curated JSON files in `public/data/`.

---

<a id="scheduled-automation"></a>
## Scheduled Automation

<a id="vercel-cron-jobs-production"></a>
### Vercel Cron Jobs (Production)

Configured in `vercel.json`:

| Schedule | Endpoint | Purpose |
|---|---|---|
| Weekdays 5:00 AM UTC | `/api/lost-found/cron/reminders` | Send Lost & Found claim reminders |
| Sundays 1:00 PM UTC | `/api/lost-found/cron/reminders` | Weekly Lost & Found digest |

<a id="github-actions-data-updates"></a>
### GitHub Actions (Recommended for Data Updates)

- `.github/workflows/update-timetable.yml` — Hourly timetable refresh
- `.github/workflows/update-events.yml` — Weekly Monday events refresh

Required repository secrets: `MAIN_PUSH_TOKEN`, `SLATE_USERNAME`, `SLATE_PASSWORD`, `SLATE_TOOL_BASE`, `GROQ_API_KEY`

---

<a id="database-schema"></a>
## Database Schema

<a id="lost-found-items"></a>
### `lost_found_items`
Stores all reported lost and found items with image URLs, campus zone locations, resolution status, and timestamps.

<a id="lost-found-claims"></a>
### `lost_found_claims`
Tracks claims submitted by users on found items, with verification status (pending, verified, unclaimed).

<a id="campus-feedback"></a>
### `campus_feedback`
Stores user feedback submissions with category (bug report, suggestion, review, inquiry) and emoji rating (1–5).

All tables use Supabase Row Level Security with permissive policies for the student-facing demo, managed through the admin dashboard.

---

<a id="design-highlights"></a>
## Design Highlights

- **Glass-morphism Header** — Sticky header with backdrop blur and a signature "laser rail" gradient border (purple→orange in light mode, gold→yellow in dark mode).
- **Department Accent Colors** — Each of the 11 departments has a unique accent color applied consistently across cards, pills, borders, and badges.
- **Dual Navigation** — Desktop uses a floating bottom navbar with "stage light" animation on the active tab; mobile uses an arc-shaped radial FAB menu with drag-to-scroll.
- **Responsive Everything** — Every page adapts between mobile (390px) and desktop (1440px+) with bottom sheets on mobile and side panels on desktop.
- **Live "Next Up" Ticker** — On the home page, a desktop ticker shows your next upcoming class based on saved preferences.
- **Print-Ready Exports** — Dedicated print styles for timetable and exam exports.

---

<a id="license-usage"></a>
## License & Usage

This project is **source-available** — the codebase is publicly visible for learning, transparency, and community contribution, but it is **not open source** in the traditional sense. I retain full ownership and all rights are reserved.

<a id="what-you-can-do"></a>
### What You Can Do

- **Read and explore** the codebase to understand how things work under the hood
- **Run the project locally** to experiment, test, or learn on your own machine
- **Fork the repository** to open pull requests — contributions are welcome, I review and merge at my discretion
- **Report issues and suggest features** through GitHub Issues

<a id="what-you-cannot-do"></a>
### What You Cannot Do

- **Copy the codebase** — in whole or in part — into your own project without my explicit permission
- **Lift the UI design** or reproduce how things are structured and built here without my explicit permission
- **Use this project commercially** without my consent

If you'd like to use any part of this project beyond what's permitted above, [reach out to me](https://linkedin.com/in/muhammad-ammar-asad).

---

<a id="contributing"></a>
## Contributing

Contributions are welcome — I review and merge at my discretion. If you see something that could be improved or want to add a feature:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Contributions I merge become part of this project under the same license terms.

---

<a id="license"></a>
## License

© 2026 Ammar Asad. All rights reserved.

Source-available — not open source. You're free to read, run locally, and fork for pull requests. You're not free to copy the codebase, lift the UI design, or reproduce how things are structured and built — in whole or in part — without my explicit permission. Contributions I merge become part of this project under these same terms. See the [LICENSE](LICENSE) file for full terms.

---

<div align="center">

**Built with 💖 for the FAST NUCES Islamabad community**

</div>
