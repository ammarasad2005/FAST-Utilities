'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import semesterCalendarRaw from '../../../public/data/semester_calendar.json';

// ── Data ─────────────────────────────────────────────────────────────────────

type SemesterCalendar = {
  semester: string;
  academicYear: string;
  generatedAt: string;
  keyDates: {
    label: string;
    date: string;
    endDate?: string;
    type: 'academic' | 'exam' | 'deadline';
    icon?: string;
  }[];
  holidays: {
    label: string;
    date: string;
    endDate?: string;
    type: 'national' | 'religious';
    note?: string;
  }[];
  academicRanges: {
    label: string;
    startDate: string;
    endDate: string;
    color: string;
    type: 'classes' | 'exams';
  }[];
  weekCount: number;
  totalCreditHoursPerWeek: number;
};

const semesterCalendar = semesterCalendarRaw as SemesterCalendar;

const KEY_DATE_BADGES: Record<string, string> = {
  'First day of classes': 'Start',
  'Add & Drop of courses / labs': 'Deadline',
  'Semester Freeze': 'Deadline',
  'First Sessional Examination': 'Sessional 1',
  'First Sessional results announced': 'Results',
  'Second Sessional Examination': 'Sessional 2',
  'Second Sessional results announced': 'Results',
  'Last day of classes': 'End',
  'Course withdrawal deadline / Makeup week': 'Deadline',
  'Final Examinations': 'Finals',
  'Final Examination results announced': 'Results',
};

// Calendar helpers
// Full 12-month name table — required because semesters can span any month
// (e.g. Summer 2026 = Jun–Aug, Fall 2026 = Aug–Jan). Previously only 6 entries.
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toUtcDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addRange(set: Set<string>, startDate: string, endDate?: string) {
  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate ?? startDate);
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    set.add(`${cursor.getUTCFullYear()}-${cursor.getUTCMonth() + 1}-${cursor.getUTCDate()}`);
  }
}

function formatDateRange(startDate: string, endDate?: string, includeWeekday = false) {
  const start = toUtcDate(startDate);
  const end = endDate ? toUtcDate(endDate) : null;
  if (!end || startDate === endDate) {
    const base = `${start.getUTCDate()} ${MONTH_SHORT[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
    return includeWeekday ? `${WEEKDAY_SHORT[start.getUTCDay()]}, ${base}` : base;
  }
  const sameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();
  if (sameMonth) {
    return `${start.getUTCDate()}–${end.getUTCDate()} ${MONTH_SHORT[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  }
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  if (sameYear) {
    return `${start.getUTCDate()} ${MONTH_SHORT[start.getUTCMonth()]} – ${end.getUTCDate()} ${MONTH_SHORT[end.getUTCMonth()]} ${start.getUTCFullYear()}`;
  }
  return `${start.getUTCDate()} ${MONTH_SHORT[start.getUTCMonth()]} ${start.getUTCFullYear()} – ${end.getUTCDate()} ${MONTH_SHORT[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
}

function mapKeyDateType(event: SemesterCalendar['keyDates'][number]) {
  if (event.type === 'exam') return 'exam';
  if (event.type === 'deadline') return 'deadline';
  if (event.icon === 'info' || event.label.toLowerCase().includes('results')) return 'info';
  return 'milestone';
}

const KEY_DATES = semesterCalendar.keyDates.map((event) => ({
  badge: KEY_DATE_BADGES[event.label] ?? 'Info',
  type: mapKeyDateType(event),
  label: event.label,
  date: formatDateRange(event.date, event.endDate, true),
}));

const HOLIDAYS = semesterCalendar.holidays.map((holiday) => ({
  name: holiday.label,
  date: formatDateRange(holiday.date, holiday.endDate),
  lunar: holiday.type === 'religious',
}));

const examDays     = new Set<string>();
const deadlineDays = new Set<string>();
const holidayDays  = new Set<string>();
const classStartDays = new Set<string>();

semesterCalendar.keyDates.forEach((event) => {
  if (event.type === 'exam') addRange(examDays, event.date, event.endDate);
  if (event.type === 'deadline') addRange(deadlineDays, event.date, event.endDate);
  if (event.type === 'academic' && ['First day of classes', 'Last day of classes'].includes(event.label)) {
    addRange(classStartDays, event.date, event.endDate);
  }
});

semesterCalendar.academicRanges.forEach((range) => {
  if (range.type === 'exams') addRange(examDays, range.startDate, range.endDate);
});

semesterCalendar.holidays.forEach((holiday) => addRange(holidayDays, holiday.date, holiday.endDate));

type DayKind = 'today' | 'classes-start' | 'exam' | 'deadline' | 'holiday' | 'normal' | 'empty';

function classifyDay(y: number, m1: number, d: number): DayKind {
  const today = new Date();
  if (today.getFullYear() === y && today.getMonth() + 1 === m1 && today.getDate() === d) return 'today';
  const key = `${y}-${m1}-${d}`;
  if (classStartDays.has(key)) return 'classes-start';
  if (examDays.has(key))     return 'exam';
  if (deadlineDays.has(key)) return 'deadline';
  if (holidayDays.has(key))  return 'holiday';
  return 'normal';
}

const BADGE_STYLES: Record<string, { bg: string; text: string; border?: string }> = {
  exam:      { bg: 'var(--accent-cs-bg)',  text: 'var(--accent-cs)'  },
  deadline:  { bg: 'var(--accent-ee-bg)',  text: 'var(--accent-ee)'  },
  milestone: { bg: 'var(--accent-ds-bg)',  text: 'var(--accent-ds)'  },
  info:      { bg: 'var(--color-bg-subtle)', text: 'var(--color-text-secondary)' },
};

const BORDER_COLORS: Record<string, string> = {
  exam:      'var(--accent-cs)',
  deadline:  'var(--accent-ee)',
  milestone: 'var(--accent-ds)',
};

const DAY_STYLES: Record<DayKind, { bg: string; color: string; fw?: string }> = {
  today:         { bg: 'var(--accent-cs)',      color: '#fff',                          fw: '600' },
  'classes-start':{ bg: 'var(--accent-ds)',     color: '#fff',                          fw: '600' },
  exam:          { bg: 'var(--accent-cs-bg)',    color: 'var(--accent-cs)',              fw: '500' },
  deadline:      { bg: 'var(--accent-ee-bg)',    color: 'var(--accent-ee)',              fw: '500' },
  holiday:       { bg: 'var(--accent-cy-bg)',    color: 'var(--accent-cy)',              fw: '500' },
  normal:        { bg: 'transparent',            color: 'var(--color-text-secondary)'             },
  empty:         { bg: 'transparent',            color: 'transparent'                             },
};

export default function SemesterPlanPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      <main className="md:hidden min-h-dvh flex flex-col bg-[var(--color-bg)]">
        <Header />
        <div className="flex flex-col flex-1 px-5 pb-28 pt-4 max-w-lg mx-auto w-full gap-10">
          <MobileHero />
          <KeyDatesSection />
          {mounted && <CalendarsSection />}
          <HolidaysSection />
        </div>
      </main>

      <div className="hidden md:flex min-h-dvh flex-col bg-[var(--color-bg)]">
        <Header />
        <div className="flex-1 w-full px-6 md:px-10 lg:px-12 xl:px-16 py-14">
          
          <DesktopHero />

          <div className="mt-12 flex flex-col gap-10 lg:flex-row lg:gap-8 xl:gap-12">
            
            {/* COLUMN 1: Key Dates (Left) */}
            <div className="flex-[1.2] min-w-0 flex flex-col gap-8">
              <KeyDatesSection />
            </div>

            {/* COLUMN 2: Holidays (Middle) */}
            <div className="flex-[0.6] min-w-[200px] hidden lg:flex flex-col">
              <HolidaysSection vertical />
            </div>

            {/* COLUMN 3: Calendars (Right) */}
            <aside className="flex-[1] min-w-[320px] lg:sticky lg:top-20 lg:self-start">
              <SectionLabel>Monthly calendars</SectionLabel>
              <section
                className="rounded-2xl border p-6 xl:p-7 flex flex-col gap-8"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-raised)',
                  boxShadow: 'var(--shadow-card), var(--border-inset)',
                }}
              >
                {mounted && <CalendarsSection compact hideLabel />}
                
                {/* Fallback for smaller desktop screens where middle column is hidden */}
                <div className="lg:hidden">
                    <div className="h-px mb-8" style={{ backgroundColor: 'var(--color-border)' }} />
                    <HolidaysSection compact />
                </div>
              </section>
            </aside>

          </div>
        </div>
        <div className="pb-20" />
      </div>
    </>
  );
}

function MobileHero() {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2">
        FAST NUCES · Islamabad
      </p>
      <h1 className="font-display text-3xl leading-tight text-[var(--color-text-primary)]">
        Semester Schedule<br /><span className="italic">{semesterCalendar.semester}.</span>
      </h1>
      <p className="mt-2 font-mono text-[11px] text-[var(--color-text-tertiary)]">
        Signed Jan 8, 2026
      </p>
    </div>
  );
}

function DesktopHero() {
  return (
    <div className="max-w-4xl">
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-tertiary)] mb-4">
        FAST NUCES · Islamabad · Signed Jan 8, 2026
      </p>
      <h1
        className="font-display leading-[1.1] text-[var(--color-text-primary)]"
        style={{ fontSize: 'clamp(2.2rem, 3.5vw, 3.6rem)' }}
      >
        Semester Schedule — <span className="italic">{semesterCalendar.semester}.</span>
      </h1>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-4 text-center">
      {children}
    </p>
  );
}

function KeyDatesSection() {
  const [mounted, setMounted] = useState(false);
  const [animatedItems, setAnimatedItems] = useState<number[]>([]);

  useEffect(() => {
    setMounted(true);
    KEY_DATES.forEach((_, index) => {
      setTimeout(() => {
        setAnimatedItems((prev) => [...prev, index]);
      }, 150 + index * 60);
    });
  }, []);

  return (
    <section>
      <style>{`
        .timeline-line {
          transform: scaleY(0);
          transform-origin: top;
          transition: transform 700ms ease-out;
        }
        .timeline-line.animate {
          transform: scaleY(1);
        }
        .timeline-item {
          opacity: 0;
          transform: translateY(8px);
          transition: all 400ms ease-out;
        }
        .timeline-item.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .timeline-marker {
          transform: scale(0);
          transition: transform 300ms ease-out;
        }
        .timeline-marker.visible {
          transform: scale(1);
        }
      `}</style>
      <SectionLabel>Key dates at a glance</SectionLabel>

      <div className="relative mt-4 pl-10">
        <div
          className={`absolute left-[16px] top-6 bottom-4 w-[2px] bg-[#E5E7EB] timeline-line ${mounted ? 'animate' : ''}`}
        />

        <div className="flex flex-col gap-6">
          {KEY_DATES.map((ev, i) => {
            const isVisible = animatedItems.includes(i);
            const badgeStyle = BADGE_STYLES[ev.type];
            const borderColor = BORDER_COLORS[ev.type] || 'var(--color-text-tertiary)';

            return (
              <div
                key={i}
                className={`relative flex items-center group timeline-item ${isVisible ? 'visible' : ''}`}
                style={{ marginBottom: '24px' }}
              >
                <div className="absolute -left-[29px] w-6 flex justify-center z-10">
                  <div
                    className={`w-[10px] h-[10px] rounded-full timeline-marker ${isVisible ? 'visible' : ''}`}
                    style={{
                      backgroundColor: borderColor,
                      boxShadow: `0 0 0 4px ${badgeStyle.bg}`,
                    }}
                  />
                </div>

                <div
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1 p-4 rounded-xl border bg-[var(--color-bg-raised)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-md"
                  style={{
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span
                      className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0"
                      style={{
                        backgroundColor: badgeStyle.bg,
                        color: badgeStyle.text,
                      }}
                    >
                      {ev.badge}
                    </span>
                    <span className="font-body text-sm text-[var(--color-text-primary)] font-medium leading-tight">
                      {ev.label}
                    </span>
                  </div>
                  <span className="font-mono text-[12px] text-[var(--color-text-tertiary)] shrink-0 sm:text-right pt-1 sm:pt-0">
                    {ev.date}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Derive the visible { year, month } tuples from the JSON's actual date range.
// Scans every date in keyDates, holidays, and academicRanges, then walks
// month-by-month from the earliest to the latest. Caps at 12 months to
// guard against malformed data. Handles year boundaries (e.g. Fall 2026
// spanning Aug 2026 → Jan 2027). Falls back to the current real-world
// month ± 2 if the JSON contains no usable dates.
function deriveVisibleMonths(calendar: SemesterCalendar): { year: number; month: number }[] {
  const isoDates: string[] = [];
  for (const k of calendar.keyDates) {
    isoDates.push(k.date);
    if (k.endDate) isoDates.push(k.endDate);
  }
  for (const h of calendar.holidays) {
    isoDates.push(h.date);
    if (h.endDate) isoDates.push(h.endDate);
  }
  for (const r of calendar.academicRanges) {
    isoDates.push(r.startDate);
    isoDates.push(r.endDate);
  }

  const parsed = isoDates
    .map((s) => {
      const [y, m, d] = s.split('-').map(Number);
      return Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)
        ? new Date(Date.UTC(y, m - 1, d))
        : null;
    })
    .filter((d): d is Date => d !== null);

  if (parsed.length === 0) {
    // Fallback: current month, previous month, next month
    const now = new Date();
    return [-1, 0, 1].map((offset) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  }

  let minDate = parsed[0];
  let maxDate = parsed[0];
  for (const d of parsed) {
    if (d < minDate) minDate = d;
    if (d > maxDate) maxDate = d;
  }

  const out: { year: number; month: number }[] = [];
  let y = minDate.getUTCFullYear();
  let m = minDate.getUTCMonth();
  const endY = maxDate.getUTCFullYear();
  const endM = maxDate.getUTCMonth();
  // Safety cap: 12 months max
  for (let i = 0; i < 12; i++) {
    out.push({ year: y, month: m });
    if (y === endY && m === endM) break;
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  return out;
}

function CalendarsSection({ compact = false, hideLabel = false }: { compact?: boolean; hideLabel?: boolean }) {
  // Months/years are now derived from the JSON's actual date range,
  // so the calendar grid auto-adapts to any semester shape (Spring Jan–Jun,
  // Summer Jun–Aug, Fall Aug–Jan, etc.) without code edits.
  const months = deriveVisibleMonths(semesterCalendar);

  return (
    <section>
      {!hideLabel && <SectionLabel>Monthly calendars</SectionLabel>}

      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6">
        {[
          { label: 'Classes start / Last day', bg: 'var(--accent-ds)',                                border: undefined },
          { label: 'Exam period',              bg: 'var(--accent-cs-bg)',                             border: 'var(--accent-cs)' },
          { label: 'Deadline',                 bg: 'var(--accent-ee-bg)',                             border: 'var(--accent-ee)' },
          { label: 'Holiday',                  bg: 'var(--accent-cy-bg)',                             border: 'var(--accent-cy)' },
          { label: 'Today',                    bg: 'var(--accent-cs)',                                border: undefined },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-[3px] shrink-0"
              style={{ background: l.bg, ...(l.border && { border: `1px solid ${l.border}` }) }}
            />
            <span className="font-mono text-[11px] text-[var(--color-text-secondary)]">{l.label}</span>
          </div>
        ))}
      </div>

      <div className={`grid gap-4 ${compact ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
        {months.map(({ year, month: mi }) => {
          const m1 = mi + 1;
          const firstDay = new Date(year, mi, 1).getDay();
          const daysInMonth = new Date(year, mi + 1, 0).getDate();
          const cells: { d: number | null; kind: DayKind }[] = [];

          for (let i = 0; i < firstDay; i++) cells.push({ d: null, kind: 'empty' });
          for (let d = 1; d <= daysInMonth; d++) cells.push({ d, kind: classifyDay(year, m1, d) });

          return (
            <div
              key={`${year}-${mi}`}
              className={`rounded-2xl border ${compact ? 'p-3' : 'p-4'}`}
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-raised)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <p className="font-mono text-xs font-semibold text-center text-[var(--color-text-primary)] mb-3">
                {MONTH_NAMES[mi]} {year}
              </p>
              <div className="grid grid-cols-7 gap-[2px] text-center">
                {DOW_SHORT.map((d) => (
                  <div key={d} className="font-mono text-[9px] text-[var(--color-text-tertiary)] pb-1">{d}</div>
                ))}
                {cells.map((cell, ci) => {
                  const s = DAY_STYLES[cell.kind];
                  return (
                    <div
                      key={ci}
                      className="aspect-square flex items-center justify-center rounded-[4px] font-mono text-[10px]"
                      style={{
                        background: s.bg,
                        color: s.color,
                        fontWeight: s.fw ?? '400',
                      }}
                    >
                      {cell.d ?? ''}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HolidaysSection({ compact = false, vertical = false }: { compact?: boolean; vertical?: boolean }) {
  return (
    <section>
      <SectionLabel>Holidays</SectionLabel>
      <div className={`grid gap-3 ${vertical ? 'grid-cols-1' : compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {HOLIDAYS.map((h, i) => (
          <div
            key={i}
            className="flex flex-col gap-1.5 px-5 py-4 rounded-xl border group transition-all duration-300 hover:shadow-sm"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-bg-subtle)',
            }}
          >
            <div className="flex items-center gap-2">
                <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: 'var(--accent-cy)' }}
                />
                <span className="font-body text-sm font-semibold text-[var(--color-text-primary)]">{h.name}</span>
                {h.lunar && (
                <span className="font-mono text-[9px] text-[var(--color-text-tertiary)] italic">(lunar)</span>
                )}
            </div>
            <span className="font-mono text-[11px] text-[var(--color-text-secondary)] pl-3.5">{h.date}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
