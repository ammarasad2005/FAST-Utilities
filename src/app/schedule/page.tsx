'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useState, useEffect, Suspense } from 'react';
import { filterExams, filterSummerExams, groupByDay } from '@/lib/filter';
import { sortByChronological } from '@/lib/dates';
import { ExamCard } from '@/components/ExamCard';
import { Header } from '@/components/Header';

import { ExamDetail } from '@/components/ExamDetail';
import { SearchBar } from '@/components/SearchBar';
import { ExportButton } from '@/components/ExportButton';
import { EmptyState } from '@/components/EmptyState';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { ExamEntry } from '@/lib/types';
import { supabase } from '@/lib/supabase';

// Both JSON files are bundled at build time; the component picks the right one
// at runtime based on the active semester type from localStorage.
// The dispatcher (scripts/run-exam-parser.ts) generates the appropriate file
// based on semester_settings.semester_type from Supabase.
// eslint-disable-next-line
const regularScheduleData = require('../../../public/data/regular_schedule.json');
// eslint-disable-next-line
const summerScheduleData = require('../../../public/data/summer_schedule.json');

function SchedulePageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const batch = params?.get('batch') ?? '';
  const school = params?.get('school') ?? '';
  const dept = params?.get('dept') ?? 'CS';

  // Detect summer mode from localStorage (set by /home and / pages on mount)
  const [isSummer, setIsSummer] = useState(false);
  const [showExams, setShowExams] = useState<boolean | null>(null);

  useEffect(() => {
    const activeSemester = localStorage.getItem('fsc_active_semester');
    const summer = activeSemester === 'summer';
    setIsSummer(summer);
    console.log('[Schedule] Summer mode:', summer, '| Entries:', summer ? summerScheduleData.length : regularScheduleData.length);

    // Fetch show_exams from Supabase
    supabase
      .from('semester_settings')
      .select('show_exams')
      .eq('id', 1)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setShowExams(data.show_exams ?? false);
        } else {
          setShowExams(false); // Default: hidden if can't fetch
        }
      });
  }, []);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ExamEntry | null>(null);

  // Pick the right dataset based on semester type
  const allExams: ExamEntry[] = isSummer
    ? (summerScheduleData as ExamEntry[])
    : (regularScheduleData as ExamEntry[]);

  const filtered = useMemo(
    () => {
      if (isSummer) {
        // Summer mode: filter by selected courses (from localStorage) + free-text search
        let selectedCourses: string[] = [];
        try {
          const stored = localStorage.getItem('fsc_summer_courses');
          if (stored) {
            const courseMap = JSON.parse(stored);
            selectedCourses = Object.keys(courseMap);
          }
        } catch { /* ignore parse errors */ }

        // Debug: trace what's being filtered
        console.log('[Schedule] Summer filter — selectedCourses:', selectedCourses, '| total exams:', allExams.length);

        const summerFiltered = filterSummerExams(allExams, { query, selectedCourses });
        console.log('[Schedule] Summer filter — matched:', summerFiltered.length, 'exams:', summerFiltered.map(e => e.courseCode));
        return summerFiltered.sort(sortByChronological);
      } else {
        // Regular mode: filter by batch/school/dept + free-text search
        const regularFiltered = filterExams(allExams, { batch, school, department: dept, query });
        return regularFiltered.sort(sortByChronological);
      }
    },
    [isSummer, allExams, batch, school, dept, query]
  );

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  // Subtitle differs in summer mode
  const subtitle = isSummer
    ? 'Summer 2026'
    : (dept === 'BBA' ? `BBA-${batch}` : `BS(${dept})-${batch}`);

  // Show loading state while fetching show_exams
  if (showExams === null) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Header>
          <div className="flex flex-1 items-center gap-2 w-full min-w-0">
            <span className="font-mono text-sm text-[var(--color-text-tertiary)]">Loading…</span>
          </div>
        </Header>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--color-border)] border-t-[var(--color-text-primary)] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Show "no exams" placeholder when exams are hidden
  if (!showExams) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Header>
          <div className="flex flex-1 items-center gap-2 w-full min-w-0">
            <button
              onClick={() => router.push('/')}
              aria-label="Back"
              className="w-8 h-8 flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] rounded-full transition-colors shrink-0 -ml-2"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M11 4l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="font-mono text-sm font-medium text-[var(--color-text-primary)] truncate">
              Exam Finder
            </span>
          </div>
        </Header>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          {/* Icon */}
          <div className="relative mb-8">
            <div className="w-20 h-20 rounded-full bg-[var(--color-bg-subtle)] flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-tertiary)]">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path d="M14 2v6h6"/>
                <path d="M9 13h6"/>
                <path d="M9 17h4"/>
              </svg>
            </div>
            {/* Small clock overlay */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--color-bg-raised)] border border-[var(--color-border)] flex items-center justify-center shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-secondary)]">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
          </div>

          {/* Message */}
          <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-3 leading-tight">
            No exams right now
          </h1>
          <p className="font-body text-base text-[var(--color-text-secondary)] max-w-md leading-relaxed mb-8">
            Exam schedules haven&apos;t been published yet for this semester.
            Check back closer to exam week — we&apos;ll have your full
            schedule ready as soon as it&apos;s announced.
          </p>

          {/* Tips */}
          <div className="flex flex-col gap-3 max-w-sm w-full">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)]/50">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-cs-bg)] flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--accent-cs)]">
                  <path d="M12 6v6l4 2"/>
                  <circle cx="12" cy="12" r="9"/>
                </svg>
              </div>
              <div className="text-left min-w-0">
                <p className="font-body text-sm font-semibold text-[var(--color-text-primary)]">Stay focused on classes</p>
                <p className="font-mono text-[10px] text-[var(--color-text-tertiary)] mt-0.5">Your weekly timetable is always up to date</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)]/50">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-ai-bg)] flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--accent-ai)]">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div className="text-left min-w-0">
                <p className="font-body text-sm font-semibold text-[var(--color-text-primary)]">We&apos;ll notify you</p>
                <p className="font-mono text-[10px] text-[var(--color-text-tertiary)] mt-0.5">Exam schedules appear here automatically</p>
              </div>
            </div>
          </div>

          {/* Back button */}
          <button
            onClick={() => router.push('/')}
            className="mt-8 px-6 py-3 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] font-body text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Sticky header */}
      <Header rightActions={<ExportButton entries={filtered} config={{ isCustom: false, subtitle }} />}>
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
            {isSummer ? (
              <>
                <span
                  className="font-mono text-sm font-medium px-2 py-0.5 rounded shrink-0"
                  style={{
                    backgroundColor: `var(--accent-cs-bg)`,
                    color: `var(--accent-cs)`,
                  }}
                >
                  SUMMER
                </span>
                <span className="font-mono text-sm text-[var(--color-text-secondary)] truncate">Summer 2026 Exams</span>
              </>
            ) : (
              <>
                <span
                  className="font-mono text-sm font-medium px-2 py-0.5 rounded shrink-0"
                  style={{
                    backgroundColor: `var(--accent-${dept.toLowerCase()}-bg)`,
                    color: `var(--accent-${dept.toLowerCase()})`,
                  }}
                >
                  {dept}
                </span>
                <span className="font-mono text-sm text-[var(--color-text-secondary)] truncate">Batch {batch}</span>
              </>
            )}
          </div>
        </div>
      </Header>


      {/* Main content */}
      <div className="flex flex-1 md:gap-0">

        {/* Sidebar (desktop only) */}
        <aside className="hidden md:flex md:w-56 lg:w-64 flex-col gap-4 p-6 border-r border-[var(--color-border)] sticky top-14 h-[calc(100dvh-56px)] overflow-y-auto">
          {isSummer ? (
            <>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-1">Semester</p>
                <p className="font-mono text-sm font-medium">Summer 2026</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-1">Scope</p>
                <p className="font-mono text-sm font-medium" style={{ color: 'var(--accent-cs)' }}>
                  All Courses
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-1">Batch</p>
                <p className="font-mono text-sm font-medium">{batch}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-1">Department</p>
                <p
                  className="font-mono text-sm font-medium"
                  style={{ color: `var(--accent-${dept.toLowerCase()})` }}
                >
                  {dept}
                </p>
              </div>
            </>
          )}
          <div className="h-px bg-[var(--color-border)]" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-1">Found</p>
            <p className="font-mono text-2xl font-medium">{filtered.length}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">exam{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <button
              onClick={() => router.push('/')}
              className="text-xs text-[var(--color-text-secondary)] underline underline-offset-2 text-left hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2"
            >
              {isSummer ? 'Change courses' : 'Change filters'}
            </button>
            <ExportButton entries={filtered} variant="sidebar" config={{ isCustom: false, subtitle }} />
          </div>
        </aside>

        {/* List area */}
        <div className="flex-1 flex flex-col">
          {/* Search bar — sticky below header */}
          <div className="sticky top-14 z-10 bg-[var(--color-bg)] px-4 py-3 border-b border-[var(--color-border)]">
            <SearchBar value={query} onChange={setQuery} />
          </div>
          {/* Result count (mobile) */}
          <p className="md:hidden px-4 pt-4 pb-1 font-mono text-xs text-[var(--color-text-tertiary)]">
            {filtered.length} exam{filtered.length !== 1 ? 's' : ''} found
          </p>
          {/* Grouped list */}
          <div id="print-area" className="flex-1 px-4 pb-24 md:pb-8 bg-[var(--color-bg)]">
            {filtered.length === 0 ? (
              <EmptyState query={query} batch={batch} dept={dept} />
            ) : (
              grouped.map(({ label, entries }) => (
                <section key={label} className="mt-6 first:mt-4">
                  <h2 className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-3">
                    {label}
                  </h2>
                  <div className="flex flex-col gap-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
                    {entries.map(exam => (
                      <ExamCard
                        key={`${exam.date}-${exam.courseCode}-${exam.time}`}
                        exam={exam}
                        dept={dept}
                        onClick={() => setSelected(exam)}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Exam detail: bottom sheet on mobile, side panel on desktop */}
      {selected && (
        <ExamDetail
          exam={selected}
          dept={dept}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center">
        <p className="font-mono text-sm text-[var(--color-text-tertiary)]">Loading…</p>
      </div>
    }>
      <SchedulePageInner />
    </Suspense>
  );
}
