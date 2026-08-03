export interface ExamEntry {
  date: string;        // "DD/MM/YYYY"
  day: string;         // "Monday"
  time: string;        // "09:00 AM – 11:00 AM"
  courseCode: string;  // "CS1004"
  courseName: string;
  batch: string;       // "2023" or "Summer"
  department: string;  // "CS" or "ALL" (summer)
  school: string;      // "FSC", "FSM", or "FSE"
  room?: string;       // summer only — comma-separated room list (e.g., "C-301, C-302")
  sections?: string;   // summer only — raw section string for display (e.g., "A", "AB", "BAF-9A, 9B")
}

export const SCHOOLS = ['FSC', 'FSM', 'FSE'];

export const SCHOOL_DEPARTMENTS: Record<string, string[]> = {
  FSC: ['CS', 'AI', 'DS', 'CY', 'SE'],
  FSM: ['BBA', 'AF', 'BA', 'FT'],
  FSE: ['EE', 'CE']
};

export interface FilterState {
  batch: string;
  department: string;
  school: string;
  query: string;       // live search string
}

export const DEPARTMENTS: string[] = ['CS', 'AI', 'DS', 'CY', 'SE', 'BBA', 'AF', 'BA', 'FT', 'EE', 'CE'];

export const DEPARTMENT_LABELS: Record<string, string> = {
  CS: 'Computer Science',
  AI: 'Artificial Intelligence',
  DS: 'Data Science',
  CY: 'Cyber Security',
  SE: 'Software Engineering',
  BBA: 'Bachelor of Business Admin',
  AF: 'Accounting and Finance',
  BA: 'Business Analytics',
  FT: 'FinTech',
  EE: 'Electrical Engineering',
  CE: 'Computer Engineering'
};

// Derive available batches from loaded data at runtime
export function getAvailableBatches(entries: ExamEntry[]): string[] {
  return [...new Set(entries.map(e => e.batch))].sort().reverse();
}

// ─── Timetable Types ──────────────────────────────────────────────────────────

/**
 * A single class slot extracted from the Python-generated timetable JSON.
 * The Python script stores times as "HH:MM - HH:MM" (24-h), room as a string,
 * and classifies courses as 'regular' | 'repeat'.
 */
export interface TimetableEntry {
  courseName: string;                  // "Programming Fundamentals"
  batch: string;                       // "2024"
  department: string;                  // "CS"
  section: string;                     // "A", "BX", "A1" etc.
  day: string;                         // "Monday"
  time: string;                        // "08:30 - 10:00" (from Python)
  room: string;                        // "CR-01", "TBA"
  type: 'lecture' | 'lab';             // inferred: 'lab' if name ends with 'Lab'
  category: 'regular' | 'repeat';      // from Python hierarchy key
  rescheduled?: boolean;               // flags special manual slots
  exam?: boolean;                      // flags "Mid", "Exam", or "Sessional" slots
  isElective?: boolean;                // inferred from section range
  electiveGroup?: string | null;       // e.g. "G-I", "Gp-II"
  cancelled?: boolean;                 // flags cancelled classes
  reserved?: boolean;                  // flags reserved rooms
}

export const TIMETABLE_META_KEY = '__meta__';

export interface TimetableSheetMeta {
  day: string;
  sheetName: string;
  date?: string;
  isoDate?: string;
  isMakeup?: boolean;
}

export interface TimetableMetadata {
  days: TimetableSheetMeta[];
}

export type TimetableSlot = {
  room: string;
  time: string;
  rescheduled?: boolean;
  exam?: boolean;
  isElective?: boolean;
  elective_group?: string | null;
  cancelled?: boolean;
  reserved?: boolean;
};

export type TimetableDayMap = Record<string, TimetableSlot[]>;

export type TimetableSectionMap = Record<string, TimetableDayMap>;

export type TimetableCourseMap = Record<string, TimetableSectionMap>;

export interface TimetableDepartmentMap {
  regular: TimetableCourseMap;
  repeat: TimetableCourseMap;
}

export type TimetableBatchMap = Record<string, TimetableDepartmentMap>;

export const DAYS_ORDER: string[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

// Fixed section set shown on the home-page pill selector.
// Dynamically available sections are filtered from loaded data
// after batch+dept are chosen.
export const TIMETABLE_SECTIONS: string[] = ['A', 'B', 'C', 'BX'];

// ─── Timetable raw JSON shape (from Python script) ───────────────────────────
// batch → dept → ("regular"|"repeat") → courseName → section → day → [{room,time}]
export type RawTimetableJSON = Record<
  string,
  TimetableBatchMap
> & {
  [TIMETABLE_META_KEY]?: TimetableMetadata;
};

// ─── Summer Semester Catalog ──────────────────────────────────────────────────
// Stored in semester_settings.course_mappings (JSONB) when semester_type = 'summer'.
// sheetName is always used for entry matching; displayName is the student-facing label.
export interface SummerCourseCatalogEntry {
  sheetName: string;          // exact courseName as it appears in the Google Sheet
  displayName: string | null; // admin alias (null = show sheetName as-is)
  hidden: boolean;            // if true, exclude from the student course checklist
}

// Response shape from /api/timetable
export interface TimetableAPIResponse {
  entries: TimetableEntry[];
  catalog: SummerCourseCatalogEntry[];
}

// ─── Regular Semester Course Mappings ─────────────────────────────────────────
// Shape: { [batch]: { [dept]: string[] } }
// Mirrors VALID_COURSES_MAP in all_courses_schedule.py.
// Stored in semester_settings.regular_course_mappings (JSONB).
export type RegularCourseMappings = Record<string, Record<string, string[]>>;

// The hardcoded fallback — mirrors VALID_COURSES_MAP in all_courses_schedule.py.
// Used to pre-populate the admin editor via "Load from Code".
export const HARDCODED_VALID_COURSES_MAP: RegularCourseMappings = {
  "2022": {
    "CS": ["Stat Modeling", "Entre", "Digital Mktg", "AI Prod Develop", "Gen AI", "Cloud Comp", "Tech Mgt", "Big Data", "Deep Learn", "Agentic AI", "Fund of Data Vis", "ML for Robo", "Robo Tech", "Fund of SPM", "MLOPs"],
    "SE": ["PPIT", "S/w Metrices", "Cloud Comp", "NLP", "Entre", "User Exp Engg", "Gen AI"],
    "AI": ["PPIT", "Fin Mgt", "Info Sec", "Blockchain", "Responsible AI", "Agentic AI", "Gen AI"],
    "DS": ["Reinf Learn", "Agentic AI", "MLOPs", "Fin Mgt", "NLP", "Resp AI", "Gen AI", "Comp Vision"],
    "CY": ["Blockchain", "Entre", "PPIT", "Cloud Security", "Blockchain"]
  },
  "2023": {
    "CS": ["PDC", "Web", "AI", "Comp Arch", "SE", "Comp Const", "DIP", "AI Lab"],
    "SE": ["SPM", "Civics", "Comp Net Lab", "AI Lab", "Comp Net", "AI", "Process Mining", "Formal Meth in SE"],
    "AI": ["Comp Vision", "NLP", "PDC", "Art Neural Net", "Comp Net", "Comp Net Lab"],
    "DS": ["Deep Learn", "AI", "PDC", "NLP", "AI Lab", "Data Mining", "Comp Net", "Comp Net Lab"],
    "CY": ["AI", "Digital Forensics", "Sec S/w Design", "Info Sec", "Malware Analysis", "Ethical Hack", "Digital Forensics Lab", "AI Lab", "Sec S/w Design Lab", "Comp Net", "Comp Net Lab"]
  },
  "2024": {
    "CS": ["DB", "OS", "Prob & Stats", "SDA", "DB Lab", "OS Lab", "AI", "AI Lab"],
    "SE": ["DB", "SRE", "SDA", "COAL", "OS", "COAL Lab", "OS Lab", "DB Lab", "Pak Studies"],
    "AI": ["DB", "AI", "OS", "DB Lab", "OS Lab", "AI Lab", "Pak Studies", "Fund of S/w Engg", "Prob & Stats"],
    "DS": ["AI", "AI Lab", "Pak Studies", "DB", "OS", "DB Lab", "OS Lab", "Prob & Stats", "Fund of S/w Engg"],
    "CY": ["Comp Net", "Prob & Stats", "Algo", "Pak Studies", "Comp Net Lab", "COAL Lab", "TBW", "COAL"]
  },
  "2025": {
    "CS": ["OOP", "Discrete", "Civics", "MV Calculus", "Pak Studies", "Exp Writing", "Exp Writing Lab", "OOP Lab"],
    "SE": ["DLD", "OOP", "MV Calculus", "Exp Writing", "Exp Writing Lab", "AP", "Seerah & UHQ-I", "OOP Lab", "DLD Lab"],
    "AI": ["OOP", "OOP Lab", "MV Calculus", "DLD", "DLD Lab", "AP", "Exp Writing", "Exp Writing Lab", "Seerah & UHQ-I"],
    "DS": ["OOP", "MV Calculus", "DLD", "DLD Lab", "Civics", "Pak Studies", "OOP Lab", "Exp Writing", "Exp Writing Lab"],
    "CY": ["OOP", "OOP Lab", "DLD", "DLD Lab", "MV Calculus", "AP", "Exp Writing", "Exp Writing Lab", "Seerah & UHQ-I"]
  }
};
