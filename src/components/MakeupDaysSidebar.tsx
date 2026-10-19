'use client';

import { useEffect } from 'react';
import { useMobileSwipe } from '@/hooks/useMobileSwipe';

interface MakeupDaysSidebarProps {
  onClose: () => void;
  makeupDays: { day: string; sheetName: string; date?: string; isoDate?: string; isMakeup?: boolean }[];
  monthName: string;
}

export function MakeupDaysSidebar({ onClose, makeupDays, monthName }: MakeupDaysSidebarProps) {
  const { drawerRef, handleRef, backdropRef, closeDrawer } = useMobileSwipe({ onClose, defaultHeightStr: '60dvh' });

  // Lock body scroll on mobile when sheet is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeDrawer]);

  return (
    <>
      {/* Backdrop — mobile only */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-30 bg-black/30 md:hidden animate-in fade-in duration-300 ease-out"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Sheet — bottom on mobile, right panel on desktop */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${monthName} Makeup Days`}
        className="fixed z-45 bottom-0 left-0 right-0 rounded-t-2xl overflow-y-auto md:bottom-0 md:top-14 md:left-auto md:right-0 md:w-96 md:rounded-none md:rounded-l-2xl md:max-h-[calc(100dvh-56px)] animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-300 ease-out h-[60dvh] md:h-auto"
        style={{
          backgroundColor: 'var(--color-bg-raised)',
          boxShadow: 'var(--shadow-float)',
        }}
      >
        {/* Drag handle (mobile only) */}
        <div ref={handleRef} className="md:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border-strong)] pointer-events-none" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-[var(--color-border)]">
          <div>
            <h2 className="font-display text-xl leading-tight font-bold">📅 {monthName} Makeup Days</h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              Makeup classes scheduled in this calendar month
            </p>
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

        {/* Content List */}
        <div className="px-5 py-4 flex flex-col gap-3">
          {makeupDays.map((d, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-bg-subtle)]/30 transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-mono text-sm font-bold text-[var(--color-text-primary)]">
                  {d.day}
                </span>
                <span className="font-mono text-xs text-[var(--color-text-secondary)] mt-0.5">
                  {d.sheetName}
                </span>
              </div>
              <span className="font-mono text-xs font-medium px-2.5 py-1 rounded bg-[var(--color-bg-subtle)] border border-[var(--color-border-strong)] text-[var(--color-text-secondary)]">
                {d.date || 'No Date'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
