'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { downloadEventsICS } from '@/lib/export';
import { useMobileSwipe } from '@/hooks/useMobileSwipe';
import {
  DAY_NAMES,
  MONTH_NAMES,
  getCalendarCells,
  getCurrentAndNextMonth,
  getEventsForMonth,
  type CalendarCell,
  type CalendarEvent,
} from '@/lib/events';

interface EventsCalendarProps {
  initialMonth?: number;
  initialYear?: number;
  compact?: boolean;
}

function getMonthIndex(month: number, year: number): number {
  return year * 12 + month;
}

function stepMonth(month: number, year: number, delta: 1 | -1): { month: number; year: number } {
  const next = new Date(year, month + delta, 1);
  return { month: next.getMonth(), year: next.getFullYear() };
}

function EventDayDetail({
  day,
  month,
  year,
  events,
  onClose,
}: {
  day: number;
  month: number;
  year: number;
  events: CalendarEvent[];
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const { drawerRef, handleRef, backdropRef, closeDrawer } = useMobileSwipe({ onClose, defaultHeightStr: '85dvh' });

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!mounted) return null;

  const title = new Date(year, month, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const dotPalette = ['#378ADD', '#1D9E75', '#534AB7'] as const;

  return createPortal(
    <>
      <div
        ref={backdropRef}
        className="fixed inset-0 z-[60] bg-black/30 md:hidden animate-in fade-in duration-300 ease-out"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} events`}
        className="fixed z-[70] bottom-0 left-0 right-0 rounded-t-2xl overflow-y-auto md:bottom-0 md:top-14 md:left-auto md:right-0 md:w-[430px] md:rounded-none md:rounded-l-2xl md:max-h-[calc(100dvh-56px)] animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-300 ease-out h-[85dvh] md:h-auto"
        style={{
          backgroundColor: 'var(--color-bg-raised)',
          boxShadow: 'var(--shadow-float)',
        }}
      >
        <div ref={handleRef} className="md:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border-strong)] pointer-events-none" />
        </div>

        <div className="flex items-start justify-between px-5 pt-4 pb-3 md:pb-3 border-b md:border-b-0 border-[var(--color-border)]">
          <div>
            <span className="font-mono text-xs text-[var(--color-text-tertiary)]">Campus Events</span>
            <h2 className="mt-1 font-display text-xl leading-tight text-[var(--color-text-primary)]">{title}</h2>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => downloadEventsICS(events, `events-${day}-${month + 1}.ics`)}
              title="Export all events for this day"
              className="w-8 h-8 flex items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button
              onClick={closeDrawer}
              aria-label="Close"
              className="w-8 h-8 flex items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] focus-visible:outline-none focus-visible:ring-2"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="md:hidden px-5 pb-5">
          <div className="flex flex-col divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] overflow-hidden">
            {events.map((event, index) => (
              <article
                key={`${event.id ?? event.event_name}-${event.time}-${index}`}
                className="flex items-start gap-3 p-4 bg-[var(--color-bg-raised)]"
              >
                <span
                  className="mt-1 h-2 w-2 flex-none rounded-full"
                  style={{ backgroundColor: dotPalette[Math.min(index, dotPalette.length - 1)] }}
                  aria-hidden="true"
                />

                <div className="min-w-0 flex-1">
                  <p className="font-body text-sm font-medium leading-snug text-[var(--color-text-primary)]">
                    {event.event_name}
                  </p>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
                    {event.time}
                    <span className="px-1.5 text-[var(--color-text-tertiary)]" aria-hidden="true">
                      ·
                    </span>
                    {event.event_location || 'Location not provided'}
                  </p>
                </div>

                <button
                  onClick={() => downloadEventsICS([event], `${event.event_name.slice(0, 20)}.ics`)}
                  className="p-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
                  title="Add to calendar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M12 14v6"/><path d="M9 17h6"/></svg>
                </button>
              </article>
            ))}
          </div>
        </div>

        <div className="hidden px-5 pb-6 md:flex md:flex-col md:gap-3">
          {events.map((event, index) => (
            <article
              key={`${event.id ?? event.event_name}-${event.time}-${index}`}
              className="rounded-xl border px-4 py-3 group relative"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-raised)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-body text-sm font-medium text-[var(--color-text-primary)] leading-snug">
                    {event.event_name}
                  </p>
                  <p className="mt-2 font-mono text-[11px] text-[var(--color-text-secondary)]">{event.time}</p>
                </div>
                <button
                  onClick={() => downloadEventsICS([event], `${event.event_name.slice(0, 20)}.ics`)}
                  className="shrink-0 p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-all"
                  title="Add to calendar"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M12 14v6"/><path d="M9 17h6"/></svg>
                </button>
              </div>
              <p className="mt-1 font-mono text-[11px] text-[var(--color-text-tertiary)] flex items-start gap-1.5">
                <span aria-hidden="true">📍</span>
                <span className="leading-relaxed">{event.event_location || 'Location not provided'}</span>
              </p>
            </article>
          ))}
        </div>
      </div>
    </>,
    document.body
  );
}

export function EventsCalendar({ initialMonth, initialYear, compact = false }: EventsCalendarProps) {
  const now = useMemo(() => new Date(), []);
  const { current, next } = useMemo(() => getCurrentAndNextMonth(now), [now]);

  const initial = useMemo(() => {
    if (typeof initialMonth !== 'number' || typeof initialYear !== 'number') {
      return current;
    }

    const currentIndex = getMonthIndex(current.month, current.year);
    const nextIndex = getMonthIndex(next.month, next.year);
    const providedIndex = getMonthIndex(initialMonth, initialYear);

    if (providedIndex === currentIndex || providedIndex === nextIndex) {
      return { month: initialMonth, year: initialYear };
    }

    return current;
  }, [current, next, initialMonth, initialYear]);

  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [selectedDate, setSelectedDate] = useState<{ day: number; month: number; year: number } | null>(null);

  const currentIndex = getMonthIndex(current.month, current.year);
  const nextIndex = getMonthIndex(next.month, next.year);
  const viewIndex = getMonthIndex(month, year);

  const canGoPrev = viewIndex > currentIndex;
  const canGoNext = viewIndex < nextIndex;

  const eventsByDay = useMemo(() => getEventsForMonth(month, year, now), [month, year, now]);
  const prevMonthInfo = useMemo(() => stepMonth(month, year, -1), [month, year]);
  const nextMonthInfo = useMemo(() => stepMonth(month, year, 1), [month, year]);
  const prevEventsByDay = useMemo(
    () => getEventsForMonth(prevMonthInfo.month, prevMonthInfo.year, now),
    [prevMonthInfo, now]
  );
  const nextEventsByDay = useMemo(
    () => getEventsForMonth(nextMonthInfo.month, nextMonthInfo.year, now),
    [nextMonthInfo, now]
  );
  const cells = useMemo(() => getCalendarCells(month, year), [month, year]);

  function getEventsForCell(cell: CalendarCell): CalendarEvent[] {
    if (cell.inCurrentMonth) return eventsByDay[cell.day] ?? [];
    if (cell.month === prevMonthInfo.month && cell.year === prevMonthInfo.year) return prevEventsByDay[cell.day] ?? [];
    if (cell.month === nextMonthInfo.month && cell.year === nextMonthInfo.year) return nextEventsByDay[cell.day] ?? [];
    return [];
  }

  const selectedEvents = selectedDate
    ? getEventsForCell({
      day: selectedDate.day,
      month: selectedDate.month,
      year: selectedDate.year,
      inCurrentMonth: selectedDate.month === month && selectedDate.year === year,
    })
    : [];
  const monthEventCount = Object.values(eventsByDay).reduce((sum, events) => sum + events.length, 0);
  const chipPalette = [
    'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
    'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
  ] as const;
  const dotPalette = ['#378ADD', '#1D9E75', '#534AB7'] as const;

  function goPrev() {
    if (!canGoPrev) return;
    const prev = stepMonth(month, year, -1);
    setMonth(prev.month);
    setYear(prev.year);
    setSelectedDate(null);
  }

  function goNext() {
    if (!canGoNext) return;
    const nextMonthValue = stepMonth(month, year, 1);
    setMonth(nextMonthValue.month);
    setYear(nextMonthValue.year);
    setSelectedDate(null);
  }

  function renderDesktopCell(cell: CalendarCell, index: number) {
    const dayEvents = getEventsForCell(cell);
    const hasEvents = dayEvents.length > 0;
    const isToday =
      cell.day === now.getDate() &&
      cell.month === now.getMonth() &&
      cell.year === now.getFullYear();
    const isOverflowDay = !cell.inCurrentMonth;
    const previewLimit = compact ? 2 : 3;
    const baseClass = `group relative rounded-lg border text-left transition-all ${compact ? 'h-[70px] p-1.5' : 'h-[132px] lg:h-[142px] p-2.5'}`;
    const interactiveClass = hasEvents ? 'hover:-translate-y-[1px] hover:border-[var(--color-border-strong)]' : '';

    const content = (
      <>
        <span
          className={`absolute font-mono leading-none ${compact ? 'text-[10px] top-1.5 left-1.5' : 'text-sm top-2 left-2.5'} ${isToday && !isOverflowDay ? 'text-[#16c60c] dark:text-[#7CFC00]' : ''}`}
          style={{
            color: isOverflowDay ? 'var(--color-text-tertiary)' : (isToday ? undefined : 'var(--color-text-secondary)'),
            fontWeight: isToday ? '700' : '500',
            opacity: isOverflowDay ? 0.5 : 1,
          }}
        >
          {cell.day}
        </span>

        {hasEvents && (
          <span
            className={`absolute w-1.5 h-1.5 rounded-full ${compact ? 'top-1.5 right-1.5' : 'top-2.5 right-2.5'}`}
            style={{ backgroundColor: 'var(--accent-ds)', opacity: isOverflowDay ? 0.7 : 1 }}
            aria-hidden="true"
          />
        )}

        <div className={`flex flex-col gap-1 ${compact ? 'pt-3' : 'pt-5'}`}>
          {dayEvents.slice(0, previewLimit).map((event, eventIndex) => (
            <span
              key={`${event.id ?? event.event_name}-${event.time}-${eventIndex}`}
              className={`inline-block font-mono leading-tight rounded truncate ${compact ? 'text-[9px] px-1 py-0.5' : 'text-[11px] px-1.5 py-0.5'} ${chipPalette[Math.min(eventIndex, chipPalette.length - 1)]}`}
              style={{
                opacity: isOverflowDay ? 0.75 : 1,
              }}
            >
              {event.event_name}
            </span>
          ))}

          {dayEvents.length > previewLimit && (
            <span
              className={`font-mono text-[var(--color-text-tertiary)] ${compact ? 'text-[9px]' : 'text-[10px]'}`}
              style={{ opacity: isOverflowDay ? 0.7 : 1 }}
            >
              +{dayEvents.length - previewLimit} more
            </span>
          )}
        </div>
      </>
    );

    const commonStyle = {
      borderColor: isToday ? '#ff7a00' : 'var(--color-border)',
      backgroundColor: hasEvents ? 'var(--color-bg-raised)' : 'var(--color-bg-subtle)',
      boxShadow: isToday
        ? '0 0 0 1px rgba(255, 122, 0, 0.9), 0 0 14px rgba(255, 122, 0, 0.55), inset 0 0 0 1px rgba(255, 170, 90, 0.25)'
        : (hasEvents ? 'var(--shadow-card)' : 'none'),
      opacity: isOverflowDay ? 0.82 : 1,
    } as const;

    if (!hasEvents) {
      return (
        <div
          key={`desktop-day-${cell.year}-${cell.month}-${cell.day}-${index}`}
          className={baseClass}
          style={commonStyle}
        >
          {content}
        </div>
      );
    }

    return (
      <button
        key={`desktop-day-${cell.year}-${cell.month}-${cell.day}-${index}`}
        type="button"
        onClick={() => setSelectedDate({ day: cell.day, month: cell.month, year: cell.year })}
        className={`${baseClass} ${interactiveClass}`}
        style={commonStyle}
      >
        {content}
      </button>
    );
  }

  function renderMobileCell(cell: CalendarCell, index: number) {
    const dayEvents = getEventsForCell(cell);
    const hasEvents = dayEvents.length > 0;
    const isToday =
      cell.day === now.getDate() &&
      cell.month === now.getMonth() &&
      cell.year === now.getFullYear();
    const isOverflowDay = !cell.inCurrentMonth;
    const cellClasses = [
      'min-h-[54px] border-b border-r px-1 py-1 text-center transition-colors',
      hasEvents ? 'cursor-pointer active:bg-[var(--color-bg-subtle)]' : 'cursor-default',
      isToday ? 'bg-[color:rgba(55,138,221,0.07)]' : 'bg-[var(--color-bg-raised)]',
    ].join(' ');

    const numberClasses = [
      'inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] leading-none',
      isToday ? 'bg-[#378ADD] text-white' : '',
    ].join(' ');

    const content = (
      <>
        <div
          className="flex justify-center"
          style={{
            color: isOverflowDay ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
            opacity: isOverflowDay ? 0.45 : 1,
            fontWeight: 500,
          }}
        >
          <span className={numberClasses}>{cell.day}</span>
        </div>

        <div className="mt-1 flex min-h-[8px] items-center justify-center gap-1">
          {dayEvents.slice(0, 3).map((event, eventIndex) => (
            <span
              key={`${event.id ?? event.event_name}-${event.time}-${eventIndex}`}
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: dotPalette[Math.min(eventIndex, dotPalette.length - 1)],
                opacity: isOverflowDay ? 0.4 : 1,
              }}
              aria-hidden="true"
            />
          ))}

          {dayEvents.length > 3 && (
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: 'var(--color-text-tertiary)',
                opacity: isOverflowDay ? 0.25 : 0.5,
              }}
              aria-hidden="true"
            />
          )}
        </div>
      </>
    );

    if (!hasEvents) {
      return (
        <div
          key={`mobile-day-${cell.year}-${cell.month}-${cell.day}-${index}`}
          className={cellClasses}
          style={{ borderColor: 'var(--color-border)' }}
        >
          {content}
        </div>
      );
    }

    return (
      <button
        key={`mobile-day-${cell.year}-${cell.month}-${cell.day}-${index}`}
        type="button"
        onClick={() => setSelectedDate({ day: cell.day, month: cell.month, year: cell.year })}
        className={cellClasses}
        style={{ borderColor: 'var(--color-border)' }}
      >
        {content}
      </button>
    );
  }

  return (
    <section
      className={`rounded-2xl border ${compact ? 'p-4' : 'p-4 md:p-7'}`}
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-bg-raised)',
        boxShadow: 'var(--shadow-card), var(--border-inset)',
      }}
    >
      <div className={`flex items-center gap-3 ${compact ? 'mb-2' : 'mb-3 md:mb-4'}`}>
        <button
          onClick={goPrev}
          disabled={!canGoPrev}
          aria-label="Previous month"
          className="w-8 h-8 rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
        >
          <span aria-hidden="true">←</span>
        </button>

        <div className="flex-1 min-w-0 flex items-end justify-between gap-3">
          <h3 className={`font-display text-[var(--color-text-primary)] ${compact ? 'text-lg' : 'text-[clamp(1.8rem,2.6vw,2.5rem)] leading-none'}`}>
            {MONTH_NAMES[month]} {year}
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const allMonthEvents = Object.values(eventsByDay).flat();
                downloadEventsICS(allMonthEvents, `campus-events-${MONTH_NAMES[month]}-${year}.ics`);
              }}
              title="Export all events for this month"
              className={`flex items-center gap-1.5 font-mono text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors ${compact ? 'text-[9px]' : 'text-xs'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Export</span>
            </button>
            <span className={`font-mono text-[var(--color-text-tertiary)] whitespace-nowrap ${compact ? 'text-[10px]' : 'text-xs'}`}>
              {monthEventCount} event{monthEventCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <button
          onClick={goNext}
          disabled={!canGoNext}
          aria-label="Next month"
          className="w-8 h-8 rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className={`grid grid-cols-7 border-b border-[var(--color-border)] md:border-b-0 ${compact ? 'gap-1.5 mb-2' : 'gap-0 md:gap-2 mb-0 md:mb-3'}`}>
        {DAY_NAMES.map((dayName) => (
          <div
            key={dayName}
            className={`font-mono uppercase tracking-widest text-[var(--color-text-tertiary)] text-center py-1 ${compact ? 'text-[10px]' : 'text-[10px] md:text-xs'}`}
          >
            {dayName}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-l border-t border-[var(--color-border)] md:hidden">
        {cells.map((cell, index) => renderMobileCell(cell, index))}
      </div>

      <div className={`hidden md:grid md:grid-cols-7 ${compact ? 'md:gap-1.5' : 'md:gap-2'}`}>
        {cells.map((cell, index) => renderDesktopCell(cell, index))}
      </div>

      {selectedDate && selectedEvents.length > 0 && (
        <EventDayDetail
          day={selectedDate.day}
          month={selectedDate.month}
          year={selectedDate.year}
          events={selectedEvents}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </section>
  );
}
