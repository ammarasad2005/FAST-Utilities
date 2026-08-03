'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { downloadEventsICS } from '@/lib/export';
import { Navbar } from '@/components/Navbar';
import { FloatingMenu } from '@/components/FloatingMenu';
import { EventsCalendar } from '@/components/EventsCalendar';
import {
  MONTH_NAMES,
  getCurrentAndNextMonth,
  getEventsForMonth,
  type CalendarEvent,
} from '@/lib/events';

function parseStartMinutes(timeRange: string): number {
  const match = timeRange.match(/(\d{1,2}):(\d{2})\s*([ap]m)/i);
  if (!match) return Number.MAX_SAFE_INTEGER;

  let hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  const period = match[3].toLowerCase();

  if (period === 'pm' && hour !== 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;

  return hour * 60 + minute;
}

function parseSingleTimeMinutes(timeToken: string): number | null {
  const match = timeToken.trim().match(/(\d{1,2}):(\d{2})\s*([ap]m)/i);
  if (!match) return null;

  let hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  const period = match[3].toLowerCase();

  if (period === 'pm' && hour !== 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;

  return hour * 60 + minute;
}

function parseRangeMinutes(timeRange: string): { start: number; end: number } | null {
  const parts = timeRange.split(/\s*[-–—]\s*/);
  if (parts.length < 2) return null;

  const start = parseSingleTimeMinutes(parts[0]);
  const end = parseSingleTimeMinutes(parts[1]);
  if (start === null || end === null) return null;
  return { start, end };
}

function getEventKey(event: CalendarEvent): string {
  return `${event.id ?? 'na'}|${event.year}-${event.month}-${event.day}|${event.time}|${event.event_name}`;
}

export default function EventsPage() {
  const [clockMs, setClockMs] = useState(() => Date.now());
  const now = useMemo(() => new Date(clockMs), [clockMs]);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const { current, next } = getCurrentAndNextMonth(now);

  useEffect(() => {
    const timer = window.setInterval(() => setClockMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const currentMonthEvents = Object.values(
    getEventsForMonth(current.month, current.year, now)
  ).flat();
  const nextMonthEvents = Object.values(
    getEventsForMonth(next.month, next.year, now)
  ).flat();

  const ongoingEvents = currentMonthEvents
    .filter((event: CalendarEvent) => {
      const eventDate = new Date(event.year, event.month, event.day);
      if (eventDate.getTime() !== todayStart.getTime()) return false;

      const range = parseRangeMinutes(event.time);
      if (!range) return false;

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      return currentMinutes >= range.start && currentMinutes < range.end;
    })
    .sort((a: CalendarEvent, b: CalendarEvent) => parseStartMinutes(a.time) - parseStartMinutes(b.time));
  const ongoingKeys = new Set(ongoingEvents.map(getEventKey));

  const upcomingEvents = [...currentMonthEvents, ...nextMonthEvents]
    .filter((event: CalendarEvent) => {
      const eventDate = new Date(event.year, event.month, event.day);
      if (eventDate.getTime() < todayStart.getTime()) return false;
      return !ongoingKeys.has(getEventKey(event));
    })
    .sort((a: CalendarEvent, b: CalendarEvent) => {
      const dayDiff = new Date(a.year, a.month, a.day).getTime() - new Date(b.year, b.month, b.day).getTime();
      if (dayDiff !== 0) return dayDiff;
      return parseStartMinutes(a.time) - parseStartMinutes(b.time);
    })
    .slice(0, 10);

  return (
    <>
      <main className="md:hidden min-h-dvh flex flex-col bg-[var(--color-bg)]">
        <Header />
        <div className="flex flex-col flex-1 px-4 pb-28 pt-4 gap-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2 events-panel-enter" style={{ animationDelay: '20ms' }}>
            FAST NUCES · Islamabad
          </p>
          <h1 className="font-display text-3xl leading-tight text-[var(--color-text-primary)] events-hero-enter" style={{ animationDelay: '60ms' }}>
            Campus Events
          </h1>
          <p className="mt-2 font-body text-sm text-[var(--color-text-secondary)] leading-relaxed events-panel-enter" style={{ animationDelay: '110ms' }}>
            Student-relevant events at Campus, updated weekly.
          </p>

          <div className="grid grid-cols-3 gap-2 events-panel-enter" style={{ animationDelay: '160ms' }}>
            <div className="rounded-xl border p-2.5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-raised)' }}>
              <p className="font-mono text-[9px] text-[var(--color-text-tertiary)] uppercase tracking-widest">This Month</p>
              <p className="font-mono text-lg text-[var(--color-text-primary)] mt-1">{currentMonthEvents.length}</p>
            </div>
            <div className="rounded-xl border p-2.5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-raised)' }}>
              <p className="font-mono text-[9px] text-[var(--color-text-tertiary)] uppercase tracking-widest">Next Month</p>
              <p className="font-mono text-lg text-[var(--color-text-primary)] mt-1">{nextMonthEvents.length}</p>
            </div>
            <div className="rounded-xl border p-2.5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-raised)' }}>
              <p className="font-mono text-[9px] text-[var(--color-text-tertiary)] uppercase tracking-widest">Tracked</p>
              <p className="font-mono text-lg text-[var(--color-text-primary)] mt-1">{upcomingEvents.length}</p>
            </div>
          </div>

          <div className="events-hero-enter" style={{ animationDelay: '220ms' }}>
            <EventsCalendar />
          </div>

          {ongoingEvents.length > 0 && (
            <section
              className="rounded-2xl border p-4 events-panel-enter"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-raised)',
                boxShadow: 'var(--shadow-card), var(--border-inset)',
                animationDelay: '260ms',
              }}
            >
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-3">
                Ongoing Snapshot
              </h2>
              <div className="flex flex-col gap-3">
                {ongoingEvents.map((event, index) => (
                  <article
                    key={`ongoing-mobile-${event.id ?? event.event_name}-${event.time}-${index}`}
                    className="rounded-xl border px-4 py-3 group relative events-item-enter"
                    style={{ 
                      borderColor: 'var(--color-border)', 
                      backgroundColor: 'var(--color-bg-raised)',
                      boxShadow: 'var(--shadow-card)',
                      animationDelay: `${280 + index * 40}ms` 
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="font-body text-sm font-medium text-[var(--color-text-primary)] leading-snug">
                            {event.event_name}
                          </p>
                          <p className="mt-2 font-mono text-[10px] text-[var(--color-text-secondary)]">
                            {event.time}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadEventsICS([event], `${event.event_name.slice(0, 20)}.ics`)}
                        className="shrink-0 p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-all"
                        title="Add to calendar"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M12 14v6"/><path d="M9 17h6"/></svg>
                      </button>
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-[var(--color-text-tertiary)] flex items-start gap-1.5 pl-4">
                      <span aria-hidden="true">📍</span>
                      <span className="leading-relaxed">{event.event_location || 'Location not provided'}</span>
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section
            className="rounded-2xl border p-4 events-panel-enter"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-bg-raised)',
              boxShadow: 'var(--shadow-card), var(--border-inset)',
              animationDelay: ongoingEvents.length > 0 ? '330ms' : '290ms',
            }}
          >
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-3">
              Upcoming Snapshot
            </h2>
            <div className="flex flex-col gap-3">
              {upcomingEvents.slice(0, 6).map((event, index) => (
                <article
                  key={`${event.id ?? event.event_name}-${event.time}-${index}`}
                  className="rounded-xl border px-4 py-3 group relative events-item-enter"
                  style={{ 
                    borderColor: 'var(--color-border)', 
                    backgroundColor: 'var(--color-bg-raised)',
                    boxShadow: 'var(--shadow-card)',
                    animationDelay: `${330 + index * 40}ms` 
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-body text-sm font-medium text-[var(--color-text-primary)] leading-snug">{event.event_name}</p>
                      <p className="mt-2 font-mono text-[10px] text-[var(--color-text-secondary)]">
                        {MONTH_NAMES[event.month].slice(0, 3)} {event.day} · {event.time}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadEventsICS([event], `${event.event_name.slice(0, 20)}.ics`)}
                      className="shrink-0 p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-all"
                      title="Add to calendar"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M12 14v6"/><path d="M9 17h6"/></svg>
                    </button>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-[var(--color-text-tertiary)] flex items-start gap-1.5">
                    <span aria-hidden="true">📍</span>
                    <span className="leading-relaxed">{event.event_location || 'Location not provided'}</span>
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>

      <div className="hidden md:flex min-h-dvh flex-col bg-[var(--color-bg)]">
        <Header />

        <div className="flex-1 w-full px-7 lg:px-12 xl:px-16 py-8 lg:py-10">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-8 h-full">
            <section className="min-w-0 flex flex-col">
              <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2 events-panel-enter" style={{ animationDelay: '20ms' }}>
                FAST NUCES · Islamabad
              </p>
              <h1 className="font-display text-[clamp(2.4rem,3.5vw,3.6rem)] leading-tight text-[var(--color-text-primary)] events-hero-enter" style={{ animationDelay: '70ms' }}>
                Campus Events
              </h1>
              <p className="mt-3 font-body text-[17px] text-[var(--color-text-secondary)] leading-relaxed max-w-3xl events-panel-enter" style={{ animationDelay: '130ms' }}>
                Student-relevant events at Campus, updated weekly. Browse this month and next month at full scale.
              </p>

              <div
                className="mt-7 flex-1 min-h-0 rounded-3xl border p-3 lg:p-4 events-hero-enter"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'linear-gradient(165deg, color-mix(in srgb, var(--color-bg-raised) 90%, white), var(--color-bg-raised) 60%)',
                  boxShadow: 'var(--shadow-float), var(--border-inset)',
                  animationDelay: '200ms',
                }}
              >
                <EventsCalendar />
              </div>
            </section>

            <aside className="space-y-4 xl:sticky xl:top-20 self-start">
              {ongoingEvents.length > 0 && (
                <section
                  className="rounded-2xl border p-4 events-panel-enter"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-bg-raised)',
                    boxShadow: 'var(--shadow-card), var(--border-inset)',
                    animationDelay: '250ms',
                  }}
                >
                  <h2 className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-3">
                    Ongoing Events
                  </h2>
                  <div className="flex flex-col gap-3">
                    {ongoingEvents.map((event, index) => (
                      <article
                        key={`ongoing-${event.id ?? event.event_name}-${event.time}-${index}`}
                        className="rounded-xl border px-4 py-3 group relative events-item-enter"
                        style={{ 
                          borderColor: 'var(--color-border)', 
                          backgroundColor: 'var(--color-bg-raised)',
                          boxShadow: 'var(--shadow-card)',
                          animationDelay: `${270 + index * 35}ms` 
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="mt-1.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" aria-hidden="true" />
                            <div className="min-w-0">
                              <p className="font-body text-sm font-medium text-[var(--color-text-primary)] leading-snug">
                                {event.event_name}
                              </p>
                              <p className="mt-2 font-mono text-[10px] text-[var(--color-text-secondary)]">
                                {event.time}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => downloadEventsICS([event], `${event.event_name.slice(0, 20)}.ics`)}
                            className="shrink-0 p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-all"
                            title="Add to calendar"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M12 14v6"/><path d="M9 17h6"/></svg>
                          </button>
                        </div>
                        <p className="mt-1 font-mono text-[10px] text-[var(--color-text-tertiary)] flex items-start gap-1.5 pl-4">
                          <span aria-hidden="true">📍</span>
                          <span className="leading-relaxed">{event.event_location || 'Location not provided'}</span>
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              <section
                className="rounded-2xl border p-4 events-panel-enter"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-raised)',
                  boxShadow: 'var(--shadow-card), var(--border-inset)',
                  animationDelay: '320ms',
                }}
              >
                <h2 className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-3">
                  Upcoming Snapshot
                </h2>
                <div className="flex flex-col gap-3 max-h-[54dvh] overflow-auto pr-1">
                  {upcomingEvents.map((event, index) => (
                    <article
                      key={`${event.id ?? event.event_name}-${event.time}-${index}`}
                      className="rounded-xl border px-4 py-3 group relative events-item-enter"
                      style={{ 
                        borderColor: 'var(--color-border)', 
                        backgroundColor: 'var(--color-bg-raised)',
                        boxShadow: 'var(--shadow-card)',
                        animationDelay: `${360 + index * 45}ms` 
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-body text-sm font-medium text-[var(--color-text-primary)] leading-snug">{event.event_name}</p>
                          <p className="mt-2 font-mono text-[10px] text-[var(--color-text-secondary)]">
                            {MONTH_NAMES[event.month].slice(0, 3)} {event.day} · {event.time}
                          </p>
                        </div>
                        <button
                          onClick={() => downloadEventsICS([event], `${event.event_name.slice(0, 20)}.ics`)}
                          className="shrink-0 p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-all"
                          title="Add to calendar"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M12 14v6"/><path d="M9 17h6"/></svg>
                        </button>
                      </div>
                      <p className="mt-1 font-mono text-[10px] text-[var(--color-text-tertiary)] flex items-start gap-1.5">
                        <span aria-hidden="true">📍</span>
                        <span className="leading-relaxed">{event.event_location || 'Location not provided'}</span>
                      </p>
                    </article>
                  ))}
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
