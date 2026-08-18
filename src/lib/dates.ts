// Parse "DD/MM/YYYY" → Date object
export function parseExamDate(dateStr: string): Date | null {
  const [d, m, y] = dateStr.split('/').map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

// Returns days from today to exam date (negative if passed)
export function getDaysUntil(dateStr: string): number | null {
  const examDate = parseExamDate(dateStr);
  if (!examDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = examDate.getTime() - today.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

// "12/05/2025" → "12 May 2025"
export function formatDate(dateStr: string): string {
  const [d, m, y] = dateStr.split('/');
  const month = new Date(2000, parseInt(m) - 1, 1).toLocaleString('en', { month: 'long' });
  return `${parseInt(d)} ${month} ${y}`;
}

export function parseTime(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

// Parse "HH:MM" (24-hour) or "HH:MM AM/PM" → minutes from midnight
export function parseTime24(timeStr: string): number {
  if (!timeStr) return 0;
  
  // 1. Handle AM/PM format: "09:00 AM"
  const amPmMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (amPmMatch) {
    let h = parseInt(amPmMatch[1], 10);
    const m = parseInt(amPmMatch[2], 10);
    const p = amPmMatch[3].toUpperCase();
    if (p === 'PM' && h < 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }

  // 2. Handle 24-hour format or ambiguous format: "08:30" or "02:15"
  const parts = timeStr.split(':');
  if (parts.length < 2) return 0;
  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  
  // Ambiguity check for university schedule (8:30 AM to 5:15 PM)
  // If hour is between 1-7, it's likely PM.
  if (h >= 1 && h <= 7) h += 12;
  
  return (h || 0) * 60 + (m || 0);
}

// "HH:MM - HH:MM" or "HH:MM to HH:MM" or "HH:MM-HH:MM" → { start: mins, end: mins }
export function parseTimeRange(range: string): { start: number; end: number } {
  if (!range) return { start: 0, end: 0 };
  
  const delimiters = [' - ', ' to ', '-'];
  let parts: string[] = [];
  
  for (const del of delimiters) {
    if (range.includes(del)) {
      parts = range.split(del).map(s => s.trim());
      break;
    }
  }

  if (parts.length < 2) return { start: 0, end: 0 };
  return { start: parseTime24(parts[0]), end: parseTime24(parts[1]) };
}



// Format duration: 
// if < 60 mins: "Xm"
// if < 24 hours: "Xh Ym"
// if > 24 hours: "Xd Yh Zm"
export function formatDuration(totalMins: number): string {
  const d = Math.floor(totalMins / (24 * 60));
  const h = Math.floor((totalMins % (24 * 60)) / 60);
  const m = totalMins % 60;

  if (d > 0) {
    if (h === 0 && m === 0) return `${d}d`;
    if (m === 0) return `${d}d ${h}h`;
    if (h === 0) return `${d}d ${m}m`;
    return `${d}d ${h}h ${m}m`;
  }

  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}



export function sortByChronological(a: ExamEntry, b: ExamEntry): number {


  const [ad, am, ay] = a.date.split('/').map(Number);
  const [bd, bm, by] = b.date.split('/').map(Number);
  const da = new Date(ay, am - 1, ad).getTime();
  const db = new Date(by, bm - 1, bd).getTime();
  if (da !== db) return da - db;
  return parseTime(a.time) - parseTime(b.time);
}

// ── Semester start date helpers ─────────────────────────────────────────────
// eslint-disable-next-line
let _semesterCalendarCache: any = null;

/**
 * Returns the semester's "First Day of Classes" as an ISO date string (YYYY-MM-DD),
 * or null if not found / not parseable. Caches the calendar JSON on first load.
 */
export function getSemesterStartDate(): string | null {
  try {
    if (!_semesterCalendarCache) {
      // eslint-disable-next-line
      _semesterCalendarCache = require('../../public/data/semester_calendar.json');
    }
    const firstDay = _semesterCalendarCache?.keyDates?.find(
      (k: { label: string }) => k.label.toLowerCase().includes('first day of classes')
    );
    return firstDay?.date ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns true if today's date is before the semester start date.
 * Used to suppress "today" highlighting and ongoing-class detection
 * during pre-semester periods (orientation week, etc.).
 */
export function isBeforeSemesterStart(): boolean {
  const startISO = getSemesterStartDate();
  if (!startISO) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startISO + 'T00:00:00');
  if (isNaN(start.getTime())) return false;
  return today < start;
}

/**
 * Returns the "effective today" — the date that should be treated as "Today"
 * for display purposes.
 *
 * From 12:00 AM to 5:29 PM: effective today = actual today
 * From 5:30 PM to 11:59 PM: effective today = tomorrow
 *
 * After 5:30 PM, all BS classes are done (last slot ends at 5:15-5:20 PM).
 * Showing the empty remainder of today is useless, so we shift "Today" to
 * tomorrow. At midnight, tomorrow becomes today naturally.
 */
export function getEffectiveToday(now: Date = new Date()): Date {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (currentMinutes >= 17 * 60 + 30) {
    // After 5:30 PM — shift to tomorrow
    today.setDate(today.getDate() + 1);
  }
  return today;
}

/**
 * Clamps a Monday reference date to the semester start week if the Monday
 * falls before the semester's "First Day of Classes". This ensures day
 * labels never show pre-semester dates.
 *
 * Returns the (possibly clamped) Monday Date.
 */
export function clampMondayToSemesterStart(monday: Date): Date {
  const startISO = getSemesterStartDate();
  if (!startISO) return monday;
  const start = new Date(startISO + 'T00:00:00');
  if (isNaN(start.getTime())) return monday;
  if (monday >= start) return monday;
  // Clamp to the Monday of the semester start week
  const ssDayOfWeek = start.getDay();
  const ssDaysToMonday = ssDayOfWeek === 0 ? 6 : ssDayOfWeek - 1;
  const clamped = new Date(start);
  clamped.setDate(start.getDate() - ssDaysToMonday);
  clamped.setHours(0, 0, 0, 0);
  return clamped;
}

// ── Semester timeline helpers ────────────────────────────────────────────────

interface KeyDate {
  label: string;
  date: string;
  endDate?: string;
  type?: string;
  icon?: string;
}

interface AcademicRange {
  label: string;
  start: string;
  end: string;
  color: string;
}

interface SemesterCalendar {
  semester: string;
  keyDates: KeyDate[];
  holidays: KeyDate[];
  academicRanges: AcademicRange[];
  weekCount?: number;
}

function getCalendar(): SemesterCalendar | null {
  try {
    if (!_semesterCalendarCache) {
      // eslint-disable-next-line
      _semesterCalendarCache = require('../../public/data/semester_calendar.json');
    }
    return _semesterCalendarCache as SemesterCalendar;
  } catch {
    return null;
  }
}

/** Returns the "Last Day of Classes" ISO date, or null. */
export function getSemesterEndDate(): string | null {
  const cal = getCalendar();
  if (!cal?.keyDates) return null;
  const lastDay = cal.keyDates.find(
    (k) => k.label.toLowerCase().includes('last day of classes')
  );
  return lastDay?.date ?? null;
}

/** Returns the "Final Examinations" start ISO date, or null. */
export function getFinalExamsStartDate(): string | null {
  const cal = getCalendar();
  if (!cal?.keyDates) return null;
  const finals = cal.keyDates.find(
    (k) => k.label.toLowerCase().includes('final examination')
  );
  return finals?.date ?? null;
}

/** Returns the "Final Examinations" end ISO date, or null. */
export function getFinalExamsEndDate(): string | null {
  const cal = getCalendar();
  if (!cal?.keyDates) return null;
  const finals = cal.keyDates.find(
    (k) => k.label.toLowerCase().includes('final examination')
  );
  return finals?.endDate ?? finals?.date ?? null;
}

/**
 * Returns the current semester week number (1-based).
 * Week 1 starts on the semester's first day. Returns null if before start
 * or after the semester ends.
 */
export function getSemesterWeekNumber(now: Date = new Date()): number | null {
  const startISO = getSemesterStartDate();
  const endISO = getSemesterEndDate();
  if (!startISO || !endISO) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const start = new Date(startISO + 'T00:00:00');
  if (today < start) return null;
  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

/**
 * Returns semester progress as a float 0-100.
 * 0 = semester just started, 100 = semester ended (including finals).
 * The timeline extends from First Day of Classes to the end of Final
 * Examinations, so the FE marker sits at its true proportional position.
 * Returns null if dates unavailable. Can return <0 (pre-semester).
 */
export function getSemesterProgress(now: Date = new Date()): number | null {
  const startISO = getSemesterStartDate();
  const endISO = getSemesterEndDate();
  const finalsEndISO = getFinalExamsEndDate();
  if (!startISO || !endISO) return null;
  // Extend timeline to include finals period if available
  const timelineEndISO = finalsEndISO || endISO;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const start = new Date(startISO + 'T00:00:00');
  const end = new Date(timelineEndISO + 'T00:00:00');
  const total = end.getTime() - start.getTime();
  if (total <= 0) return null;
  const elapsed = today.getTime() - start.getTime();
  return (elapsed / total) * 100;
}

/**
 * Returns key exam milestones for the timeline bar markings.
 * Each milestone has a label, date, and progressPercent (0-100 position on bar).
 */
export interface SemesterMilestone {
  label: string;
  shortLabel: string;
  date: string;
  progressPercent: number;
}

export function getSemesterMilestones(): SemesterMilestone[] {
  const cal = getCalendar();
  const startISO = getSemesterStartDate();
  const endISO = getSemesterEndDate();
  const finalsEndISO = getFinalExamsEndDate();
  if (!cal?.keyDates || !startISO || !endISO) return [];

  // Use the same extended timeline as getSemesterProgress (includes finals)
  const timelineEndISO = finalsEndISO || endISO;
  const start = new Date(startISO + 'T00:00:00').getTime();
  const end = new Date(timelineEndISO + 'T00:00:00').getTime();
  const total = end - start;
  if (total <= 0) return [];

  const milestones: SemesterMilestone[] = [];
  const findKeyDate = (needle: string) =>
    cal.keyDates.find((k) => k.label.toLowerCase().includes(needle));

  const sessional1 = findKeyDate('first sessional');
  const sessional2 = findKeyDate('second sessional');
  const finals = findKeyDate('final examination');

  for (const [kd, short] of [
    [sessional1, 'S1'],
    [sessional2, 'S2'],
    [finals, 'FE'],
  ] as [KeyDate | undefined, string][]) {
    if (kd?.date) {
      const d = new Date(kd.date + 'T00:00:00').getTime();
      const pct = ((d - start) / total) * 100;
      milestones.push({
        label: kd.label,
        shortLabel: short,
        date: kd.date,
        progressPercent: Math.max(0, Math.min(100, pct)),
      });
    }
  }

  return milestones;
}

/**
 * Returns the next N upcoming key dates from today.
 * Used in the expanded timeline dropdown.
 */
export function getUpcomingMilestones(
  count: number = 5,
  now: Date = new Date()
): KeyDate[] {
  const cal = getCalendar();
  if (!cal?.keyDates) return [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().slice(0, 10);
  return cal.keyDates
    .filter((k) => k.date >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, count);
}

/**
 * Formats a duration between two dates as "X months, Y weeks, Z days".
 * Uses calendar-aware month approximation (30.44 days/month).
 */
export function formatMonthsWeeksDays(
  startISO: string,
  endISO: string,
  now: Date = new Date()
): { months: number; weeks: number; days: number; direction: 'elapsed' | 'remaining' } {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const start = new Date(startISO + 'T00:00:00');
  const end = new Date(endISO + 'T00:00:00');

  // Determine direction: if today is between start and end, "elapsed".
  // If today is before start, count "until start". If after end, count "since end".
  let from: Date, to: Date, direction: 'elapsed' | 'remaining';
  if (today < start) {
    from = today;
    to = start;
    direction = 'remaining';
  } else if (today > end) {
    from = end;
    to = today;
    direction = 'elapsed';
  } else {
    from = start;
    to = today;
    direction = 'elapsed';
  }

  const totalDays = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  const months = Math.floor(totalDays / 30.44);
  const remainingDays = totalDays - Math.floor(months * 30.44);
  const weeks = Math.floor(remainingDays / 7);
  const days = remainingDays - weeks * 7;

  return { months, weeks, days, direction };
}

/**
 * Returns the number of days from today to the given ISO date.
 * Positive = future, negative = past.
 */
export function daysUntil(isoDate: string, now: Date = new Date()): number {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoDate + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

import type { ExamEntry } from './types';
