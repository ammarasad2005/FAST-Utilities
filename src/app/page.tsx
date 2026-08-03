'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { DesktopTicker } from '@/components/DesktopTicker';
import { flattenTimetable } from '@/lib/timetable-filter';
import type { RawTimetableJSON, TimetableEntry, SummerCourseCatalogEntry } from '@/lib/types';

// eslint-disable-next-line
const timetableRaw: RawTimetableJSON = require('../../public/data/timetable.json');
const allTimetableEntries: TimetableEntry[] = flattenTimetable(timetableRaw);

// ── Typing animation text ────────────────────────────────────────────────────
const INTRO_TEXT =
  'A unified utility layer for FAST Isb students. Timetables, exam schedules, room availability, faculty info, semester plan and the events calendar — all in one place.';

// ── Feature card definitions ─────────────────────────────────────────────────
const FEATURES = [
  {
    id: 'timetable',
    title: 'Timetable',
    description: 'Your full weekly class schedule — every course, room, and timing — instantly.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="14" x2="8" y2="14" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="12" y1="14" x2="12" y2="14" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="16" y1="14" x2="16" y2="14" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    accent: 'cs',
    placeholder: false,
  },
  {
    id: 'optimizer',
    title: 'Timetable Optimizer',
    description: 'Find clash-free combinations of your preferred sections and classes.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    ),
    accent: 'cy',
    placeholder: false,
  },
  {
    id: 'exams',
    title: 'Exam Finder',
    description: 'Every exam date and time for your batch and department.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    accent: 'ee',
    placeholder: false,
  },
  {
    id: 'rooms',
    title: 'Free Rooms',
    description: 'Find empty classrooms and labs across campus for any day and time slot.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    accent: 'ds',
    placeholder: false,
  },
  {
    id: 'faculty',
    title: 'Faculty Info',
    description: 'Find emails, office numbers, and other details for all faculty members.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="7" r="4" />
        <path d="M5.5 21a7 7 0 0 1 13 0" />
      </svg>
    ),
    accent: 'se',
    placeholder: false,
  },
  {
    id: 'semester',
    title: 'Semester Schedule',
    description: 'Full academic calendar — key dates, holidays, sessionals, and finals.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    accent: 'af',
    placeholder: false,
  },
  {
    id: 'events',
    title: 'Campus Events',
    description: 'Student-relevant events, seminars, drives, and activities in one monthly view.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="14" x2="8" y2="14" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="12" y1="14" x2="12" y2="14" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="16" y1="14" x2="16" y2="14" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    accent: 'ba',
    placeholder: false,
  },
  {
    id: 'lost-found',
    title: 'Lost & Found',
    description: 'Report lost items or browse found belongings — reunite students with their stuff.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    accent: 'lf',
    placeholder: false,
  },
] as const;

interface UserConfig {
  batch: string;
  school: string;
  dept: string;
  section: string;
}

interface Bundle {
  id: string;
  name: string;
  rows: unknown[];
}

export default function RootPage() {
  const router = useRouter();

  // Typing animation
  const [displayText, setDisplayText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  // Load persisted config for DesktopTicker
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isSummerMode, setIsSummerMode] = useState<boolean>(false);
  const [semesterName, setSemesterName] = useState<string>('Spring 2026');
  const [summerCoursesList, setSummerCoursesList] = useState<TimetableEntry[]>([]);
  const [summerSelections, setSummerSelections] = useState<Record<string, string>>({});
  const [summerCatalog, setSummerCatalog] = useState<SummerCourseCatalogEntry[]>([]);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('fsc_user_config');
      if (stored) setUserConfig(JSON.parse(stored));
      const storedBundles = localStorage.getItem('fsc_custom_bundles');
      if (storedBundles) setBundles(JSON.parse(storedBundles));
      const savedSemesterName = localStorage.getItem('fsc_semester_name');
      if (savedSemesterName) setSemesterName(savedSemesterName);
    } catch { }

    const savedActiveSemester = localStorage.getItem('fsc_active_semester');
    if (savedActiveSemester === 'summer') {
      setIsSummerMode(true);
      fetch('/api/timetable', { cache: 'no-store' })
        .then(res => res.ok ? res.json() : { entries: [], catalog: [] })
        .then(data => {
          setSummerCoursesList(data.entries ?? []);
          setSummerCatalog(data.catalog ?? []);
          const storedSelections = localStorage.getItem('fsc_summer_courses');
          if (storedSelections) setSummerSelections(JSON.parse(storedSelections));
        })
        .catch(err => console.error('Error fetching initial summer courses:', err));
    }

    async function checkSemesterType() {
      try {
        const { supabase } = await import('@/lib/supabase');
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
              setSummerCoursesList(apiData.entries ?? []);
              setSummerCatalog(apiData.catalog ?? []);
              const storedSelections = localStorage.getItem('fsc_summer_courses');
              if (storedSelections) setSummerSelections(JSON.parse(storedSelections));
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
  }, []);

  // Typing animation on mount
  useEffect(() => {
    let i = 0;
    setDisplayText('');
    setIsTypingComplete(false);
    const iv = setInterval(() => {
      setDisplayText(INTRO_TEXT.slice(0, i));
      i++;
      if (i > INTRO_TEXT.length) { clearInterval(iv); setIsTypingComplete(true); }
    }, 20);
    return () => clearInterval(iv);
  }, []);

  function handleFeatureClick(id: string, placeholder: boolean) {
    if (placeholder) return;
    if (id === 'semester') {
      router.push('/semester');
    } else if (id === 'events') {
      router.push('/events');
    } else if (id === 'optimizer') {
      router.push('/timetable/optimizer');
    } else if (id === 'lost-found') {
      router.push('/lost-found');
    } else {
      router.push(`/home?feature=${id}`);
    }
  }

  return (
    <>
      {/* ================================================================
          MOBILE  (< 768px)
      ================================================================ */}
      <main className="md:hidden min-h-dvh flex flex-col bg-[var(--color-bg)]">
        <div className="-mx-0">
          <Header />
        </div>

        <div className="flex flex-col flex-1 px-5 pb-28 pt-4 max-w-lg mx-auto w-full">

          {/* Intro typing text */}
          <div className="mb-8">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-3">
              FAST NUCES, ISB
            </p>
            <h1 className="font-display text-3xl leading-tight text-[var(--color-text-primary)] mb-4">
              Your campus,<br /><span className="italic">at a glance.</span>
            </h1>
            <p className="font-body text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {INTRO_TEXT}
            </p>
          </div>

          {/* Feature cards grid */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <button
                key={f.id}
                onClick={() => handleFeatureClick(f.id, f.placeholder)}
                disabled={f.placeholder}
                className="relative overflow-hidden w-full text-left rounded-2xl bg-[var(--color-bg-raised)] p-4 flex flex-col justify-between aspect-ratio-square transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  border: `1.5px solid var(--accent-${f.accent})`,
                  boxShadow: 'var(--shadow-card)',
                  aspectRatio: '1/1',
                }}
              >
                <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{
                      backgroundColor: `var(--accent-${f.accent}-bg)`,
                      color: `var(--accent-${f.accent})`,
                    }}
                  >
                    {f.icon}
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <span className="font-body text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-primary)] leading-tight">
                      {f.title}
                    </span>
                    {f.placeholder && (
                      <span className="inline-block font-mono text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] border border-[var(--color-border)]">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer strip */}
          <div className="mt-10 pt-6 border-t border-[var(--color-border)]">
            <p className="font-mono text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-widest text-center flex items-center justify-center gap-1">
              FAST NUCES · Islamabad Campus · {semesterName}
              <a 
                href="/admin" 
                className="hover:text-orange-500 transition-colors duration-150 p-1 ml-0.5 opacity-40 hover:opacity-100"
                title="Admin Portal"
              >
                🔑
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* ================================================================
          DESKTOP  (≥ 768px)
      ================================================================ */}
      <div className="hidden md:flex min-h-dvh flex-col bg-[var(--color-bg)]">
        {/* Header — no tabs */}
        <Header />

        <div className="flex flex-1 overflow-hidden">

          {/* LEFT — hero + clock */}
          <div
            className="w-[42%] lg:w-[40%] flex flex-col justify-between px-10 lg:px-16 xl:px-20 py-14 border-r border-[var(--color-border)] relative overflow-hidden"
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
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-[var(--accent-cs)]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 left-10 w-56 h-56 bg-[var(--accent-ai)]/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none" />

            {/* Headline block */}
            <div className="relative z-10">
              <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-tertiary)] mb-6">
                FAST NUCES, ISB — Unified Portal
              </p>
              <h1
                className="font-display leading-[1.1] text-[var(--color-text-primary)]"
                style={{ fontSize: 'clamp(2.4rem, 3vw, 3.2rem)' }}
              >
                Your campus,<br /><span className="italic">at a glance.</span>
              </h1>
              <p className="mt-6 font-body text-base text-[var(--color-text-secondary)] max-w-sm leading-relaxed min-h-[6rem]">
                {displayText}
                {!isTypingComplete && (
                  <span className="inline-block w-[2px] h-[1em] bg-[var(--color-text-tertiary)] animate-pulse ml-1 align-middle" />
                )}
              </p>
            </div>

            {/* Clock + Next Up */}
            {mounted && (
              <DesktopTicker
                allTimetableEntries={isSummerMode ? summerCoursesList : allTimetableEntries}
                userConfig={userConfig}
                bundles={bundles}
                isSummer={isSummerMode}
                summerSelections={summerSelections}
                summerCatalog={summerCatalog}
              />
            )}

            {/* Social link */}
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

          {/* RIGHT — feature cards */}
          <div className="flex-1 flex flex-col px-10 lg:px-16 xl:px-20 py-14 overflow-y-auto">

            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-6">
              Features
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 content-start">
              {FEATURES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFeatureClick(f.id, f.placeholder)}
                  disabled={f.placeholder}
                  className="group relative overflow-hidden text-left rounded-2xl border bg-[var(--color-bg-raised)] p-6 flex flex-col gap-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: 'var(--color-border)',
                    boxShadow: 'var(--shadow-card), var(--border-inset)',
                  }}
                  onMouseOver={e => {
                    if (!f.placeholder) {
                      (e.currentTarget as HTMLElement).style.boxShadow = `var(--shadow-raised), var(--border-inset), 0 0 0 1px var(--accent-${f.accent})`;
                      (e.currentTarget as HTMLElement).style.borderColor = `var(--accent-${f.accent})`;
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseOut={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card), var(--border-inset)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-0 bottom-0 w-[5px] rounded-l-2xl opacity-80 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ backgroundColor: `var(--accent-${f.accent})` }}
                  />
                  <div className="flex items-start justify-between">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-200"
                      style={{
                        backgroundColor: `var(--accent-${f.accent}-bg)`,
                        color: `var(--accent-${f.accent})`,
                      }}
                    >
                      {f.icon}
                    </div>
                    {f.placeholder ? (
                      <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] border border-[var(--color-border)]">
                        Coming Soon
                      </span>
                    ) : (
                      <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h2 className="mb-[5px] font-body text-[17px] font-medium leading-[1.4] tracking-[0.04em] text-[rgba(0,0,0,0.8)] dark:text-[rgba(255,255,255,0.88)]">
                      {f.title}
                    </h2>
                    <p className="font-body text-sm text-[var(--color-text-secondary)] leading-relaxed">{f.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer strip */}
            <div className="mt-10 pt-6 border-t border-[var(--color-border)]">
              <p className="font-mono text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-widest text-center flex items-center justify-center gap-1">
                FAST NUCES · Islamabad Campus · {semesterName}
                <a 
                  href="/admin" 
                  className="hover:text-orange-500 transition-colors duration-150 p-1 ml-0.5 opacity-40 hover:opacity-100"
                  title="Admin Portal"
                >
                  🔑
                </a>
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
