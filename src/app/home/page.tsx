'use client';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DepartmentPill } from '@/components/DepartmentPill';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SCHOOLS, SCHOOL_DEPARTMENTS, DEPARTMENT_LABELS } from '@/lib/types';
import { flattenTimetable, getAvailableSections, findMatchingCatalogEntry } from '@/lib/timetable-filter';
import type { RawTimetableJSON, TimetableEntry, SummerCourseCatalogEntry } from '@/lib/types';
import { AlertCircle, Terminal, ShieldAlert } from 'lucide-react';
import { DesktopTicker } from '@/components/DesktopTicker';
import { DEPT_ACCENT } from '@/lib/faculty';
import type { DeptFileKey } from '@/lib/faculty';

import { useTheme } from '@/lib/theme';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase';


// eslint-disable-next-line
const scheduleRaw = require('../../../public/data/regular_schedule.json');
const batches: string[] = [...new Set<string>(scheduleRaw.map((e: { batch: string }) => e.batch))]
  .sort()
  .reverse();

// eslint-disable-next-line
const timetableRaw: RawTimetableJSON = require('../../../public/data/timetable.json');
const allTimetableEntries = flattenTimetable(timetableRaw);
const timetableBatches: string[] = [...new Set<string>(allTimetableEntries.map(e => e.batch))].sort().reverse();

type Mode = 'default' | 'custom';
type Feature = 'exams' | 'timetable' | 'rooms' | 'faculty';

// FSC-only departments for the timetable (from the Python data)
const TIMETABLE_DEPTS = ['CS', 'AI', 'DS', 'CY', 'SE'];

interface UserConfig {
  batch: string;
  school: string;
  dept: string;
  section: string;
}


// Typing animation strings — one per feature
const HERO_TEXTS: Record<Feature, string> = {
  exams:
    'Select your batch and department. Your full exam schedule — every date, time, and course — in one place.',
  timetable:
    'Select your batch, department and section. Your weekly class timetable — every slot, room, and timing — instantly.',
  rooms:
    'Find empty classrooms and labs across campus — for any day and time slot — sourced from the live Spring 2026 timetable.',
  faculty:
    'Browse all FAST Islamabad faculty members. Search by name, title, or office. Filter by department — AI & Data Science, CS, SE, and more.',
};

// ── Small component to read searchParams inside Suspense ────────────────────
function FeatureActivator({ onActivate }: { onActivate: (f: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const f = searchParams?.get('feature');
    if (f && ['timetable', 'exams', 'rooms', 'faculty'].includes(f)) {
      onActivate(f);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function SetupPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [feature, setFeature] = useState<Feature>('timetable');
  const [mode, setMode] = useState<Mode>('default');

  // Summer mode states
  const [isSummerMode, setIsSummerMode] = useState<boolean>(false);
  const [summerCoursesList, setSummerCoursesList] = useState<TimetableEntry[]>([]);
  const [summerCatalog, setSummerCatalog] = useState<SummerCourseCatalogEntry[]>([]);
  const [selectedSummerCourses, setSelectedSummerCourses] = useState<Record<string, string>>({});
  const [semesterName, setSemesterName] = useState<string>('Spring 2026');

  // Shared form state
  const [batch, setBatch] = useState<string>('-');
  const [school, setSchool] = useState<string>('-');
  const [dept, setDept] = useState<string>('');
  const [section, setSection] = useState<string>('');

  // Typing animation
  const fullText = HERO_TEXTS[feature].replace('Spring 2026', semesterName);
  const [displayText, setDisplayText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  // Persistence for default mode
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [exclusivityError, setExclusivityError] = useState<string | null>(null);
  const [bundles, setBundles] = useState<any[]>([]);


  // Load userConfig on mount
  useEffect(() => {
    const stored = localStorage.getItem('fsc_user_config');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserConfig(parsed);
        // Sync current state to saved values
        setBatch(parsed.batch);
        setSchool(parsed.school);
        setDept(parsed.dept);
        setSection(parsed.section);
      } catch (e) {
        console.error('Failed to parse user config', e);
      }
    }
    const savedSemesterName = localStorage.getItem('fsc_semester_name');
    if (savedSemesterName) {
      setSemesterName(savedSemesterName);
    }
    
    const storedBundles = localStorage.getItem('fsc_custom_bundles');
    if (storedBundles) {
      try {
        setBundles(JSON.parse(storedBundles));
      } catch (e) {
        console.error('Failed to parse bundles', e);
      }
    }

    setIsConfigLoaded(true);
  }, []);

  // Check semester settings and fetch summer courses if active
  // Helper: load and apply the API response (entries + catalog)
  function applySummerAPIResponse(data: { entries?: TimetableEntry[]; catalog?: SummerCourseCatalogEntry[] }) {
    setSummerCoursesList(data.entries ?? []);
    setSummerCatalog(data.catalog ?? []);
  }

  useEffect(() => {
    // Quick load from local storage cache
    const savedActiveSemester = localStorage.getItem('fsc_active_semester');
    if (savedActiveSemester === 'summer') {
      setIsSummerMode(true);
      fetch('/api/timetable', { cache: 'no-store' })
        .then(res => res.ok ? res.json() : { entries: [], catalog: [] })
        .then(data => {
          applySummerAPIResponse(data);
          const storedSelections = localStorage.getItem('fsc_summer_courses');
          if (storedSelections) setSelectedSummerCourses(JSON.parse(storedSelections));
        })
        .catch(err => console.error('Error fetching initial summer courses:', err));
    }

    async function checkSemesterType() {
      try {
        const { data, error } = await supabase
          .from('semester_settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (!error && data) {
          const isSummer = data.semester_type === 'summer';
          setIsSummerMode(isSummer);
          localStorage.setItem('fsc_active_semester', data.semester_type);
          if (data.semester_name) {
            setSemesterName(data.semester_name);
            localStorage.setItem('fsc_semester_name', data.semester_name);
          }

          if (isSummer) {
            const res = await fetch('/api/timetable', { cache: 'no-store' });
            if (res.ok) {
              const apiData = await res.json();
              applySummerAPIResponse(apiData);
              const storedSelections = localStorage.getItem('fsc_summer_courses');
              if (storedSelections) setSelectedSummerCourses(JSON.parse(storedSelections));
            }
          } else {
            setSummerCoursesList([]);
            setSummerCatalog([]);
          }
        } else {
          localStorage.setItem('fsc_active_semester', 'regular');
          setIsSummerMode(false);
        }
      } catch (err) {
        console.error('Error checking semester type:', err);
      }
    }
    checkSemesterType();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // Reset typing animation whenever feature changes
  useEffect(() => {
    setDisplayText('');
    setIsTypingComplete(false);
    let i = 0;
    const iv = setInterval(() => {
      setDisplayText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) { clearInterval(iv); setIsTypingComplete(true); }
    }, 22);
    return () => clearInterval(iv);
  }, [feature, fullText]);

  // Build unique course list for the student checklist.
  // If a catalog exists: use it (respecting hidden flag + alias).
  // If catalog is empty: fall back to raw entries (auto-derive, all visible).
  const uniqueCourses = useMemo(() => {
    // Build sections map from entries (keyed by sheetName)
    const sectionsMap = new Map<string, string[]>();
    summerCoursesList.forEach(entry => {
      if (!entry.courseName) return;
      const secs = sectionsMap.get(entry.courseName) ?? [];
      const sec = entry.section || 'A';
      if (!secs.includes(sec)) secs.push(sec);
      sectionsMap.set(entry.courseName, secs);
    });

    const isCatalogEmpty = summerCatalog.length === 0;

    // Resolve canonical sheetNames and merge sections
    const canonicalCoursesMap = new Map<string, { displayName: string; hidden: boolean; sections: string[] }>();

    Array.from(sectionsMap.entries()).forEach(([sheetName, sections]) => {
      const catalogEntry = findMatchingCatalogEntry(sheetName, summerCatalog);
      const canonicalKey = catalogEntry ? catalogEntry.sheetName : sheetName;
      const displayName = catalogEntry?.displayName ?? canonicalKey;
      const isHidden = catalogEntry 
        ? catalogEntry.hidden 
        : !isCatalogEmpty; // Whitelist logic: hide if catalog is configured but this course is not in it

      const existing = canonicalCoursesMap.get(canonicalKey);
      if (existing) {
        // Merge sections
        const mergedSecs = [...new Set([...existing.sections, ...sections])];
        canonicalCoursesMap.set(canonicalKey, {
          displayName,
          hidden: isHidden,
          sections: mergedSecs
        });
      } else {
        canonicalCoursesMap.set(canonicalKey, {
          displayName,
          hidden: isHidden,
          sections
        });
      }
    });

    return Array.from(canonicalCoursesMap.entries())
      .map(([sheetName, data]) => ({
        sheetName,
        displayName: data.displayName,
        hidden: data.hidden,
        sections: data.sections
      }))
      .filter(c => !c.hidden)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [summerCoursesList, summerCatalog]);

  // Keys in selectedSummerCourses are always sheetName (for matching), not displayName
  const handleToggleSummerCourse = (sheetName: string, defaultSection: string) => {
    setSelectedSummerCourses(prev => {
      const next = { ...prev };
      if (next[sheetName]) {
        delete next[sheetName];
      } else {
        next[sheetName] = defaultSection;
      }
      return next;
    });
  };

  const handleSummerSectionChange = (sheetName: string, sectionVal: string) => {
    setSelectedSummerCourses(prev => {
      if (!prev[sheetName]) return prev;
      return { ...prev, [sheetName]: sectionVal };
    });
  };

  // Dynamically derive available sections from loaded timetable data
  const availableSections = useMemo(
    () => (feature === 'timetable' && batch !== '-' && dept)
      ? getAvailableSections(allTimetableEntries, batch, dept)
      : [],
    [feature, batch, dept]
  );

  // Reset section when dept/batch changes — only if not currently loading from saved config
  useEffect(() => {
    // If we have a saved config, we don't reset anything unless the user manually clears it
    if (userConfig) return;
    
    setSection('');
  }, [batch, dept, feature, userConfig]);



  // When feature changes to exams, re-validate batch against exam batches
  useEffect(() => {
    if (feature === 'exams' && batch !== '-' && !batches.includes(batch)) setBatch('-');
    if (feature === 'timetable' && batch !== '-' && !timetableBatches.includes(batch)) setBatch('-');
  }, [feature, batch]);

  // Rooms feature — navigate immediately
  function handleRoomsClick() {
    router.push('/rooms');
  }

  // Faculty feature — navigate immediately
  function handleFacultyClick() {
    router.push('/faculty');
  }

  function handleSubmit() {
    if (feature === 'rooms') {
      handleRoomsClick();
      return;
    }
    if (feature === 'faculty') {
      handleFacultyClick();
      return;
    }
    if (isSummerMode) {
      localStorage.setItem('fsc_summer_courses', JSON.stringify(selectedSummerCourses));
      // In summer mode, route to /schedule for exams, /timetable for timetable
      if (feature === 'exams') {
        router.push('/schedule?batch=Summer');
      } else {
        router.push('/timetable');
      }
      return;
    }
    if (feature === 'exams') {
      if (mode === 'default') {
        if (batch === '-' || school === '-' || !dept) return;
        router.push(`/schedule?batch=${batch}&school=${school}&dept=${dept}`);
      } else {
        router.push('/custom');
      }
    } else {
      if (mode === 'default') {
        const targetBatch = userConfig?.batch || batch;
        const targetDept = userConfig?.dept || dept;
        const targetSection = userConfig?.section || section;
        if (targetBatch === '-' || !targetDept || !targetSection) return;
        router.push(`/timetable?batch=${targetBatch}&dept=${targetDept}&section=${targetSection}`);
      } else {
        router.push('/timetable/custom');
      }
    }
  }

  function savePreferences() {
    if (batch === '-' || !dept || !section) return;

    // Check for Custom Bundles
    const bundlesStr = localStorage.getItem('fsc_custom_bundles');
    if (bundlesStr) {
      try {
        const bundles = JSON.parse(bundlesStr);
        if (Array.isArray(bundles) && bundles.length > 0) {
          setExclusivityError("Oops! You already have some Saved Bundles in the Custom Courses section. To save these default preferences, please go back and clear your custom bundles first—we want to keep your schedule simple and organized!");
          return;
        }
      } catch (e) {
        console.error("Failed to parse bundles", e);
      }
    }

    const config: UserConfig = { batch, school, dept, section };
    localStorage.setItem('fsc_user_config', JSON.stringify(config));
    setUserConfig(config);
  }

  function clearPreferences() {
    localStorage.removeItem('fsc_user_config');
    setUserConfig(null);
    setBatch('-');
    setSchool('-');
    setDept('');
    setSection('');
  }


  const activeBatches = feature === 'timetable' ? timetableBatches : batches;
  
  const examCtaDisabled = mode === 'default' && (
    userConfig 
      ? (userConfig.batch === '-' || userConfig.school === '-' || !userConfig.dept)
      : (batch === '-' || school === '-' || !dept)
  );

  const timetableCtaDisabled = mode === 'default' && (
    userConfig
      ? (userConfig.batch === '-' || !userConfig.dept || !userConfig.section)
      : (batch === '-' || !dept || !section)
  );

  const ctaDisabled = isSummerMode
    ? Object.keys(selectedSummerCourses).length === 0
    : (feature === 'rooms' || feature === 'faculty')
      ? false
      : feature === 'exams'
        ? examCtaDisabled
        : timetableCtaDisabled;

  // ─── Shared UI pieces ──────────────────────────────────────────────────────

  const featureSelector = (
    <div>
      <p
        id="feature-label"
        className="block font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2"
      >
        Feature
      </p>
      <div role="group" aria-labelledby="feature-label" className="grid grid-cols-3 gap-2">
        {(['timetable', 'exams', 'rooms'] as Feature[]).map(f => (
          <button
            key={f}
            id={`feature-${f}`}
            onClick={() => { setFeature(f); setMode('default'); }}
            aria-pressed={feature === f}
            className="h-11 rounded-md border font-body text-sm font-medium transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2"
            style={feature === f ? {
              backgroundColor: 'var(--color-text-primary)',
              color: 'var(--color-bg)',
              borderColor: 'transparent',
            } : {
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {f === 'exams' ? 'Exams' : f === 'timetable' ? 'Timetable' : 'Free Rooms'}
          </button>
        ))}
      </div>
    </div>
  );

  const modeSelector = feature !== 'rooms' ? (
    <div>
      <p
        id="mode-label"
        className="block font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2"
      >
        Mode
      </p>
      <div role="group" aria-labelledby="mode-label" className="grid grid-cols-2 gap-2">
        {(['default', 'custom'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className="h-11 rounded-md border font-body text-sm font-medium transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2"
            style={mode === m ? {
              backgroundColor: 'var(--color-text-primary)',
              color: 'var(--color-bg)',
              borderColor: 'transparent',
            } : {
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {m === 'default' ? 'Default Courses' : 'Custom Courses'}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
        {feature === 'exams'
          ? (mode === 'default'
            ? 'All exams for your batch and department automatically.'
            : 'Enter custom courses — for irregular credit loads.')
          : (mode === 'default'
            ? 'All classes for your batch and department automatically.'
            : 'Select specific classes — for cross-section or repeat courses.')}
      </p>
    </div>
  ) : null;

  // Rooms feature — show a simple info card instead of the normal form
  const roomsCard = feature === 'rooms' ? (
    <div
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-5 flex flex-col gap-3"
    >
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {/* Map Pin icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-tertiary)]">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="font-mono text-sm font-medium text-[var(--color-text-primary)] truncate">
          Free Rooms Finder
        </span>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
        The Free Rooms Finder works across all batches and departments.
        Pick a day &amp; time slot — or generate a full weekly vacancy calendar.
      </p>
    </div>
  ) : null;

  // Batch selector — shared between both features but only shown in 'default' mode
  const batchSelector = (feature !== 'rooms' && mode === 'default') ? (
    <div>
      <label
        htmlFor="batch-select"
        className="block font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2"
      >
        Batch year
      </label>
      <div className="relative">
        <select
          id="batch-select"
          value={batch}
          onChange={e => { setBatch(e.target.value); setDept(''); setSection(''); }}
          className="w-full h-12 pl-4 pr-10 bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] rounded-md font-mono text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-cs)] cursor-pointer"
        >
          {batch === '-' && <option value="-">-</option>}
          {activeBatches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-tertiary)]">
          <svg width="12" height="7" viewBox="0 0 12 7" fill="none" aria-hidden="true">
            <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  ) : null;

  // School selector — only for exam feature
  const schoolSelector = feature === 'exams' && mode === 'default' ? (
    <div>
      <label
        htmlFor="school-select"
        className="block font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2"
      >
        School
      </label>
      <div className="relative">
        <select
          id="school-select"
          value={school}
          onChange={e => {
            const s = e.target.value;
            setSchool(s);
            if (s !== '-' && SCHOOL_DEPARTMENTS[s]) setDept(SCHOOL_DEPARTMENTS[s][0]);
            else setDept('');
          }}
          className="w-full h-12 pl-4 pr-10 bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] rounded-md font-mono text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-cs)] cursor-pointer"
        >
          {school === '-' && <option value="-">-</option>}
          {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-tertiary)]">
          <svg width="12" height="7" viewBox="0 0 12 7" fill="none" aria-hidden="true">
            <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  ) : null;

  // Department pills — for exams (school-gated) or timetable (FSC only)
  const deptPills = (feature === 'exams' && mode === 'default') ? (
    <div>
      {school === '-' ? (
        <div className="h-12 flex items-center justify-center text-sm font-medium text-[var(--color-text-secondary)] italic">
          Good Luck for Exams 😊
        </div>
      ) : (
        <>
          <p id="department-label" className="block font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2">
            Department
          </p>
          <div role="group" aria-labelledby="department-label" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {SCHOOL_DEPARTMENTS[school]?.map(d => (
              <DepartmentPill key={d} dept={d} selected={dept === d} onClick={() => setDept(d)} />
            ))}
          </div>
          {dept && (
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{DEPARTMENT_LABELS[dept]}</p>
          )}
        </>
      )}
    </div>
  ) : (feature === 'timetable' && mode === 'default') ? (
    <div>
      <p id="tt-department-label" className="block font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2">
        Department
      </p>
      <div role="group" aria-labelledby="tt-department-label" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {TIMETABLE_DEPTS.map(d => (
          <DepartmentPill key={d} dept={d} selected={dept === d} onClick={() => setDept(d)} />
        ))}
      </div>
      {dept && (
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{DEPARTMENT_LABELS[dept]}</p>
      )}
    </div>
  ) : null;

  // Section pills — only for timetable
  const sectionPills = (feature === 'timetable' && mode === 'default') && dept && batch !== '-' ? (
    <div>
      <p id="section-label" className="block font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2">
        Section
      </p>
      {availableSections.length === 0 ? (
        <p className="text-xs text-[var(--color-text-tertiary)] italic h-11 flex items-center">
          {allTimetableEntries.length === 0
            ? 'No timetable data yet — run the Python script first.'
            : 'No sections found for this batch & department.'}
        </p>
      ) : (
        <div role="group" aria-labelledby="section-label" className="flex flex-wrap gap-2">
          {availableSections.map(s => (
            <button
              key={s}
              id={`section-${s}`}
              onClick={() => setSection(s)}
              aria-pressed={section === s}
              className="h-11 min-w-[3.5rem] px-3 rounded-md border font-mono text-sm font-medium transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2"
              style={section === s ? {
                backgroundColor: `var(--accent-${dept.toLowerCase()}-bg)`,
                color: `var(--accent-${dept.toLowerCase()})`,
                boxShadow: `0 0 0 2px var(--accent-${dept.toLowerCase()})`,
                borderColor: 'transparent',
              } : {
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  ) : null;

  const summerCheckboxList = isSummerMode ? (
    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 border border-[var(--color-border-strong)] rounded-lg p-3 bg-[var(--color-bg-subtle)]">
      <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2 sticky top-0 bg-[var(--color-bg-subtle)] pb-1 border-b border-[var(--color-border)]">
        Select Summer Courses
      </p>
      {uniqueCourses.length === 0 ? (
        <p className="text-xs text-[var(--color-text-tertiary)] italic py-4 text-center">
          No summer courses loaded from timetable API.
        </p>
      ) : (
        <div className="space-y-2.5">
          {uniqueCourses.map(({ sheetName, displayName, sections }) => {
            const isChecked = !!selectedSummerCourses[sheetName];
            const selectedSection = selectedSummerCourses[sheetName] || sections[0] || 'A';
            return (
              <div key={sheetName} className="flex items-center justify-between gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-[var(--color-text-primary)] font-medium flex-1 truncate">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleSummerCourse(sheetName, sections[0] || 'A')}
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 accent-orange-500"
                  />
                  {/* Show alias if set, otherwise raw sheet name */}
                  <span className="truncate" title={sheetName}>{displayName}</span>
                </label>

                <select
                  value={selectedSection}
                  disabled={!isChecked}
                  onChange={(e) => handleSummerSectionChange(sheetName, e.target.value)}
                  className="h-8 rounded border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)] font-mono text-[11px] px-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sections.map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  ) : null;

  const prefButton = feature === 'timetable' && mode === 'default' && (userConfig || (batch !== '-' && dept && section)) && (
    <button
      onClick={userConfig ? clearPreferences : savePreferences}
      style={{ height: '52px' }}
      className={`w-full rounded-md font-body font-medium text-sm transition-all focus-visible:outline-none focus-visible:ring-2 border-2 ${userConfig
        ? 'border-red-500/20 text-red-500 hover:bg-red-500/5'
        : 'border-[var(--color-border-strong)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]'
        }`}
    >
      {userConfig ? 'Clear Saved Preferences' : 'Save these Preferences'}
    </button>
  );


  const userConfigView = userConfig && mode === 'default' && feature === 'timetable' ? (
    <div className="flex flex-col gap-4">
      <div>
        <p className="block font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2">
          User Config
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { val: userConfig.batch, isAccent: false },
            { val: userConfig.dept, isAccent: true },
            { val: userConfig.section, isAccent: true }
          ].map((item, i) => (
            <div
              key={i}
              className="h-12 flex items-center justify-center rounded-md font-mono text-sm border transition-all"
              style={item.isAccent ? {
                backgroundColor: `var(--accent-${userConfig.dept.toLowerCase()}-bg)`,
                color: `var(--accent-${userConfig.dept.toLowerCase()})`,
                borderColor: `var(--accent-${userConfig.dept.toLowerCase()})`,
                boxShadow: `inset 0 0 0 1px var(--accent-${userConfig.dept.toLowerCase()})`,
              } : {
                backgroundColor: 'var(--color-bg-raised)',
                border: '1px solid var(--color-border-strong)',
                color: 'var(--color-text-primary)'
              }}
            >
              {item.val}
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : null;


  const ctaButton = (
    <div className="flex flex-col gap-3 w-full">
      {prefButton}
      <button
        id="cta-button"
        onClick={handleSubmit}
        disabled={ctaDisabled}
        style={{ height: '52px' }}
        className={`w-full rounded-md font-body font-medium text-base transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${ctaDisabled
          ? 'bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] cursor-not-allowed'
          : 'bg-[var(--color-text-primary)] text-[var(--color-bg)] active:scale-[0.98] hover:opacity-90'
          }`}
      >
        {feature === 'rooms'
          ? 'Find Free Rooms →'
          : feature === 'faculty'
            ? 'Browse Faculty →'
            : feature === 'timetable'
              ? 'View my timetable →'
              : mode === 'default'
                ? 'View my exams →'
                : 'Enter custom courses →'}
      </button>
    </div>
  );


  return (
    <>
      {/* Activate feature from ?feature= query param */}
      <Suspense fallback={null}>
        <FeatureActivator onActivate={(f) => setFeature(f as Feature)} />
      </Suspense>
      {/* ================================================================
          MOBILE  (< 768px)
      ================================================================ */}
      <main className="md:hidden min-h-dvh flex flex-col px-5 pt-safe-top pb-safe-bottom max-w-lg mx-auto">

        <div className="-mx-5">
          <Header />
        </div>


        {/* Subheader: Feature Selector */}
        <div className="flex flex-col gap-2 mb-8 mt-3">
          <div role="group" aria-label="Select feature" className="flex items-center gap-1 bg-[var(--color-bg-subtle)] rounded-lg p-1">
            {(['timetable', 'exams', 'rooms', 'faculty'] as Feature[]).map(f => (
              <button
                key={f}
                onClick={() => { setFeature(f); setMode('default'); }}
                aria-pressed={feature === f}
                className="flex-1 h-10 rounded-md font-body text-[11px] font-bold transition-all duration-150 active:scale-95"
                style={feature === f ? {
                  backgroundColor: 'var(--color-text-primary)',
                  color: 'var(--color-bg)',
                } : {
                  color: 'var(--color-text-secondary)',
                }}
              >
                {f === 'exams' ? 'Exams' : f === 'timetable' ? 'Timetable' : f === 'rooms' ? 'Rooms' : 'Faculty'}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h1 className="font-display text-4xl leading-tight text-[var(--color-text-primary)]">
            {feature === 'exams' ? (
              <>Find your<br /><span className="italic">exam schedule.</span></>
            ) : feature === 'timetable' ? (
              <>Find your<br /><span className="italic">class timetable.</span></>
            ) : feature === 'faculty' ? (
              <>Meet your<br /><span className="italic">faculty.</span></>
            ) : (
              <>Find a<br /><span className="italic">free room.</span></>
            )}
          </h1>
          <div className="mt-6 h-px bg-[var(--color-border)]" />
        </div>

        <div className="flex flex-col gap-6 flex-1">
          {feature === 'rooms' ? roomsCard
          : feature === 'faculty' ? (
            <div className="flex flex-col gap-5">
              <p className="font-body text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Explore the directory of FAST Islamabad faculty members across 9 departments. Find emails, office locations, and other details instantly.
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {['CS', 'AIDS', 'SE', 'CY', 'EE', 'CE', 'SH', 'AF', 'MS'].map(d => {
                  const accent = DEPT_ACCENT[d as DeptFileKey];
                  return (
                    <button 
                      key={d}
                      onClick={() => router.push(`/faculty?dept=${d}`)}
                      className="flex items-center justify-center h-12 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] transition-all active:scale-95 hover:bg-[var(--hover-bg)] hover:text-[var(--hover-color)] hover:border-[var(--hover-color)]"
                      style={{
                        '--hover-bg': `var(--accent-${accent}-bg)`,
                        '--hover-color': `var(--accent-${accent})`,
                      } as React.CSSProperties}
                    >
                      <span className="font-mono text-xs font-bold text-[var(--color-text-secondary)] group-hover:text-inherit transition-colors">{d}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : isSummerMode ? (
            summerCheckboxList
          ) : (
            <>
              {modeSelector}
              {userConfigView ? userConfigView : (
                <>
                  {batchSelector}
                  {schoolSelector}
                  {deptPills}
                  {sectionPills}
                </>
              )}
            </>
          )}
        </div>


        <div className="pb-8 pt-6 flex flex-col gap-8">
          {ctaButton}
        </div>
      </main>

      {/* ================================================================
          DESKTOP  (≥ 768px) — two-column layout
      ================================================================ */}
      <div className="hidden md:flex min-h-dvh flex-col">

        {/* Full-width header */}
        {/* Full-width header */}
        <Header>
          {/* Feature toggle — prominent centre nav */}
          <div role="group" aria-label="Select feature" className="flex items-center gap-1 bg-[var(--color-bg-subtle)] rounded-lg p-1">
            {(['timetable', 'exams', 'rooms', 'faculty'] as Feature[]).map(f => (
              <button
                key={f}
                id={`desktop-feature-${f}`}
                onClick={() => { setFeature(f); setMode('default'); }}
                aria-pressed={feature === f}
                className="h-8 px-4 rounded-md font-body text-sm font-medium transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2"
                style={feature === f ? {
                  backgroundColor: 'var(--color-text-primary)',
                  color: 'var(--color-bg)',
                } : {
                  color: 'var(--color-text-secondary)',
                }}
              >
                {f === 'exams' ? 'Exam Finder' : f === 'timetable' ? 'Timetable' : f === 'rooms' ? 'Free Rooms' : 'Faculty Info'}
              </button>
            ))}
          </div>
        </Header>

        {/* Two-column body */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT — hero + stats */}
          {/* LEFT — hero + stats */}
          <div
            className="w-1/2 lg:w-[55%] flex flex-col justify-between px-10 lg:px-16 xl:px-24 py-14 border-r border-[var(--color-border)] relative overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg)' }}
          >
            {/* Dot-grid texture */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none opacity-[0.35]"
              style={{
                backgroundImage: 'radial-gradient(circle, var(--color-text-secondary) 1.4px, transparent 1.4px)',
                backgroundSize: '18px 18px',
              }}
            />

            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-cs)]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 left-10 w-48 h-48 bg-[var(--accent-ai)]/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none" />

            {/* Headline block */}
            <div className="relative z-10">
              <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-tertiary)] mb-6">
                FAST Isb Utilities —{' '}
                {feature === 'exams' ? 'Exam Portal' : feature === 'timetable' ? 'Timetable Portal' : feature === 'faculty' ? 'Faculty Directory' : 'Room Finder'}
              </p>
              <h1
                className="font-display leading-[1.1] text-[var(--color-text-primary)]"
                style={{ fontSize: 'clamp(2.4rem, 3.5vw, 3.6rem)' }}
              >
                {feature === 'exams' ? (
                  <>Find your<br /><span className="italic">exam schedule.</span></>
                ) : feature === 'timetable' ? (
                  <>Find your<br /><span className="italic">class timetable.</span></>
                ) : feature === 'faculty' ? (
                  <>Meet your<br /><span className="italic">faculty.</span></>
                ) : (
                  <>Find a<br /><span className="italic">free room.</span></>
                )}
              </h1>
              <p className="mt-6 font-body text-base text-[var(--color-text-secondary)] max-w-sm leading-relaxed min-h-[6rem]">
                {displayText}
                {!isTypingComplete && (
                  <span className="inline-block w-[2px] h-[1em] bg-[var(--color-text-tertiary)] animate-pulse ml-1 align-middle" />
                )}
                <span className="sr-only">{fullText}</span>
              </p>
            </div>

            <DesktopTicker 
                allTimetableEntries={isSummerMode ? summerCoursesList : allTimetableEntries} 
                userConfig={userConfig} 
                bundles={bundles} 
                isSummer={isSummerMode}
                summerSelections={selectedSummerCourses}
                summerCatalog={summerCatalog}
            />


            {/* Social / Developer Links */}
            <div className="relative z-10 flex gap-8">
              <a
                href="https://github.com/ammarasad2005/Exam-Table"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
                  </svg>
                  <span className="font-mono text-sm font-medium">GitHub</span>
                </div>
                <span className="font-mono text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-widest pl-[28px]">@ammarasad2005</span>
              </a>
              <a
                href="https://linkedin.com/in/muhammad-ammar-asad"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-1 text-[var(--color-text-secondary)] hover:text-[#0a66c2] transition-colors dark:hover:text-[#3b82f6]"
              >
                <div className="flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  <span className="font-mono text-sm font-medium">LinkedIn</span>
                </div>
                <span className="font-mono text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-widest pl-[28px] h-3 block" />
              </a>
            </div>
          </div>

          {/* RIGHT — form card */}
          <div className="flex-1 relative flex items-center justify-center px-10 lg:px-16 xl:px-24 py-14">
            <div className="w-full max-w-sm">

              <div className={`rounded-[26px] md:p-[2px] p-0 ${
                isDark 
                  ? "md:bg-gradient-to-r md:from-amber-500/40 md:via-yellow-200/70 md:to-amber-500/40 bg-transparent" 
                  : "md:bg-gradient-to-r md:from-purple-600/40 md:via-orange-500/60 md:to-purple-600/40 bg-transparent"
              }`}>
                <div
                  className="bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-2xl md:rounded-[24px] p-8 lg:p-10 flex flex-col gap-6"
                  style={{ boxShadow: 'var(--shadow-raised), var(--border-inset)' }}
                >
                {feature === 'rooms' ? (
                  roomsCard
                ) : feature === 'faculty' ? (
                  <div className="flex flex-col gap-5">
                    <p className="font-body text-sm text-[var(--color-text-secondary)] leading-relaxed">
                      Explore the directory of FAST Islamabad faculty members. Find emails, office locations, and other details instantly.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {['CS', 'AIDS', 'SE', 'CY', 'EE', 'CE', 'SH', 'AF', 'MS'].map(d => {
                        const accent = DEPT_ACCENT[d as DeptFileKey];
                        return (
                          <button 
                            key={d}
                            onClick={() => router.push(`/faculty?dept=${d}`)}
                            className="flex items-center justify-center h-14 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] transition-all active:scale-95 group hover:bg-[var(--hover-bg)] hover:border-[var(--hover-color)] hover:text-[var(--hover-color)]"
                            style={{
                              '--hover-bg': `var(--accent-${accent}-bg)`,
                              '--hover-color': `var(--accent-${accent})`,
                            } as React.CSSProperties}
                          >
                            <span className="font-mono text-[13px] font-bold text-[var(--color-text-secondary)] group-hover:text-inherit transition-colors">{d}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : isSummerMode ? (
                  summerCheckboxList
                ) : (
                  <>
                    {modeSelector}
                    {userConfigView ? userConfigView : (
                      <>
                        {batchSelector}
                        {schoolSelector}
                        {deptPills}
                        {sectionPills}
                      </>
                    )}
                  </>
                )}


                {ctaButton}
              </div>
            </div>

              <p className="mt-5 font-mono text-[11px] text-[var(--color-text-tertiary)] text-center leading-relaxed">
                {feature === 'exams'
                  ? 'Data updates for all examinations.'
                  : feature === 'timetable'
                    ? `Time-Table for ${semesterName}.`
                    : feature === 'faculty'
                      ? 'Faculty members across 9 departments.'
                      : `Room availability from ${semesterName} timetable.`}
              </p>

            </div>
          </div>

        </div>
      </div>
      {exclusivityError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
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
    </>
  );
}