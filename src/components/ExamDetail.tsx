'use client';
import { useEffect } from 'react';
import { generateICS } from '@/lib/export';
import { getDaysUntil, formatDate } from '@/lib/dates';
import type { ExamEntry } from '@/lib/types';
import { useMobileSwipe } from '@/hooks/useMobileSwipe';

interface Props {
  exam: ExamEntry;
  dept: string;
  onClose: () => void;
}

export function ExamDetail({ exam, dept, onClose }: Props) {
  const { drawerRef, handleRef, backdropRef, closeDrawer } = useMobileSwipe({ onClose, defaultHeightStr: '85dvh' });

  // Lock body scroll on mobile when sheet is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const accentColor = `var(--accent-${dept.toLowerCase()})`;
  const accentBg = `var(--accent-${dept.toLowerCase()}-bg)`;
  const daysUntil = getDaysUntil(exam.date);

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-30 bg-black/30 md:hidden animate-in fade-in duration-300 ease-out"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Sheet — mobile: fixed bottom; desktop: fixed right panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${exam.courseName} exam details`}
        className="fixed z-40 bottom-0 left-0 right-0 rounded-t-2xl overflow-y-auto md:bottom-0 md:top-14 md:left-auto md:right-0 md:w-96 md:rounded-none md:rounded-l-2xl md:max-h-[calc(100dvh-56px)] animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-300 ease-out h-[85dvh] md:h-auto"
        style={{
          backgroundColor: 'var(--color-bg-raised)',
          boxShadow: 'var(--shadow-float)',
        }}
      >
        <div ref={handleRef} className="md:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border-strong)] pointer-events-none" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-3">
          <div>
            <span
              className="font-mono text-xs font-medium px-2 py-0.5 rounded"
              style={{ backgroundColor: accentBg, color: accentColor }}
            >
              {exam.courseCode}
            </span>
            <h2 className="mt-2 font-display text-xl leading-tight">{exam.courseName}</h2>
          </div>
          <button
            onClick={closeDrawer}
            aria-label="Close"
            className="ml-4 mt-1 w-8 h-8 flex items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] focus-visible:outline-none focus-visible:ring-2"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Detail rows */}
        <div className="px-5 pb-5">
          <div className="flex flex-col divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] overflow-hidden">
            {[
              { label: 'Date', value: `${exam.day}, ${formatDate(exam.date)}` },
              { label: 'Time', value: exam.time },
              { label: 'Batch', value: exam.batch },
              { label: 'Department', value: exam.department },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3 bg-[var(--color-bg-raised)]">
                <span className="font-mono text-xs text-[var(--color-text-secondary)]">{label}</span>
                <span className="font-mono text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>

          {/* Countdown callout */}
          {daysUntil !== null && (
            <div
              className="mt-4 px-4 py-3 rounded-md text-sm font-medium"
              style={{ backgroundColor: accentBg, color: accentColor }}
            >
              {daysUntil === 0 && 'Exam is today — good luck!'}
              {daysUntil === 1 && 'Exam is tomorrow.'}
              {daysUntil > 1 && `${daysUntil} days until this exam.`}
              {daysUntil < 0 && 'This exam has passed.'}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={() => generateICS(exam)}
              className="w-full h-11 rounded-md border border-[var(--color-border-strong)] font-body text-sm font-medium text-[var(--color-text-primary)] active:scale-[0.98] transition-transform hover:bg-[var(--color-bg-subtle)] focus-visible:outline-none focus-visible:ring-2"
            >
              Add to calendar (.ics)
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
