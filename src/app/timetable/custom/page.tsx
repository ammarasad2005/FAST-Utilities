'use client';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useId, Suspense, useEffect } from 'react';
import { TimetableCard } from '@/components/TimetableCard';
import { TimetableDetail } from '@/components/TimetableDetail';
import { SearchBar } from '@/components/SearchBar';
import { TimetableExportButton } from '@/components/TimetableExportButton';
import { EmptyState } from '@/components/EmptyState';
import { Header } from '@/components/Header';
import { MakeupDaysSidebar } from '@/components/MakeupDaysSidebar';

import { ThemeToggle } from '@/components/ThemeToggle';
import { ShieldAlert, AlertCircle, Info } from 'lucide-react';
import { flattenTimetable, groupByDayTimetable, detectConflicts, formatTimeRange, parseTimeRange, findMatchingCatalogEntry } from '@/lib/timetable-filter';
import type { TimetableEntry, RawTimetableJSON, SummerCourseCatalogEntry } from '@/lib/types';
import { DAYS_ORDER } from '@/lib/types';

// eslint-disable-next-line
const timetableRaw: RawTimetableJSON = require('../../../../public/data/timetable.json');
const allTimetableEntries = flattenTimetable(timetableRaw);

// Derive available batches from data
const availableBatches: string[] = [...new Set<string>(allTimetableEntries.map(e => e.batch))]
  .sort()
  .reverse();

const TIMETABLE_DEPTS = ['CS', 'AI', 'DS', 'CY', 'SE', 'AI/DS'];
const CATEGORIES = ['regular', 'repeat'];

interface CourseRow {
  id: string;
  batch: string;
  stream: string;
  category: string;
  selection: string; // Format: "Course Name|Section"
  // validation state
  errorBatch: boolean;
  errorStream: boolean;
  errorCategory: boolean;
  errorSelection: boolean;
}

interface Bundle {
  id: string;
  name: string;
  rows: CourseRow[];
}

type ViewMode = 'list' | 'grid';


function makeRow(id: string, isSummerMode: boolean): CourseRow {
  const defaultBatch = isSummerMode
    ? 'Summer'
    : (availableBatches.filter(b => b !== 'Summer')[0] ?? '2024');
  return {
    id,
    batch: defaultBatch,
    stream: defaultBatch === 'Summer' ? 'CS' : '',
    category: 'regular',
    selection: '',
    errorBatch: false,
    errorStream: false,
    errorCategory: false,
    errorSelection: false,
  };
}

function findClasses(entry: CourseRow, entries: TimetableEntry[] = allTimetableEntries): TimetableEntry[] {
  if (!entry.batch || !entry.stream || !entry.category || !entry.selection) return [];
  const [courseName, section] = entry.selection.split(' | ');
  return entries.filter(e =>
    e.batch === entry.batch &&
    e.department === entry.stream &&
    e.category === entry.category &&
    e.courseName === courseName &&
    e.section === section
  );
}

function CustomTimetableInner() {
  const router = useRouter();
  const baseId = useId();
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [nextIdx, setNextIdx] = useState(1);
  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selected, setSelected] = useState<TimetableEntry|null>(null);
  const [isMobileClassesExpanded, setIsMobileClassesExpanded] = useState(false);
  const [isDesktopClassesExpanded, setIsDesktopClassesExpanded] = useState(false);
  const [isMakeupSidebarOpen, setIsMakeupSidebarOpen] = useState(false);

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentYear = today.getFullYear();

    const currentDayOfWeek = today.getDay();
    const daysToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
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

    // Sort resolved sheets: Today first, then other days by isoDate / DAYS_ORDER index
    resolvedSheets.sort((a, b) => {
      const isTodayA = a.isoDate === todayISO || a.day.toLowerCase() === todayDayName.toLowerCase();
      const isTodayB = b.isoDate === todayISO || b.day.toLowerCase() === todayDayName.toLowerCase();

      if (isTodayA) return -1;
      if (isTodayB) return 1;

      const getDayIndex = (dayName: string) => {
        const idx = DAYS_ORDER.indexOf(dayName);
        return idx === -1 ? 999 : idx;
      };

      if (a.isoDate && b.isoDate) {
        return a.isoDate.localeCompare(b.isoDate);
      }
      return getDayIndex(a.day) - getDayIndex(b.day);
    });

    return {
      resolvedSheets,
      sidebarMakeupDays,
      todayISO,
      todayDayName
    };
  }, [rawDaysList]);

  const currentMonthMakeupDays = useMemo(() => {
    return resolvedData.sidebarMakeupDays;
  }, [resolvedData]);

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { month: 'long' });
  }, []);

  // ── Bundle Management State ──
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [editingBundleId, setEditingBundleId] = useState<string|null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newBundleName, setNewBundleName] = useState('');
  const [semesterName, setSemesterName] = useState<string>('Spring 2026');
  const [exclusivityError, setExclusivityError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string|null>(null);
  const [tempName, setTempName] = useState('');
  const [activeBundleId, setActiveBundleId] = useState<string|null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSummer, setIsSummer] = useState(false);
  const [summerCatalog, setSummerCatalog] = useState<SummerCourseCatalogEntry[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>(allTimetableEntries);

  useEffect(() => {
    const activeSemester = localStorage.getItem('fsc_active_semester');
    const isSummerMode = activeSemester === 'summer';
    setIsSummer(isSummerMode);

    if (isSummerMode) {
      fetch('/api/timetable', { cache: 'no-store' })
        .then(res => res.ok ? res.json() : { entries: [], catalog: [] })
        .then(data => {
          if (data.entries) setTimetableEntries(data.entries);
          if (data.catalog) setSummerCatalog(data.catalog);
        })
        .catch(err => console.error('Error fetching custom timetable summer entries:', err));
    }

    // Check for a preview first
    const previewData = localStorage.getItem('fsc_timetable_preview');
    if (previewData) {
      try {
        const previewRows = JSON.parse(previewData);
        if (Array.isArray(previewRows) && previewRows.length > 0) {
          setRows(previewRows);
          setSaved(true); // Immediately trigger the view
          setIsDesktopClassesExpanded(false); // Collapse the editor
          setIsMobileClassesExpanded(false);
          setEditingBundleId(null); // Ensure no bundle is marked as active
        }
      } catch (e) {
        console.error('Failed to parse preview data', e);
      } finally {
        // IMPORTANT: Clean up the preview data so it's not loaded again
        localStorage.removeItem('fsc_timetable_preview');
      }
      // If we loaded a preview, we don't need to load regular bundles
      setIsLoaded(true);
      return;
    }

    // Regular bundle loading
    const stored = localStorage.getItem('fsc_custom_bundles');
    if (stored) {
      try {
        setBundles(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse bundles', e);
      }
    }
    const savedSemesterName = localStorage.getItem('fsc_semester_name');
    if (savedSemesterName) {
      setSemesterName(savedSemesterName);
    }

    // Set initial row if empty
    setRows([makeRow(`${baseId}-0`, isSummerMode)]);

    async function loadSemesterSettings() {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data, error } = await supabase
          .from('semester_settings')
          .select('semester_name')
          .eq('id', 1)
          .single();
        if (!error && data?.semester_name) {
          setSemesterName(data.semester_name);
          localStorage.setItem('fsc_semester_name', data.semester_name);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadSemesterSettings();
    setIsLoaded(true);
  }, [baseId]);


  // Save bundles to localStorage whenever they change, but ONLY after initial load
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('fsc_custom_bundles', JSON.stringify(bundles));
    }
  }, [bundles, isLoaded]);


  // Handle outside click to close renaming
  useEffect(() => {
    if (!renamingId) return;
    const handler = () => setRenamingId(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [renamingId]);


  // ── Row management ────────────────────────────────────────────────────────
  function addRow() {
    const id = `${baseId}-${nextIdx}`;
    setNextIdx(n => n + 1);
    setRows(prev => [...prev, makeRow(id, isSummer)]);
    setSaved(false);
  }

  function updateRow(id: string, patch: Partial<CourseRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    setSaved(false);
  }

  function removeRow(id: string) {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
    setSaved(false);
  }

  function handleSave() {
    let hasError = false;
    const validated = rows.map(r => {
      const eb = !r.batch;
      const es = !r.stream;
      const ec = !r.category;
      const esel = !r.selection;
      if (eb || es || ec || esel) hasError = true;
      return { ...r, errorBatch: eb, errorStream: es, errorCategory: ec, errorSelection: esel };
    });
    setRows(validated);
    if (!hasError) {
      setSaved(true);
      setIsMobileClassesExpanded(false);
      setIsDesktopClassesExpanded(false);
    }
  }


  function handleCreateBundle() {
    if (!newBundleName.trim()) return;

    // Check for Default Preferences
    if (localStorage.getItem('fsc_user_config')) {
      setExclusivityError("Wait! You have some Saved Preferences in the Default view. To start building custom bundles, you'll need to clear your default preferences first so we can maintain a clean dashboard for you.");
      return;
    }

    const newBundle: Bundle = {
      id: crypto.randomUUID(),
      name: newBundleName.trim(),
      rows: rows.map(r => ({ ...r, errorBatch: false, errorStream: false, errorCategory: false, errorSelection: false }))
    };
    setBundles(prev => [newBundle, ...prev]);
    setEditingBundleId(newBundle.id);
    setIsSaving(false);
    setNewBundleName('');
  }

  function handleUpdateBundle() {
    if (!editingBundleId) return;
    setBundles(prev => prev.map(b => b.id === editingBundleId ? { ...b, rows: rows.map(r => ({ ...r, errorBatch: false, errorStream: false, errorCategory: false, errorSelection: false })) } : b));
  }

  function handleDeleteBundle(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setBundles(prev => prev.filter(b => b.id !== id));
    if (editingBundleId === id) setEditingBundleId(null);
  }

  function handleRenameBundle(id: string, name: string) {
    setBundles(prev => prev.map(b => b.id === id ? { ...b, name } : b));
    setRenamingId(null);
  }

  function loadBundle(bundle: Bundle, andGenerate: boolean = false) {
    // We map to new IDs to avoid conflicts with current session's baseId
    const base = `loaded-${bundle.id}`;
    const newRows = bundle.rows.map((r, i) => ({
      ...r,
      id: `${base}-${i}`
    }));
    setRows(newRows);
    setEditingBundleId(bundle.id);
    if (andGenerate) {
      setSaved(true);
      setIsMobileClassesExpanded(false);
      setIsDesktopClassesExpanded(false);
    } else {
      setSaved(false);
      setIsMobileClassesExpanded(true);
      setIsDesktopClassesExpanded(true);
    }
  }


  // ── Compute results ──────────────────────────────────────────────────────
  const savedMatches = useMemo(() => {
    if (!saved) return [];
    const seen = new Set<string>();
    const result: TimetableEntry[] = [];
    for (const row of rows) {
      for (const slot of findClasses(row, timetableEntries)) {
        const key = `${slot.day}|${slot.time}|${slot.courseName}|${slot.section}`;
        if (!seen.has(key)) { seen.add(key); result.push(slot); }
      }
    }
    return result; // Order matters less here because groupByDay sorts them
  }, [saved, rows, timetableEntries]);

  const filtered = useMemo(() => {
    if (!query.trim()) return savedMatches;
    const q = query.toLowerCase();
    return savedMatches.filter(e =>
      e.courseName.toLowerCase().includes(q) ||
      e.room.toLowerCase().includes(q) ||
      e.section.toLowerCase().includes(q)
    );
  }, [savedMatches, query]);

  const grouped = useMemo(() => groupByDayTimetable(filtered), [filtered]);
  const conflicts = useMemo(() => detectConflicts(filtered), [filtered]);
  const reorderedGrouped = useMemo(() => {
    const { resolvedSheets, todayISO, todayDayName } = resolvedData;

    const groupedMap = new Map(grouped.map(g => [g.day, g.entries]));
    const result: {
      day: string;
      dayName: string;
      entries: TimetableEntry[];
      isToday: boolean;
      dateStr: string;
      isMakeup: boolean;
    }[] = [];

    resolvedSheets.forEach((s) => {
      const isToday = s.isoDate === todayISO || s.day.toLowerCase() === todayDayName.toLowerCase();
      const entries = groupedMap.get(s.sheetName) || [];

      if (isToday || entries.length > 0) {
        result.push({
          day: s.sheetName,
          dayName: s.day,
          entries,
          isToday,
          dateStr: s.dateStr || '',
          isMakeup: s.isMakeup
        });
      }
    });

    return result;
  }, [grouped, resolvedData]);

  // ── Per-row "not found" hint ─────────────────────────────────────────────
  const rowMatches = useMemo(() =>
    rows.map(r => ({ id: r.id, count: findClasses(r, timetableEntries).length })),
    [rows, timetableEntries]
  );

  const anyError = saved === false && rows.some(r => r.errorBatch || r.errorStream || r.errorCategory || r.errorSelection);

  return (
    <div className="min-h-dvh flex flex-col">

      {/* ── Sticky header ── */}
      <Header rightActions={saved && <TimetableExportButton entries={filtered} />}>
        <div className="flex flex-1 items-center gap-2 md:gap-3 w-full max-w-full min-w-0">
          <button
            onClick={() => router.push('/')}
            aria-label="Back to setup"
            className="w-8 h-8 flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 shrink-0 -ml-2"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M11 4l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-[var(--color-text-primary)]">Custom Timetable</span>
            {currentMonthMakeupDays.length > 0 && (
              <button
                onClick={() => setIsMakeupSidebarOpen(true)}
                className="ml-2 font-mono text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all shrink-0 flex items-center gap-1"
              >
                <span>📅</span> {currentMonthName} Makeup Days
              </button>
            )}
          </div>
        </div>
      </Header>

      <div className="flex flex-1 md:gap-0">

        {/* ── Sidebar (desktop) ── */}
        <aside className="hidden md:flex md:w-[350px] lg:w-[400px] flex-col border-r border-[var(--color-border)] sticky top-14 h-[calc(100dvh-56px)] overflow-y-auto">
          <div className="flex-1 px-5 py-5 flex flex-col gap-4">
            <button
              onClick={() => setIsDesktopClassesExpanded(prev => !prev)}
              aria-expanded={isDesktopClassesExpanded}
              className="w-full flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-raised)] px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2"
            >
              <div className="flex flex-col gap-0.5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
                  Your Classes
                </p>
                <p className="font-mono text-[10px] text-[var(--color-text-secondary)]">
                  {isDesktopClassesExpanded ? 'Tap to collapse' : 'Expand to add courses'}
                </p>
              </div>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`text-[var(--color-text-secondary)] transition-transform duration-200 ${isDesktopClassesExpanded ? 'rotate-0' : 'rotate-180'}`}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isDesktopClassesExpanded && (
              <>
                <div className="flex flex-col gap-3">
                  {rows.map((row, idx) => (
                    <RowEditor
                      key={row.id}
                      row={row}
                      index={idx}
                      matchCount={rowMatches.find(m => m.id === row.id)?.count ?? 0}
                      showMatchHint={saved}
                      onUpdate={patch => updateRow(row.id, patch)}
                      onRemove={() => removeRow(row.id)}
                      canRemove={rows.length > 1}
                      timetableEntries={timetableEntries}
                      summerCatalog={summerCatalog}
                      isSummer={isSummer}
                    />
                  ))}
                </div>

                <button
                  onClick={addRow}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-md border border-dashed border-[var(--color-border-strong)] font-mono text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:border-[var(--color-text-tertiary)] transition-all focus-visible:outline-none"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Add another course
                </button>

                {anyError && (
                  <p className="text-xs text-red-500 font-mono">Fill all highlighted fields first.</p>
                )}
              </>
            )}
          </div>

          <div className="h-px bg-[var(--color-border)] opacity-50 mx-5" />

          {/* Bundles Section */}
          <div className="px-5 py-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
                Saved Sets
              </p>
              <button
                onClick={() => setIsSaving(true)}
                className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                title="Save current as bundle"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              </button>
            </div>

            {bundles.length === 0 ? (
              <p className="font-mono text-[10px] text-[var(--color-text-tertiary)] italic px-1">No bundles yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {bundles.map(bundle => (
                  <BundleCard
                    key={bundle.id}
                    bundle={bundle}
                    isActive={editingBundleId === bundle.id}
                    isFocused={activeBundleId === bundle.id}
                    renamingId={renamingId}
                    tempName={tempName}
                    setTempName={setTempName}
                    onFocus={() => setActiveBundleId(activeBundleId === bundle.id ? null : bundle.id)}
                    onRenameStart={() => {
                      setRenamingId(bundle.id);
                      setTempName(bundle.name);
                    }}
                    onRenameConfirm={() => handleRenameBundle(bundle.id, tempName)}
                    onDelete={(e) => handleDeleteBundle(e, bundle.id)}
                    onLoad={() => loadBundle(bundle, false)}
                    onGenerate={() => loadBundle(bundle, true)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Save + stats */}
          <div className="px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-raised)]/50 flex flex-col gap-2">
            {saved && (
              <p className="font-mono text-xs text-[var(--color-text-tertiary)]">
                {savedMatches.length} class slot{savedMatches.length !== 1 ? 's' : ''} found
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSave}
                className={`h-10 rounded-md font-body text-[10px] sm:text-xs font-medium transition-all active:scale-95 ${saved ? 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border-strong)]' : 'bg-[var(--color-text-primary)] text-[var(--color-bg)]'}`}
              >
                {saved ? 'Update View' : 'Build Timetable'}
              </button>
              
              {editingBundleId ? (
                <button
                  onClick={handleUpdateBundle}
                  className="h-10 rounded-md bg-[var(--accent-cs)] text-white font-body text-[10px] sm:text-xs font-medium hover:opacity-90 active:scale-95 transition-all truncate px-1"
                >
                  Update &quot;{bundles.find(b => b.id === editingBundleId)?.name.split(' ')[0]}...&quot;
                </button>
              ) : (
                <button
                  onClick={() => setIsSaving(true)}
                  className="h-10 rounded-md border border-[var(--color-border-strong)] text-[var(--color-text-primary)] font-body text-[10px] sm:text-xs font-medium hover:bg-[var(--color-bg-subtle)] active:scale-95 transition-all"
                >
                  Save as Bundle
                </button>
              )}
            </div>
            
            {saved && (
              <TimetableExportButton entries={filtered} variant="sidebar" />
            )}
          </div>
        </aside>

        {/* ── Main display area ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Mobile: row editor */}
          <div className="md:hidden border-b border-[var(--color-border)] px-4 py-4 bg-[var(--color-bg)] flex flex-col gap-3">
            <button
              onClick={() => setIsMobileClassesExpanded(prev => !prev)}
              aria-expanded={isMobileClassesExpanded}
              className="w-full flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-raised)] px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2"
            >
              <div className="flex flex-col gap-0.5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
                  Your Classes
                </p>
                <p className="font-mono text-[10px] text-[var(--color-text-secondary)]">
                  {isMobileClassesExpanded ? 'Tap to collapse' : 'Expand to add courses'}
                </p>
              </div>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`text-[var(--color-text-secondary)] transition-transform duration-200 ${isMobileClassesExpanded ? 'rotate-0' : 'rotate-180'}`}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isMobileClassesExpanded && (
              <>
                <div className="flex flex-col gap-3">
                  {rows.map((row, idx) => (
                    <RowEditor
                      key={row.id}
                      row={row}
                      index={idx}
                      matchCount={rowMatches.find(m => m.id === row.id)?.count ?? 0}
                      showMatchHint={saved}
                      onUpdate={patch => updateRow(row.id, patch)}
                      onRemove={() => removeRow(row.id)}
                      canRemove={rows.length > 1}
                      timetableEntries={timetableEntries}
                      summerCatalog={summerCatalog}
                      isSummer={isSummer}
                    />
                  ))}
                </div>

                <button
                  onClick={addRow}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-md border border-dashed border-[var(--color-border-strong)] font-mono text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-all focus-visible:outline-none"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Add another course
                </button>

                {anyError && (
                  <p className="text-xs text-red-500 font-mono mt-1">Fill all highlighted fields first.</p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSave}
                    className="h-11 rounded-md bg-[var(--color-text-primary)] text-[var(--color-bg)] font-body text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2"
                  >
                    {saved ? 'Update View' : 'Build Timetable'}
                  </button>
                  {editingBundleId ? (
                    <button
                      onClick={handleUpdateBundle}
                      className="h-11 rounded-md bg-[var(--accent-cs)] text-white font-body text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                      Update Bundle
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsSaving(true)}
                      className="h-11 rounded-md border border-[var(--color-border-strong)] text-[var(--color-text-primary)] font-body text-sm font-medium hover:bg-[var(--color-bg-subtle)] active:scale-[0.98] transition-all"
                    >
                      Save Bundle
                    </button>
                  )}
                </div>
              </>
            )}

            <div className="mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-raised)] p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
                  Saved Sets
                </p>
                <button
                  onClick={() => setIsSaving(true)}
                  className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                  title="Save current as bundle"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                </button>
              </div>

              {bundles.length === 0 ? (
                <p className="font-mono text-[10px] text-[var(--color-text-tertiary)] italic">No bundles yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {bundles.map(bundle => (
                    <BundleCard
                      key={bundle.id}
                      bundle={bundle}
                      isActive={editingBundleId === bundle.id}
                      isFocused={activeBundleId === bundle.id}
                      renamingId={renamingId}
                      tempName={tempName}
                      setTempName={setTempName}
                      onFocus={() => setActiveBundleId(activeBundleId === bundle.id ? null : bundle.id)}
                      onRenameStart={() => {
                        setRenamingId(bundle.id);
                        setTempName(bundle.name);
                      }}
                      onRenameConfirm={() => handleRenameBundle(bundle.id, tempName)}
                      onDelete={(e) => handleDeleteBundle(e, bundle.id)}
                      onLoad={() => loadBundle(bundle, false)}
                      onGenerate={() => loadBundle(bundle, true)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>


          {/* Search bar */}
          {saved && (
            <div className="sticky top-14 z-10 bg-[var(--color-bg)] px-4 py-3 border-b border-[var(--color-border)]">
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <SearchBar value={query} onChange={setQuery} />
                </div>
                <div className="md:hidden flex gap-1">
                  {(['list', 'grid'] as ViewMode[]).map(v => (
                    <button
                      key={v}
                      onClick={() => setViewMode(v)}
                      aria-pressed={viewMode === v}
                      className="h-9 w-9 rounded border font-mono text-xs font-medium transition-all"
                      style={viewMode === v ? {
                        backgroundColor: 'var(--color-text-primary)',
                        color: 'var(--color-bg)',
                        borderColor: 'transparent',
                      } : {
                        borderColor: 'var(--color-border-strong)',
                        color: 'var(--color-text-secondary)',
                      }}
                      title={v === 'list' ? 'List view' : 'Grid view'}
                    >
                      {v === 'list' ? '☰' : '⊞'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <div id="print-area" className="flex-1 px-4 pb-[150px] bg-[var(--color-bg)]">
            {!saved ? (
              <div className="flex flex-col items-center justify-center text-center py-24 px-6">
                <div className="text-4xl mb-4 select-none">📋</div>
                <p className="font-body text-sm text-[var(--color-text-secondary)] max-w-sm leading-relaxed">
                  Add your class selections, then tap{' '}
                  <strong className="text-[var(--color-text-primary)]">Build Timetable</strong>{' '}
                  to generate your schedule. You can also{' '}
                  <strong className="text-[var(--color-text-primary)]">Save as Bundle</strong>{' '}
                  to keep this set for later.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState query={query} batch="" dept="" message="No classes found for the selected rows." />
            ) : viewMode === 'list' ? (
              <>
                {reorderedGrouped.map(({ day, dayName, entries, isToday, dateStr, isMakeup }) => (
                  <section
                    key={day}
                    className={`mt-6 first:mt-4 transition-all duration-500 ${
                      isToday
                        ? 'p-4 md:p-6 rounded-2xl relative overflow-hidden shadow-2xl ring-1 ring-[var(--color-text-primary)]/5'
                        : ''
                    }`}
                    style={isToday ? {
                      background: 'var(--color-bg-raised)',
                      border: '3px solid transparent',
                      backgroundImage: 'linear-gradient(var(--color-bg-raised), var(--color-bg-raised)), var(--today-border-gradient)',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                    } : {}}
                  >
                    {isToday && (
                      <div
                        className="absolute top-0 right-0 px-4 py-1.5 text-[var(--color-bg)] font-mono text-[10px] font-bold uppercase tracking-[0.2em] rounded-bl-xl shadow-md"
                        style={{ background: 'var(--today-label-bg)' }}
                      >
                        Today
                      </div>
                    )}
                    <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <h2 className={`font-mono tracking-widest ${
                        isToday
                          ? 'text-sm font-black text-[var(--color-text-primary)]'
                          : 'text-[11px] font-bold text-[var(--color-text-tertiary)] uppercase'
                      }`}>
                        {isToday 
                          ? `TODAY (${dayName.toUpperCase()}${isMakeup ? ' (MAKEUP)' : ''}${dateStr ? ` ${dateStr.toUpperCase()}` : ''})` 
                          : `${dayName.toUpperCase()}${isMakeup ? ' (MAKEUP)' : ''}${dateStr ? ` ${dateStr.toUpperCase()}` : ''}`}
                      </h2>
                    </div>
                    {entries.length === 0 ? (
                      <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-bg-subtle)]/10">
                        <p className="text-[var(--color-text-secondary)] font-mono text-sm italic">No classes scheduled for today</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
                        {entries.map((entry, idx) => {
                          const key = `${entry.day}|${entry.time}|${entry.courseName}|${entry.section}`;
                          return (
                            <TimetableCard
                              key={`${key}-${idx}`}
                              entry={entry}
                              dept={entry.department}
                              conflicting={conflicts.has(key)}
                              onClick={() => setSelected(entry)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </section>
                ))}
              </>
            ) : (
              <GridViewCustom groupedDays={reorderedGrouped} conflicts={conflicts} onSelect={setSelected} />
            )}
          </div>
        </div>
      </div>

      {selected && (
        <TimetableDetail
          entry={selected}
          dept={selected.department}
          onClose={() => setSelected(null)}
        />
      )}

      {isSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="font-display text-xl mb-4">Save Course Bundle</h3>
            <p className="text-xs text-[var(--color-text-secondary)] mb-4 leading-relaxed">
              Give this set of courses a name like &quot;Semester 6&quot; or &quot;{semesterName}&quot;. You can load it later with one click.
            </p>
            <input
              autoFocus
              type="text"
              placeholder="e.g. My Schedule"
              value={newBundleName}
              onChange={e => setNewBundleName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateBundle()}
              className="w-full h-11 px-4 mb-4 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-bg)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-cs)]"
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsSaving(false)}
                className="h-11 rounded-md border border-[var(--color-border-strong)] font-body text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBundle}
                disabled={!newBundleName.trim()}
                className="h-11 rounded-md bg-[var(--color-text-primary)] text-[var(--color-bg)] font-body text-sm font-medium disabled:opacity-50 transition-all active:scale-95"
              >
                Save Bundle
              </button>
            </div>
          </div>
        </div>
      )}
      {exclusivityError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[var(--color-bg-raised)]/90 border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-500 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600" />
            
            <div className="mx-auto w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mb-6 ring-1 ring-yellow-500/20">
              <ShieldAlert size={32} className="text-yellow-600 dark:text-yellow-400" />
            </div>

            <h3 className="font-display text-2xl mb-3 text-[var(--color-text-primary)]">Action Required</h3>
            <p className="text-[13px] text-[var(--color-text-secondary)] mb-8 leading-relaxed opacity-90">
              {exclusivityError}
            </p>
            
            <button
              onClick={() => setExclusivityError(null)}
              className="group relative w-full h-12 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] font-body font-bold overflow-hidden transition-all active:scale-[0.98]"
            >
              <span className="relative z-10">Got it</span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      )}

      {/* ── Makeup Days Sidebar ─────────────────────────────────────────── */}
      {isMakeupSidebarOpen && (
        <MakeupDaysSidebar
          onClose={() => setIsMakeupSidebarOpen(false)}
          makeupDays={currentMonthMakeupDays}
          monthName={currentMonthName}
        />
      )}
    </div>

  );
}


const GRID_START = 8 * 60; // 08:00
const GRID_END   = 18.5 * 60; // 18:30
const PX_PER_MIN = 1.35;
const TIME_COL_WIDTH = 56;

function GridViewCustom({
  groupedDays,
  conflicts,
  onSelect,
}: {
  groupedDays: {
    day: string;
    dayName: string;
    entries: TimetableEntry[];
    isToday: boolean;
    dateStr: string;
    isMakeup: boolean;
  }[];
  conflicts: Set<string>;
  onSelect: (e: TimetableEntry) => void;
}) {
  const dayCount = groupedDays.length;
  const gridTemplateColumns = `${TIME_COL_WIDTH}px repeat(${dayCount}, minmax(0, 1fr))`;
  const totalHeight = (GRID_END - GRID_START) * PX_PER_MIN;

  const hours = [];
  for (let m = GRID_START; m <= GRID_END; m += 60) {
    hours.push(m);
  }

  return (
    <div className="mt-8 overflow-x-auto select-none rounded-xl border border-[var(--color-border)] shadow-sm bg-[var(--color-bg-raised)]">
      <div className="w-full min-w-[980px] relative flex flex-col">
        <div
          className="grid sticky top-0 z-20 bg-[var(--color-bg-raised)]/95 backdrop-blur-sm border-b border-[var(--color-border)]"
          style={{ gridTemplateColumns }}
        >
          <div className="h-10 border-r border-[var(--color-border)] sticky left-0 z-30 bg-[var(--color-bg-raised)]" />
          {groupedDays.map(d => {
            const shortDay = d.dayName.slice(0, 3).toUpperCase();
            const label = d.isMakeup ? `${shortDay} (MKP)` : shortDay;
            return (
              <div 
                key={d.day} 
                className={`text-center font-mono text-[10px] uppercase tracking-widest flex flex-col items-center justify-center border-r border-[var(--color-border)] last:border-r-0 py-1 ${
                  d.isToday ? 'bg-[var(--color-text-primary)]/5 font-bold text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'
                }`}
              >
                <span>{label}</span>
                {d.dateStr && <span className="text-[8px] opacity-80 mt-0.5">{d.dateStr}</span>}
              </div>
            );
          })}
        </div>

        <div
          className="relative grid"
          style={{
            height: `${totalHeight}px`,
            gridTemplateColumns,
          }}
        >
          <div className="absolute inset-0 pointer-events-none">
            {hours.map(m => {
              const top = (m - GRID_START) * PX_PER_MIN;
              return (
                <div key={m} className="absolute left-0 right-0 border-t border-[var(--color-border)] opacity-30 flex items-start" style={{ top: `${top}px` }}>
                  <span className="sticky left-1 z-30 font-mono text-[8px] md:text-[9px] -mt-2 text-[var(--color-text-tertiary)] bg-[var(--color-bg-raised)] px-1">
                    {Math.floor(m / 60)}:00
                  </span>
                </div>
              );
            })}

            <div className="absolute inset-0 grid" style={{ gridTemplateColumns }}>
              <div className="border-r border-[var(--color-border)] bg-[var(--color-bg-subtle)]/30 sticky left-0 z-20" />
              {groupedDays.map(d => (
                <div key={d.day} className={`border-r border-[var(--color-border)] last:border-r-0 ${d.isToday ? 'bg-[var(--color-text-primary)]/[0.02]' : ''}`} />
              ))}
            </div>
          </div>

          <div className="col-start-2 relative h-full" style={{ gridColumn: `2 / span ${dayCount}` }}>
            <div className="absolute inset-0 grid h-full" style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}>
              {groupedDays.map((d, dayIdx) => (
                <div key={d.day} className="relative h-full px-0.5 md:px-1">
                  {d.entries.map((e, idx) => {
                    const [start, end] = parseTimeRange(e.time);
                    const top = (start - GRID_START) * PX_PER_MIN;
                    const height = (end - start) * PX_PER_MIN;
                    const key = `${e.day}|${e.time}|${e.courseName}|${e.section}`;
                    const isConflict = conflicts.has(key);
                    const isRepeat = e.category === 'repeat';
                    const accentColor = `var(--accent-${e.department.toLowerCase()})`;
                    const accentBg = `var(--accent-${e.department.toLowerCase()}-bg)`;

                    return (
                      <button
                        key={idx}
                        onClick={() => onSelect(e)}
                        className="absolute left-0.5 right-0.5 md:left-1 md:right-1 rounded-md text-[9px] md:text-[10px] transition-all hover:ring-1 hover:ring-[var(--color-text-tertiary)] active:scale-[0.98] focus-visible:outline-none overflow-hidden text-left flex items-center justify-center"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          background: isConflict
                            ? (isRepeat ? 'repeating-linear-gradient(45deg, #fef2f2, #fef2f2 10px, #fff1f2 10px, #fff1f2 20px)' : '#fef2f2')
                            : (isRepeat
                              ? 'linear-gradient(135deg, var(--color-bg-raised) 50%, color-mix(in srgb, var(--color-bg-raised) 80%, #f59e0b 20%))'
                              : accentBg),
                          color: isConflict ? '#dc2626' : accentColor,
                          borderLeft: isConflict ? '2px solid #f87171' : (isRepeat ? '2px solid #f59e0b' : `2px solid ${accentColor}`),
                          boxShadow: 'var(--shadow-card)',
                          zIndex: isConflict ? 10 : 1,
                        }}
                      >
                        <div className="flex flex-col h-full w-full justify-between gap-1 p-1 md:p-2">
                          <div className="min-w-0">
                            <p className="font-bold leading-tight line-clamp-2 uppercase break-words">{e.courseName}</p>
                            <p className="mt-0.5 opacity-80 font-mono text-[8.5px] whitespace-nowrap overflow-hidden text-ellipsis">{formatTimeRange(e.time)}</p>
                          </div>
                          <p className="font-medium opacity-80 self-end text-[8.5px] truncate max-w-full">{e.room}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── RowEditor sub-component ────────────────────────────────────────────────
interface RowEditorProps {
  row: CourseRow;
  index: number;
  matchCount: number;
  showMatchHint: boolean;
  onUpdate: (patch: Partial<CourseRow>) => void;
  onRemove: () => void;
  canRemove: boolean;
  timetableEntries: TimetableEntry[];
  summerCatalog: SummerCourseCatalogEntry[];
  isSummer: boolean;
}

function RowEditor({ row, index, matchCount, showMatchHint, onUpdate, onRemove, canRemove, timetableEntries, summerCatalog, isSummer }: RowEditorProps) {
  const errorBase = 'border-red-400 ring-1 ring-red-400';
  const normalBase = 'border-[var(--color-border-strong)]';

  const batchesList = useMemo(() => {
    if (isSummer) {
      return availableBatches.filter(b => b === 'Summer');
    }
    return availableBatches.filter(b => b !== 'Summer');
  }, [isSummer]);

  const availableCourses = useMemo(() => {
    if (!row.batch || !row.stream || !row.category) return [];
    const coursesMap = new Map<string, { key: string; label: string }>();
    for (const e of timetableEntries) {
      if (e.batch === row.batch && e.department === row.stream && e.category === row.category) {
        const catalogEntry = findMatchingCatalogEntry(e.courseName, summerCatalog);
        const displayName = catalogEntry?.displayName ?? e.courseName;
        const key = `${e.courseName} | ${e.section}`;
        const label = `${displayName} | ${e.section}`;
        if (!coursesMap.has(key)) {
          coursesMap.set(key, { key, label });
        }
      }
    }
    return Array.from(coursesMap.values())
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [row.batch, row.stream, row.category, timetableEntries, summerCatalog]);

  function handleCourseKeyDown(e: React.KeyboardEvent<HTMLSelectElement>) {
    if (!/^[a-z]$/i.test(e.key)) return;
    const firstLetter = e.key.toLowerCase();
    const match = availableCourses.find(course =>
      course.label.charAt(0).toLowerCase() === firstLetter
    );
    if (!match) return;
    e.preventDefault();
    onUpdate({ selection: match.key, errorSelection: false });
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-raised)] p-3 flex flex-col gap-3">
      {/* Row header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
          Class Selection {index + 1}
        </span>
        <div className="flex items-center gap-2">
          {showMatchHint && (
            <span
              className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={matchCount > 0
                ? { backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }
                : { backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-tertiary)' }
              }
            >
              {matchCount > 0 ? `${matchCount} slot${matchCount !== 1 ? 's' : ''}` : 'not found'}
            </span>
          )}
          {canRemove && (
            <button
              onClick={onRemove}
              aria-label={`Remove course ${index + 1}`}
              className="w-6 h-6 flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-red-500 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {/* Top fields in a row */}
        <div className={`grid ${isSummer ? 'grid-cols-1' : 'grid-cols-3'} gap-2`}>
          {/* Batch */}
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
              Batch
            </label>
            <select
              value={row.batch}
              onChange={e => {
                const val = e.target.value;
                if (val === 'Summer') {
                  onUpdate({ batch: val, stream: 'CS', category: 'regular', selection: '', errorBatch: false, errorStream: false, errorCategory: false, errorSelection: false });
                } else {
                  onUpdate({ batch: val, stream: '', selection: '', errorBatch: false, errorStream: false, errorCategory: false, errorSelection: false });
                }
              }}
              className={`h-9 px-2 rounded-md border text-xs font-mono bg-[var(--color-bg)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-cs)] cursor-pointer ${row.errorBatch ? errorBase : normalBase}`}
              aria-invalid={row.errorBatch}
            >
              {batchesList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Department */}
          {!isSummer && (
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
                Dept
              </label>
              <select
                value={row.stream}
                onChange={e => onUpdate({ stream: e.target.value, selection: '', errorStream: false, errorSelection: false })}
                className={`h-9 px-2 rounded-md border text-xs font-mono bg-[var(--color-bg)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-cs)] cursor-pointer ${row.errorStream ? errorBase : normalBase}`}
                aria-invalid={row.errorStream}
              >
                <option value="" disabled>—</option>
                {TIMETABLE_DEPTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Category */}
          {!isSummer && (
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
                Category
              </label>
              <select
                value={row.category}
                onChange={e => onUpdate({ category: e.target.value, selection: '', errorCategory: false, errorSelection: false })}
                className={`h-9 px-2 rounded-md border text-xs font-mono bg-[var(--color-bg)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-cs)] cursor-pointer ${row.errorCategory ? errorBase : normalBase}`}
                aria-invalid={row.errorCategory}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c === 'regular' ? 'Regular' : 'Repeat'}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Course Selection (Full width below) */}
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
            Course & Section
          </label>
          <select
            value={row.selection}
            onChange={e => onUpdate({ selection: e.target.value, errorSelection: false })}
            onKeyDown={handleCourseKeyDown}
            className={`w-full h-9 px-2 rounded-md border text-xs font-mono bg-[var(--color-bg)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-cs)] cursor-pointer ${row.errorSelection ? errorBase : normalBase}`}
            aria-invalid={row.errorSelection}
            disabled={!row.stream || availableCourses.length === 0}
            title="Type a single letter (A-Z) to jump"
          >
            <option value="" disabled>
              {!row.stream ? 'Select Dept first' : availableCourses.length === 0 ? 'No classes found' : 'Select course & section'}
            </option>
            {availableCourses.map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Inline error hints */}
      {(row.errorBatch || row.errorStream || row.errorCategory || row.errorSelection) && (
        <p className="font-mono text-[10px] text-red-500">
          {[
            row.errorStream && 'Select Dept',
            row.errorSelection && 'Select Course & Section',
          ].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  );
}

export default function CustomTimetablePage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center">
        <p className="font-mono text-sm text-[var(--color-text-tertiary)]">Loading…</p>
      </div>
    }>
      <CustomTimetableInner />
    </Suspense>
  );
}


// ── BundleCard Sub-component ──
interface BundleCardProps {
  bundle: Bundle;
  isActive: boolean;
  isFocused: boolean;
  renamingId: string | null;
  tempName: string;
  setTempName: (s: string) => void;
  onFocus: () => void;
  onRenameStart: () => void;
  onRenameConfirm: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onLoad: () => void;
  onGenerate: () => void;
}

function BundleCard({
  bundle, isActive, isFocused, renamingId, tempName, setTempName,
  onFocus, onRenameStart, onRenameConfirm, onDelete, onLoad, onGenerate
}: BundleCardProps) {
  const isRenaming = renamingId === bundle.id;

  return (
    <div
      onClick={onFocus}
      className={`group relative flex flex-col gap-2 p-3 rounded-lg border transition-all cursor-pointer ${
        isActive
          ? 'bg-[var(--accent-cs)]/5 border-[var(--accent-cs)] shadow-sm'
          : 'bg-[var(--color-bg)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0" onClick={e => isRenaming && e.stopPropagation()}>
          {isRenaming ? (
            <input
              autoFocus
              value={tempName}
              onChange={e => setTempName(e.target.value)}
              onBlur={onRenameConfirm}
              onKeyDown={e => e.key === 'Enter' && onRenameConfirm()}
              className="w-full bg-transparent border-b border-[var(--accent-cs)] font-mono text-xs focus:outline-none text-[var(--color-text-primary)]"
            />
          ) : (
            <div className="flex items-center gap-1.5 group/name">
              <span className={`font-mono text-xs font-medium truncate ${isActive ? 'text-[var(--accent-cs)]' : 'text-[var(--color-text-primary)]'}`}>
                {bundle.name}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onRenameStart(); }}
                className="opacity-0 group-hover/name:opacity-100 p-0.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-all"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
          )}
        </div>
        
        <button
          onClick={onDelete}
          className="shrink-0 p-1 text-[var(--color-text-tertiary)] hover:text-red-500 transition-colors"
          aria-label="Delete bundle"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>

      {isFocused && (
        <div className="grid grid-cols-2 gap-2 mt-1 animate-in slide-in-from-top-1 duration-200">
          <button
            onClick={(e) => { e.stopPropagation(); onLoad(); }}
            className={`h-7 rounded border font-mono text-[9px] uppercase tracking-wider font-bold transition-all ${
              isActive ? 'bg-[var(--accent-cs)] text-white border-transparent' : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border-strong)]'
            }`}
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onGenerate(); }}
            className="h-7 rounded bg-[var(--color-text-primary)] text-[var(--color-bg)] font-mono text-[9px] uppercase tracking-wider font-bold active:scale-95 transition-all"
          >
            Generate
          </button>
        </div>
      )}
    </div>
  );
}
