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

import type { ExamEntry } from './types';
