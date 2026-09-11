/**
 * Dynamic Exam Type Detection
 * ============================
 *
 * Determines the current exam type (Sessional 1, Sessional 2, Finals, Mids)
 * by looking at the semester calendar and today's date.
 *
 * Algorithm ("look ahead and present, not behind"):
 *   1. Build exam periods from the semester calendar. Each period has:
 *      - start: the exam date (e.g., "First Sessional Examination")
 *      - end:   the results-announcement date (e.g., "Announcement of
 *               Results of 1st Sessional Examinations")
 *   2. Scan periods chronologically. Return the FIRST period where
 *      today ≤ end (i.e., the exam hasn't fully concluded yet).
 *   3. If all exams have passed, return the last exam type (usually Finals).
 *   4. If no exam dates found in the calendar, return "Exams" (generic fallback).
 *
 * This approach does NOT match the data file's dates against the calendar.
 * It uses ONLY today's date + the calendar. The admin controls timing by
 * opening/closing exam portal access — the label auto-adjusts.
 *
 * Exam categories:
 *   Regular (Fall/Spring): Sessional 1, Sessional 2, Finals
 *   Summer:                Mids, Finals
 */

import { getEffectiveToday } from './dates';

export type ExamType = 'Sessional 1' | 'Sessional 2' | 'Finals' | 'Mids' | 'Exams';

interface ExamPeriod {
  start: Date;
  end: Date;
  type: ExamType;
}

interface CalendarKeyDate {
  date: string;  // ISO format "YYYY-MM-DD"
  label: string;
}

interface SemesterCalendar {
  keyDates: CalendarKeyDate[];
}

// eslint-disable-next-line
const calendar: SemesterCalendar = require('../../public/data/semester_calendar.json');

/**
 * Parse an ISO date string ("YYYY-MM-DD") into a Date object at midnight local time.
 */
function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Find a key date whose label matches all the given keywords (case-insensitive).
 * Excludes dates whose label contains "results" or "announced" (those are
 * results-announcement dates, not exam dates).
 */
function findKeyDate(keywords: string[]): CalendarKeyDate | undefined {
  return calendar.keyDates.find(kd => {
    const label = kd.label.toLowerCase();
    // Skip results/announcement/show-up entries (not exam dates)
    if (label.includes('result') || label.includes('announced') || label.includes('show-up') || label.includes('show up')) return false;
    return keywords.every(kw => label.includes(kw.toLowerCase()));
  });
}

/**
 * Find a results-announcement date for a given set of keywords.
 * Looks for labels containing "result" or "announced" AND all the given keywords.
 */
function findResultsDate(keywords: string[]): CalendarKeyDate | undefined {
  return calendar.keyDates.find(kd => {
    const label = kd.label.toLowerCase();
    if (!label.includes('result') && !label.includes('announced')) return false;
    return keywords.every(kw => label.includes(kw.toLowerCase()));
  });
}

/**
 * Build exam periods from the semester calendar.
 *
 * For regular semester: Sessional 1, Sessional 2, Finals
 * For summer: Mids, Finals
 *
 * Each period's end date is the results-announcement date. If no results
 * date is found, falls back to the next exam's start date, or start + 30 days.
 */
function buildExamPeriods(isSummer: boolean): ExamPeriod[] {
  const periods: ExamPeriod[] = [];

  if (isSummer) {
    // Summer: Mids + Finals
    const midsExam = findKeyDate(['mid']);
    if (midsExam) {
      const midsResults = findResultsDate(['mid']) || findResultsDate(['1st']) || findResultsDate(['first']);
      const endDate = midsResults ? parseISO(midsResults.date) : addDays(parseISO(midsExam.date), 14);
      periods.push({ start: parseISO(midsExam.date), end: endDate, type: 'Mids' });
    }

    const finalsExam = findKeyDate(['final', 'examination']);
    if (finalsExam) {
      const finalsResults = findResultsDate(['final']);
      const endDate = finalsResults ? parseISO(finalsResults.date) : addDays(parseISO(finalsExam.date), 30);
      periods.push({ start: parseISO(finalsExam.date), end: endDate, type: 'Finals' });
    }
  } else {
    // Regular: Sessional 1, Sessional 2, Finals
    const s1Exam = findKeyDate(['first', 'sessional']);
    if (s1Exam) {
      const s1Results = findResultsDate(['1st']) || findResultsDate(['first', 'sessional']);
      const endDate = s1Results ? parseISO(s1Results.date) : addDays(parseISO(s1Exam.date), 14);
      periods.push({ start: parseISO(s1Exam.date), end: endDate, type: 'Sessional 1' });
    }

    const s2Exam = findKeyDate(['second', 'sessional']);
    if (s2Exam) {
      const s2Results = findResultsDate(['2nd']) || findResultsDate(['second', 'sessional']);
      const endDate = s2Results ? parseISO(s2Results.date) : addDays(parseISO(s2Exam.date), 14);
      periods.push({ start: parseISO(s2Exam.date), end: endDate, type: 'Sessional 2' });
    }

    const finalsExam = findKeyDate(['final', 'examination']);
    if (finalsExam) {
      const finalsResults = findResultsDate(['final']);
      const endDate = finalsResults ? parseISO(finalsResults.date) : addDays(parseISO(finalsExam.date), 30);
      periods.push({ start: parseISO(finalsExam.date), end: endDate, type: 'Finals' });
    }
  }

  // Sort by start date
  periods.sort((a, b) => a.start.getTime() - b.start.getTime());

  // Fill in missing end dates with the next period's start
  for (let i = 0; i < periods.length - 1; i++) {
    if (periods[i].end.getTime() >= periods[i + 1].start.getTime()) {
      // If end date overlaps or exceeds next start, cap it
      periods[i].end = periods[i + 1].start;
    }
  }

  return periods;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Get the current exam type based on today's date and the semester calendar.
 *
 * Scans exam periods chronologically and returns the first one where
 * today ≤ period.end (the exam hasn't fully concluded yet — either
 * approaching or in-progress).
 *
 * If all exams have passed, returns the last exam type (usually Finals).
 * If no exam dates found in the calendar, returns "Exams" (generic).
 */
export function getExamType(isSummer: boolean): ExamType {
  const periods = buildExamPeriods(isSummer);
  if (periods.length === 0) return 'Exams';

  const today = getEffectiveToday();

  for (const period of periods) {
    if (today <= period.end) {
      return period.type;
    }
  }

  // All exams have passed → return the last exam type
  return periods[periods.length - 1].type;
}
