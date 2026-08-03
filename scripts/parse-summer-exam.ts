/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Summer Exam Schedule Parser
 * ============================
 *
 * Reads the ORGANIZED summer exam xlsx (exam_schedule_summer.xlsx) and
 * outputs public/data/summer_schedule.json.
 *
 * This parser mirrors scripts/parse-excel.ts (the regular-semester parser)
 * but is adapted for the summer organized format:
 *
 *   Spring organized columns (7):
 *     S.No | Date | Time Slot | Course Code | Course Name | Degree & Sections | Batch
 *
 *   Summer organized columns (8 — same 7 + Room):
 *     S.No | Date | Time Slot | Course Code | Course Name | Degree & Sections | Batch | Room
 *
 * Key differences from the regular parser:
 *   1. "Degree & Sections" contains "ALL" or "ALL (sections)" instead of
 *      "BS(CS) (A,B,C)". Department is always "ALL" — no per-department expansion.
 *   2. "Batch" is always "Summer".
 *   3. A new "Room" column is read and included in the output.
 *   4. Output file is summer_schedule.json (separate from regular_schedule.json).
 *
 * This parser is invoked by scripts/run-exam-parser.ts (the dispatcher) when
 * semester_type === 'summer'. The dispatcher mirrors scripts/run_parser.py
 * (the timetable dispatcher). The frontend picks the right JSON at runtime
 * based on semester_settings.semester_type from Supabase.
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

interface SummerExamEntry {
  date: string;        // "DD/MM/YYYY"
  day: string;         // "Monday"
  time: string;        // "9:00 to 11:00 AM"
  courseCode: string;  // "MT1003"
  courseName: string;
  batch: string;       // "Summer"
  department: string;  // "ALL"
  school: string;      // "FSC", "FSM", or "FSE"
  room: string;        // "C-301, C-302" (comma-separated if multiple)
  sections: string;    // "A" or "BAF-9A, 9B" or "" (empty for FSC)
}

const INPUT_FILE = 'exam_schedule_summer.xlsx';
const OUTPUT_FILE = path.join('public', 'data', 'summer_schedule.json');

// ── If the summer xlsx doesn't exist, skip gracefully ─────────────────────────
if (!fs.existsSync(INPUT_FILE)) {
  console.log(`ℹ️  ${INPUT_FILE} not found — skipping summer exam parser.`);
  console.log('    This is expected if no summer exam data has been provided yet.');
  process.exit(0);
}

// 1. Load workbook
const wb = XLSX.readFile(INPUT_FILE, { cellDates: false, cellNF: true });

// 2. Expand merged cells (same logic as parse-excel.ts)
function expandMerges(sheet: any): void {
  const merges: any[] = sheet['!merges'] || [];
  for (const merge of merges) {
    const topLeft = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
    const topLeftCell = sheet[topLeft];
    if (!topLeftCell) continue;
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (addr !== topLeft) {
          sheet[addr] = { ...topLeftCell };
        }
      }
    }
  }
}

function getCell(sheet: any, r: number, c: number): any {
  const addr = XLSX.utils.encode_cell({ r, c });
  return sheet[addr] || null;
}

function getCellDisplay(sheet: any, r: number, c: number): string {
  const cell = getCell(sheet, r, c);
  if (!cell || cell.v === undefined || cell.v === null) return '';
  return String(cell.w ?? cell.v).trim();
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Header row discovery (extended aliases for summer) ────────────────────────
function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function findHeaderRow(sheet: any, range: any): { row: number; columns: Record<string, number> } | null {
  const aliases: Record<string, string> = {
    sno: 'serial',
    serialno: 'serial',
    date: 'date',
    timeslot: 'time',
    time: 'time',
    coursecode: 'courseCode',
    coursename: 'courseName',
    degreessections: 'degreeSections',
    degreesections: 'degreeSections',
    degreeandsections: 'degreeSections',
    batch: 'batch',
    room: 'room',
    venue: 'room',
  };

  for (let r = range.s.r; r <= Math.min(range.e.r, 20); r++) {
    const columns: Record<string, number> = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
      const key = aliases[normalizeHeader(getCellDisplay(sheet, r, c))];
      if (key) columns[key] = c;
    }

    // Summer requires: date, time, courseCode, courseName, degreeSections, batch
    // Room is optional (but expected in summer format)
    if (
      columns.date !== undefined &&
      columns.time !== undefined &&
      columns.courseCode !== undefined &&
      columns.courseName !== undefined &&
      columns.degreeSections !== undefined &&
      columns.batch !== undefined
    ) {
      return { row: r, columns };
    }
  }

  return null;
}

// ── Date parsing (same logic as parse-excel.ts) ──────────────────────────────
const MONTH_MAP: Record<string, string> = {
  'january': '01', 'february': '02', 'march': '03', 'april': '04',
  'may': '05', 'june': '06', 'july': '07', 'august': '08',
  'september': '09', 'october': '10', 'november': '11', 'december': '12',
  'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
  'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
};

function parseDateCell(cell: any): { date: string; day: string } | null {
  if (!cell || cell.v === undefined || cell.v === null || cell.v === '') return null;

  if (cell.t === 'n') {
    const serial = Number(cell.v);
    if (serial > 40000 && serial < 60000) {
      const parsed = XLSX.SSF.parse_date_code(serial);
      if (parsed) {
        const dd = String(parsed.d).padStart(2, '0');
        const mm = String(parsed.m).padStart(2, '0');
        const yyyy = String(parsed.y);
        const dt = new Date(parsed.y, parsed.m - 1, parsed.d);
        return { date: `${dd}/${mm}/${yyyy}`, day: DAY_NAMES[dt.getDay()] };
      }
    }
  }

  const candidates = [String(cell.v ?? '').trim(), String(cell.w ?? '').trim()].filter(Boolean);
  for (const raw of candidates) {
    // YY-MM-DD (spring organized format, e.g., "26-07-13")
    const shortYearMatch = raw.match(/^(\d{2})-(\d{1,2})-(\d{1,2})$/);
    if (shortYearMatch) {
      const yy = shortYearMatch[1];
      const mm = shortYearMatch[2].padStart(2, '0');
      const dd = shortYearMatch[3].padStart(2, '0');
      const yyyy = `20${yy}`;
      const dt = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
      return { date: `${dd}/${mm}/${yyyy}`, day: DAY_NAMES[dt.getDay()] };
    }

    // ISO: YYYY-MM-DD
    const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const yyyy = isoMatch[1];
      const mm = isoMatch[2].padStart(2, '0');
      const dd = isoMatch[3].padStart(2, '0');
      const dt = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
      return { date: `${dd}/${mm}/${yyyy}`, day: DAY_NAMES[dt.getDay()] };
    }

    // DD/MM/YYYY
    const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const dd = slashMatch[1].padStart(2, '0');
      const mm = slashMatch[2].padStart(2, '0');
      const yyyy = slashMatch[3];
      const dt = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
      return { date: `${dd}/${mm}/${yyyy}`, day: DAY_NAMES[dt.getDay()] };
    }

    // Long with day: "Monday, May 12, 2025"
    const longWithDayMatch = raw.match(/^([A-Za-z]+),\s+([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
    if (longWithDayMatch) {
      const dayName = longWithDayMatch[1];
      const monthName = longWithDayMatch[2].toLowerCase();
      const dd = longWithDayMatch[3].padStart(2, '0');
      const yyyy = longWithDayMatch[4];
      const mm = MONTH_MAP[monthName] ?? '01';
      return { date: `${dd}/${mm}/${yyyy}`, day: dayName };
    }

    // Long: "12 May 2025"
    const longMatch = raw.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (longMatch) {
      const dd = longMatch[1].padStart(2, '0');
      const monthWord = longMatch[2].toLowerCase();
      const mm = MONTH_MAP[monthWord] ?? '01';
      const yyyy = longMatch[3];
      const dt = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
      return { date: `${dd}/${mm}/${yyyy}`, day: DAY_NAMES[dt.getDay()] };
    }
  }

  return null;
}

// ── Parse "Degree & Sections" for summer ─────────────────────────────────────
// Examples:
//   "ALL"             → department="ALL", sections=""
//   "ALL (A)"         → department="ALL", sections="A"
//   "ALL (AB)"        → department="ALL", sections="AB"
//   "ALL (BAF-9A, 9B)" → department="ALL", sections="BAF-9A, 9B"
function parseDegreeSections(rawValue: string): { department: string; sections: string } {
  const trimmed = rawValue.trim();
  if (!trimmed) return { department: 'ALL', sections: '' };

  // Match "ALL" optionally followed by "(...)" 
  const match = trimmed.match(/^ALL\s*(?:\(([^)]*)\))?$/i);
  if (match) {
    const sections = (match[1] || '').trim();
    return { department: 'ALL', sections };
  }

  // Fallback: if it doesn't match "ALL" pattern, treat the whole value as sections
  return { department: 'ALL', sections: trimmed };
}

// ── Build entries from the organized table ───────────────────────────────────
function buildEntries(
  sheet: any,
  range: any,
  school: string
): SummerExamEntry[] {
  const entries: SummerExamEntry[] = [];
  const seen = new Set<string>();
  const header = findHeaderRow(sheet, range);
  if (!header) return entries;

  const { row: headerRow, columns } = header;

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const dateInfo = parseDateCell(getCell(sheet, r, columns.date));
    if (!dateInfo) continue;

    const time = getCellDisplay(sheet, r, columns.time);
    const courseCode = getCellDisplay(sheet, r, columns.courseCode).toUpperCase();
    const courseName = getCellDisplay(sheet, r, columns.courseName) || 'Unknown Course';
    const degreeSections = getCellDisplay(sheet, r, columns.degreeSections);
    const batch = getCellDisplay(sheet, r, columns.batch) || 'Summer';
    const room = columns.room !== undefined ? getCellDisplay(sheet, r, columns.room) : '';

    if (!time || !courseCode || !degreeSections) continue;

    const { department, sections } = parseDegreeSections(degreeSections);

    const dedupKey = `${dateInfo.date}|${time}|${courseCode}|${sections}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    entries.push({
      date: dateInfo.date,
      day: dateInfo.day,
      time,
      courseCode,
      courseName,
      batch,
      department,
      school,
      room,
      sections,
    });
  }

  return entries;
}

// ── Sort (same logic as parse-excel.ts) ───────────────────────────────────────
function parseDate(dateStr: string): number {
  const parts = dateStr.split('/').map(Number);
  return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
}

function parseTime(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function sortEntries(entries: SummerExamEntry[]): SummerExamEntry[] {
  return entries.sort((a, b) => {
    const dateDiff = parseDate(a.date) - parseDate(b.date);
    if (dateDiff !== 0) return dateDiff;
    return parseTime(a.time) - parseTime(b.time);
  });
}

// ── Sheet lookup (same prefix-matching as parse-excel.ts) ─────────────────────
function findSheet(wb: any, prefix: string): any | null {
  if (wb.Sheets[prefix]) return wb.Sheets[prefix];
  const key = Object.keys(wb.Sheets).find(
    (n) => n.toUpperCase().startsWith(prefix.toUpperCase())
  );
  return key ? wb.Sheets[key] : null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const allRawEntries: SummerExamEntry[] = [];
for (const schoolCode of ['FSC', 'FSM', 'FSE']) {
  const sheet = findSheet(wb, schoolCode);
  if (!sheet) {
    console.warn(`⚠️  Sheet with prefix "${schoolCode}" not found — skipping. Available sheets: ${wb.SheetNames.join(', ')}`);
    continue;
  }
  const sheetRange = XLSX.utils.decode_range(sheet['!ref']);
  expandMerges(sheet);
  const sheetEntries = buildEntries(sheet, sheetRange, schoolCode);
  allRawEntries.push(...sheetEntries);
}

const output = sortEntries(allRawEntries);

// Ensure output directory exists
const outDir = path.join('public', 'data');
fs.mkdirSync(outDir, { recursive: true });

// Safety guard: never overwrite with an empty array
if (output.length === 0) {
  console.warn('⚠️  Zero summer exam entries parsed — summer_schedule.json was NOT overwritten to prevent data loss.');
  console.warn('    Check that the Excel sheet names start with FSC / FSM / FSE and that the header row is present.');
} else {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✅ Wrote ${output.length} summer exam entries to ${OUTPUT_FILE}`);
  console.log(`   First entry: ${output[0].date} (${output[0].day}) — ${output[0].courseCode} ${output[0].courseName}`);
  console.log(`   Last  entry: ${output[output.length-1].date} (${output[output.length-1].day}) — ${output[output.length-1].courseCode} ${output[output.length-1].courseName}`);
}
