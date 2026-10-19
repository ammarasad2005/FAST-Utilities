'use client';
import { useState, useRef, useEffect } from 'react';
import { downloadTimetableCSV, downloadTimetableXLSX, downloadTimetableICS, downloadWeeklyTimetableImage } from '@/lib/export';
import type { TimetableEntry } from '@/lib/types';

export interface TimetableExportConfig {
  batch?: string;
  dept?: string;
  section?: string;
  semesterName?: string;
  isCustom?: boolean;
  isSummer?: boolean;
  todayDayName?: string;
}

interface Props {
  entries: TimetableEntry[];
  variant?: 'header' | 'sidebar';
  isSummer?: boolean;
  config?: TimetableExportConfig;
}

export function TimetableExportButton({ entries, variant = 'header', isSummer, config }: Props) {
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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

  const handleImageExport = async () => {
    setOpen(false);
    setIsExporting(true);
    try {
      await downloadWeeklyTimetableImage(entries, { ...config, isSummer });
    } catch (e) {
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={isExporting}
        aria-label="Export timetable"
        aria-expanded={open}
        className={`${variant === 'header' ? baseHeader : baseSidebar} text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50`}
      >
        {isExporting ? 'Generating...' : 'Export ↓'}
      </button>

      {open && (
        <div
          className={`absolute z-50 bg-[var(--color-bg-raised)] border border-[var(--color-border)] shadow-md rounded-md p-1 min-w-[160px] ${
            variant === 'header' ? 'top-full right-0 mt-1' : 'bottom-full left-0 mb-1 w-full'
          }`}
        >
          <button
            onClick={handleImageExport}
            className="w-full text-left font-mono text-xs text-[var(--color-text-primary)] px-3 py-2 rounded-sm hover:bg-[var(--color-bg-subtle)] focus-visible:outline-none focus-visible:ring-2"
          >
            as Image (PNG)
          </button>
          <button
            onClick={() => { downloadTimetableICS(entries, isSummer); setOpen(false); }}
            className="w-full text-left font-mono text-xs text-[var(--color-text-primary)] px-3 py-2 rounded-sm hover:bg-[var(--color-bg-subtle)] focus-visible:outline-none focus-visible:ring-2"
          >
            as Calendar (.ics)
          </button>
          <button
            onClick={() => { downloadTimetableXLSX(entries); setOpen(false); }}
            className="w-full text-left font-mono text-xs text-[var(--color-text-primary)] px-3 py-2 rounded-sm hover:bg-[var(--color-bg-subtle)] focus-visible:outline-none focus-visible:ring-2"
          >
            as XLSX
          </button>
          <button
            onClick={() => { downloadTimetableCSV(entries); setOpen(false); }}
            className="w-full text-left font-mono text-xs text-[var(--color-text-primary)] px-3 py-2 rounded-sm hover:bg-[var(--color-bg-subtle)] focus-visible:outline-none focus-visible:ring-2"
          >
            as CSV
          </button>
        </div>
      )}
    </div>
  );
}
