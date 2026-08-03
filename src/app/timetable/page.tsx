'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, Suspense } from 'react';
import {
  flattenTimetable,
  filterTimetable,
  groupByDayTimetable,
  detectConflicts,
  formatTimeRange,
  parseTimeToMinutes,
  parseTimeRange,
  findMatchingCatalogEntry,
} from '@/lib/timetable-filter';
import { TimetableCard } from '@/components/TimetableCard';
import { TimetableDetail } from '@/components/TimetableDetail';
import { TimetableExportButton } from '@/components/TimetableExportButton';
import { SearchBar } from '@/components/SearchBar';
import { EmptyState } from '@/components/EmptyState';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Header } from '@/components/Header';
import { AlertCircle } from 'lucide-react';
import type { TimetableEntry, RawTimetableJSON, SummerCourseCatalogEntry } from '@/lib/types';
import { DAYS_ORDER } from '@/lib/types';
import { MakeupDaysSidebar } from '@/components/MakeupDaysSidebar';

// eslint-disable-next-line
const timetableRaw: RawTimetableJSON = require('../../../public/data/timetable.json');
const allEntries: TimetableEntry[] = flattenTimetable(timetableRaw);
const timetableDayMeta = timetableRaw.__meta__?.days ?? {};

// ─── Time slots for the grid view ─────────────────────────────────────────────
const GRID_SLOTS = ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '17:00'];
const RESULT_PREFS_STORAGE_KEY = 'fsc_timetable_results_preferences_v1';

type ViewMode = 'list' | 'grid';
type CourseKey = string;

interface TimetableResultPreference {
  sectionByCourse: Record<CourseKey, string>;
  removedCourseKeys: CourseKey[];
}

function isDepartmentMatch(entryDept: string, filterDept: string): boolean {
  if (entryDept === filterDept) return true;
  const depts = entryDept.split('/').map(d => d.trim());
  return depts.includes(filterDept);
}

function normalizeSectionForBatch(batch: string, rawSection: string): string {
  if (batch === '2025') {
    return rawSection.replace(/\d+$/, '');
  }
  return rawSection;
}

function isSelectedSection(batch: string, candidateSection: string, selectedSection: string): boolean {
  return normalizeSectionForBatch(batch, candidateSection) === normalizeSectionForBatch(batch, selectedSection);
}

function makeCourseKey(entry: Pick<TimetableEntry, 'department' | 'category' | 'courseName'>): CourseKey {
  return `${entry.department}|${entry.category}|${entry.courseName}`;
}

function sortSectionNamesAlphabetically(sections: string[]): string[] {
  return [...sections].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function TimetablePageInner() {
  const params  = useSearchParams();
  const router  = useRouter();
  const batch   = params?.get('batch')   ?? '';
  const dept    = params?.get('dept')    ?? 'CS';
  const section = params?.get('section') ?? '';

  const [query,    setQuery]    = useState('');
  const [selected, setSelected] = useState<TimetableEntry | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [includeRepeats, setIncludeRepeats] = useState(false);
  const [manualSectionByCourse, setManualSectionByCourse] = useState<Record<CourseKey, string>>({});
  const [removedCourseKeys, setRemovedCourseKeys] = useState<CourseKey[]>([]);
  const [isOtherCoursesExpanded, setIsOtherCoursesExpanded] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState('');
  const [repeatPromptCourse, setRepeatPromptCourse] = useState<{ key: CourseKey, section: string } | null>(null);
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

  const [entries, setEntries] = useState<TimetableEntry[]>(allEntries);
  const [isSummer, setIsSummer] = useState<boolean>(false);
  const [semesterName, setSemesterName] = useState<string>('Spring 2026');
  const [summerSelections, setSummerSelections] = useState<Record<string, string>>({});
  const [summerCatalog, setSummerCatalog] = useState<SummerCourseCatalogEntry[]>([]);
  const [loadingSummer, setLoadingSummer] = useState<boolean>(false);

  useEffect(() => {
    const savedSemesterName = localStorage.getItem('fsc_semester_name');
    if (savedSemesterName) {
      setSemesterName(savedSemesterName);
    }
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

    const activeSemester = localStorage.getItem('fsc_active_semester');
    if (activeSemester === 'summer') {
      setIsSummer(true);
      const storedSelections = localStorage.getItem('fsc_summer_courses');
      if (storedSelections) setSummerSelections(JSON.parse(storedSelections));
      setLoadingSummer(true);
      fetch('/api/timetable', { cache: 'no-store' })
        .then(res => res.ok ? res.json() : { entries: [], catalog: [] })
        .then(data => {
          setEntries(data.entries ?? []);
          setSummerCatalog(data.catalog ?? []);
          setLoadingSummer(false);
        })
        .catch(err => {
          console.error('Error fetching summer timetable:', err);
          setEntries(allEntries);
          setLoadingSummer(false);
        });
    } else {
      setIsSummer(false);
      setEntries(allEntries);
    }
  }, []);

  const preferenceScopeKey = useMemo(() => `${batch}|${dept}`, [batch, dept]);

  const contextEntries = useMemo(() => {
    return entries.filter(e => {
      if (e.batch !== batch) return false;
      if (!isDepartmentMatch(e.department, dept)) return false;
      return true;
    });
  }, [batch, dept, entries]);

  const defaultEntries = useMemo(() => {
    return filterTimetable(entries, {
      batch,
      department: dept,
      section,
      query: '',
      includeRepeats,
    });
  }, [batch, dept, section, includeRepeats, entries]);

  const defaultSectionByCourse = useMemo(() => {
    const map = new Map<CourseKey, string>();
    for (const entry of defaultEntries) {
      const key = makeCourseKey(entry);
      if (!map.has(key)) {
        map.set(key, entry.section);
      }
    }
    return map;
  }, [defaultEntries]);

  const courseSectionsByKey = useMemo(() => {
    const map = new Map<CourseKey, Set<string>>();
    for (const entry of contextEntries) {
      const key = makeCourseKey(entry);
      if (!map.has(key)) map.set(key, new Set<string>());
      map.get(key)!.add(entry.section);
    }
    return map;
  }, [contextEntries]);

  const courseSectionsListByKey = useMemo(() => {
    const map = new Map<CourseKey, string[]>();
    for (const [key, sectionSet] of courseSectionsByKey.entries()) {
      map.set(key, sortSectionNamesAlphabetically([...sectionSet]));
    }
    return map;
  }, [courseSectionsByKey]);

  const cleanedManualSectionByCourse = useMemo(() => {
    const next: Record<CourseKey, string> = {};
    for (const [courseKey, targetSection] of Object.entries(manualSectionByCourse)) {
      const options = courseSectionsListByKey.get(courseKey) ?? [];
      if (options.includes(targetSection)) {
        next[courseKey] = targetSection;
      }
    }
    return next;
  }, [manualSectionByCourse, courseSectionsListByKey]);

  const cleanedRemovedCourseKeys = useMemo(
    () => removedCourseKeys.filter(courseKey => courseSectionsByKey.has(courseKey)),
    [removedCourseKeys, courseSectionsByKey]
  );

  const removedSet = useMemo(() => new Set(cleanedRemovedCourseKeys), [cleanedRemovedCourseKeys]);

  useEffect(() => {
    let loaded: TimetableResultPreference | null = null;
    try {
      const raw = localStorage.getItem(RESULT_PREFS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, TimetableResultPreference>;
        loaded = parsed[preferenceScopeKey] ?? null;
      }
    } catch (err) {
      console.error('Failed to parse timetable result preferences', err);
    }

    setManualSectionByCourse(loaded?.sectionByCourse ?? {});
    setRemovedCourseKeys(loaded?.removedCourseKeys ?? []);
    setSaveFeedback('');
  }, [preferenceScopeKey]);

  const persistResultPreferences = () => {
    try {
      const raw = localStorage.getItem(RESULT_PREFS_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, TimetableResultPreference>) : {};

      parsed[preferenceScopeKey] = {
        sectionByCourse: cleanedManualSectionByCourse,
        removedCourseKeys: cleanedRemovedCourseKeys,
      };

      localStorage.setItem(RESULT_PREFS_STORAGE_KEY, JSON.stringify(parsed));
      setSaveFeedback('Preferences saved');
    } catch (err) {
      console.error('Failed to save timetable result preferences', err);
      setSaveFeedback('Save failed');
    }
  };

  const effectiveSectionByCourse = useMemo(() => {
    const map = new Map<CourseKey, string>();

    for (const [courseKey, defaultSection] of defaultSectionByCourse.entries()) {
      map.set(courseKey, defaultSection);
    }

    for (const [courseKey, manualSection] of Object.entries(cleanedManualSectionByCourse)) {
      map.set(courseKey, manualSection);
    }

    return map;
  }, [defaultSectionByCourse, cleanedManualSectionByCourse]);

  const filtered = useMemo(() => {
    if (isSummer) {
      const result = entries.filter(e => {
        const isCatalogEmpty = summerCatalog.length === 0;
        const catalogEntry = findMatchingCatalogEntry(e.courseName, summerCatalog);

        // Whitelist logic: If catalog is configured, must match a visible (non-hidden) course
        if (!isCatalogEmpty) {
          if (!catalogEntry || catalogEntry.hidden) return false;
        } else {
          if (catalogEntry && catalogEntry.hidden) return false;
        }

        // Resolve canonical name for looking up user selections
        const canonicalName = catalogEntry ? catalogEntry.sheetName : e.courseName;

        // summerSelections keys are course sheetNames; values are the chosen section
        if (!summerSelections[canonicalName]) return false;
        const selectedSection = summerSelections[canonicalName];
        // If the entry or selection has no section, show it
        if (!e.section || !selectedSection) return true;
        return e.section === selectedSection;
      });
      const q = query.toLowerCase().trim();
      if (!q) return result;
      return result.filter(e =>
        e.courseName.toLowerCase().includes(q) ||
        e.room.toLowerCase().includes(q) ||
        e.section.toLowerCase().includes(q)
      );
    }

    const activeCourseKeys = new Set<CourseKey>([
      ...defaultSectionByCourse.keys(),
      ...Object.keys(cleanedManualSectionByCourse),
    ]);

    const result: TimetableEntry[] = [];
    const seen = new Set<string>();

    for (const courseKey of activeCourseKeys) {
      if (removedSet.has(courseKey)) continue;

      // If it's a repeat course and master toggle is off, skip it
      if (courseKey.includes('|repeat|') && !includeRepeats) continue;

      const activeSection = effectiveSectionByCourse.get(courseKey);
      if (activeSection === undefined) continue;

      for (const entry of contextEntries) {
        if (makeCourseKey(entry) !== courseKey) continue;
        if (entry.section !== activeSection) continue;

        const uniqueSlotKey = `${entry.day}|${entry.time}|${entry.courseName}|${entry.section}|${entry.category}`;
        if (!seen.has(uniqueSlotKey)) {
          seen.add(uniqueSlotKey);
          result.push(entry);
        }
      }
    }

    const q = query.toLowerCase().trim();
    if (!q) return result;

    return result.filter(e =>
      e.courseName.toLowerCase().includes(q) ||
      e.room.toLowerCase().includes(q) ||
      e.section.toLowerCase().includes(q)
    );
  }, [
    isSummer,
    entries,
    summerSelections,
    summerCatalog,
    cleanedManualSectionByCourse,
    contextEntries,
    defaultSectionByCourse,
    effectiveSectionByCourse,
    includeRepeats,
    query,
    removedSet,
  ]);

  const selectedOtherCount = useMemo(() => {
    let count = 0;
    for (const [courseKey, sectionChoice] of effectiveSectionByCourse.entries()) {
      if (removedSet.has(courseKey)) continue;
      const defaultSection = defaultSectionByCourse.get(courseKey);
      if (!defaultSection || defaultSection !== sectionChoice) {
        count += 1;
      }
    }
    return count;
  }, [effectiveSectionByCourse, removedSet, defaultSectionByCourse]);

  const updateCourseSection = (courseKey: CourseKey, nextSection: string) => {
    setRemovedCourseKeys(prev => prev.filter(key => key !== courseKey));
    setManualSectionByCourse(prev => {
      const defaultSection = defaultSectionByCourse.get(courseKey);
      if (defaultSection && defaultSection === nextSection) {
        const next = { ...prev };
        delete next[courseKey];
        return next;
      }
      return { ...prev, [courseKey]: nextSection };
    });
  };

  const removeCourseByKey = (courseKey: CourseKey) => {
    setRemovedCourseKeys(prev => (prev.includes(courseKey) ? prev : [...prev, courseKey]));
    setManualSectionByCourse(prev => {
      if (!(courseKey in prev)) return prev;
      const next = { ...prev };
      delete next[courseKey];
      return next;
    });
  };

  // Summer-specific: remove a course by its name from summerSelections
  const removeSummerCourse = (courseName: string) => {
    const catalogEntry = findMatchingCatalogEntry(courseName, summerCatalog);
    const key = catalogEntry ? catalogEntry.sheetName : courseName;
    setSummerSelections(prev => {
      const next = { ...prev };
      delete next[key];
      localStorage.setItem('fsc_summer_courses', JSON.stringify(next));
      return next;
    });
  };

  // Summer-specific: update section for a course in summerSelections
  const updateSummerCourseSection = (courseName: string, section: string) => {
    const catalogEntry = findMatchingCatalogEntry(courseName, summerCatalog);
    const key = catalogEntry ? catalogEntry.sheetName : courseName;
    setSummerSelections(prev => {
      const next = { ...prev, [key]: section };
      localStorage.setItem('fsc_summer_courses', JSON.stringify(next));
      return next;
    });
  };


  const toggleOtherCourse = (courseKey: CourseKey, targetSection: string) => {
    // If it's a repeat course and master toggle is off, show the prompt
    if (courseKey.includes('|repeat|') && !includeRepeats) {
      setRepeatPromptCourse({ key: courseKey, section: targetSection });
      return;
    }

    setRemovedCourseKeys(prev => prev.filter(key => key !== courseKey));

    setManualSectionByCourse(prev => {
      const defaultSection = defaultSectionByCourse.get(courseKey);

      if (defaultSection !== undefined) {
        if (defaultSection === targetSection) {
          const next = { ...prev };
          delete next[courseKey];
          return next;
        }
        return { ...prev, [courseKey]: targetSection };
      }

      if (prev[courseKey] === targetSection) {
        const next = { ...prev };
        delete next[courseKey];
        return next;
      }

      return { ...prev, [courseKey]: targetSection };
    });
  };

  const electiveGroups = useMemo(() => {
    if (batch !== '2022') return null;
    
    const electives = contextEntries.filter(e => 
      e.batch === batch && 
      e.department === dept && 
      (e.isElective || e.category === 'repeat')
    );

    const g1 = new Map<string, { section: string, department: string, courseKey: CourseKey }[]>();
    const g2 = new Map<string, { section: string, department: string, courseKey: CourseKey }[]>();
    const g3 = new Map<string, { section: string, department: string, courseKey: CourseKey }[]>();
    const others = new Map<string, { section: string, department: string, courseKey: CourseKey }[]>();

    electives.forEach(e => {
      // Logic: Repeats always go to 'others' for 2022. 
      // Regular electives follow their group metadata (normalized to G-I, G-II, G-III).
      const group = e.category === 'repeat' ? null : e.electiveGroup;
      const isG1 = group === 'G-I';
      const isG2 = group === 'G-II';
      const isG3 = group === 'G-III';
      
      const map = isG1 ? g1 : isG2 ? g2 : isG3 ? g3 : others;
      
      if (!map.has(e.courseName)) map.set(e.courseName, []);
      if (!map.get(e.courseName)!.some(item => item.section === e.section && item.department === e.department)) {
         map.get(e.courseName)!.push({ section: e.section, department: e.department, courseKey: makeCourseKey(e) });
      }
    });

    for (const map of [g1, g2, g3, others]) {
      for (const [courseName, items] of map.entries()) {
        map.set(
          courseName,
          [...items].sort((a, b) =>
            a.section.localeCompare(b.section, undefined, { sensitivity: 'base' })
          )
        );
      }
    }
    
    return { g1, g2, g3, others };
  }, [batch, dept, contextEntries]);

  const otherCourseGroups = useMemo(() => {
    if (batch === '2022') return [];

    // Filter electives and repeats for non-2022 batches
    const electives = contextEntries.filter(e => 
      e.batch === batch && 
      e.department === dept && 
      (e.isElective || e.category === 'repeat')
    );

    const groups = new Map<CourseKey, {
      courseName: string;
      department: string;
      category: 'regular' | 'repeat';
      sections: Set<string>;
    }>();

    electives.forEach(entry => {
      const courseKey = makeCourseKey(entry);
      if (!groups.has(courseKey)) {
        groups.set(courseKey, {
          courseName: entry.courseName,
          department: entry.department,
          category: entry.category,
          sections: new Set<string>(),
        });
      }
      groups.get(courseKey)!.sections.add(entry.section);
    });

    return [...groups.entries()]
      .map(([courseKey, value]) => ({
        courseKey,
        courseName: value.courseName,
        department: value.department,
        category: value.category,
        sections: sortSectionNamesAlphabetically([...value.sections]),
      }))
      .sort((a, b) => a.courseName.localeCompare(b.courseName));
  }, [batch, dept, contextEntries]);

  // Handle Master Toggle: When turned off, clear all selected repeat courses
  const handleToggleRepeats = (enabled: boolean) => {
    setIncludeRepeats(enabled);
    if (!enabled) {
      setManualSectionByCourse(prev => {
        const next = { ...prev };
        let changed = false;
        for (const key of Object.keys(next)) {
          // Keys are "Dept|Category|CourseName"
          if (key.includes('|repeat|')) {
            delete next[key];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  };

  const grouped  = useMemo(() => groupByDayTimetable(filtered), [filtered]);
  const conflicts = useMemo(() => detectConflicts(filtered, includeRepeats), [filtered, includeRepeats]);

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

  const handleEnableRepeatsFromPrompt = () => {
    if (repeatPromptCourse) {
      handleToggleRepeats(true);
      setRemovedCourseKeys(prev => prev.filter(key => key !== repeatPromptCourse.key));
      setManualSectionByCourse(prev => ({
        ...prev,
        [repeatPromptCourse.key]: repeatPromptCourse.section
      }));
      setRepeatPromptCourse(null);
    }
  };

  const accentColor = `var(--accent-${dept.toLowerCase()})`;
  const accentBg    = `var(--accent-${dept.toLowerCase()}-bg)`;

  /** Resolve alias: returns displayName if set in catalog, otherwise raw sheetName */
  const summerDisplayName = (sheetName: string): string => {
    if (!isSummer || summerCatalog.length === 0) return sheetName;
    const entry = findMatchingCatalogEntry(sheetName, summerCatalog);
    return entry?.displayName ?? sheetName;
  };

  return (
    <div className="min-h-dvh flex flex-col">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <Header rightActions={<TimetableExportButton entries={filtered} isSummer={isSummer} />}>
        <div className="flex flex-1 items-center gap-2 md:gap-3 w-full max-w-full min-w-0">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="w-8 h-8 flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 shrink-0 -ml-2"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M11 4l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span
              className="font-mono text-sm font-medium px-2 py-0.5 rounded shrink-0"
              style={{
                backgroundColor: isSummer ? 'var(--accent-cs-bg)' : accentBg,
                color: isSummer ? 'var(--accent-cs)' : accentColor
              }}
            >
              {isSummer ? 'SUMMER' : dept}
            </span>
            <span className="font-mono text-sm text-[var(--color-text-secondary)] truncate">
              {isSummer ? semesterName : `Batch ${batch} · Section ${section}`}
            </span>
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


      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 md:gap-0">

        {/* ── Desktop Sidebar ───────────────────────────────────────────── */}
        <aside className="hidden md:flex md:w-56 lg:w-64 flex-col gap-4 p-6 border-r border-[var(--color-border)] sticky top-14 h-[calc(100dvh-56px)] overflow-y-auto">
          {isSummer ? (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-1">Semester</p>
              <p className="font-mono text-sm font-medium">{semesterName}</p>
            </div>
          ) : (
            <>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-1">Batch</p>
                <p className="font-mono text-sm font-medium">{batch}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-1">Department</p>
                <p className="font-mono text-sm font-medium" style={{ color: accentColor }}>{dept}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-1">Section</p>
                <p className="font-mono text-sm font-medium">{section}</p>
              </div>
            </>
          )}
          <div className="h-px bg-[var(--color-border)]" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-1">Found</p>
            <p className="font-mono text-2xl font-medium">{filtered.length}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">class slot{filtered.length !== 1 ? 's' : ''}</p>
          </div>

          {/* View toggle */}
          <div className="h-px bg-[var(--color-border)]" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2">View</p>
            <div className="grid grid-cols-2 gap-1">
              {(['list', 'grid'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  id={`view-${v}`}
                  onClick={() => setViewMode(v)}
                  aria-pressed={viewMode === v}
                  className="h-8 rounded border font-mono text-xs font-medium transition-all duration-150 focus-visible:outline-none"
                  style={viewMode === v ? {
                    backgroundColor: 'var(--color-text-primary)',
                    color: 'var(--color-bg)',
                    borderColor: 'transparent',
                  } : {
                    borderColor: 'var(--color-border-strong)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {v === 'list' ? 'List' : 'Grid'}
                </button>
              ))}
            </div>
          </div>

          {/* Include Repeats toggle */}
          {!isSummer && (
            <>
              <div className="h-px bg-[var(--color-border)]" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2">Repeat Courses</p>
                <button
                  id="sidebar-repeats-toggle"
                  role="switch"
                  aria-checked={includeRepeats}
                  onClick={() => handleToggleRepeats(!includeRepeats)}
                  className="flex items-center justify-between w-full h-8 px-3 rounded border font-mono text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2"
                  style={includeRepeats ? {
                    backgroundColor: 'var(--color-text-primary)',
                    color: 'var(--color-bg)',
                    borderColor: 'transparent',
                  } : {
                    borderColor: 'var(--color-border-strong)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <span>{includeRepeats ? 'Included' : 'Excluded'}</span>
                  <span className="opacity-60 text-[10px]">{includeRepeats ? '●' : '○'}</span>
                </button>
              </div>
            </>
          )}

          <div className="mt-auto flex flex-col gap-2">
            {!isSummer && (
              <>
                <button
                  onClick={persistResultPreferences}
                  className="h-9 rounded border border-[var(--color-border-strong)] font-mono text-[10px] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
                >
                  Save Preferences
                </button>
                {saveFeedback && (
                  <p className="font-mono text-[10px] text-[var(--color-text-tertiary)]">{saveFeedback}</p>
                )}
              </>
            )}
            <button
              onClick={() => router.push('/')}
              className="text-xs text-[var(--color-text-secondary)] underline underline-offset-2 text-left hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2"
            >
              {isSummer ? 'Change courses' : 'Change filters'}
            </button>
            <TimetableExportButton entries={filtered} variant="sidebar" isSummer={isSummer} />
          </div>
        </aside>

        {/* ── List / Grid area ──────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Search + view toggle (mobile) */}
          <div className="sticky top-14 z-10 bg-[var(--color-bg)] px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <SearchBar value={query} onChange={setQuery} />
              </div>
              {/* Include Repeats — mobile inline toggle */}
              <button
                id="mobile-repeats-toggle"
                role="switch"
                aria-checked={includeRepeats}
                onClick={() => handleToggleRepeats(!includeRepeats)}
                title={includeRepeats ? 'Exclude repeat courses' : 'Include repeat courses'}
                className="h-9 px-2.5 rounded border font-mono text-[10px] font-medium transition-all shrink-0 focus-visible:outline-none"
                style={includeRepeats ? {
                  backgroundColor: 'var(--color-text-primary)',
                  color: 'var(--color-bg)',
                  borderColor: 'transparent',
                } : {
                  borderColor: 'var(--color-border-strong)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Repeats
              </button>
              {/* View toggle — mobile only */}
              <div className="md:hidden flex gap-1">
                {(['list', 'grid'] as ViewMode[]).map(v => (
                  <button
                    key={v}
                    id={`mobile-view-${v}`}
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
            <div className="mt-2 md:hidden flex items-center gap-2">
              <button
                onClick={persistResultPreferences}
                className="h-8 px-3 rounded border border-[var(--color-border-strong)] font-mono text-[10px] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
              >
                Save Preferences
              </button>
              {saveFeedback && (
                <span className="font-mono text-[10px] text-[var(--color-text-tertiary)]">{saveFeedback}</span>
              )}
            </div>
          </div>

          {/* Other Courses UI */}
          {!isSummer && batch === '2022' && electiveGroups && (
            <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]/30">
              <button
                onClick={() => setIsOtherCoursesExpanded(!isOtherCoursesExpanded)}
                className="w-full flex items-center justify-between px-4 py-4 focus-visible:outline-none focus-visible:bg-[var(--color-bg-raised)] transition-colors hover:bg-[var(--color-bg-raised)]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center border border-blue-500/20">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                    </svg>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm md:text-base text-blue-600 dark:text-blue-400 font-bold uppercase tracking-[0.3em]">Electives / Others</span>
                    {selectedOtherCount > 0 && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-text-primary)] text-[var(--color-bg)]">
                        {selectedOtherCount} selected
                      </span>
                    )}
                  </div>
                </div>
                <svg
                  width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-[var(--color-text-secondary)] transition-transform duration-200 ${isOtherCoursesExpanded ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              
              {isOtherCoursesExpanded && (
                <div className="px-4 pb-6 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* G-I Column */}
                <div>
                  <h3 className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-tertiary)] mb-3">Group I (G-I)</h3>
                  <div className="flex flex-col gap-4">
                    {Array.from(electiveGroups.g1.entries()).map(([courseName, items]) => (
                      <div key={courseName} className="relative overflow-hidden border border-[var(--color-border)] rounded-md p-3 pl-5 bg-[var(--color-bg-raised)]">
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-0 bottom-0 w-[4px] opacity-80"
                          style={{ backgroundColor: `var(--accent-${items[0].department.toLowerCase()})` }}
                        />
                        <p className="font-bold text-sm mb-2">{courseName}</p>
                        <div className="flex flex-wrap gap-2">
                          {items.map(item => {
                            const isSelected = effectiveSectionByCourse.get(item.courseKey) === item.section && !removedSet.has(item.courseKey);
                            return (
                              <button 
                                key={`${item.courseKey}-${item.section}`}
                                onClick={() => toggleOtherCourse(item.courseKey, item.section)}
                                className={`px-2 py-1 rounded text-xs font-mono transition-colors border ${
                                  isSelected 
                                    ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] border-transparent' 
                                    : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-border)]'
                                }`}
                              >
                                {item.section}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    {electiveGroups.g1.size === 0 && <p className="font-mono text-[10px] text-[var(--color-text-tertiary)] italic">None</p>}
                  </div>
                </div>
                
                {/* G-II Column */}
                <div>
                  <h3 className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-tertiary)] mb-3">Group II (G-II)</h3>
                  <div className="flex flex-col gap-4">
                    {Array.from(electiveGroups.g2.entries()).map(([courseName, items]) => (
                      <div key={courseName} className="relative overflow-hidden border border-[var(--color-border)] rounded-md p-3 pl-5 bg-[var(--color-bg-raised)]">
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-0 bottom-0 w-[4px] opacity-80"
                          style={{ backgroundColor: `var(--accent-${items[0].department.toLowerCase()})` }}
                        />
                        <p className="font-bold text-sm mb-2">{courseName}</p>
                        <div className="flex flex-wrap gap-2">
                          {items.map(item => {
                            const isSelected = effectiveSectionByCourse.get(item.courseKey) === item.section && !removedSet.has(item.courseKey);
                            return (
                              <button 
                                key={`${item.courseKey}-${item.section}`}
                                onClick={() => toggleOtherCourse(item.courseKey, item.section)}
                                className={`px-2 py-1 rounded text-xs font-mono transition-colors border ${
                                  isSelected 
                                    ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] border-transparent' 
                                    : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-border)]'
                                }`}
                              >
                                {item.section}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    {electiveGroups.g2.size === 0 && <p className="font-mono text-[10px] text-[var(--color-text-tertiary)] italic">None</p>}
                  </div>
                </div>
                
                {/* G-III Column */}
                <div>
                  <h3 className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-tertiary)] mb-3">Group III (G-III)</h3>
                  <div className="flex flex-col gap-4">
                    {Array.from(electiveGroups.g3.entries()).map(([courseName, items]) => (
                      <div key={courseName} className="relative overflow-hidden border border-[var(--color-border)] rounded-md p-3 pl-5 bg-[var(--color-bg-raised)]">
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-0 bottom-0 w-[4px] opacity-80"
                          style={{ backgroundColor: `var(--accent-${items[0].department.toLowerCase()})` }}
                        />
                        <p className="font-bold text-sm mb-2">{courseName}</p>
                        <div className="flex flex-wrap gap-2">
                          {items.map(item => {
                            const isSelected = effectiveSectionByCourse.get(item.courseKey) === item.section && !removedSet.has(item.courseKey);
                            return (
                              <button 
                                key={`${item.courseKey}-${item.section}`}
                                onClick={() => toggleOtherCourse(item.courseKey, item.section)}
                                className={`px-2 py-1 rounded text-xs font-mono transition-colors border ${
                                  isSelected 
                                    ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] border-transparent' 
                                    : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-border)]'
                                }`}
                              >
                                {item.section}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    {electiveGroups.g3.size === 0 && <p className="font-mono text-[10px] text-[var(--color-text-tertiary)] italic">None</p>}
                  </div>
                </div>

                {/* Others Column */}
                <div>
                  <h3 className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-tertiary)] mb-3">Others</h3>
                  <div className="flex flex-col gap-4">
                    {Array.from(electiveGroups.others.entries()).map(([courseName, items]) => (
                      <div key={courseName} className="relative overflow-hidden border border-[var(--color-border)] rounded-md p-3 pl-5 bg-[var(--color-bg-raised)]">
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-0 bottom-0 w-[4px] opacity-80"
                          style={{ backgroundColor: `var(--accent-${items[0].department.toLowerCase()})` }}
                        />
                        <p className="font-bold text-sm mb-2">{courseName}</p>
                        <div className="flex flex-wrap gap-2">
                          {items.map(item => {
                            const isSelected = effectiveSectionByCourse.get(item.courseKey) === item.section && !removedSet.has(item.courseKey);
                            return (
                              <button 
                                key={`${item.courseKey}-${item.section}`}
                                onClick={() => toggleOtherCourse(item.courseKey, item.section)}
                                className={`px-2 py-1 rounded text-xs font-mono transition-colors border ${
                                  isSelected 
                                    ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] border-transparent' 
                                    : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-border)]'
                                }`}
                              >
                                {item.section}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    {electiveGroups.others.size === 0 && <p className="font-mono text-[10px] text-[var(--color-text-tertiary)] italic">None</p>}
                  </div>
                </div>
              </div></div>
              )}
            </div>
          )}

          {batch !== '2022' && (
            <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]/30">
              <button
                onClick={() => setIsOtherCoursesExpanded(!isOtherCoursesExpanded)}
                className="w-full flex items-center justify-between px-4 py-4 focus-visible:outline-none focus-visible:bg-[var(--color-bg-raised)] transition-colors hover:bg-[var(--color-bg-raised)]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center border border-blue-500/20">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                    </svg>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm md:text-base text-blue-600 dark:text-blue-400 font-bold uppercase tracking-[0.3em]">Electives / Others</span>
                    {selectedOtherCount > 0 && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-text-primary)] text-[var(--color-bg)]">
                        {selectedOtherCount} selected
                      </span>
                    )}
                  </div>
                </div>
                <svg
                  width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-[var(--color-text-secondary)] transition-transform duration-200 ${isOtherCoursesExpanded ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isOtherCoursesExpanded && (
                <div className="px-4 pb-6 pt-2">
                  {otherCourseGroups.length === 0 ? (
                    <p className="font-mono text-xs text-[var(--color-text-tertiary)]">No electives found for this batch/department.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {otherCourseGroups.map(group => (
                        <div key={group.courseKey} className="relative overflow-hidden border border-[var(--color-border)] rounded-md p-3 pl-5 bg-[var(--color-bg-raised)]">
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-0 bottom-0 w-[4px] opacity-80"
                            style={{ backgroundColor: `var(--accent-${group.department.toLowerCase()})` }}
                          />
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="font-body text-sm font-medium text-[var(--color-text-primary)] leading-snug">{group.courseName}</p>
                            {group.category === 'repeat' && (
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">Repeat</span>
                            )}
                          </div>
                          <p className="font-mono text-[10px] text-[var(--color-text-tertiary)] mb-2">{group.department}</p>
                          <div className="flex flex-wrap gap-2">
                            {group.sections.map(sectionOption => {
                              const isSelected = effectiveSectionByCourse.get(group.courseKey) === sectionOption && !removedSet.has(group.courseKey);
                              return (
                                <button
                                  key={`${group.courseKey}-${sectionOption}`}
                                  onClick={() => toggleOtherCourse(group.courseKey, sectionOption)}
                                  className={`px-2 py-1 rounded text-xs font-mono transition-colors border ${
                                    isSelected
                                      ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] border-transparent'
                                      : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-border)]'
                                  }`}
                                >
                                  {sectionOption || 'Unspecified'}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Result count (mobile) */}
          <p className="md:hidden px-4 pt-3 pb-1 font-mono text-xs text-[var(--color-text-tertiary)]">
            {filtered.length} class slot{filtered.length !== 1 ? 's' : ''} found
          </p>

          {/* Repeat Prompt Modal */}
          {repeatPromptCourse && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-400">
                  <AlertCircle size={24} />
                  <h3 className="font-display text-xl font-bold">Repeat Courses Disabled</h3>
                </div>
                <p className="font-body text-sm text-[var(--color-text-secondary)] mb-6 leading-relaxed">
                  To import this course, you need to enable the <strong>&quot;Include Repeat Courses&quot;</strong> master toggle at the top of the page.
                </p>                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleEnableRepeatsFromPrompt}
                    className="h-12 w-full rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] font-body font-bold hover:opacity-90 transition-all active:scale-[0.98]"
                  >
                    Enable Repeats Now
                  </button>
                  <button
                    onClick={() => setRepeatPromptCourse(null)}
                    className="h-12 w-full rounded-xl border border-[var(--color-border-strong)] text-[var(--color-text-primary)] font-body font-medium hover:bg-[var(--color-bg-subtle)] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Content area */}
          <div id="print-area" className="flex-1 px-4 pb-[150px] bg-[var(--color-bg)]">
            {filtered.length === 0 ? (
              <EmptyState
                query={query}
                batch={batch}
                dept={dept}
                message={
                  query
                    ? `No classes matching "${query}" for ${dept} Section ${section}, Batch ${batch}.`
                    : allEntries.length === 0
                      ? 'No timetable data yet. Run the Python script and place the output in public/data/timetable.json.'
                      : `No timetable found for ${dept} Section ${section}, Batch ${batch}. The timetable may not yet be available.`
                }
              />
            ) : viewMode === 'list' ? (
              <ListView
                grouped={reorderedGrouped}
                dept={isSummer ? 'cs' : dept}
                conflicts={conflicts}
                onSelect={setSelected}
                onRemoveCourse={isSummer
                  ? (entry: TimetableEntry) => removeSummerCourse(entry.courseName)
                  : (entry: TimetableEntry) => removeCourseByKey(makeCourseKey(entry))}
                onChangeCourseSection={isSummer
                  ? (entry: TimetableEntry, nextSection: string) => updateSummerCourseSection(entry.courseName, nextSection)
                  : (entry: TimetableEntry, nextSection: string) => updateCourseSection(makeCourseKey(entry), nextSection)}
                getAvailableSections={isSummer
                  ? (entry: TimetableEntry) => {
                      // Build sections list from all entries for this course
                      const secs = [...new Set(entries.filter(e => e.courseName === entry.courseName && e.section).map(e => e.section))].filter(Boolean);
                      return secs.length > 0 ? secs : [];
                    }
                  : (entry: TimetableEntry) => courseSectionsListByKey.get(makeCourseKey(entry)) ?? []}
                resolveDisplayName={summerDisplayName}
              />
            ) : (
              <GridView groupedDays={reorderedGrouped} dept={dept} conflicts={conflicts} onSelect={setSelected} resolveDisplayName={summerDisplayName} />
            )}
          </div>
        </div>
      </div>

      {/* ── Detail panel ────────────────────────────────────────────────── */}
      {selected && (
        <TimetableDetail
          entry={selected}
          dept={dept}
          onClose={() => setSelected(null)}
          isSummer={isSummer}
          displayName={summerDisplayName(selected.courseName)}
        />
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

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({
  grouped,
  dept,
  conflicts,
  onSelect,
  onRemoveCourse,
  onChangeCourseSection,
  getAvailableSections,
  resolveDisplayName,
}: {
  grouped: {
    day: string;
    dayName: string;
    entries: TimetableEntry[];
    isToday: boolean;
    dateStr: string;
    isMakeup: boolean;
  }[];
  dept: string;
  conflicts: Set<string>;
  onSelect: (e: TimetableEntry) => void;
  onRemoveCourse: (e: TimetableEntry) => void;
  onChangeCourseSection: (e: TimetableEntry, section: string) => void;
  getAvailableSections: (e: TimetableEntry) => string[];
  resolveDisplayName?: (courseName: string) => string;
}) {
  return (
    <>
      {grouped.map(({ day, dayName, entries, isToday, dateStr, isMakeup }) => (
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

          <div className="mb-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
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
                    dept={dept}
                    conflicting={conflicts.has(key)}
                    isRepeat={entry.category === 'repeat'}
                    onClick={() => onSelect(entry)}
                    onRemove={() => onRemoveCourse(entry)}
                    onChangeSection={(nextSection) => onChangeCourseSection(entry, nextSection)}
                    availableSections={getAvailableSections(entry)}
                    displayName={resolveDisplayName ? resolveDisplayName(entry.courseName) : undefined}
                  />
                );
              })}
            </div>
          )}
        </section>
      ))}
    </>
  );
}

// ─── Grid View ────────────────────────────────────────────────────────────────

const GRID_START = 8 * 60; // 08:00
const GRID_END   = 18.5 * 60; // 18:30 (last slot ends at 17:00 + 90min)
const PX_PER_MIN = 1.35;
const TIME_COL_WIDTH = 56;

function GridView({
  groupedDays,
  dept,
  conflicts,
  onSelect,
  resolveDisplayName,
}: {
  groupedDays: {
    day: string;
    dayName: string;
    entries: TimetableEntry[];
    isToday: boolean;
    dateStr: string;
    isMakeup: boolean;
  }[];
  dept: string;
  conflicts: Set<string>;
  onSelect: (e: TimetableEntry) => void;
  resolveDisplayName?: (courseName: string) => string;
}) {
  const accentColor = `var(--accent-${dept.toLowerCase()})`;
  const accentBg    = `var(--accent-${dept.toLowerCase()}-bg)`;
  const dayCount = groupedDays.length;
  const gridTemplateColumns = `${TIME_COL_WIDTH}px repeat(${dayCount}, minmax(0, 1fr))`;

  const totalHeight = (GRID_END - GRID_START) * PX_PER_MIN;

  // Generate hour marks
  const hours = [];
  for (let m = GRID_START; m <= GRID_END; m += 60) {
    hours.push(m);
  }

  return (
    <div className="mt-8 overflow-x-auto select-none rounded-xl border border-[var(--color-border)] shadow-sm bg-[var(--color-bg-raised)]">
      <div className="w-full min-w-[980px] relative flex flex-col">
        
        {/* Day Headers - Sticky */}
        <div
          className="grid sticky top-0 z-20 bg-[var(--color-bg-raised)]/95 backdrop-blur-sm border-b border-[var(--color-border)]"
          style={{ gridTemplateColumns }}
        >
          <div className="h-10 border-r border-[var(--color-border)] sticky left-0 z-30 bg-[var(--color-bg-raised)]" /> {/* Spacer for time column */}
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

        {/* Grid Body */}
        <div
          className="relative grid"
          style={{
            height: `${totalHeight}px`,
            gridTemplateColumns,
          }}
        >
          
          {/* Time Column & Grid Lines */}
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
            
            {/* Vertical lines */}
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns }}>
              <div className="border-r border-[var(--color-border)] bg-[var(--color-bg-subtle)]/30 sticky left-0 z-20" />
              {groupedDays.map(d => (
                <div key={d.day} className={`border-r border-[var(--color-border)] last:border-r-0 ${d.isToday ? 'bg-[var(--color-text-primary)]/[0.02]' : ''}`} />
              ))}
            </div>
          </div>

          {/* Classes Layer */}
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
                            <p className="font-bold leading-tight line-clamp-2 uppercase break-words">{resolveDisplayName ? resolveDisplayName(e.courseName) : e.courseName}</p>
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

// ─── Page export ──────────────────────────────────────────────────────────────

export default function TimetablePage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center">
        <p className="font-mono text-sm text-[var(--color-text-tertiary)]">Loading…</p>
      </div>
    }>
      <TimetablePageInner />
    </Suspense>
  );
}
