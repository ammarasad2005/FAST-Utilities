import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { flattenTimetable, findMatchingCatalogEntry, extractTimeFromCourseName } from '@/lib/timetable-filter';
import type { TimetableEntry, SummerCourseCatalogEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

// ─── URL helpers ─────────────────────────────────────────────────────────────

function extractSheetInfo(url: string): { spreadsheetId: string | null; gid: string | null } {
  const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const spreadsheetId = idMatch ? idMatch[1] : null;
  const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : null;
  return { spreadsheetId, gid };
}

// ─── CSV parsing ─────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') { cell += '"'; i++; }
        else { inQuotes = false; }
      } else { cell += char; }
    } else {
      if (char === '"') { inQuotes = true; }
      else if (char === ',') { row.push(cell.trim()); cell = ''; }
      else if (char === '\r' || char === '\n') {
        row.push(cell.trim()); cell = '';
        if (row.some(c => c !== '')) result.push(row);
        row = [];
        if (char === '\r' && nextChar === '\n') i++;
      } else { cell += char; }
    }
  }
  if (cell || row.length > 0) {
    row.push(cell.trim());
    if (row.some(c => c !== '')) result.push(row);
  }
  return result;
}

const headerAliases: Record<string, string[]> = {
  courseName:    ['coursename', 'course name', 'course', 'title', 'subject'],
  batch:         ['batch', 'year'],
  department:    ['department', 'dept', 'discipline'],
  section:       ['section', 'sec'],
  day:           ['day', 'weekday'],
  time:          ['time', 'timeslot', 'time slot', 'duration', 'slot'],
  room:          ['room', 'roomno', 'room no', 'room number', 'room_no'],
  type:          ['type', 'classtype'],
  category:      ['category', 'classcategory'],
  rescheduled:   ['rescheduled'],
  exam:          ['exam'],
  isElective:    ['iselective', 'elective', 'is_elective'],
  electiveGroup: ['electivegroup', 'group', 'elective_group'],
};

function parseBoolean(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (!val) return false;
  const str = String(val).toLowerCase().trim();
  return str === 'true' || str === '1' || str === 'yes';
}

function processCSVRows(rows: string[][], defaultDay?: string): TimetableEntry[] {
  if (rows.length < 2) return [];

  // Determine if this is a 2D grid format (e.g. "Room" header on the left, time slots on top)
  let isGridFormat = false;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const firstCell = rows[i][0]?.toLowerCase().trim();
    if (firstCell === 'room' || firstCell === 'rooms') {
      isGridFormat = true;
      break;
    }
  }

  const entries: TimetableEntry[] = [];

  if (isGridFormat) {
    // ---- ADVANCED 2D GRID PARSING ----
    let currentTimeHeaders: string[] | null = null;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const firstCell = row[0]?.toLowerCase().trim();
      if (!firstCell) continue;
      
      // If we hit a header row, update currentTimeHeaders
      if (firstCell === 'room' || firstCell === 'rooms' || firstCell === 'lab' || firstCell === 'labs') {
        currentTimeHeaders = row;
        continue;
      }
      
      // If we have active headers, parse courses
      if (currentTimeHeaders) {
        const room = row[0]?.trim();
        
        // Skip empty or purely "Reserved" administrative rows
        if (!room) continue;
        
        for (let col = 1; col < row.length; col++) {
          const cell = row[col]?.trim();
          if (!cell || cell === '') continue; // Empty cell
          
          const timeSlot = currentTimeHeaders[col]?.trim();
          if (!timeSlot || timeSlot === '') continue; // Skip if no time header

          const cellLower = cell.toLowerCase();
          let courseName = cell;
          let section = '';
          let batch = '';
          let department = '';
          let reserved = false;
          let cancelled = false;
          let rescheduled = false;

          if (cellLower.includes("reserved")) {
            courseName = "Reserved";
            section = "Reserved";
            batch = "System";
            department = "System";
            reserved = true;
          } else {
            let cellText = cell;
            if (cellLower.includes("cancel") || cellLower.includes("cancle")) {
              cancelled = true;
              cellText = cellText.replace(/\s*\(\s*(?:cancel|cancle)[a-z]*\s*\)\s*/gi, ' ')
                             .replace(/\s*\b(?:cancel|cancle)[a-z]*\b\s*/gi, ' ')
                             .trim();
            }

            if (/\b(?:resched[a-z]*|resch)\b/i.test(cellText)) {
              rescheduled = true;
              cellText = cellText.replace(/\s*\(\s*(?:resched[a-z]*|resch)\s*\)\s*/gi, ' ')
                                 .replace(/\s*\b(?:resched[a-z]*|resch)\b\s*/gi, ' ')
                                 .trim();
            }

            // Extract section if present (for summer, e.g. "Linear Algebra (A)")
            const match = cellText.match(/^([^(]+?)\s*\(\s*([A-Za-z0-9\-/]+)\s*\)/);
            if (match) {
              courseName = match[1].trim();
              section = match[2].trim();
            } else {
              courseName = cellText;
              section = 'A';
            }
          }

          const type: 'lecture' | 'lab' =
            courseName.toLowerCase().includes('lab') ? 'lab' : 'lecture';

          const { cleanName, time: extractedTime } = extractTimeFromCourseName(courseName);

          entries.push({
            courseName: cleanName,
            batch,
            department,
            section,
            day: defaultDay || '',
            time: extractedTime || timeSlot,
            room: room,
            type: type,
            category: 'regular',
            rescheduled: rescheduled,
            exam: false,
            isElective: false,
            electiveGroup: null,
            cancelled,
            reserved,
          });
        }
      }
    }
    return entries;
  }

  // ---- FLAT TABLE PARSING ----
  const headers = rows[0];
  const headerMap: Record<string, number> = {};
  headers.forEach((h, index) => {
    const cleanH = h.toLowerCase().trim();
    for (const [key, aliases] of Object.entries(headerAliases)) {
      if (cleanH === key.toLowerCase() || aliases.includes(cleanH)) {
        headerMap[key] = index;
        break;
      }
    }
  });

  const getValue = (key: string, row: string[], defaultValue: unknown) => {
    const idx = headerMap[key];
    if (idx === undefined || idx >= row.length) return defaultValue;
    return row[idx] ?? defaultValue;
  };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every(c => c === '')) continue;
    let courseName = String(getValue('courseName', row, '')).trim();
    if (!courseName) continue;

    const courseLower = courseName.toLowerCase();
    let reserved = false;
    let cancelled = false;
    let rescheduled = false;
    let section = String(getValue('section', row, ''));
    let batch = String(getValue('batch', row, ''));
    let department = String(getValue('department', row, ''));

    if (courseLower.includes("reserved")) {
      courseName = "Reserved";
      section = "Reserved";
      batch = "System";
      department = "System";
      reserved = true;
    } else {
      if (courseLower.includes("cancel") || courseLower.includes("cancle")) {
        cancelled = true;
        courseName = courseName.replace(/\s*\(\s*(?:cancel|cancle)[a-z]*\s*\)\s*/gi, ' ')
                               .replace(/\s*\b(?:cancel|cancle)[a-z]*\b\s*/gi, ' ')
                               .trim();
      }

      if (/\b(?:resched[a-z]*|resch)\b/i.test(courseName)) {
        rescheduled = true;
        courseName = courseName.replace(/\s*\(\s*(?:resched[a-z]*|resch)\s*\)\s*/gi, ' ')
                               .replace(/\s*\b(?:resched[a-z]*|resch)\b\s*/gi, ' ')
                               .trim();
      }
    }

    const typeVal = String(getValue('type', row, ''));
    const type: 'lecture' | 'lab' =
      typeVal.toLowerCase().includes('lab') || courseName.toLowerCase().endsWith('lab')
        ? 'lab'
        : 'lecture';

    const rawDay = String(getValue('day', row, '')).trim();
    const day = rawDay || defaultDay || '';

    const { cleanName, time: extractedTime } = extractTimeFromCourseName(courseName);

    entries.push({
      courseName: cleanName,
      batch,
      department,
      section,
      day,
      time:          extractedTime || String(getValue('time', row, '')),
      room:          String(getValue('room', row, '')),
      type,
      category:      String(getValue('category', row, 'regular')) as 'regular' | 'repeat',
      rescheduled:   rescheduled || parseBoolean(getValue('rescheduled', row, false)),
      exam:          parseBoolean(getValue('exam', row, false)),
      isElective:    parseBoolean(getValue('isElective', row, false)),
      electiveGroup: (getValue('electiveGroup', row, null) as string | null) || null,
      cancelled,
      reserved,
    });
  }
  return entries;
}

// ─── Catalog helpers ──────────────────────────────────────────────────────────

/**
 * Build a default catalog from unique course names in the entries.
 * Used when the admin has not yet set up the catalog (course_mappings is empty).
 */
function autoBuildCatalog(entries: TimetableEntry[]): SummerCourseCatalogEntry[] {
  const seen = new Set<string>();
  const catalog: SummerCourseCatalogEntry[] = [];
  for (const e of entries) {
    if (e.courseName && !seen.has(e.courseName)) {
      seen.add(e.courseName);
      catalog.push({ sheetName: e.courseName, displayName: null, hidden: false });
    }
  }
  return catalog.sort((a, b) => a.sheetName.localeCompare(b.sheetName));
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

function serveLocalFallback(catalog: SummerCourseCatalogEntry[] = []) {
  try {
    // eslint-disable-next-line
    const timetableRaw = require('../../../../public/data/timetable.json');
    const entries = flattenTimetable(timetableRaw);
    return NextResponse.json({ entries, catalog });
  } catch (err) {
    console.error('Error reading/flattening local timetable:', err);
    return NextResponse.json({ error: 'Failed to retrieve timetable data' }, { status: 500 });
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  try {
    const { data: settings, error } = await supabase
      .from('semester_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !settings) {
      console.error('Error fetching settings from Supabase, using fallback:', error);
      return serveLocalFallback();
    }

    const isSummer = settings.semester_type === 'summer';

    // ── Determine entries source ──────────────────────────────────────────────
    let entries: TimetableEntry[] = [];
    try {
      // eslint-disable-next-line
      const timetableRaw = require('../../../../public/data/timetable.json');
      entries = flattenTimetable(timetableRaw);
      if (isSummer) {
        entries = entries.filter(e => e.batch === 'Summer');
      }
    } catch (err) {
      console.error('Error reading/flattening local timetable:', err);
      return NextResponse.json({ error: 'Failed to retrieve timetable data' }, { status: 500 });
    }

    // ── Build catalog ─────────────────────────────────────────────────────────
    let catalog: SummerCourseCatalogEntry[] = [];

    if (isSummer) {
      const rawMappings = settings.course_mappings;
      const isEmptyCatalog =
        !rawMappings ||
        (Array.isArray(rawMappings) && rawMappings.length === 0);

      if (isEmptyCatalog) {
        // First-time: auto-generate from entries (all visible, no aliases)
        // Normalize courseName first
        entries = entries.map(e => ({
          ...e,
          courseName: e.courseName.replace(/\s*\([^)]*\)\s*$/, '').trim()
        }));
        catalog = autoBuildCatalog(entries);
      } else {
        // Admin has curated the catalog — serve as-is
        catalog = rawMappings as SummerCourseCatalogEntry[];
        
        // Strict whitelist: Only allow entries that match a catalog course where hidden is false.
        // Also normalize the returned entries' courseNames to match the catalog's exact sheetName.
        const filteredEntries: TimetableEntry[] = [];
        for (const e of entries) {
          const catalogEntry = findMatchingCatalogEntry(e.courseName, catalog);
          if (catalogEntry && !catalogEntry.hidden) {
            filteredEntries.push({
              ...e,
              courseName: catalogEntry.sheetName // Canonical name
            });
          }
        }
        entries = filteredEntries;
      }
    }
    // Regular semester: catalog stays [] — frontend ignores it

    const response = { entries, catalog };

    return NextResponse.json(response);
  } catch (err) {
    console.error('API Error in timetable route:', err);
    return serveLocalFallback();
  }
}
