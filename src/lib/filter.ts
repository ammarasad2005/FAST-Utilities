import type { ExamEntry, FilterState } from './types';

export function filterExams(entries: ExamEntry[], filter: FilterState): ExamEntry[] {
  const q = filter.query.toLowerCase().trim();
  return entries.filter(e => {
    if (e.batch !== filter.batch) return false;
    if (e.school !== filter.school) return false;
    if (e.department !== filter.department) return false;
    if (q && !e.courseCode.toLowerCase().includes(q) && !e.courseName.toLowerCase().includes(q)) return false;
    return true;
  });
}

/**
 * Summer exam filter — does NOT filter by batch/school/department.
 * Instead, optionally filters by the student's selected summer courses
 * (course names from localStorage fsc_summer_courses), plus free-text search.
 *
 * If selectedCourses is empty or undefined, all summer exams are shown.
 *
 * COURSE NAME MATCHING:
 * The summer timetable uses short names/abbreviations (e.g., "AP", "DLD",
 * "OOP", "MV Calculus") while the exam schedule uses full course names
 * (e.g., "Applied Physics", "Digital Logic Design", "Object Oriented
 * Programming", "Multivariable Calculus"). A multi-strategy matcher is
 * used to bridge this gap (see matchesSummerCourse below).
 */
export function filterSummerExams(
  entries: ExamEntry[],
  filter: { query: string; selectedCourses?: string[] }
): ExamEntry[] {
  const q = filter.query.toLowerCase().trim();
  const courses = filter.selectedCourses ?? [];

  return entries.filter(e => {
    // If the student has selected specific summer courses, filter by name match
    if (courses.length > 0) {
      const matches = courses.some(course => matchesSummerCourse(course, e.courseName));
      if (!matches) return false;
    }
    // Apply free-text search
    if (q && !e.courseCode.toLowerCase().includes(q) && !e.courseName.toLowerCase().includes(q)) return false;
    return true;
  });
}

// ─── Summer course name matching ──────────────────────────────────────────────

/**
 * Known alias map: summer timetable short name → exact exam course names.
 *
 * This handles the known abbreviations used in the summer timetable catalog
 * (stored in Supabase course_mappings / timetable.json) and maps them to the
 * full course names used in the exam schedule (from exam_schedule_summer.xlsx).
 *
 * The map is checked FIRST and takes priority over all other matching
 * strategies, which allows precise disambiguation — e.g., "Calculus" maps
 * to "Calculus and Analytical Geometry" ONLY (not "Multivariable Calculus",
 * which is handled by the separate "MV Calculus" entry).
 *
 * To extend: add new entries here when new summer courses are introduced.
 */
const SUMMER_COURSE_ALIASES: Record<string, string[]> = {
  'ap':            ['applied physics'],
  'calculus':      ['calculus and analytical geometry'],
  'dld':           ['digital logic design'],
  'la':            ['linear algebra'],
  'mv calculus':   ['multivariable calculus'],
  'oop':           ['object oriented programming'],
  'pf':            ['programming fundamentals'],
  'prob & stats':  ['probability and satistics'],  // note: "satistics" typo is in the source xlsx
  'generative ai': ['generative ai'],
  'discrete st':   [],  // exam "will be held later" per FAST — no match expected
};

/**
 * Multi-strategy course name matcher.
 *
 * Returns true if the selected course name (from the summer timetable)
 * refers to the same course as the exam course name (from the exam schedule).
 *
 * Strategies (checked in order, first match wins):
 *   1. Alias map — precise lookup for known abbreviations
 *   2. Exact match — direct string equality
 *   3. Acronym match — "DLD" matches "Digital Logic Design" (first letters)
 *   4. Word-level overlap — "Prob & Stats" matches "Probability and Satistics"
 *      via prefix matching on significant words
 *   5. Substring match — fallback for any remaining cases
 */
function matchesSummerCourse(selectedName: string, examName: string): boolean {
  const sel = selectedName.toLowerCase().trim();
  const exam = examName.toLowerCase().trim();

  if (!sel || !exam) return false;

  // Strategy 1: Alias map (highest priority — handles disambiguation)
  const aliases = SUMMER_COURSE_ALIASES[sel];
  if (aliases !== undefined) {
    return aliases.some(a => exam === a);
  }

  // Strategy 2: Exact match
  if (sel === exam) return true;

  // Strategy 3: Acronym match
  // If the selected name is all uppercase letters (2+ chars), check if it
  // matches the first letters of each word in the exam course name.
  // e.g., "DLD" → "Digital Logic Design" → first letters "DLD" → match
  if (/^[a-z]{2,5}$/.test(sel) && sel === selectedName.trim().toLowerCase() &&
      selectedName.trim() === selectedName.trim().toUpperCase()) {
    const examWords = exam.split(/\s+/).filter(w => w.length > 0 && /[a-z]/.test(w));
    const acronym = examWords.map(w => w[0]).join('');
    if (acronym === sel) return true;
  }

  // Strategy 4: Word-level overlap
  // Split both names into words, ignore short words (≤2 chars like "&", "and",
  // "ii", "to"), and check if any significant word from the selected name is
  // a prefix of (or is prefixed by) a significant word in the exam name.
  // e.g., "Prob & Stats" → ["prob", "stats"] → "prob" is prefix of "probability" → match
  const selWords = sel.split(/[\s&]+/).filter(w => w.length > 2);
  const examWords = exam.split(/[\s&]+/).filter(w => w.length > 2);
  if (selWords.length > 0) {
    const hasOverlap = selWords.some(sw =>
      examWords.some(ew => ew.startsWith(sw) || sw.startsWith(ew))
    );
    if (hasOverlap) return true;
  }

  // Strategy 5: Substring match (lowest priority fallback)
  if (exam.includes(sel) || sel.includes(exam)) return true;

  return false;
}

export function groupByDay(entries: ExamEntry[]): { label: string; entries: ExamEntry[] }[] {
  const map = new Map<string, ExamEntry[]>();
  for (const e of entries) {
    const key = e.date;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return [...map.entries()].map(([date, dayEntries]) => ({
    label: formatDayHeader(date, dayEntries[0].day),
    entries: dayEntries,
  }));
}

// "12/05/2025" + "Monday" → "MON 12 MAY"
function formatDayHeader(date: string, day: string): string {
  const [d, m] = date.split('/');
  const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${day.slice(0, 3).toUpperCase()} ${d} ${monthNames[parseInt(m) - 1]}`;
}
