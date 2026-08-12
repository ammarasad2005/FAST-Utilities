'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  getSemesterStartDate,
  getSemesterEndDate,
  getFinalExamsEndDate,
  getSemesterWeekNumber,
  getSemesterProgress,
  getSemesterMilestones,
  formatMonthsWeeksDays,
  daysUntil,
} from '@/lib/dates';

interface SemesterTimelineProps {
  semesterName?: string;
}

type Phase = 'before' | 'live' | 'final' | 'complete';

// ── Color interpolation: green → amber → red ──
// Concept palette: #7D8797 (void) → #18A36B (start) → #DCA12D (middle) → #D94A59 (end)
function interpolateColor(pct: number): string {
  if (pct <= 0) return '#7d8797'; // void
  if (pct >= 100) return '#d94a59'; // end red

  const stops = [
    { p: 0,   r: 0x18, g: 0xa3, b: 0x6b }, // #18A36B green
    { p: 50,  r: 0xdc, g: 0xa1, b: 0x2d }, // #DCA12D amber
    { p: 100, r: 0xd9, g: 0x4a, b: 0x59 }, // #D94A59 red
  ];

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i + 1];
    if (pct >= a.p && pct <= b.p) {
      const t = (pct - a.p) / (b.p - a.p);
      const r = Math.round(a.r + (b.r - a.r) * t);
      const g = Math.round(a.g + (b.g - a.g) * t);
      const bl = Math.round(a.b + (b.b - a.b) * t);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
    }
  }
  return '#18a36b';
}

function formatDurationText(d: { months: number; weeks: number; days: number }): string {
  const parts: string[] = [];
  if (d.months > 0) parts.push(`${d.months} month${d.months !== 1 ? 's' : ''}`);
  if (d.weeks > 0) parts.push(`${d.weeks} week${d.weeks !== 1 ? 's' : ''}`);
  parts.push(`${d.days} day${d.days !== 1 ? 's' : ''}`);
  return parts.join(' · ');
}

export function SemesterTimeline({ semesterName }: SemesterTimelineProps) {
  const [now, setNow] = useState(new Date());
  const [expanded, setExpanded] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Update every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Close on outside click + Escape
  useEffect(() => {
    if (!expanded) return;
    const handleClick = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [expanded]);

  const data = useMemo(() => {
    const startISO = getSemesterStartDate();
    const endISO = getSemesterEndDate();
    const finalsEndISO = getFinalExamsEndDate();
    if (!startISO || !endISO) return null;

    const progress = getSemesterProgress(now) ?? 0;
    const weekNum = getSemesterWeekNumber(now);
    const milestones = getSemesterMilestones();
    const daysToStart = daysUntil(startISO, now);
    const daysToEnd = daysUntil(endISO, now);
    const duration = formatMonthsWeeksDays(startISO, endISO, now);

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const start = new Date(startISO + 'T00:00:00');
    const end = new Date(endISO + 'T00:00:00');
    const finalsEnd = finalsEndISO ? new Date(finalsEndISO + 'T00:00:00') : end;
    const totalWeeks = Math.max(1, Math.round((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));

    let phase: Phase;
    if (today < start) phase = 'before';
    else if (today > finalsEnd) phase = 'complete';
    else if (progress >= 80) phase = 'final';
    else phase = 'live';

    const clampedPct = Math.max(0, Math.min(100, progress));
    const barColor = interpolateColor(clampedPct);

    let statusText: string;
    let primaryText: string;
    let metaText: string;
    let detailValue: string;
    let detailCaption: string;

    if (phase === 'before') {
      statusText = 'PRE-SEMESTER';
      primaryText = `${daysToStart}d to start`;
      metaText = `Begins ${start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
      detailValue = formatDurationText(duration);
      detailCaption = 'until the semester begins';
    } else if (phase === 'complete') {
      statusText = 'COMPLETE';
      primaryText = 'Semester complete';
      metaText = `100%`;
      detailValue = formatDurationText(duration);
      detailCaption = 'total semester duration';
    } else if (phase === 'final') {
      statusText = 'FINAL STRETCH';
      primaryText = `${daysToEnd}d left`;
      metaText = `Week ${weekNum} of ${totalWeeks} · ${Math.round(clampedPct)}%`;
      const remMonths = Math.floor(daysToEnd / 30.44);
      const remDaysAfter = daysToEnd - Math.floor(remMonths * 30.44);
      const remWeeks = Math.floor(remDaysAfter / 7);
      const remDays = remDaysAfter - remWeeks * 7;
      detailValue = formatDurationText({ months: remMonths, weeks: remWeeks, days: remDays });
      detailCaption = 'remaining until the semester ends';
    } else {
      statusText = 'IN SESSION';
      primaryText = `Week ${weekNum}`;
      metaText = `${weekNum} of ${totalWeeks} · ${Math.round(clampedPct)}%`;
      detailValue = formatDurationText(duration);
      detailCaption = 'elapsed since the semester began';
    }

    return {
      startISO, endISO, finalsEndISO, phase, clampedPct, barColor,
      milestones, weekNum, statusText, primaryText, metaText,
      detailValue, detailCaption,
    };
  }, [now]);

  if (!data) return null;

  const { phase, clampedPct, barColor, milestones, statusText, primaryText, metaText, detailValue, detailCaption, startISO, endISO, finalsEndISO } = data;

  const startDateObj = new Date(startISO + 'T00:00:00');
  const endDateObj = new Date((finalsEndISO || endISO) + 'T00:00:00');
  const todayStr = new Date(now).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="relative hidden md:block flex-1 max-w-[560px]" ref={widgetRef}>
      {/* ── Capsule — shares header baseline, laser-rail gradient on arc ── */}
      <div
        className="relative h-[60px] flex flex-col justify-center semester-timeline-capsule"
        style={{
          padding: '8px 20px 8px',
          backgroundColor: 'var(--color-bg-raised)',
          border: 'none',
          borderRadius: '14px 14px 0 0',
          boxShadow: '0 -2px 8px rgba(35, 47, 67, 0.06)',
          // CSS var for milestone tick color
          ['--bar-color' as string]: barColor,
        }}
      >
        {/* Summary row (clickable button) */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between gap-3 bg-transparent border-0 cursor-pointer text-left p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)] rounded-md"
          aria-expanded={expanded}
          aria-label={`${primaryText}. ${metaText}. Open exact timeline breakdown.`}
        >
          {/* Left: orb + status + primary */}
          <span className="flex items-center gap-2 min-w-0">
            {/* Live orb */}
            <span
              className="w-[8px] h-[8px] rounded-full shrink-0 transition-colors duration-300"
              style={{
                backgroundColor: barColor,
                boxShadow: `0 0 0 3px ${barColor}26`,
              }}
            />
            <span className="min-w-0">
              <span
                className="block font-mono font-bold tracking-widest leading-none"
                style={{ fontSize: '7px', color: 'var(--color-text-tertiary)', letterSpacing: '0.12em', marginBottom: '1px' }}
              >
                {statusText}
              </span>
              <span
                className="block font-bold truncate leading-tight"
                style={{ fontSize: '13px', color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}
              >
                {primaryText}
              </span>
            </span>
          </span>

          {/* Right: meta + chevron */}
          <span
            className="flex items-center gap-1.5 shrink-0 font-mono"
            style={{ color: 'var(--color-text-secondary)', fontSize: '9px', fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            <span>{metaText}</span>
            <svg
              className="transition-transform duration-200"
              style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
              width="12" height="12" viewBox="0 0 24 24" fill="none"
            >
              <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>

        {/* Progress track with milestones */}
        <div className="relative mt-[5px]">
          <div
            className="relative h-[5px] rounded-full"
            style={{ backgroundColor: 'var(--color-bg-subtle)' }}
            role="progressbar"
            aria-label="Semester progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clampedPct)}
            aria-valuetext={`${Math.round(clampedPct)} percent complete`}
          >
            {/* Fill — single solid color + sheen */}
            <div
              className="h-full rounded-full relative overflow-hidden transition-all duration-500"
              style={{ width: `${clampedPct}%`, backgroundColor: barColor }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  backgroundSize: '15% 100%',
                  animation: 'timelineSheen 3.2s infinite linear',
                }}
              />
            </div>

            {/* Milestone tick marks */}
            {milestones.map((m) => {
              const reached = clampedPct >= m.progressPercent && clampedPct > 0;
              return (
                <button
                  key={m.shortLabel}
                  className="absolute top-[-4px] w-[14px] h-[14px] bg-transparent border-0 rounded-full cursor-help p-0 group/milestone"
                  style={{ left: `${m.progressPercent}%`, transform: 'translateX(-50%)' }}
                  aria-label={`${m.label}, ${new Date(m.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                >
                  <span
                    className="absolute top-[2px] left-1/2 -translate-x-1/2 rounded-full"
                    style={{
                      width: '2px',
                      height: '9px',
                      backgroundColor: reached ? barColor : 'var(--color-text-tertiary)',
                      border: '2px solid var(--color-bg-raised)',
                      boxShadow: '0 1px 2px rgba(20,28,40,0.22)',
                      boxSizing: 'content-box',
                    }}
                  />
                  <span
                    className="absolute top-[18px] left-1/2 -translate-x-1/2 z-10 px-2 py-1 rounded-md pointer-events-none opacity-0 group-hover/milestone:opacity-100 group-focus-visible/milestone:opacity-100 transition-opacity duration-150"
                    style={{
                      backgroundColor: 'var(--color-text-primary)',
                      color: 'var(--color-bg)',
                      fontSize: '9px',
                      fontWeight: 700,
                      lineHeight: 1.35,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.label} · {new Date(m.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Popover (expanded detail) — overlays below, doesn't shift layout ── */}
      {expanded && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 rounded-2xl border shadow-xl"
          style={{
            width: '320px',
            backgroundColor: 'var(--color-bg-raised)',
            borderColor: 'var(--color-border-strong)',
            padding: '16px',
            animation: 'timelinePopoverIn 180ms ease',
            transformOrigin: 'top center',
          }}
        >
          {/* Pointing arrow */}
          <div
            className="absolute top-[-6px] left-1/2 -translate-x-1/2 w-[11px] h-[11px] rotate-45"
            style={{
              backgroundColor: 'var(--color-bg-raised)',
              borderTop: '1px solid var(--color-border-strong)',
              borderLeft: '1px solid var(--color-border-strong)',
            }}
          />

          {/* Header row */}
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div
                className="font-mono font-bold uppercase tracking-widest"
                style={{ fontSize: '9px', color: 'var(--color-text-tertiary)', letterSpacing: '0.12em' }}
              >
                Exact breakdown
              </div>
              <div
                className="mt-1 font-bold leading-tight"
                style={{ fontSize: '18px', color: 'var(--color-text-primary)', letterSpacing: '-0.03em' }}
              >
                {detailValue}
              </div>
              <div className="mt-1" style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                {detailCaption}
              </div>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="w-[24px] h-[24px] grid place-items-center rounded-lg cursor-pointer border-0 shrink-0 ml-2"
              style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-secondary)' }}
              aria-label="Close timeline details"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Date row: 3 columns */}
          <div className="grid grid-cols-3 mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div className="px-2" style={{ borderRight: '1px solid var(--color-border)' }}>
              <small className="block mb-1 font-mono font-bold uppercase tracking-widest" style={{ fontSize: '8px', color: 'var(--color-text-tertiary)', letterSpacing: '0.1em' }}>
                Start
              </small>
              <strong style={{ fontSize: '11px', color: 'var(--color-text-primary)' }}>
                {startDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </strong>
            </div>
            <div className="px-2" style={{ borderRight: '1px solid var(--color-border)' }}>
              <small className="block mb-1 font-mono font-bold uppercase tracking-widest" style={{ fontSize: '8px', color: 'var(--color-text-tertiary)', letterSpacing: '0.1em' }}>
                Today
              </small>
              <strong style={{ fontSize: '11px', color: 'var(--color-text-primary)' }}>
                {todayStr}
              </strong>
            </div>
            <div className="px-2">
              <small className="block mb-1 font-mono font-bold uppercase tracking-widest" style={{ fontSize: '8px', color: 'var(--color-text-tertiary)', letterSpacing: '0.1em' }}>
                End
              </small>
              <strong style={{ fontSize: '11px', color: 'var(--color-text-primary)' }}>
                {endDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
