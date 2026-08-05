/**
 * Exam-only course catalog merger.
 *
 * The summer course checklist on /home is shared between the timetable feature
 * and the exam-schedule feature. The checklist's source data comes from
 * /api/timetable, which returns { entries, catalog } where:
 *   - entries = weekly timetable slots (FSC only — FSM/FSE have no weekly timetable)
 *   - catalog = SummerCourseCatalogEntry[] from Supabase course_mappings
 *
 * Problem: FSM and FSE courses exist ONLY in the exam schedule
 * (public/data/summer_schedule.json), not in the weekly timetable. So they
 * never appear in the checklist, and students can't select them for exam
 * filtering.
 *
 * Solution: at API runtime, merge FSM/FSE exam courses into the catalog as
 * `examOnly: true` entries with their school tag. The home page checklist
 * then:
 *   - In 'exams' feature: shows ALL courses (including examOnly), grouped by
 *     school in a multi-column layout (FSC | FSM | FSE).
 *   - In 'timetable' feature: hides examOnly courses (they have no weekly
 *     slots, so showing them would be noise).
 *
 * Existing catalog entries (from Supabase) are FSC courses (the timetable
 * only serves FSC). They get tagged with `school: 'FSC'` for column grouping.
 */

import type { SummerCourseCatalogEntry, ExamEntry } from './types';
// eslint-disable-next-line
const summerSchedule: ExamEntry[] = require('../../public/data/summer_schedule.json');

/**
 * Merge exam-only courses (FSM, FSE) into the existing timetable catalog.
 *
 * - Tags existing catalog entries with school='FSC' (the timetable only has FSC).
 * - Adds NEW entries for every FSM/FSE exam course that isn't already in the catalog.
 *   The new entry's sheetName = exam.courseName (full name like "Financial Accounting"),
 *   so the exam schedule's filterSummerExams() matches it via exact string equality.
 *
 * This function is idempotent: running it twice on the same catalog produces the
 * same output. It's called once per /api/timetable request.
 *
 * NOTE: FSC exam courses are NOT added here — they're already in the catalog
 * (from Supabase or auto-built from timetable entries). The SUMMER_COURSE_ALIASES
 * map in filter.ts bridges their short timetable name (e.g., "OOP") to their full
 * exam name (e.g., "Object Oriented Programming").
 */
export function mergeExamOnlyCourses(
  catalog: SummerCourseCatalogEntry[]
): SummerCourseCatalogEntry[] {
  // 1. Tag existing entries as FSC (timetable only has FSC courses)
  const tagged: SummerCourseCatalogEntry[] = catalog.map(c => ({
    ...c,
    school: c.school ?? 'FSC',
    examOnly: c.examOnly ?? false,
  }));

  // 2. Build a set of existing sheetNames (lowercased) for dedup
  const existingNames = new Set(
    tagged.map(c => c.sheetName.toLowerCase().trim())
  );

  // 3. Collect FSM and FSE exam courses not already in the catalog
  const examOnlyEntries: SummerCourseCatalogEntry[] = [];
  const seen = new Set<string>();

  for (const exam of summerSchedule) {
    // Only add FSM/FSE courses as exam-only.
    // FSC exam courses are already in the catalog via the timetable.
    if (exam.school === 'FSC') continue;

    const sheetName = exam.courseName.trim();
    const key = sheetName.toLowerCase();
    if (existingNames.has(key) || seen.has(key)) continue;
    seen.add(key);

    examOnlyEntries.push({
      sheetName,
      displayName: null,  // show the full exam course name as-is
      hidden: false,
      examOnly: true,
      school: exam.school as 'FSC' | 'FSM' | 'FSE',
    });
  }

  // 4. Merge: existing (FSC-tagged) + new (FSM/FSE exam-only)
  return [...tagged, ...examOnlyEntries];
}
