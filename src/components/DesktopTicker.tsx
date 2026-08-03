'use client';

import { useState, useEffect, useMemo } from 'react';
import { parseTimeRange, formatDuration } from '@/lib/dates';
import { DAYS_ORDER, type TimetableEntry, type RawTimetableJSON, type SummerCourseCatalogEntry } from '@/lib/types';
import { ShieldAlert } from 'lucide-react';
import { findMatchingCatalogEntry } from '@/lib/timetable-filter';
import {
  getLiveTimetableEntries,
  RESULT_PREFS_STORAGE_KEY,
  type TimetableResultPreference,
  type UserConfig,
} from '@/lib/timetable-live';

// eslint-disable-next-line
const timetableRaw: RawTimetableJSON = require('../../public/data/timetable.json');

interface Bundle {
  id: string;
  name: string;
  rows: any[];
}

interface DesktopTickerProps {
  allTimetableEntries: TimetableEntry[];
  userConfig: UserConfig | null;
  bundles: Bundle[];
  isSummer?: boolean;
  summerSelections?: Record<string, string>;
  summerCatalog?: SummerCourseCatalogEntry[];
}

interface OngoingClass extends TimetableEntry {
  remaining: number;
}

interface UpcomingClass extends TimetableEntry {
  until: number;
}

type TickerStatus =
  | { type: 'ongoing'; classes: OngoingClass[] }
  | { type: 'next'; classes: UpcomingClass[] };

export function DesktopTicker({
  allTimetableEntries,
  userConfig,
  bundles,
  isSummer = false,
  summerSelections = {},
  summerCatalog = [],
}: DesktopTickerProps) {

  const [now, setNow] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [resultPreferences, setResultPreferences] = useState<TimetableResultPreference | null>(null);

  // Update clock every second
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userConfig) {
      setResultPreferences(null);
      return;
    }

    try {
      const raw = localStorage.getItem(RESULT_PREFS_STORAGE_KEY);
      if (!raw) {
        setResultPreferences(null);
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, TimetableResultPreference>;
      setResultPreferences(parsed[`${userConfig.batch}|${userConfig.dept}`] ?? null);
    } catch (err) {
      console.error('Failed to parse timetable result preferences', err);
      setResultPreferences(null);
    }
  }, [userConfig]);

  const rawDaysList = useMemo(() => {
    return Array.isArray(timetableRaw.__meta__?.days)
      ? timetableRaw.__meta__.days
      : DAYS_ORDER.map(d => ({
          day: d,
          sheetName: d,
          date: '',
          isoDate: '',
          isMakeup: false
        }));
  }, []);

  const resolvedData = useMemo(() => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const currentYear = today.getFullYear();

    const currentDayOfWeek = today.getDay();
    const daysToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);
    thirtyDaysLater.setHours(23, 59, 59, 999);

    const toISODate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${date}`;
    };

    const mondayISO = toISODate(monday);
    const sundayISO = toISODate(sunday);
    const todayISO = toISODate(today);
    const todayDayName = today.toLocaleDateString('en-US', { weekday: 'long' });

    const parseExplicitDate = (sheetName: string): Date | null => {
      const match = sheetName.match(/\(([^)]+)\)/);
      if (!match) return null;
      
      const dateStr = match[1];
      let parsed = Date.parse(dateStr);
      if (isNaN(parsed)) {
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const cleanStr = dateStr.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
        const parts = cleanStr.split(/\s+/).filter(Boolean);
        
        let dayNum = 1;
        let monthIndex = -1;
        
        for (const part of parts) {
          const dayVal = parseInt(part);
          if (!isNaN(dayVal) && dayVal >= 1 && dayVal <= 31) {
            dayNum = dayVal;
          } else {
            const mIdx = months.findIndex(m => part.startsWith(m));
            if (mIdx !== -1) {
              monthIndex = mIdx;
            }
          }
        }
        
        if (monthIndex !== -1) {
          return new Date(currentYear, monthIndex, dayNum);
        }
      } else {
        const d = new Date(parsed);
        if (!/\d{4}/.test(dateStr)) {
          d.setFullYear(currentYear);
        }
        return d;
      }
      return null;
    };

    interface ResolvedSheet {
      day: string;
      sheetName: string;
      isoDate: string;
      isMakeup: boolean;
      dateStr: string;
      isDated: boolean;
    }

    const resolvedSheets: ResolvedSheet[] = [];
    const sidebarMakeupDays: ResolvedSheet[] = [];

    // Separate dated and undated sheets
    const undatedSheets = rawDaysList.filter(d => !parseExplicitDate(d.sheetName));
    const datedSheets = rawDaysList.filter(d => !!parseExplicitDate(d.sheetName));

    const currentWeekDatedDays = new Set<string>();

    // Process dated sheets
    const processedDated = datedSheets.map(s => {
      const dateObj = parseExplicitDate(s.sheetName);
      if (!dateObj) return null;
      dateObj.setHours(0, 0, 0, 0);

      // Rule: must not have passed (date >= today) and must be within 30 days
      if (dateObj < today || dateObj > thirtyDaysLater) {
        return null;
      }

      const isoDate = toISODate(dateObj);
      const isCurrentWeek = isoDate >= mondayISO && isoDate <= sundayISO;
      const dateStr = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

      const res: ResolvedSheet = {
        day: s.day,
        sheetName: s.sheetName,
        isoDate,
        isMakeup: true,
        dateStr,
        isDated: true
      };

      if (isCurrentWeek) {
        currentWeekDatedDays.add(s.day.toLowerCase());
      }

      return { res, isCurrentWeek };
    }).filter(Boolean) as { res: ResolvedSheet; isCurrentWeek: boolean }[];

    // Process undated sheets
    undatedSheets.forEach(s => {
      const dayIndex = DAYS_ORDER.indexOf(s.day);
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + dayIndex);
      targetDate.setHours(0, 0, 0, 0);

      const hasCurrentWeekDated = currentWeekDatedDays.has(s.day.toLowerCase());

      if (hasCurrentWeekDated) {
        // Rule: assign to the NEXT week
        const nextWeekDate = new Date(targetDate);
        nextWeekDate.setDate(targetDate.getDate() + 7);
        
        resolvedSheets.push({
          day: s.day,
          sheetName: s.sheetName,
          isoDate: toISODate(nextWeekDate),
          isMakeup: false,
          dateStr: nextWeekDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          isDated: false
        });
      } else {
        // Rule: assign to the current week
        resolvedSheets.push({
          day: s.day,
          sheetName: s.sheetName,
          isoDate: toISODate(targetDate),
          isMakeup: false,
          dateStr: targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          isDated: false
        });
      }
    });

    // Put dated sheets in resolvedSheets or sidebarMakeupDays
    processedDated.forEach(({ res, isCurrentWeek }) => {
      if (isCurrentWeek) {
        resolvedSheets.push(res);
      } else {
        sidebarMakeupDays.push(res);
      }
    });

    return {
      resolvedSheets,
      sidebarMakeupDays,
      todayISO,
      todayDayName
    };
  }, [rawDaysList, now]);

  // Build sheet name to meta mapping dynamically based on resolvedData
  const sheetToMeta = useMemo(() => {
    const map: Record<string, { day: string; isoDate: string; isMakeup: boolean; date: string }> = {};
    const { resolvedSheets, sidebarMakeupDays } = resolvedData;

    resolvedSheets.forEach(d => {
      map[d.sheetName] = {
        day: d.day,
        isoDate: d.isoDate,
        isMakeup: d.isMakeup,
        date: d.dateStr,
      };
    });

    sidebarMakeupDays.forEach(d => {
      map[d.sheetName] = {
        day: d.day,
        isoDate: d.isoDate,
        isMakeup: d.isMakeup,
        date: d.dateStr,
      };
    });

    return map;
  }, [resolvedData]);

  // ─── Timetable Logic ──────────────────────────────────────────────────
  const relevantEntries = useMemo(() => {
    if (isSummer) {
      const filtered = allTimetableEntries.filter(e => {
        const catalogEntry = findMatchingCatalogEntry(e.courseName, summerCatalog);
        const canonicalName = catalogEntry ? catalogEntry.sheetName : e.courseName;

        if (!summerSelections[canonicalName]) return false;
        const selectedSection = summerSelections[canonicalName];
        if (!e.section || !selectedSection) return true;
        return e.section === selectedSection;
      });
      // Deduplicate
      const seen = new Set<string>();
      return filtered.filter(entry => {
        const key = `${entry.day}|${entry.time}|${entry.courseName}|${entry.section}|${entry.category}|${entry.department}|${entry.room}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return entry.time && (entry.time.includes('-') || entry.time.includes(' to '));
      });
    }

    if (userConfig) {
      return getLiveTimetableEntries(allTimetableEntries, userConfig, resultPreferences);
    }

    if (bundles.length > 0) {
      const allSelections = bundles.flatMap((b: any) => b.rows).filter((r: any) => r.selection);
      const filtered = allTimetableEntries.filter(e => {
        return allSelections.some((sel: any) => {
          const [course, section] = sel.selection.split('|');
          return (
            e.courseName === course.trim() &&
            e.section === section.trim() &&
            e.batch === sel.batch &&
            e.department === sel.stream
          );
        });
      });

      const seen = new Set<string>();
      return filtered.filter(entry => {
        const key = `${entry.day}|${entry.time}|${entry.courseName}|${entry.section}|${entry.category}|${entry.department}|${entry.room}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return entry.time && (entry.time.includes('-') || entry.time.includes(' to '));
      });
    }

    return [];
  }, [isSummer, summerSelections, summerCatalog, userConfig, bundles, allTimetableEntries, resultPreferences]);

  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentMins = now.getHours() * 60 + now.getMinutes();

  // local date YYYY-MM-DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const dayStr = String(now.getDate()).padStart(2, '0');
  const todayISO = `${year}-${month}-${dayStr}`;

  const status = useMemo((): TickerStatus | null => {
    if (relevantEntries.length === 0) return null;

    // A class is ongoing if today's date matches the sheet's isoDate, or falls back to canonical weekday
    const ongoing = relevantEntries.filter(e => {
      if (e.cancelled) return false;
      const meta = sheetToMeta[e.day];
      const canonicalDay = meta?.day ?? e.day;
      const isoDate = meta?.isoDate ?? '';

      const isToday = isoDate ? (isoDate === todayISO) : (canonicalDay === currentDay);
      if (!isToday) return false;

      const { start, end } = parseTimeRange(e.time);
      return currentMins >= start && currentMins < end;
    });

    if (ongoing.length > 0) {
      return {
        type: 'ongoing',
        classes: ongoing.map(e => ({
          ...e,
          remaining: parseTimeRange(e.time).end - currentMins,
        })),
      };
    }

    const WEEKDAYS_MAP: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6
    };
    const currentDayIdx = now.getDay();

    const getNextOccurrence = (e: TimetableEntry) => {
      if (e.cancelled) return null;
      const meta = sheetToMeta[e.day];
      const canonicalDay = meta?.day ?? e.day;
      const isoDate = meta?.isoDate ?? '';
      const isMakeup = meta?.isMakeup ?? false;
      const { start, end } = parseTimeRange(e.time);

      if (isMakeup) {
        if (!isoDate) return null;
        if (isoDate < todayISO) return null;
        if (isoDate === todayISO && currentMins >= end) return null;

        const [ny, nm, nd] = isoDate.split('-').map(Number);
        const targetDate = new Date(ny, nm - 1, nd, Math.floor(start / 60), start % 60, 0);
        const diffMs = targetDate.getTime() - now.getTime();
        const minsUntil = Math.max(0, Math.floor(diffMs / 60000));
        return { minsUntil, dateISO: isoDate };
      } else {
        const targetDayIdx = WEEKDAYS_MAP[canonicalDay];
        if (targetDayIdx === undefined) return null;

        let daysDiff = (targetDayIdx - currentDayIdx + 7) % 7;
        if (daysDiff === 0 && currentMins >= end) {
          daysDiff = 7;
        }

        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + daysDiff);

        const targetYear = targetDate.getFullYear();
        const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
        const targetDayStr = String(targetDate.getDate()).padStart(2, '0');
        const dateISO = `${targetYear}-${targetMonth}-${targetDayStr}`;

        const sh = Math.floor(start / 60);
        const sm = start % 60;
        const tDate = new Date(targetYear, targetDate.getMonth(), targetDate.getDate(), sh, sm, 0);
        const diffMs = tDate.getTime() - now.getTime();
        const minsUntil = Math.max(0, Math.floor(diffMs / 60000));

        return { minsUntil, dateISO };
      }
    };

    const upcomingWithOccurrence = relevantEntries
      .map(e => {
        // If it is ongoing right now, skip it from upcoming
        const meta = sheetToMeta[e.day];
        const canonicalDay = meta?.day ?? e.day;
        const isoDate = meta?.isoDate ?? '';
        const isToday = isoDate ? (isoDate === todayISO) : (canonicalDay === currentDay);
        const { start, end } = parseTimeRange(e.time);
        if (isToday && currentMins >= start && currentMins < end) {
          return null;
        }

        const occurrence = getNextOccurrence(e);
        if (!occurrence) return null;
        return { entry: e, ...occurrence };
      })
      .filter(Boolean) as { entry: TimetableEntry; minsUntil: number; dateISO: string }[];

    if (upcomingWithOccurrence.length === 0) return null;

    // Sort active entries chronologically
    const sorted = [...upcomingWithOccurrence].sort((a, b) => {
      if (a.dateISO !== b.dateISO) {
        return a.dateISO.localeCompare(b.dateISO);
      }
      return a.minsUntil - b.minsUntil;
    });

    const nextClassObj = sorted[0];
    
    // Find all next classes starting at the same time on the same day
    const allNext = sorted.filter(item => 
      item.entry.day === nextClassObj.entry.day && 
      item.dateISO === nextClassObj.dateISO &&
      item.minsUntil === nextClassObj.minsUntil
    );

    return {
      type: 'next',
      classes: allNext.map(item => ({
        ...item.entry,
        until: item.minsUntil,
      })),
    };
  }, [relevantEntries, currentDay, currentMins, todayISO, sheetToMeta, now]);

  // ─── Early Return for Hydration (Must be after all Hooks) ───────────────
  if (!mounted) {
    return <div className="hidden md:block mb-12 h-[180px] opacity-0" aria-hidden="true" />;
  }

  // ─── Rendering Logic ──────────────────────────────────────────────────────
  const timeFull = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  const [timeStr, period] = timeFull.split(' ');
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  if (relevantEntries.length === 0) {
    return (
      <div className="hidden md:block mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex flex-col gap-0.5 items-start">
          <div className="flex items-baseline gap-3">
            <h2 className="font-clock text-5xl tracking-tighter text-[var(--color-text-primary)] opacity-80 select-none">
              {timeStr.split(':').slice(0, 2).join(':')}
              <span className="opacity-20 inline-block w-[0.4em] text-center">
                <span className="animate-pulse">:</span>
              </span>
              {timeStr.split(':').slice(2).join('')}
            </h2>
            <span className="font-display text-2xl font-bold text-[var(--color-text-secondary)] select-none uppercase">{period}</span>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-tertiary)] font-bold">{dateStr}</p>
        </div>
        <div className="mt-6 border-t border-[var(--color-border)] pt-4 opacity-50">
          <p className="text-[11px] text-[var(--color-text-tertiary)] max-w-sm leading-relaxed font-mono">
            {isSummer 
              ? 'No summer courses selected. Live class tracking will appear here once selected.'
              : 'No preferences detected. Live class tracking will appear here once saved.'}
          </p>
        </div>
      </div>
    );
  }

  const isConflict = status && status.classes.length > 1;

  return (
    <div className="hidden md:block mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex flex-col gap-0.5 items-start">
        <div className="flex items-baseline gap-3">
          <h2 className="font-clock text-5xl tracking-tighter text-[var(--color-text-primary)] select-none">
            {timeStr.split(':').slice(0, 2).join(':')}
            <span className="opacity-20 w-[0.4em] inline-block text-center tabular-nums">
              <span className="animate-pulse">:</span>
            </span>
            <span className="tabular-nums">{timeStr.split(':').slice(2).join('')}</span>
          </h2>
          <span className="font-display text-2xl font-bold text-[var(--color-text-secondary)] select-none uppercase">{period}</span>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-tertiary)] font-bold">{dateStr}</p>
      </div>

      {status && (
        <div className="mt-10 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-tertiary)] font-bold">
              {status.type === 'ongoing' ? 'Ongoing Class' : 'Next Up'}
            </span>
            {isConflict && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 font-mono text-[10px] font-bold uppercase tracking-widest animate-pulse border border-red-500/20">
                <ShieldAlert size={12} />
                Critical Conflict
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            {status.classes.map((cls, idx) => {
              const deptCode = cls.department?.toLowerCase() || 'cs';
              const accentColor = `var(--accent-${deptCode})`;
              const label = status.type === 'ongoing' 
                ? `${formatDuration((cls as OngoingClass).remaining)} left` 
                : `starts in ${formatDuration((cls as UpcomingClass).until)}`;
              
              const pillStyle = {
                borderColor: `rgba(var(--accent-rgb-${deptCode}), 0.25)`,
                color: accentColor,
                backgroundColor: `rgba(var(--accent-rgb-${deptCode}), 0.08)`
              };

              return (
                <div key={idx} className="grid grid-cols-3 gap-2 w-full max-w-xl">
                  <div className="h-12 px-4 flex items-center justify-center rounded-md border font-mono text-sm font-bold shadow-sm whitespace-nowrap" style={pillStyle}>
                    {cls.room || 'TBA'}
                  </div>
                  
                  <div className="h-12 px-4 flex items-center justify-center rounded-md border font-mono text-sm font-bold shadow-sm truncate text-center" style={pillStyle}>
                    {cls.courseName}
                  </div>

                  <div className="h-12 px-4 flex items-center justify-center rounded-md border font-mono text-sm font-bold shadow-sm whitespace-nowrap" style={pillStyle}>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
