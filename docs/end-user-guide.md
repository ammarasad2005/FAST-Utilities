# How to use FAST ISB Utilities

## How can you navigate this guide?

- [What is this platform and who is it for?](#what-is-this-platform-and-who-is-it-for)
- [Why does this platform exist?](#why-does-this-platform-exist)
- [How can you get oriented in under five minutes?](#how-can-you-get-oriented-in-under-five-minutes)
- [Which concepts matter before you use it?](#which-concepts-matter-before-you-use-it)
- [How can you complete the most common tasks on the site?](#how-can-you-complete-the-most-common-tasks-on-the-site)
- [Which links, settings, and exports does the site support?](#which-links-settings-and-exports-does-the-site-support)
- [What should you do when something looks wrong?](#what-should-you-do-when-something-looks-wrong)

## What is this platform and who is it for?

FAST ISB Utilities is a student-facing campus utilities platform for FAST NUCES Islamabad. It brings together exam lookup, weekly timetable planning, section optimization, room availability, faculty lookup, semester dates, and student-relevant events in one place for students who would otherwise bounce between spreadsheets, notices, and separate tools. It replaces scattered schedule hunting and manual section comparison, while staying focused on planning and discovery rather than official enrollment, room booking, or academic policy decisions.

## Why does this platform exist?

Before this platform, a student often had to assemble their week from multiple sources: exam spreadsheets, timetable sheets, separate event posts, faculty listings, and manual section comparisons. That process becomes even harder for irregular students, repeat students, and anyone trying to compare sections or build a mixed timetable across batches and departments.

With FAST ISB Utilities, the same student can move from feature to feature inside one workflow: find exam timings, inspect a weekly class plan, test section combinations in the timetable optimizer, preview a chosen result, check whether a room is open, and scan faculty, semester, and events information without leaving the site. The repository itself shows that the product has grown beyond a single exam viewer into a broader campus utilities layer, which is why the documentation below treats it as a unified platform instead of a narrow schedule page.

## How can you get oriented in under five minutes?

Use this path if you want to understand the platform quickly and reach a real result without making many choices.

1. Open the site home page.
2. Read the launcher cards to see the full platform surface: Timetable, Timetable Optimizer, Exam Finder, Free Rooms, Faculty Info, Semester Schedule, and Campus Events.
3. Open `Timetable`.
4. Choose your batch, department, and section.
5. Continue to the timetable results page.
6. Use the site navigation to move between the other utilities once you have seen your first result.

Example path:

```text
/home?feature=timetable
/timetable?batch=2024&dept=CS&section=A
```

If you want to understand the platform at a glance rather than start with a custom setup, this path shows the core workflow and makes the rest of the site easier to understand.

## Which concepts matter before you use it?

### The platform is feature-first, not page-first

Definition: You start by choosing the outcome you want, not by learning a technical structure.

Why it exists: Most students arrive with a question such as "What is my timetable?" or "Which rooms are free?" rather than a need to browse raw data files.

Minimal example:

```text
Home -> Timetable
Home -> Timetable Optimizer
Home -> Free Rooms
```

### Default flows and custom flows solve different problems

Definition: Default flows assume a standard student profile, while custom flows let you mix courses, sections, and academic paths.

Why it exists: Many students can use one saved batch and section, but irregular students and mixed-course cases need more control.

Minimal example:

```text
Default exams: batch + school + department
Custom exams: multiple manually added course rows
```

### The timetable optimizer is a planning tool for section choice

Definition: The optimizer compares section combinations across your selected courses and returns clash-free schedules that best fit your chosen goal.

Why it exists: Students often care about more than avoiding clashes. They also want fewer campus days, fewer harsh gaps, or a more comfortable daily rhythm.

Minimal example:

```text
Goal: Balanced
Constraint: Lock one preferred section
Result: ranked schedule options with fit score and comfort score
```

### Saved preferences and custom bundles are separate modes

Definition: The site treats saved default preferences and saved custom bundles as two different ways of organizing your schedule.

Why it exists: A simple default profile works best for repeated use, while bundles work better when you are testing multiple custom combinations.

Minimal example:

```text
Default profile -> saved batch, department, section
Custom bundle -> saved mixed timetable rows
```

### Exports turn results into something you can carry elsewhere

Definition: Exams, timetables, and events can be moved out of the site into calendar or spreadsheet formats.

Why it exists: Students often want the result inside a personal calendar, a sheet, or a file they can share.

Minimal example:

```text
Exam results -> .ics, .xlsx, .csv
Timetable results -> .ics, .xlsx, .csv
Events -> .ics
```

## How can you complete the most common tasks on the site?

### How can you find your exam schedule?

Prerequisites: Know your batch, school, and department.

1. Open the home page.
2. Choose `Exam Finder`.
3. Select your batch, school, and department.
4. Continue to the results page.
5. Use search to narrow by course code or course name.
6. Open any exam card to inspect the full timing details.
7. Export the result if you want it in calendar or spreadsheet form.

Complete working example:

```text
/schedule?batch=2024&school=FSC&dept=CS
```

What next: If your courses do not fit one department-and-batch view, use the custom exam builder.

### How can you build a custom exam list?

Prerequisites: Know the course codes you want to combine.

1. Open `Custom Courses` from the exams flow.
2. Add one row per course.
3. Fill in the batch, stream, and course code for each row.
4. Save the list to generate the merged exam result.
5. Search within the merged result if you need to narrow it further.
6. Export the result when you are done.

Complete working example:

```text
/custom
Rows:
- 2024 | CS | CS2004
- 2024 | AI | AI2102
```

What next: If you also need a weekly class plan for mixed selections, move to the custom timetable builder or the optimizer.

### How can you view your weekly timetable?

Prerequisites: Know your batch, department, and section.

1. Open `Timetable`.
2. Select your batch, department, and section.
3. Continue to the results page.
4. Switch between list view and grid view based on how you want to read the week.
5. Search by course, room, or section if you need to narrow the result.
6. Save timetable result preferences if you want your section overrides and removals to persist for that batch and department.
7. Export the timetable when you want a calendar or file copy.

Complete working example:

```text
/timetable?batch=2024&dept=CS&section=A
```

What next: If you want the platform to compare multiple section combinations for you, use the timetable optimizer.

### How can you generate the best timetable for your courses?

Prerequisites: Know either your default batch and department or the exact set of courses you want to optimize.

1. Open `Timetable Optimizer`.
2. Choose an optimization goal:
   `Balanced`, `Maximize Off-Days`, `Minimize Workload`, or `Custom Weights`.
3. Decide whether you want to lock any preferred sections manually.
4. Choose an input mode:
   `Default Courses` for a standard batch-and-department set, or `Custom Courses` for a hand-picked list.
5. If you use `Default Courses`, verify the detected course list and uncheck any course you are not taking.
6. If you use `Custom Courses`, add rows and select the year, department, type, course, and optional locked section.
7. Run the optimizer.
8. Compare the ranked schedules by fit score, comfort score, off-days, midday-break status, and fatigue warnings.
9. Open `Preview Timetable` on any result to hand the chosen schedule into the timetable view.

Complete working example:

```text
/timetable/optimizer
Goal: Balanced
Input mode: Default Courses
Batch: 2024
Department: CS
```

What next: If one result looks promising, preview it and then keep it as the timetable you use day to day.

### How can you find a free room?

Prerequisites: Know the day and time slot you care about.

1. Open `Free Rooms`.
2. Pick the day.
3. Pick the time slot.
4. Review fully vacant rooms first.
5. Review partially vacant rooms if a full vacancy is not necessary.
6. Open the calendar-style availability view if you want the bigger picture across the week.

Complete working example:

```text
/rooms
Day: Monday
Slot: 10:00 AM – 11:20 AM
```

What next: If you need the rest of your day context before choosing a room, open your timetable and compare the slot against your class blocks.

### How can you use the faculty, semester, and events views?

Prerequisites: None.

1. Open `Faculty Info` when you need contact or office information.
2. Open `Semester Schedule` when you need academic dates, holidays, and exam windows.
3. Open `Campus Events` when you want student-relevant events in calendar form.
4. Use the faculty search and department filters to narrow the people list.
5. Use the events page to review ongoing and upcoming items and export an event to calendar when needed.

Complete working examples:

```text
/faculty?dept=CS
/semester
/events
```

What next: Once you know your semester dates and events, return to timetable and optimizer flows to plan around the weeks that matter most.

## Which links, settings, and exports does the site support?

### Which pages can you open directly?

| Name | Type | Default | Description | Example |
| --- | --- | --- | --- | --- |
| Home | route | launcher view | Landing page that exposes all major utilities. | `/` |
| Home feature view | route + query | `timetable` is the practical default flow | Opens the setup page with a selected feature context. | `/home?feature=exams` |
| Exam results | route + query | `dept=CS` if omitted | Shows exam results for one batch, school, and department. | `/schedule?batch=2024&school=FSC&dept=CS` |
| Custom exam builder | route | none | Builds one merged exam list from manually added course rows. | `/custom` |
| Timetable results | route + query | `dept=CS` if omitted | Shows one section timetable with search, view modes, and export. | `/timetable?batch=2024&dept=CS&section=A` |
| Custom timetable builder | route | none | Builds mixed timetables and reusable bundles. | `/timetable/custom` |
| Timetable optimizer | route | none | Finds clash-free schedule combinations ranked by goal fit. | `/timetable/optimizer` |
| Free rooms | route | none | Finds fully and partially vacant rooms by day and slot. | `/rooms` |
| Faculty directory | route + query | all departments | Lists faculty members with search and department filters. | `/faculty?dept=SE` |
| Semester schedule | route | none | Shows academic milestones, holidays, and exam windows. | `/semester` |
| Campus events | route | none | Shows student-relevant events for the current and next month. | `/events` |
| Exam JSON API | API route + query | none | Returns filtered exam data for advanced usage. | `/api/schedule?batch=2024&dept=CS` |

### Which query parameters and selectors matter?

| Name | Type | Default | Description | Example |
| --- | --- | --- | --- | --- |
| `feature` | query param | none | Chooses the active setup flow on the home configuration page. Accepted values: `exams`, `timetable`, `rooms`, `faculty`. | `/home?feature=rooms` |
| `batch` | query param / selector | none | Academic batch or year used by exams and timetable flows. | `2024` |
| `school` | query param / selector | none | School used in exam lookup. Accepted values: `FSC`, `FSM`, `FSE`. | `FSC` |
| `dept` for exams and timetable | query param / selector | `CS` in result pages when omitted | Department code used by exam and timetable flows. | `CS` |
| `section` | query param / selector | none | Section used for the default timetable results page. | `A` |
| `dept` for faculty | query param / selector | all departments | Faculty filter code. Accepted values include `CS`, `AIDS`, `SE`, `CY`, `EE`, `CE`, `SH`, `AF`, `MS`. | `/faculty?dept=AIDS` |
| Search on exam results | page control | empty | Filters by course code or course name. | `CS2004` |
| Search on timetable results | page control | empty | Filters by course, room, or section. | `Lab` |
| Search on faculty page | page control | empty | Filters by name, title, email, or office. | `Associate Professor` |

### Which optimizer goals and constraints can you use?

| Name | Type | Default | Description | Example |
| --- | --- | --- | --- | --- |
| Balanced | optimization goal | selected by default | Favors fewer campus days while still avoiding punishing workload patterns. | `Balanced` |
| Maximize Off-Days | optimization goal | not selected | Packs classes into as few days as possible. | `Maximize Off-Days` |
| Minimize Workload | optimization goal | not selected | Prioritizes lighter daily rhythm, fewer hard gaps, and healthier spacing. | `Minimize Workload` |
| Custom Weights | optimization goal | not selected | Lets you tune how much you care about mornings, afternoons, gaps, breaks, consecutive classes, and campus days. | `Custom Weights` |
| Preferred section lock | optimizer constraint | off | Restricts one or more courses to chosen sections before optimization. | `Lock Section -> A` |
| Default Courses | optimizer input mode | available | Starts from a batch and department, then asks you to verify the course list. | `2024 + CS` |
| Custom Courses | optimizer input mode | available | Builds the optimization set from manually selected courses. | `2024 + AI + regular + NLP` |

### Which exports and saved settings can you rely on?

| Name | Type | Default | Description | Example |
| --- | --- | --- | --- | --- |
| Exam export to calendar | export | available when exam results exist | Downloads the current exam result as `.ics`. | `Export -> as Calendar (.ics)` |
| Exam export to XLSX | export | available when exam results exist | Downloads the current exam result as `.xlsx`. | `Export -> as XLSX` |
| Exam export to CSV | export | available when exam results exist | Downloads the current exam result as `.csv`. | `Export -> as CSV` |
| Timetable export to calendar | export | available when timetable results exist | Downloads the current timetable result as `.ics`. | `Export -> as Calendar (.ics)` |
| Timetable export to XLSX | export | available when timetable results exist | Downloads the current timetable result as `.xlsx`. | `Export -> as XLSX` |
| Timetable export to CSV | export | available when timetable results exist | Downloads the current timetable result as `.csv`. | `Export -> as CSV` |
| Event export to calendar | export | available per event card | Downloads an event as `.ics`. | `Add to calendar` |
| Saved default preferences | browser setting | unset | Stores your default batch, school, department, and section for repeat use. | `Save Preferences` |
| Custom timetable bundles | browser setting | unset | Stores reusable custom timetable row sets. | `Saved bundle` |
| Timetable result preferences | browser setting | unset | Stores section overrides and removed courses for one batch and department. | `Preferences saved` |
| Theme preference | browser setting | time-of-day based if unset | Stores light or dark mode. | `Theme toggle` |
| Optimizer preview handoff | browser setting | temporary | Opens a selected optimizer result inside the custom timetable page. | `Preview Timetable` |

### Which room-finder and events behaviors should you know?

| Name | Type | Default | Description | Example |
| --- | --- | --- | --- | --- |
| Standard room slot 1 | time slot | available | First free-room check window. | `8:30 AM – 9:50 AM` |
| Standard room slot 2 | time slot | available | Second free-room check window. | `10:00 AM – 11:20 AM` |
| Standard room slot 3 | time slot | available | Third free-room check window. | `11:30 AM – 12:50 PM` |
| Standard room slot 4 | time slot | available | Fourth free-room check window. | `1:00 PM – 2:20 PM` |
| Standard room slot 5 | time slot | available | Fifth free-room check window. | `2:30 PM – 3:50 PM` |
| Standard room slot 6 | time slot | available | Sixth free-room check window. | `3:55 PM – 5:15 PM` |
| Partially vacant room | room status | computed | A room with at least 30 free minutes inside the selected slot. | `Partially Vacant` |
| Ongoing events | events view | computed from current time | Events happening right now on the current day. | `Ongoing Snapshot` |
| Upcoming events | events view | first 10 upcoming items | Near-future events across the current and next month. | `Upcoming Snapshot` |

## What should you do when something looks wrong?

### The page opens, but I cannot tell where to start

- Symptom: The launcher shows several tools and you are not sure which one to open first.
- Cause: The platform is designed around outcomes instead of one linear path.
- Fix: Start with `Timetable` if you want the fastest orientation, then move to exams, rooms, or optimizer after you have seen your first result.
- Verification: You should reach a results page such as `/timetable?batch=...&dept=...&section=...`.

### I cannot find my exams

- Symptom: The exam results page is empty or does not include the course you expected.
- Cause: The batch, school, or department selection does not match your actual exam listing, or you are looking for a mixed set of courses that does not belong to one default profile.
- Fix: Recheck the batch, school, and department first. If your courses span multiple rows or academic contexts, switch to the custom exam builder and add the courses one by one.
- Verification: You should see dated exam cards after saving the custom rows or correcting the default filters.

### The optimizer says no clash-free timetable exists

- Symptom: The optimizer returns a message saying no clash-free timetable exists within the five-day workweek.
- Cause: The selected course set has no valid combination under the current section locks, or the selected set itself conflicts.
- Fix: Remove some locked sections, switch from strict preferences to open optimization, or reduce the selected course set and try again.
- Verification: The optimizer should return ranked schedules with fit scores instead of the no-combination message.

### The optimizer results look too strict or too uncomfortable

- Symptom: The returned schedules have too many long days, fatigue warnings, or fewer off-days than you wanted.
- Cause: The active optimization goal is not aligned with what you value most.
- Fix: Switch between `Balanced`, `Maximize Off-Days`, and `Minimize Workload`, or use `Custom Weights` to tune mornings, gaps, breaks, and campus days.
- Verification: The ranking should reshuffle, and the top cards should reflect the tradeoff you selected.

### Preview Timetable opens, but the result is not what I expected

- Symptom: The preview opens the custom timetable view, but the rows do not match the option you meant to inspect.
- Cause: A different preview may have been loaded last, or you may have opened the custom timetable page separately instead of using the preview handoff from the optimizer.
- Fix: Return to the optimizer and open `Preview Timetable` on the exact ranked option you want to inspect.
- Verification: The custom timetable page should load rows that match the course-section pairings shown on the chosen optimizer card.

### My saved default preferences or custom bundles seem to conflict

- Symptom: The site warns you when you try to save a default profile or create custom bundles.
- Cause: The platform keeps simple default preferences and custom bundle workflows separate to avoid mixing two planning models.
- Fix: Decide which workflow you want to keep active. Clear the conflicting saved state, then save the new one.
- Verification: The warning should disappear, and the selected save action should complete.

### I checked Free Rooms, but the list is shorter than I expected

- Symptom: Few or no rooms appear fully vacant.
- Cause: The chosen slot may be busy across much of campus, and the page distinguishes fully vacant rooms from partially vacant rooms with at least 30 free minutes.
- Fix: Review both the fully vacant and partially vacant sections, then try a different slot if you need a longer free block.
- Verification: Changing the slot should update the room counts and room lists.

### The faculty page does not show the person I want immediately

- Symptom: A faculty member is not visible in the current list view.
- Cause: The active department filter or search query is narrowing the list too much, or the person is on another result page within the directory.
- Fix: Clear the search, switch to `All Faculty`, or move through the paginated results.
- Verification: The total count and page contents should update as the filter changes.

### The events page does not show the month or event I expected

- Symptom: An event seems missing from the visible calendar or snapshot.
- Cause: The page focuses on the current and next month views, and the snapshots only surface ongoing items and the next set of upcoming events.
- Fix: Check the calendar month itself first, then compare ongoing and upcoming panels separately.
- Verification: You should be able to find the event either in the month grid or in the relevant snapshot panel if it falls within the visible window.

### The exported file is empty or unavailable

- Symptom: The export control is disabled or produces an empty result.
- Cause: Exports only work when the current page already has results to export.
- Fix: Generate the exam, timetable, or event result first, then export from that populated state.
- Verification: The export menu should activate once result cards or event items are present.
