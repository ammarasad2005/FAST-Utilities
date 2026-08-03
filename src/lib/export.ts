import type { ExamEntry, TimetableEntry } from './types';
import type { CalendarEvent } from './events';


// Download as CSV
export function downloadCSV(entries: ExamEntry[]): void {
  try {
    const header = 'Date,Day,Time,Course Code,Course Name,Batch,Department';
    const rows = entries.map(e =>
      [e.date, e.day, e.time, e.courseCode, `"${e.courseName}"`, e.batch, e.department].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fsc-exams-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('CSV export failed:', err);
  }
}

// Download as XLSX
// Download as XLSX (Matching the provided screenshot style)
export async function downloadXLSX(entries: ExamEntry[]): Promise<void> {
  try {
    // Dynamically import to avoid breaking Next.js SSR
    const { Workbook } = await import('exceljs');
    const { saveAs } = (await import('file-saver')).default;

    const wb = new Workbook();
    wb.creator = 'FAST Exams Engine';
    const sheet = wb.addWorksheet('Exam Timetable');

    // Define columns as per the original content, but styled like the screenshot
    sheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Day', key: 'day', width: 14 },
      { header: 'Time', key: 'time', width: 25 },
      { header: 'Course Code', key: 'courseCode', width: 18 },
      { header: 'Course Name', key: 'courseName', width: 55 },
      { header: 'Batch', key: 'batch', width: 12 },
      { header: 'Department', key: 'department', width: 16 },
    ];

    // Insert Data
    sheet.addRows(entries);

    // -- Styling: Header Row --
    const headerRow = sheet.getRow(1);
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
      // Dark navy blue background, white bold text, centered
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F3864' }, // A dark blue common in standard tables
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      // Thin explicit borders for the header
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // -- Styling: Data Rows --
    entries.forEach((_, index) => {
      const row = sheet.getRow(index + 2); // 1-based index, plus 1 for header
      row.height = 18;

      row.eachCell((cell, colNumber) => {
        // Center all data cells perfectly as seen in the screenshot,
        // EXCEPT Course Name (col 5) which we left-align for readability.
        if (colNumber === 5) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
        
        // Plain white fill
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' }
        };
        // Thin borders for that pronounced grid feeling
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        };
      });
    });

    // Buffer to blob and save
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Exam_Timetable_${Date.now()}.xlsx`);
  } catch (err) {
    console.error('XLSX export failed:', err);
  }
}

// Generate .ics for all exams in the schedule
export function downloadFullICS(entries: ExamEntry[]): void {
  try {
    const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const events = entries.map(exam => {
      const [dStr, mStr, yStr] = exam.date.split('/');
      
      // Calculate start and end dates for a true "All Day Event" (End Date is exclusive in ICS)
      const startDate = new Date(parseInt(yStr), parseInt(mStr) - 1, parseInt(dStr));
      const endDate = new Date(startDate.getTime());
      endDate.setDate(endDate.getDate() + 1);

      const startDT = `${startDate.getFullYear()}${String(startDate.getMonth() + 1).padStart(2,'0')}${String(startDate.getDate()).padStart(2,'0')}`;
      const endDT = `${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2,'0')}${String(endDate.getDate()).padStart(2,'0')}`;

      return [
        'BEGIN:VEVENT',
        `DTSTART;VALUE=DATE:${startDT}`,
        `DTEND;VALUE=DATE:${endDT}`,
        `DTSTAMP:${dtStamp}`,
        `SUMMARY:${exam.courseCode} – ${exam.courseName}`,
        `DESCRIPTION:Exact Time: ${exam.time}\\nBatch: ${exam.batch}\\nStream: ${exam.department}`,
        'END:VEVENT'
      ].join('\r\n');
    }).join('\r\n');

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FAST Exams//EN',
      events,
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fsc-exams-schedule-${Date.now()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('ICS full export failed:', err);
  }
}

// Generate .ics for a single exam and trigger download
export function generateICS(exam: ExamEntry): void {
  try {
    const [dStr, mStr, yStr] = exam.date.split('/');
    const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const startDate = new Date(parseInt(yStr), parseInt(mStr) - 1, parseInt(dStr));
    const endDate = new Date(startDate.getTime());
    endDate.setDate(endDate.getDate() + 1);

    const startDT = `${startDate.getFullYear()}${String(startDate.getMonth() + 1).padStart(2,'0')}${String(startDate.getDate()).padStart(2,'0')}`;
    const endDT = `${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2,'0')}${String(endDate.getDate()).padStart(2,'0')}`;

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FAST Exams//EN',
      'BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${startDT}`,
      `DTEND;VALUE=DATE:${endDT}`,
      `DTSTAMP:${dtStamp}`,
      `SUMMARY:${exam.courseCode} – ${exam.courseName}`,
      `DESCRIPTION:Exact Time: ${exam.time}\\nBatch: ${exam.batch}\\nStream: ${exam.department}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exam.courseCode}-exam.ics`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('ICS export failed:', err);
  }
}

// ─── Timetable Exports ────────────────────────────────────────────────────────

export function downloadTimetableCSV(entries: TimetableEntry[]): void {
  try {
    const header = 'Course,Batch,Department,Section,Day,Time,Room,Type,Category';
    const rows = entries.map(e =>
      [
        `"${e.courseName}"`,
        e.batch,
        e.department,
        e.section,
        e.day,
        `"${e.time}"`,
        e.room,
        e.type,
        e.category,
      ].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Timetable CSV export failed:', err);
  }
}

export async function downloadTimetableXLSX(entries: TimetableEntry[]): Promise<void> {
  try {
    const { Workbook } = await import('exceljs');
    const { saveAs } = (await import('file-saver')).default;

    const wb = new Workbook();
    wb.creator = 'FAST Timetable Engine';
    const sheet = wb.addWorksheet('Class Timetable');

    sheet.columns = [
      { header: 'Course',     key: 'courseName', width: 45 },
      { header: 'Batch',      key: 'batch',      width: 10 },
      { header: 'Department', key: 'department', width: 14 },
      { header: 'Section',    key: 'section',    width: 10 },
      { header: 'Day',        key: 'day',        width: 12 },
      { header: 'Time',       key: 'time',       width: 20 },
      { header: 'Room',       key: 'room',       width: 14 },
      { header: 'Type',       key: 'type',       width: 10 },
      { header: 'Category',   key: 'category',   width: 12 },
    ];

    sheet.addRows(entries);

    const headerRow = sheet.getRow(1);
    headerRow.height = 20;
    headerRow.eachCell(cell => {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
      cell.font   = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    entries.forEach((_, idx) => {
      const row = sheet.getRow(idx + 2);
      row.height = 18;
      row.eachCell((cell, col) => {
        cell.alignment = col === 1
          ? { vertical: 'middle', horizontal: 'left', wrapText: true }
          : { vertical: 'middle', horizontal: 'center' };
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        cell.border = {
          top:    { style: 'thin', color: { argb: 'FFD9D9D9' } },
          left:   { style: 'thin', color: { argb: 'FFD9D9D9' } },
          bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          right:  { style: 'thin', color: { argb: 'FFD9D9D9' } },
        };
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Timetable_${Date.now()}.xlsx`);
  } catch (err) {
    console.error('Timetable XLSX export failed:', err);
  }
}

export async function downloadTimetableImage(entries: TimetableEntry[], config?: any): Promise<void> {
  try {
    const { saveAs } = (await import('file-saver')).default;
    
    const res = await fetch('/api/export-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ entries, config }),
    });

    if (!res.ok) {
      throw new Error(`Failed to generate image: ${res.statusText}`);
    }

    const blob = await res.blob();
    saveAs(blob, `exam-schedule.png`);
  } catch (err) {
    console.error('Image export failed:', err);
    throw err;
  }
}

/**
 * Generates a recurring weekly .ics for a set of timetable entries.
 * Events repeat RRULE:FREQ=WEEKLY for ~16 weeks (or 8 weeks for summer) from the current date.
 */
export function downloadTimetableICS(entries: TimetableEntry[], isSummer?: boolean): void {
  try {
    const DAY_MAP: Record<string, string> = {
      Monday: 'MO', Tuesday: 'TU', Wednesday: 'WE', Thursday: 'TH', Friday: 'FR',
    };
    const dayIndex: Record<string, number> = {
      Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
    };

    const weeks = isSummer ? 8 : 16;
    const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const semStart = new Date(); semStart.setHours(0, 0, 0, 0);
    const semEnd = new Date(semStart); semEnd.setDate(semEnd.getDate() + weeks * 7);
    const untilDT = semEnd.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    function nextWeekday(targetDay: string): Date {
      const d = new Date(semStart);
      const diff = (dayIndex[targetDay] ?? 1 - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + diff);
      return d;
    }

    function parseParts(t: string): [number, number] {
      const m = t.match(/(\d{1,2}):(\d{2})/);
      if (!m) return [8, 0];
      return [parseInt(m[1]), parseInt(m[2])];
    }

    function toICSDateTime(date: Date, h: number, min: number): string {
      const d = new Date(date); d.setHours(h, min, 0, 0);
      return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}00`;
    }

    const events = entries.map(e => {
      const parts = e.time.split('-').map(s => s.trim());
      const [sh, sm] = parseParts(parts[0] ?? '');
      const [eh, em] = parseParts(parts[1] ?? parts[0] ?? '');
      const firstOcc = nextWeekday(e.day);
      return [
        'BEGIN:VEVENT',
        `DTSTART:${toICSDateTime(firstOcc, sh, sm)}`,
        `DTEND:${toICSDateTime(firstOcc, eh || sh + 1, em || sm)}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${DAY_MAP[e.day] ?? 'MO'};UNTIL=${untilDT}`,
        `DTSTAMP:${dtStamp}`,
        `SUMMARY:${e.courseName} (${e.section})`,
        `DESCRIPTION:Dept: ${e.department}\\nBatch: ${e.batch}\\nRoom: ${e.room}\\nType: ${e.type}`,
        `LOCATION:${e.room}`,
        'END:VEVENT',
      ].join('\r\n');
    }).join('\r\n');

    const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//FAST Timetable//EN', events,'END:VCALENDAR'].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `timetable-${Date.now()}.ics`; a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Timetable ICS export failed:', err);
  }
}

// ─── Campus Events Exports ──────────────────────────────────────────────────

function parseEventTime(timeStr: string, year: number, month: number, day: number): { start: Date, end: Date } {
  const defaultStart = new Date(year, month, day, 9, 0, 0);
  const defaultEnd = new Date(year, month, day, 10, 0, 0);

  if (!timeStr || timeStr.toLowerCase().includes('all day')) {
    const start = new Date(year, month, day, 0, 0, 0);
    const end = new Date(year, month, day, 23, 59, 59);
    return { start, end };
  }

  try {
    const parts = timeStr.split('-').map(s => s.trim());
    
    const parseTimePart = (t: string) => {
      const match = t.match(/(\d{1,2}):(\d{2})\s*([ap]m)/i);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const p = match[3].toLowerCase();
      if (p === 'pm' && h !== 12) h += 12;
      if (p === 'am' && h === 12) h = 0;
      return { h, m };
    };

    const startInfo = parseTimePart(parts[0]);
    if (!startInfo) return { start: defaultStart, end: defaultEnd };

    const start = new Date(year, month, day, startInfo.h, startInfo.m, 0);
    
    let end: Date;
    if (parts.length > 1) {
      const endInfo = parseTimePart(parts[1]);
      if (endInfo) {
        end = new Date(year, month, day, endInfo.h, endInfo.m, 0);
      } else {
        end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour
      }
    } else {
      end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour
    }

    return { start, end };
  } catch {
    return { start: defaultStart, end: defaultEnd };
  }
}

export function downloadEventsICS(events: CalendarEvent[], filename?: string): void {
  try {
    const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const formatICSDate = (d: Date) => 
      d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const eventBlocks = events.map((e, idx) => {
      const { start, end } = parseEventTime(e.time, e.year, e.month, e.day);
      const uid = `event-${e.year}${e.month}${e.day}-${idx}-${Date.now()}@fast-portal`;

      return [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${formatICSDate(start)}`,
        `DTEND:${formatICSDate(end)}`,
        `SUMMARY:${e.event_name}`,
        `DESCRIPTION:Location: ${e.event_location || 'N/A'}\\nExported from FAST NUCES Portal`,
        `LOCATION:${e.event_location || ''}`,
        'END:VEVENT'
      ].join('\r\n');
    }).join('\r\n');

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FAST NUCES//Unified Portal//EN',
      eventBlocks,
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `campus-events-${Date.now()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Events ICS export failed:', err);
  }
}
