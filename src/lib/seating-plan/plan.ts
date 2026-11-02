/**
 * Pure seating-plan domain helpers. The input is page text extracted from the
 * emailed PDF; student names are deliberately discarded during parsing.
 */

export interface SeatingPlanHeader {
  dateISO: string;
  term: string | null;
  slot: string;
  startMinute: number;
  endMinute: number;
  venue: string;
}

export interface SeatingAssignment {
  dateISO: string;
  term: string | null;
  slot: string;
  startMinute: number;
  endMinute: number;
  venue: string;
  courseCode: string;
  courseName: string;
  sectionCode: string;
  rollNumber: string;
  seat: string;
}

export interface ParsedSeatingPlan {
  term: string | null;
  dates: string[];
  pageCount: number;
  assignmentCount: number;
  assignments: SeatingAssignment[];
}

export interface ParsePlanOptions {
  /** Optional explicit date for controlled tests only; production imports use the printed PDF date. */
  expectedDateISO?: string;
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/**
 * Accept the student's compact entry and the seating-plan notation.
 * Examples: i230000 / P230000 / 23i0000 / 23I-0000 → 23I-0000 / 23P-0000.
 * The campus letter is preserved and uppercased, never rewritten to I.
 */
export function normalizeRollNumber(value: string): string | null {
  const compact = value.trim().toUpperCase().replace(/[\s-]/g, '');
  let match = compact.match(/^([A-Z])(\d{2})(\d{4})$/);
  if (match) return `${match[2]}${match[1]}-${match[3]}`;

  match = compact.match(/^(\d{2})([A-Z])(\d{4})$/);
  if (match) return `${match[1]}${match[2]}-${match[3]}`;

  return null;
}

export interface ParsedRollNumber {
  canonical: string;
  cohortYear: string;
  campusCode: string;
  serial: string;
}

export function parseRollNumber(value: string): ParsedRollNumber | null {
  const canonical = normalizeRollNumber(value);
  if (!canonical) return null;
  const match = canonical.match(/^(\d{2})([A-Z])-(\d{4})$/)!;
  return { canonical, cohortYear: match[1], campusCode: match[2], serial: match[3] };
}

/** Program codes used by FAST School of Computing undergraduate timetables. */
export const FSC_PROGRAM_DEPARTMENTS: Readonly<Record<string, string>> = {
  BCS: 'CS',
  BAI: 'AI',
  BDS: 'DS',
  BCY: 'CY',
  BSE: 'SE',
};

export interface ParsedSectionCode {
  code: string;
  program: string;
  semester: number;
  section: string;
  department: string | null;
}

export function parseSectionCode(value: string): ParsedSectionCode | null {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '');
  const match = normalized.match(/^([A-Z]+)-(\d{1,2})([A-Z])$/);
  if (!match) return null;
  return {
    code: `${match[1]}-${match[2]}${match[3]}`,
    program: match[1],
    semester: Number(match[2]),
    section: match[3],
    department: FSC_PROGRAM_DEPARTMENTS[match[1]] ?? null,
  };
}

/**
 * Infer the undergraduate cohort from the section's semester and PDF term.
 * Unknown seasons/programs return null rather than guessing.
 */
export function cohortForSection(sectionCode: string, term: string | null): string | null {
  const section = parseSectionCode(sectionCode);
  if (!section?.department || !term) return null;
  const match = term.match(/\b(FALL|SPRING)\s+(20\d{2})\b/i);
  if (!match) return null;
  const season = match[1].toUpperCase();
  const year = Number(match[2]);
  const yearsBeforeCurrentCohort =
    season === 'FALL'
      ? Math.floor((section.semester - 1) / 2)
      : Math.floor(section.semester / 2);
  return String(year - yearsBeforeCurrentCohort);
}

function parseDateISO(dayText: string, monthText: string, yearText: string): string | null {
  const month = MONTHS[monthText.toLowerCase()];
  const day = Number(dayText);
  let year = Number(yearText);
  if (yearText.length === 2) year += year >= 70 ? 1900 : 2000;
  if (!month || day < 1 || day > 31 || year < 2000 || year > 2100) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function clockToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  const meridiem = match[3]?.toUpperCase();
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    if (meridiem === 'PM' && hour < 12) hour += 12;
  } else if (hour >= 1 && hour <= 7) {
    // FAST's PDF omits AM/PM on later afternoon slots (e.g. 6:20-7:20).
    hour += 12;
  }
  return hour * 60 + minute;
}

function parseSlot(slotText: string): { startMinute: number; endMinute: number } | null {
  const match = slotText.trim().match(/^(\d{1,2}:\d{2}(?:\s*[AP]M)?)\s*(?:-|–|—|to)\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)$/i);
  if (!match) return null;
  const startMinute = clockToMinutes(match[1]);
  let endMinute = clockToMinutes(match[2]);
  if (startMinute == null || endMinute == null) return null;
  // A bare end such as 7:20 follows a bare 6:20, i.e. 7:20 PM.
  if (!/\b(?:AM|PM)\b/i.test(match[2]) && endMinute <= startMinute) endMinute += 12 * 60;
  if (endMinute <= startMinute || endMinute - startMinute > 8 * 60) return null;
  return { startMinute, endMinute };
}

function parseTerm(lines: string[]): string | null {
  for (const line of lines.slice(0, 6)) {
    const match = line.match(/\b(FALL|SPRING|SUMMER)\s+(20\d{2})\b/i);
    if (match) return `${match[1].toUpperCase()} ${match[2]}`;
  }
  return null;
}

function parsePageHeader(lines: string[], term: string | null, authoritativeDateISO?: string): SeatingPlanHeader | null {
  const dateLine = lines.find((line) => /\bDate\s*:/i.test(line)) ?? '';
  const slotLine = lines.find((line) => /\bSlot\s*:/i.test(line));
  const venueLine = lines.find((line) => /\bVenue\s*:/i.test(line));
  if (!slotLine || !venueLine) return null;
  // Date, slot, and venue may occupy separate PDF text lanes. The email's
  // received date is authoritative for ingestion; the printed date is only a
  // fallback for parser tests or non-email uses.
  const headerLine = [dateLine, slotLine, venueLine].filter((line, index, all) => line && all.indexOf(line) === index).join(' ');
  const dateMatch = headerLine.match(/\bDate\s*:\s*(?:[A-Za-z]{3,9}\s*,\s*)?(\d{1,2})\s*,?\s*([A-Za-z]{3,9})\s*,?\s*(\d{2,4})/i);
  const documentDateISO = dateMatch ? parseDateISO(dateMatch[1], dateMatch[2], dateMatch[3]) : null;
  const dateISO = authoritativeDateISO ?? documentDateISO;
  const slotMatch = headerLine.match(/\bSlot\s*:\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)\s*(?:-|–|—|to)\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i);
  const venueMatch = headerLine.match(/\bVenue\s*:\s*(.+?)\s*$/i);
  if (!dateISO || !slotMatch || !venueMatch) return null;
  const slot = `${slotMatch[1]}-${slotMatch[2]}`;
  const minutes = parseSlot(slot);
  const venue = venueMatch[1].trim().replace(/\s+/g, ' ');
  if (!minutes || !venue) return null;
  return { dateISO, term, slot, startMinute: minutes.startMinute, endMinute: minutes.endMinute, venue };
}

const COURSE_HEADING = /^([A-Z]{2,}\d{3,}),\s*([A-Z]+-\d{1,2}[A-Z])\s*-\s*(.*)$/i;
const STUDENT_ROW = /^\s*\d+\s+((?:\d{2}[A-Z]-\d{4})|(?:[A-Z]\d{6}))\b(.*)$/i;
const SEAT_TOKEN = /\b((?:[A-Z]\d{1,2}R\d{1,2})|(?:Extra\s+\d+))\b/i;
const NUMERIC_SEAT_TOKEN = /(?:^|[\s,])(\d{1,3})\s*$/;
const TABLE_HEADER = /^S#\s*Roll\s*No\.?\s*Student\s*Name\s*Seat$/i;

function finishStudentRow(
  row: { roll: string; text: string } | null,
  page: SeatingPlanHeader,
  course: { code: string; section: string; name: string } | null,
  pageNumber: number,
  out: SeatingAssignment[],
  errors: string[]
): void {
  if (!row) return;
  const rollNumber = normalizeRollNumber(row.roll);
  const seatMatch = row.text.match(SEAT_TOKEN);
  const numericSeatMatch = seatMatch ? null : row.text.match(NUMERIC_SEAT_TOKEN);
  const seat = seatMatch?.[1] ?? numericSeatMatch?.[1];
  if (!rollNumber) {
    errors.push(`STUDENT_ROW_INVALID_ROLL page ${pageNumber}.`);
    return;
  }
  if (!seat) {
    errors.push(`STUDENT_ROW_MISSING_SEAT page ${pageNumber}.`);
    return;
  }
  if (!course) {
    errors.push(`STUDENT_ROW_MISSING_COURSE page ${pageNumber}.`);
    return;
  }
  out.push({
    ...page,
    courseCode: course.code,
    courseName: course.name,
    sectionCode: course.section,
    rollNumber,
    seat: seat.replace(/\s+/g, ' ').toUpperCase(),
  });
}

/**
 * Parse a complete, text-extractable seating PDF. Any malformed page/row fails
 * the whole import (fail-closed); consumers must never receive a partial plan.
 */
export function parseSeatingPlanPages(
  pageTexts: string[],
  options: ParsePlanOptions = {}
): ParsedSeatingPlan {
  if (!pageTexts.length) throw new Error('The PDF contains no pages.');
  const firstLines = pageTexts[0]
    .split(/\r?\n/)
    .map((s) => s.replace(/^\[\[(?:L|R)\]\]\s*/, '').trim())
    .filter(Boolean);
  const term = parseTerm(firstLines);
  const assignments: SeatingAssignment[] = [];
  const dates = new Set<string>();
  const errors: string[] = [];
  const carriedCourses = new Map<string, { code: string; section: string; name: string }>();

  pageTexts.forEach((text, pageIndex) => {
    const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const pageHeader = parsePageHeader(
      lines.map((s) => s.replace(/^\[\[(?:L|R)\]\]\s*/, '')),
      term,
      options.expectedDateISO
    );
    if (!pageHeader) {
      errors.push(`Page ${pageIndex + 1} is missing a valid slot/venue header.`);
      return;
    }
    dates.add(pageHeader.dateISO);

    type LaneState = {
      course: { code: string; section: string; name: string } | null;
      row: { roll: string; text: string } | null;
      pendingCourseName: string[];
      /** Only append wrapped title fragments after an explicit heading on this page. */
      courseNameCanExtend: boolean;
      rows: number;
    };
    const firstCourseByLane = new Map<string, { code: string; section: string; name: string }>();
    for (const rawLine of lines) {
      const laneMatch = rawLine.match(/^\[\[([LR])\]\]\s*(.*)$/);
      const lane = laneMatch?.[1] ?? 'D';
      const line = (laneMatch?.[2] ?? rawLine).trim();
      const heading = line.match(COURSE_HEADING);
      if (heading && !firstCourseByLane.has(lane)) {
        firstCourseByLane.set(lane, {
          code: heading[1].toUpperCase(),
          section: heading[2].toUpperCase(),
          name: heading[3].trim(),
        });
      }
    }
    const fallbackCourse = firstCourseByLane.size === 1
      ? [...firstCourseByLane.values()][0]
      : null;
    const lanes = new Map<string, LaneState>();
    const laneFor = (key: string): LaneState => {
      let state = lanes.get(key);
      if (!state) {
        const initialCourse = firstCourseByLane.get(key) ?? carriedCourses.get(key) ?? fallbackCourse ?? null;
        state = {
          course: initialCourse ? { ...initialCourse } : null,
          row: null,
          pendingCourseName: [],
          courseNameCanExtend: false,
          rows: 0,
        };
        lanes.set(key, state);
      }
      return state;
    };
    const flushCourseName = (state: LaneState) => {
      if (state.course && state.courseNameCanExtend && state.pendingCourseName.length) {
        let extendedName = state.course.name;
        for (const fragment of state.pendingCourseName) {
          const candidate = [extendedName, fragment].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
          if (candidate.length > 240) break;
          extendedName = candidate;
        }
        // PDF text extraction can leak unrelated header/layout text into a
        // wrapped title. Keep only bounded fragments, never exceeding the
        // server's 240-character title limit.
        state.course.name = extendedName;
      }
      state.pendingCourseName = [];
    };
    const rowHasSeat = (row: LaneState['row']) =>
      Boolean(row && (row.text.match(SEAT_TOKEN) || row.text.match(NUMERIC_SEAT_TOKEN)));

    for (const rawLine of lines) {
      const laneMatch = rawLine.match(/^\[\[([LR])\]\]\s*(.*)$/);
      const state = laneFor(laneMatch?.[1] ?? 'D');
      const line = (laneMatch?.[2] ?? rawLine).trim();
      if (TABLE_HEADER.test(line)) continue;
      if (/^Page\s+\d+\s+of\s+\d+$/i.test(line)) continue;

      const heading = line.match(COURSE_HEADING);
      if (heading) {
        finishStudentRow(state.row, pageHeader, state.course, pageIndex + 1, assignments, errors);
        if (state.row) state.rows++;
        state.row = null;
        flushCourseName(state);
        state.course = {
          code: heading[1].toUpperCase(),
          section: heading[2].toUpperCase(),
          name: heading[3].trim(),
        };
        state.courseNameCanExtend = true;
        continue;
      }

      const student = line.match(STUDENT_ROW);
      if (student) {
        finishStudentRow(state.row, pageHeader, state.course, pageIndex + 1, assignments, errors);
        if (state.row) state.rows++;
        flushCourseName(state);
        state.courseNameCanExtend = false;
        state.row = { roll: student[1], text: student[2] };
        // The roll, name fragment and seat usually share a baseline. Finalize
        // immediately once a seat is present so unrelated text from a nearby
        // lane cannot get appended and make a valid numeric seat look missing.
        if (rowHasSeat(state.row)) {
          finishStudentRow(state.row, pageHeader, state.course, pageIndex + 1, assignments, errors);
          state.rows++;
          state.row = null;
        }
        continue;
      }

      if (state.row) {
        state.row.text += ` ${line}`;
        if (rowHasSeat(state.row)) {
          finishStudentRow(state.row, pageHeader, state.course, pageIndex + 1, assignments, errors);
          state.rows++;
          state.row = null;
        }
      } else if (
        state.courseNameCanExtend &&
        state.course &&
        !/^Date\s*:/i.test(line) &&
        !/^Venue\s*:/i.test(line) &&
        !/^Slot\s*:/i.test(line) &&
        !/^Sessional\b/i.test(line) &&
        !/^FAST School of Computing$/i.test(line) &&
        !/^SEATING PLAN$/i.test(line)
      ) {
        // Course-title fragments wrap within their own PDF column. Student
        // names are deliberately ignored after the first roll-number row.
        state.pendingCourseName.push(line);
      }
    }

    for (const [lane, state] of lanes) {
      finishStudentRow(state.row, pageHeader, state.course, pageIndex + 1, assignments, errors);
      if (state.row) state.rows++;
      flushCourseName(state);
      if (state.course) carriedCourses.set(lane, { ...state.course });
    }
    const pageRows = [...lanes.values()].reduce((sum, state) => sum + state.rows, 0);
    if (pageRows === 0) errors.push(`Page ${pageIndex + 1} contains no recognized assignment rows.`);
  });

  if (errors.length) throw new Error(`Seating plan rejected (${errors.length} issue${errors.length === 1 ? '' : 's'}): ${errors[0]}`);
  if (!assignments.length) throw new Error('No seating assignments were recognized.');
  if (dates.size !== 1) throw new Error('The attachment contains more than one seating-plan date.');

  // The two PDF columns can begin at slightly different vertical positions.
  // A continuation heading may therefore appear in only one lane; propagate
  // its longest parsed title to the same exact course+section in the other.
  const bestCourseName = new Map<string, string>();
  for (const entry of assignments) {
    const key = `${entry.courseCode}|${entry.sectionCode}`;
    const existing = bestCourseName.get(key) ?? '';
    if (entry.courseName.length > existing.length) bestCourseName.set(key, entry.courseName);
  }
  const normalizedAssignments = assignments.map((entry) => ({
    ...entry,
    courseName: bestCourseName.get(`${entry.courseCode}|${entry.sectionCode}`) ?? entry.courseName,
  }));

  return {
    term,
    dates: [...dates],
    pageCount: pageTexts.length,
    assignmentCount: normalizedAssignments.length,
    assignments: normalizedAssignments,
  };
}

/** Parse a PDF date line into ISO; exported for focused tests/tools. */
export function parseSeatingDate(dayText: string, monthText: string, yearText: string): string | null {
  return parseDateISO(dayText, monthText, yearText);
}

/** Parse the PDF's slot label into local minutes after midnight. */
export function parseSeatingSlot(slot: string): { startMinute: number; endMinute: number } | null {
  return parseSlot(slot);
}
