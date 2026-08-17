/**
 * School selection utilities.
 * 
 * The app supports two schools:
 * - FSC (FAST School of Computing) — uses public/data/timetable.json
 * - FSM (FAST School of Management) — uses public/data/fsm_timetable.json
 * 
 * The school selection is persisted in localStorage and read by all pages.
 */

export type School = 'fsc' | 'fsm';

export const SCHOOL_STORAGE_KEY = 'fsc_active_school';

export const SCHOOLS: { id: School; name: string; shortName: string }[] = [
  { id: 'fsc', name: 'FAST School of Computing', shortName: 'FSC' },
  { id: 'fsm', name: 'FAST School of Management', shortName: 'FSM' },
];

/** Get the persisted school from localStorage. Defaults to 'fsc'. */
export function getSchool(): School {
  if (typeof window === 'undefined') return 'fsc';
  const stored = localStorage.getItem(SCHOOL_STORAGE_KEY);
  return stored === 'fsm' ? 'fsm' : 'fsc';
}

/** Persist the school selection. */
export function setSchool(school: School): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SCHOOL_STORAGE_KEY, school);
}

/** Department display names for each school. */
export const DEPT_NAMES: Record<School, Record<string, string>> = {
  fsc: {
    CS: 'Computer Science',
    AI: 'Artificial Intelligence',
    DS: 'Data Science',
    CY: 'Cybersecurity',
    SE: 'Software Engineering',
  },
  fsm: {
    BBA: 'Business Administration',
    BA: 'Business Analytics',
    FT: 'FinTech',
    AF: 'Accounting & Finance',
  },
};

/** Get the available departments for a school. */
export function getDepartments(school: School): { code: string; name: string }[] {
  const depts = DEPT_NAMES[school];
  return Object.entries(depts).map(([code, name]) => ({ code, name }));
}
