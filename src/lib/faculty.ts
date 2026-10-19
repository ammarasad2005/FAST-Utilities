// ─── Types ────────────────────────────────────────────────────────────────────

export interface FacultyMember {
  name: string;
  status: string;       // e.g. "Associate Professor", "HoD (CS) & Professor"
  email: string;
  office_room: string | null;
  linkedin_profile: string | null;
  profile_url: string;
  image_url: string;
}

export interface RawFacultyDepartment {
  department: string;
  faculty: FacultyMember[];
}

/** The department key as used in faculty_data.json */
export type DeptGroupKey =
  | 'Department of Artificial Intelligence & Data Science'
  | 'Department of Accounting and Finance'
  | 'Department of Computer Engineering'
  | 'Department of Computer Science'
  | 'Department of Cyber Security'
  | 'Department of Electrical Engineering'
  | 'Department of Management Sciences'
  | 'Department of Sciences & Humanities'
  | 'Department of Software Engineering';

/** The short file keys (e.g. AIDS.json → 'AIDS') */
export type DeptFileKey = 'AIDS' | 'AF' | 'CE' | 'CS' | 'CY' | 'EE' | 'MS' | 'SE' | 'SH';

/** Maps short file key → full display name */
export const DEPT_LABELS: Record<DeptFileKey, string> = {
  AIDS: 'AI & Data Science',
  AF:   'Accounting & Finance',
  CE:   'Computer Engineering',
  CS:   'Computer Science',
  CY:   'Cyber Security',
  EE:   'Electrical Engineering',
  MS:   'Management Sciences',
  SE:   'Software Engineering',
  SH:   'Sciences & Humanities',
};

/** Maps full group key (from faculty_data.json) → short file key */
export const DEPT_KEY_FROM_GROUP: Record<string, DeptFileKey> = {
  'Department of Artificial Intelligence & Data Science': 'AIDS',
  'Department of Accounting and Finance': 'AF',
  'Department of Computer Engineering': 'CE',
  'Department of Computer Science':     'CS',
  'Department of Cyber Security':       'CY',
  'Department of Electrical Engineering': 'EE',
  'Department of Management Sciences':  'MS',
  'Department of Sciences & Humanities': 'SH',
  'Department of Software Engineering': 'SE',
};

/** Ordered list of departments for the filter bar and All Faculty list */
export const DEPT_ORDER: DeptFileKey[] = ['CS', 'AIDS', 'SE', 'CY', 'EE', 'CE', 'SH', 'AF', 'MS'];

// ─── Accent colours per dept ──────────────────────────────────────────────────
// Using the same CSS variable naming convention as the rest of the app,
// mapped to dept file keys.
export const DEPT_ACCENT: Record<DeptFileKey, string> = {
  AIDS: 'ai',
  CS:   'cs',
  SE:   'se',
  CY:   'cy',
  EE:   'ee',
  CE:   'ce',
  MS:   'bba',   // closest match in existing palette
  AF:   'af',
  SH:   'ds',    // closest match
};

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Normalise a string for case-insensitive substring searching. */
function norm(s?: string | null) { return (s || '').toLowerCase(); }

/** Get the hierarchy rank of a faculty member based on their status. Lower rank = higher priority. */
export function getFacultyRank(status: string): number {
  const lowerStatus = status.toLowerCase();
  
  if (lowerStatus.includes('director') || lowerStatus.includes('dean')) return 1;
  if (lowerStatus.includes('hod') || lowerStatus.includes('incharge') || lowerStatus.includes('hos') || lowerStatus.includes('head')) return 2;
  if (lowerStatus.includes('professor') && !lowerStatus.includes('assistant') && !lowerStatus.includes('associate') && !lowerStatus.includes('adjunct')) return 3;
  if (lowerStatus.includes('associate professor')) return 4;
  if (lowerStatus.includes('assistant professor')) return 5;
  if (lowerStatus.includes('lecturer')) return 6;
  if (lowerStatus.includes('instructor') || lowerStatus.includes('lab engineer')) return 7;
  
  return 8; // Default fallback for any other roles
}

/**
 * Filter a flat array of FacultyMember by a free-text query.
 * Searches: name, status, email, office_room.
 */
export function searchFaculty<T extends FacultyMember>(members: T[], query: string): T[] {
  if (!query.trim()) return members;
  const q = norm(query.trim());
  return members.filter(m =>
    norm(m.name).includes(q) ||
    norm(m.status).includes(q) ||
    norm(m.email).includes(q) ||
    norm(m.office_room).includes(q)
  );
}

/**
 * Given the grouped faculty_data.json array, returns a flat array
 * with each member tagged with its DeptFileKey, ordered by DEPT_ORDER.
 */
export function flattenFaculty(
  data: RawFacultyDepartment[]
): Array<FacultyMember & { deptKey: DeptFileKey }> {
  const out: Array<FacultyMember & { deptKey: DeptFileKey }> = [];
  
  // Create a map for easy lookup by DeptFileKey
  const deptMap: Record<string, FacultyMember[]> = {};
  for (const item of data) {
    const key = DEPT_KEY_FROM_GROUP[item.department];
    if (key) deptMap[key] = item.faculty;
  }

  // Collect all members
  for (const key of DEPT_ORDER) {
    const faculty = deptMap[key];
    if (faculty) {
      for (const m of faculty) {
        out.push({ ...m, deptKey: key });
      }
    }
  }

  // Sort them
  out.sort((a, b) => {
    const rankA = getFacultyRank(a.status);
    const rankB = getFacultyRank(b.status);
    if (rankA !== rankB) {
      return rankA - rankB; // Lower rank first (1 = Director, 2 = HoD, etc.)
    }
    // If same rank, order by DEPT_ORDER
    const deptA = DEPT_ORDER.indexOf(a.deptKey);
    const deptB = DEPT_ORDER.indexOf(b.deptKey);
    return deptA - deptB;
  });

  return out;
}
