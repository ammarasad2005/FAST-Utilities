'use client';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { Header } from '@/components/Header';
import { TimetableOptimizer } from '@/components/TimetableOptimizer';

function OptimizerPageInner() {
  const router = useRouter();

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      {/* ── Sticky header ── */}
      <Header>
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
          <div className="flex-1 min-w-0">
            <span className="font-mono text-sm font-medium text-[var(--color-text-primary)]">Timetable Optimizer</span>
          </div>
        </div>
      </Header>

      <div className="flex-1 px-4 md:px-8 py-8 md:py-10 max-w-5xl mx-auto w-full pb-[200px]">
        <TimetableOptimizer />
      </div>
    </div>
  );
}

export default function OptimizerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center">
        <p className="font-mono text-sm text-[var(--color-text-tertiary)]">Loading…</p>
      </div>
    }>
      <OptimizerPageInner />
    </Suspense>
  );
}
