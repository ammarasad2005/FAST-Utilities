'use client';
import { useState, useRef, useEffect } from 'react';
import { downloadTimetableCSV, downloadTimetableXLSX, downloadTimetableICS } from '@/lib/export';
import type { TimetableEntry } from '@/lib/types';

interface Props {
  entries: TimetableEntry[];
  variant?: 'header' | 'sidebar';
  isSummer?: boolean;
}

export function TimetableExportButton({ entries, variant = 'header', isSummer }: Props) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const baseHeader = 'font-mono text-xs px-3 h-8 rounded border border-[var(--color-border-strong)]';
  const baseSidebar = 'w-full h-10 rounded-md border border-[var(--color-border-strong)] font-body text-sm font-medium';

  if (entries.length === 0) {
    return (
      <button
        disabled
        className={`${variant === 'header' ? baseHeader : baseSidebar} text-[var(--color-text-secondary)] opacity-40`}
      >
        Export ↓
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Export timetable"
        aria-expanded={open}
        className={`${variant === 'header' ? baseHeader : baseSidebar} text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50`}
      >
        Export ↓
      </button>

      {open && (
        <div
          className={`absolute z-50 bg-[var(--color-bg-raised)] border border-[var(--color-border)] shadow-md rounded-md p-1 min-w-[160px] ${
            variant === 'header' ? 'top-full right-0 mt-1' : 'bottom-full left-0 mb-1 w-full'
          }`}
        >
          {[
            { label: 'as Calendar (.ics)', action: () => { downloadTimetableICS(entries, isSummer); setOpen(false); } },
            { label: 'as XLSX',            action: () => { downloadTimetableXLSX(entries); setOpen(false); } },
            { label: 'as CSV',             action: () => { downloadTimetableCSV(entries); setOpen(false); } },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              className="w-full text-left font-mono text-xs text-[var(--color-text-primary)] px-3 py-2 rounded-sm hover:bg-[var(--color-bg-subtle)] focus-visible:outline-none focus-visible:ring-2"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
