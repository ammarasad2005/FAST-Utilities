'use client';
import type { ExamEntry } from '@/lib/types';
import { getDaysUntil } from '@/lib/dates';
import { CountdownBadge } from './CountdownBadge';

interface Props {
  exam: ExamEntry;
  dept: string;
  onClick: () => void;
}

export function ExamCard({ exam, dept, onClick }: Props) {
  const accentColor = `var(--accent-${dept.toLowerCase()})`;
  const accentBg = `var(--accent-${dept.toLowerCase()}-bg)`;
  const daysUntil = getDaysUntil(exam.date);

  return (
    <button
      onClick={onClick}
      className="exam-card group relative overflow-hidden w-full text-left bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg p-4 flex flex-col gap-2 active:scale-[0.98] transition-all duration-100 focus-visible:outline-none focus-visible:ring-2"
      style={{ '--ring-color': accentColor, boxShadow: 'var(--shadow-card), var(--border-inset)' } as React.CSSProperties}
    onMouseOver={e => (e.currentTarget.style.boxShadow = 'var(--shadow-raised), var(--border-inset)')}
    onMouseOut={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card), var(--border-inset)')}
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-[5px] rounded-l-lg opacity-80 group-hover:opacity-100 transition-opacity duration-150"
        style={{ backgroundColor: accentColor }}
      />

      {/* Top row: course code + countdown */}
      <div className="flex items-center justify-between">
        <span
          className="font-mono text-xs font-medium px-2 py-0.5 rounded"
          style={{ backgroundColor: accentBg, color: accentColor }}
        >
          {exam.courseCode}
        </span>
        {daysUntil !== null && daysUntil >= 0 && (
          <CountdownBadge days={daysUntil} />
        )}
        {daysUntil !== null && daysUntil < 0 && (
          <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)]">
            Passed
          </span>
        )}
      </div>

      {/* Course name */}
      <p className="font-body text-sm font-medium text-[var(--color-text-primary)] leading-snug line-clamp-2">
        {exam.courseName}
      </p>

      {/* Time */}
      <p className="font-mono text-xs text-[var(--color-text-secondary)]">
        {exam.time}
      </p>

      {/* Room (summer only — only shown if present) */}
      {exam.room && (
        <p className="font-mono text-xs text-[var(--color-text-tertiary)]">
          Room: {exam.room}
        </p>
      )}

      {/* Sections (summer only — only shown if present and non-empty) */}
      {exam.sections && (
        <p className="font-mono text-[10px] text-[var(--color-text-tertiary)]">
          Sections: {exam.sections}
        </p>
      )}
    </button>
  );
}
