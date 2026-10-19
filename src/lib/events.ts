import rawEvents from '../../public/data/student_events.json';

export interface StudentEvent {
  id?: number;
  event_name: string;
  date: string;
  time: string;
  event_location: string;
  from?: string;
}

interface StudentEventsPayload {
  filtered_at?: string;
  date_range?: string;
  total_original?: number;
  total_filtered?: number;
  events: StudentEvent[];
}

export interface CalendarEvent extends StudentEvent {
  day: number;
  month: number;
  year: number;
}

export interface CalendarCell {
  day: number;
  month: number;
  year: number;
  inCurrentMonth: boolean;
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const payload = rawEvents as StudentEventsPayload;
const sourceEvents: StudentEvent[] = Array.isArray(payload.events) ? payload.events : [];

function parseStartMinutes(timeRange: string): number {
  const match = timeRange.match(/(\d{1,2}):(\d{2})\s*([ap]m)/i);
  if (!match) return Number.MAX_SAFE_INTEGER;

  let hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  const period = match[3].toLowerCase();

  if (period === 'pm' && hour !== 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;

  return hour * 60 + minute;
}

function parseMonthToken(monthToken: string): number {
  const normalized = monthToken.trim().toLowerCase();
  return MONTH_NAMES.findIndex((name) => name.toLowerCase() === normalized);
}

export function parseEventDate(
  dateStr: string,
  referenceDate: Date = new Date()
): { day: number; month: number; year: number } | null {
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length < 2) return null;

  const month = parseMonthToken(parts[0]);
  const day = Number.parseInt(parts[1].replace(/[^\d]/g, ''), 10);

  if (month < 0 || Number.isNaN(day) || day < 1 || day > 31) return null;

  const currentMonth = referenceDate.getMonth();
  const currentYear = referenceDate.getFullYear();
  const inferredYear = month < currentMonth ? currentYear + 1 : currentYear;

  return { day, month, year: inferredYear };
}

export function getEventsForMonth(
  month: number,
  year: number,
  referenceDate: Date = new Date()
): Record<number, CalendarEvent[]> {
  const grouped: Record<number, CalendarEvent[]> = {};

  for (const event of sourceEvents) {
    const parsed = parseEventDate(event.date, referenceDate);
    if (!parsed) continue;
    if (parsed.month !== month || parsed.year !== year) continue;

    if (!grouped[parsed.day]) grouped[parsed.day] = [];
    grouped[parsed.day].push({ ...event, ...parsed });
  }

  for (const day of Object.keys(grouped)) {
    grouped[Number(day)].sort((a, b) => parseStartMinutes(a.time) - parseStartMinutes(b.time));
  }

  return grouped;
}

export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(month: number, year: number): number {
  return new Date(year, month, 1).getDay();
}

export function getCalendarCells(month: number, year: number): CalendarCell[] {
  const firstDay = getFirstDayOfMonth(month, year);
  const daysInMonth = getDaysInMonth(month, year);
  const prevMonthDate = new Date(year, month - 1, 1);
  const nextMonthDate = new Date(year, month + 1, 1);
  const prevMonth = prevMonthDate.getMonth();
  const prevYear = prevMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth();
  const nextYear = nextMonthDate.getFullYear();
  const daysInPrevMonth = getDaysInMonth(prevMonth, prevYear);

  const cells: CalendarCell[] = [];

  for (let i = 0; i < firstDay; i += 1) {
    const day = daysInPrevMonth - firstDay + i + 1;
    cells.push({ day, month: prevMonth, year: prevYear, inCurrentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, month, year, inCurrentMonth: true });
  }

  const totalCells = Math.ceil(cells.length / 7) * 7;
  let trailingDay = 1;
  while (cells.length < totalCells) {
    cells.push({ day: trailingDay, month: nextMonth, year: nextYear, inCurrentMonth: false });
    trailingDay += 1;
  }

  return cells;
}

export function getCurrentAndNextMonth(referenceDate: Date = new Date()): {
  current: { month: number; year: number };
  next: { month: number; year: number };
} {
  const currentMonth = referenceDate.getMonth();
  const currentYear = referenceDate.getFullYear();

  return {
    current: { month: currentMonth, year: currentYear },
    next: currentMonth === 11
      ? { month: 0, year: currentYear + 1 }
      : { month: currentMonth + 1, year: currentYear },
  };
}
