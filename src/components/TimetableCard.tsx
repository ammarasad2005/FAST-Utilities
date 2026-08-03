'use client';
import { useEffect, useRef, useState } from 'react';
import type { TimetableEntry } from '@/lib/types';
import { formatTimeRange } from '@/lib/timetable-filter';

interface Props {
  entry: TimetableEntry;
  dept: string;
  conflicting?: boolean;
  isRepeat?: boolean;
  onClick: () => void;
  onRemove?: () => void;
  onChangeSection?: (section: string) => void;
  availableSections?: string[];
  displayName?: string; // alias override for summer mode
}

export function TimetableCard({
  entry,
  dept,
  conflicting = false,
  isRepeat = false,
  onClick,
  onRemove,
  onChangeSection,
  availableSections = [],
  displayName,
}: Props) {
  const accentColor = `var(--accent-${dept.toLowerCase()})`;
  const accentBg    = `var(--accent-${dept.toLowerCase()}-bg)`;
  const stripColor = conflicting ? '#f87171' : entry.cancelled ? 'var(--color-text-tertiary)' : accentColor;
  const [isSectionMenuOpen, setIsSectionMenuOpen] = useState(false);
  const sectionMenuRef = useRef<HTMLDivElement | null>(null);

  const isLab = entry.type === 'lab';
  const canChangeSection = !!onChangeSection && availableSections.length > 0;

  useEffect(() => {
    if (!isSectionMenuOpen) return;
    const handler = (ev: MouseEvent) => {
      const target = ev.target as Node;
      if (sectionMenuRef.current && !sectionMenuRef.current.contains(target)) {
        setIsSectionMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [isSectionMenuOpen]);

  const hasActions = !!onRemove || canChangeSection;

  return (
    <div
      className={`timetable-card group relative overflow-hidden w-full text-left border border-[var(--color-border)] rounded-lg p-4 flex flex-col gap-2 active:scale-[0.98] transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 ${entry.cancelled ? 'opacity-65' : ''}`}
      style={{
        background: isRepeat
          ? 'linear-gradient(135deg, var(--color-bg-raised) 50%, color-mix(in srgb, var(--color-bg-raised) 80%, #f59e0b 20%))'
          : 'var(--color-bg-raised)',
        boxShadow: 'var(--shadow-card), var(--border-inset)',
      }}
      onMouseOver={e => (e.currentTarget.style.boxShadow = 'var(--shadow-raised), var(--border-inset)')}
      onMouseOut={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card), var(--border-inset)')}
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-[5px] rounded-l-lg opacity-80 group-hover:opacity-100 transition-opacity duration-150"
        style={{ backgroundColor: stripColor }}
      />

      <button type="button" onClick={onClick} className="text-left flex flex-col gap-2 w-full">
      {/* Top row: course name truncated + type badge */}
      <div className="flex items-center justify-between gap-2 overflow-hidden">
        <div className="flex gap-1.5 overflow-hidden shrink-0">
          {entry.department.includes('/') && (
            <span
              className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0 border border-[var(--color-border-strong)]"
              style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-primary)' }}
            >
              {entry.department}
            </span>
          )}
          <span
            className="font-mono text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
            style={{ backgroundColor: accentBg, color: accentColor }}
          >
            {entry.section}
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {entry.cancelled && (
            <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 shrink-0">
              🚫 Canceled
            </span>
          )}
          {isRepeat && (
            <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: 'color-mix(in srgb, transparent 80%, #f59e0b 20%)', color: '#b45309' }}>
              Repeat
            </span>
          )}
          {conflicting && (
            <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 shrink-0">
              ⚠ Conflict
            </span>
          )}
          {entry.exam && (
            <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 shrink-0">
              📅 Exam
            </span>
          )}
          {entry.rescheduled && (
            <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 shrink-0">
              ✨ Rescheduled
            </span>
          )}
          {!conflicting && !entry.rescheduled && !entry.exam && !entry.cancelled && (
            <span
              className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
              style={
                isLab
                  ? { backgroundColor: 'var(--accent-ds-bg)', color: 'var(--accent-ds)' }
                  : { backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-secondary)' }
              }
            >
              {isLab ? 'Lab' : 'Lecture'}
            </span>
          )}
        </div>
      </div>

      {/* Course name */}
      <p className={`font-body text-sm font-medium text-[var(--color-text-primary)] leading-snug line-clamp-2 ${entry.cancelled ? 'line-through opacity-80' : ''}`}>
        {displayName ?? entry.courseName}
      </p>

      {/* Time */}
      <p className="font-mono text-xs text-[var(--color-text-secondary)]">
        {formatTimeRange(entry.time)}
      </p>

      {/* Room */}
      <p className="font-mono text-[11px] text-[var(--color-text-tertiary)]">
        {entry.room === 'TBA' ? (
          <span className="italic">Room TBA</span>
        ) : (
          <>Room {entry.room}</>
        )}
      </p>

      </button>

      {hasActions && (
        <div className="pt-1 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
          <div className="relative" ref={sectionMenuRef}>
            {canChangeSection && (
              <button
                type="button"
                onClick={() => setIsSectionMenuOpen(v => !v)}
                className="h-8 px-3 rounded border border-[var(--color-border-strong)] font-mono text-[10px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
              >
                Change Section
              </button>
            )}

            {isSectionMenuOpen && canChangeSection && (
              <div className="absolute left-0 bottom-9 z-20 min-w-[10rem] rounded-md border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)] shadow-lg p-1">
                {availableSections.map(sectionOption => {
                  const isCurrent = sectionOption === entry.section;
                  return (
                    <button
                      key={sectionOption}
                      type="button"
                      onClick={() => {
                        onChangeSection(sectionOption);
                        setIsSectionMenuOpen(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded font-mono text-[10px] hover:bg-[var(--color-bg-subtle)] flex items-center justify-between gap-2"
                    >
                      <span>{sectionOption || 'Unspecified'}</span>
                      {isCurrent && <span className="text-[var(--color-text-tertiary)]">Current</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="h-8 px-3 rounded border border-[var(--color-border-strong)] font-mono text-[10px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              Remove ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}
