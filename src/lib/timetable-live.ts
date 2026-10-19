import { filterTimetable } from './timetable-filter';
import type { TimetableEntry } from './types';

export const RESULT_PREFS_STORAGE_KEY = 'fsc_timetable_results_preferences_v1';

type CourseKey = string;

export interface UserConfig {
  batch: string;
  school: string;
  dept: string;
  section: string;
}

export interface TimetableResultPreference {
  sectionByCourse: Record<CourseKey, string>;
  removedCourseKeys: CourseKey[];
}

function isDepartmentMatch(entryDept: string, filterDept: string): boolean {
  if (entryDept === filterDept) return true;
  return entryDept.split('/').map(d => d.trim()).includes(filterDept);
}

function normalizeSectionForBatch(batch: string, rawSection: string): string {
  if (batch === '2025') {
    return rawSection.replace(/\d+$/, '');
  }
  return rawSection;
}

function makeCourseKey(entry: Pick<TimetableEntry, 'department' | 'category' | 'courseName'>): CourseKey {
  return `${entry.department}|${entry.category}|${entry.courseName}`;
}

function makeSlotKey(entry: Pick<TimetableEntry, 'day' | 'time' | 'courseName' | 'section' | 'category' | 'department' | 'room'>): string {
  return `${entry.day}|${entry.time}|${entry.courseName}|${entry.section}|${entry.category}|${entry.department}|${entry.room}`;
}

function dedupeEntries(entries: TimetableEntry[]): TimetableEntry[] {
  const seen = new Set<string>();
  return entries.filter(entry => {
    const key = makeSlotKey(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getLiveTimetableEntries(
  allTimetableEntries: TimetableEntry[],
  userConfig: UserConfig,
  preferences: TimetableResultPreference | null
): TimetableEntry[] {
  const contextEntries = allTimetableEntries.filter(entry => {
    if (entry.batch !== userConfig.batch) return false;
    return isDepartmentMatch(entry.department, userConfig.dept);
  });

  const defaultEntries = filterTimetable(allTimetableEntries, {
    batch: userConfig.batch,
    department: userConfig.dept,
    section: userConfig.section,
    query: '',
    includeRepeats: false,
  });

  if (!preferences) {
    return dedupeEntries(defaultEntries).filter(entry => entry.time && (entry.time.includes('-') || entry.time.includes(' to ')));
  }

  const defaultSectionByCourse = new Map<CourseKey, string>();
  for (const entry of defaultEntries) {
    const courseKey = makeCourseKey(entry);
    if (!defaultSectionByCourse.has(courseKey)) {
      defaultSectionByCourse.set(courseKey, entry.section);
    }
  }

  const courseSectionsByKey = new Map<CourseKey, Set<string>>();
  for (const entry of contextEntries) {
    const courseKey = makeCourseKey(entry);
    if (!courseSectionsByKey.has(courseKey)) {
      courseSectionsByKey.set(courseKey, new Set<string>());
    }
    courseSectionsByKey.get(courseKey)!.add(entry.section);
  }

  const cleanedManualSectionByCourse = Object.fromEntries(
    Object.entries(preferences.sectionByCourse).filter(([courseKey, targetSection]) =>
      (courseSectionsByKey.get(courseKey)?.has(targetSection) ?? false)
    )
  );

  const removedSet = new Set(
    preferences.removedCourseKeys.filter(courseKey => courseSectionsByKey.has(courseKey))
  );

  const effectiveSectionByCourse = new Map<CourseKey, string>();
  for (const [courseKey, defaultSection] of defaultSectionByCourse.entries()) {
    effectiveSectionByCourse.set(courseKey, defaultSection);
  }
  for (const [courseKey, manualSection] of Object.entries(cleanedManualSectionByCourse)) {
    effectiveSectionByCourse.set(courseKey, manualSection);
  }

  const activeCourseKeys = new Set<CourseKey>([
    ...defaultSectionByCourse.keys(),
    ...Object.keys(cleanedManualSectionByCourse),
  ]);

  const result: TimetableEntry[] = [];
  const seen = new Set<string>();

  for (const courseKey of activeCourseKeys) {
    if (removedSet.has(courseKey)) continue;

    const activeSection = effectiveSectionByCourse.get(courseKey);
    if (!activeSection) continue;

    for (const entry of contextEntries) {
      if (makeCourseKey(entry) !== courseKey) continue;
      if (normalizeSectionForBatch(userConfig.batch, entry.section) !== normalizeSectionForBatch(userConfig.batch, activeSection)) {
        continue;
      }

      const slotKey = makeSlotKey(entry);
      if (seen.has(slotKey)) continue;
      seen.add(slotKey);
      result.push(entry);
    }
  }

  return result.filter(entry => entry.time && (entry.time.includes('-') || entry.time.includes(' to ')));
}
