'use client';
import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  buildRoomCalendar,
  getAvailableRooms,
  buildFullCalendar,
  groupRoomsByBlock,
  STANDARD_SLOTS,
  DAYS_OF_WEEK,
  type RoomAvailability,
  type CalendarCell,
} from '@/lib/room-logic';
import type { RawTimetableJSON } from '@/lib/types';
import { useMobileSwipe } from '@/hooks/useMobileSwipe';

// eslint-disable-next-line
const timetableRaw: RawTimetableJSON = require('../../../public/data/timetable.json');

// Build room calendar once at module level — it's pure and cheap to cache
const ROOM_CALENDAR = buildRoomCalendar(timetableRaw);

const ACTIVE_DAYS = DAYS_OF_WEEK.filter(d => {
  if (d === 'Saturday') {
    const metaDays = (timetableRaw as any).__meta__?.days;
    if (Array.isArray(metaDays)) {
      return metaDays.some((item: any) => item.day === 'Saturday');
    }
    return !!(timetableRaw as any).__meta__?.days?.Saturday;
  }
  return true;
});

type ViewMode = 'specific' | 'calendar' | null;

// ─── Tiny chip sub-component ──────────────────────────────────────────────────
function RoomPill({
  name,
  variant,
}: {
  name: string;
  variant: 'green' | 'yellow' | 'neutral';
}) {
  const styles: Record<string, React.CSSProperties> = {
    green: { backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' },
    yellow: { backgroundColor: '#FFFBEB', color: '#92400E' },
    neutral: { backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-secondary)' },
  };
  return (
    <span
      className="inline-block font-mono text-[10px] font-medium px-2 py-0.5 rounded whitespace-nowrap leading-5"
      style={styles[variant]}
    >
      {name}
    </span>
  );
}

// ─── Room Detail Panel ────────────────────────────────────────────────────────
function RoomDetail({
  cell,
  onClose,
}: {
  cell: CalendarCell;
  onClose: () => void;
}) {
  const { drawerRef, handleRef, backdropRef, closeDrawer } = useMobileSwipe({ onClose, defaultHeightStr: '85dvh' });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <div ref={backdropRef} className="fixed inset-0 z-30 bg-black/40 md:hidden animate-in fade-in duration-300 ease-out" onClick={closeDrawer} />
      <div
        ref={drawerRef}
        role="dialog"
        className="fixed z-40 bottom-0 left-0 right-0 rounded-t-2xl overflow-y-auto md:bottom-0 md:top-14 md:left-auto md:right-0 md:w-96 md:rounded-none md:rounded-l-2xl md:max-h-[calc(100dvh-56px)] animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-300 ease-out bg-[var(--color-bg-raised)] shadow-float border-l border-[var(--color-border)] h-[85dvh] md:h-auto"
      >
        <div ref={handleRef} className="md:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border-strong)] pointer-events-none" />
        </div>

        <div className="px-5 pt-4 pb-3 flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
              {cell.day} · {cell.slot.label}
            </p>
            <h2 className="mt-1 font-display text-2xl">Room Vacancy</h2>
          </div>
          <button onClick={closeDrawer} className="w-8 h-8 flex items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="px-5 pb-10 flex flex-col gap-10">
          {/* Fully Vacant */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-success)]">
                Fully Vacant ({cell.fullyVacant.length})
              </h3>
            </div>
            
            {cell.fullyVacant.length > 0 ? (
              <div className="flex flex-col gap-6">
                {Object.entries(groupRoomsByBlock(cell.fullyVacant)).map(([block, rooms]) => (
                  <div key={block}>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2 px-1 border-l-2 border-[var(--color-border)] ml-0.5">
                      {block}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {rooms.map(r => (
                        <div key={r} className="bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/10 px-3 py-2 rounded-lg text-center font-bold text-xs shadow-sm">
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-text-tertiary)] italic">No fully empty rooms.</p>
            )}
          </section>

          {/* Partially Vacant */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-amber-600">
                Partially Vacant ({cell.partiallyVacant.length})
              </h3>
            </div>

            {cell.partiallyVacant.length > 0 ? (
              <div className="flex flex-col gap-6">
                {Object.entries(groupRoomsByBlock(cell.partiallyVacant)).map(([block, rooms]) => (
                  <div key={block}>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2 px-1 border-l-2 border-[var(--color-border)] ml-0.5">
                      {block}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {rooms.map(r => (
                        <div key={r} className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 rounded-lg text-center font-bold text-xs shadow-sm">
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-text-tertiary)] italic">No partially empty rooms.</p>
            )}
          </section>

          <div className="bg-[var(--color-bg-subtle)] p-4 rounded-xl border border-[var(--color-border)]">
             <p className="text-[10px] text-[var(--color-text-secondary)] leading-relaxed italic">
               &quot;Partially Vacant&quot; indicates that the room is occupied for part of this slot but has at least 30 minutes of free time within it.
             </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Specific Results ─────────────────────────────────────────────────────────
function SpecificResults({
  day,
  slotRaw,
  slotLabel,
}: {
  day: string;
  slotRaw: string;
  slotLabel: string;
}) {
  const { fullyVacant, partiallyVacant }: RoomAvailability = useMemo(
    () => getAvailableRooms(ROOM_CALENDAR, day, slotRaw),
    [day, slotRaw]
  );

  const hasResults = fullyVacant.length > 0 || partiallyVacant.length > 0;

  return (
    <div className="mt-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
          {day} · {slotLabel}
        </span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      {!hasResults ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6">
          <div className="font-mono text-4xl text-[var(--color-text-tertiary)] mb-4">∅</div>
          <p className="font-body text-sm text-[var(--color-text-secondary)] max-w-xs">
            No rooms with at least 30 minutes free found for this slot.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Fully Vacant */}
          {fullyVacant.length > 0 && (
            <div
              className="rounded-xl border p-5"
              style={{
                borderColor: 'rgba(22, 101, 52, 0.20)',
                backgroundColor: 'var(--color-success-bg)',
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: 'var(--color-success)' }}
                />
                <p className="font-mono text-xs font-bold" style={{ color: 'var(--color-success)' }}>
                  Fully Vacant ({fullyVacant.length})
                </p>
              </div>

              <div className="flex flex-col gap-6">
                {Object.entries(groupRoomsByBlock(fullyVacant)).map(([block, rooms]) => (
                  <div key={block}>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2 px-1 border-l-2 border-[var(--color-success)]/30 ml-0.5">
                      {block}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {rooms.map(r => (
                        <RoomPill key={r} name={r} variant="green" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Partially Vacant */}
          {partiallyVacant.length > 0 && (
            <div
              className="rounded-xl border p-5"
              style={{
                borderColor: 'rgba(146, 64, 14, 0.20)',
                backgroundColor: '#FFFBEB',
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-amber-500" />
                <p className="font-mono text-xs font-bold text-amber-800">
                  Partially Vacant ({partiallyVacant.length})
                </p>
              </div>

              <div className="flex flex-col gap-6">
                {Object.entries(groupRoomsByBlock(partiallyVacant)).map(([block, rooms]) => (
                  <div key={block}>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2 px-1 border-l-2 border-amber-300 ml-0.5">
                      {block}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {rooms.map(r => (
                        <RoomPill key={r} name={r} variant="yellow" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────
function CalendarGrid({ onSelect }: { onSelect: (cell: CalendarCell) => void }) {
  const grid: CalendarCell[][] = useMemo(() => buildFullCalendar(ROOM_CALENDAR), []);

  // Map ACTIVE_DAYS to their indices in the full grid (which has 6 days now)
  const activeDayIndices = ACTIVE_DAYS.map(day => DAYS_OF_WEEK.indexOf(day));

  return (
    <div className="mt-6 animate-in fade-in duration-200">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
          Full Week — Weekly Map
        </span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-raised)]"
        style={{ boxShadow: 'var(--shadow-card)' }}>
        <table className="min-w-full text-left border-collapse table-fixed">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] px-4 py-3 border-b border-r border-[var(--color-border)] bg-[var(--color-bg-raised)] w-[130px]">
                Time
              </th>
              {ACTIVE_DAYS.map(day => (
                <th key={day} className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] px-3 py-3 border-b border-r border-[var(--color-border)] last:border-r-0 text-center w-[150px]">
                  {day.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STANDARD_SLOTS.map((slot, slotIdx) => (
              <tr key={slot.raw} className="border-b border-[var(--color-border)] last:border-b-0">
                <td className="sticky left-0 z-10 font-mono text-[10px] text-[var(--color-text-secondary)] px-4 py-3 border-r border-[var(--color-border)] bg-[var(--color-bg-raised)] align-top whitespace-nowrap">
                  {slot.label}
                </td>
                {activeDayIndices.map((dayIdx) => {
                  const day = DAYS_OF_WEEK[dayIdx];
                  const cell = grid[dayIdx][slotIdx];
                  const count = cell.fullyVacant.length;
                  return (
                    <td
                      key={day}
                      onClick={() => onSelect(cell)}
                      className="px-2 py-3 border-r border-[var(--color-border)] last:border-r-0 align-top cursor-pointer hover:bg-[var(--color-bg-subtle)] transition-colors group relative"
                    >
                      {count === 0 && cell.partiallyVacant.length === 0 ? (
                        <span className="font-mono text-[10px] text-[var(--color-text-tertiary)] italic">—</span>
                      ) : (
                        <div className="flex flex-col gap-1.5 h-full">
                          <div className="flex flex-wrap gap-1">
                            {cell.fullyVacant.slice(0, 4).map(r => (
                              <RoomPill key={r} name={r} variant="green" />
                            ))}
                          </div>
                          {cell.partiallyVacant.length > 0 && (
                             <div className="flex flex-wrap gap-1">
                               {cell.partiallyVacant.slice(0, 2).map(r => (
                                 <RoomPill key={r} name={r} variant="yellow" />
                               ))}
                             </div>
                          )}
                          {(count > 4 || cell.partiallyVacant.length > 2) && (
                            <span className="mt-auto font-mono text-[9px] text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-primary)]">
                              View all rooms →
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'var(--color-success-bg)', border: '1px solid rgba(22,101,52,0.3)' }} />
          <span className="font-mono text-[10px] text-[var(--color-text-tertiary)]">Fully vacant</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-50" style={{ border: '1px solid #fde68a' }} />
          <span className="font-mono text-[10px] text-[var(--color-text-tertiary)]">Partial free</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RoomsPage() {
  const router = useRouter();

  const [semesterName, setSemesterName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fsc_semester_name') || 'Spring 2026';
    }
    return 'Spring 2026';
  });

  useEffect(() => {
    async function loadSemesterSettings() {
      try {
        const { data, error } = await supabase
          .from('semester_settings')
          .select('semester_name')
          .eq('id', 1)
          .single();
        if (!error && data?.semester_name) {
          setSemesterName(data.semester_name);
          localStorage.setItem('fsc_semester_name', data.semester_name);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadSemesterSettings();
  }, []);

  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>(null);
  const [selectedCell, setSelectedCell] = useState<CalendarCell | null>(null);

  const selectedSlotObj = STANDARD_SLOTS.find(s => s.raw === selectedSlot);

  function handleFindRooms() {
    if (selectedDay && selectedSlot) setViewMode('specific');
  }

  function handleDropdownChange(type: 'day' | 'slot', value: string) {
    if (type === 'day') setSelectedDay(value);
    else setSelectedSlot(value);
    setViewMode(null); // Reset results on any change
  }

  const canSearch = selectedDay && selectedSlot;

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">

      {/* ── Sticky Header ───────────────────────────────────────────────── */}
      {/* ── Sticky Header ───────────────────────────────────────────────── */}
      <Header>
        <div className="flex flex-1 items-center gap-2 md:gap-3 w-full max-w-full min-w-0">
          <button
            onClick={() => router.push('/')}
            aria-label="Back to home"
            className="w-8 h-8 flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 shrink-0 -ml-2"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M11 4l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="flex-1 flex items-center gap-2 min-w-0">
            {/* Map Pin icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden sm:block text-[var(--color-text-tertiary)] shrink-0">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="font-mono text-sm font-medium text-[var(--color-text-primary)] truncate">
              Free Rooms Finder
            </span>
          </div>
        </div>
      </Header>


      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1">

        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex md:w-56 lg:w-64 flex-col gap-5 p-6 border-r border-[var(--color-border)] sticky top-14 h-[calc(100dvh-56px)] overflow-y-auto">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-1">Feature</p>
            <p className="font-mono text-sm font-medium">Room Finder</p>
          </div>
          <div className="h-px bg-[var(--color-border)]" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-1">Rooms tracked</p>
            <p className="font-mono text-2xl font-medium">{Object.keys(ROOM_CALENDAR).length}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">unique rooms</p>
          </div>
          <div className="h-px bg-[var(--color-border)]" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2">How it works</p>
            <ul className="text-xs text-[var(--color-text-secondary)] leading-relaxed space-y-2 list-disc list-inside">
              <li>Pick a day &amp; slot, or click any cell in the weekly grid to see details.</li>
              <li>&quot;Green&quot; rooms are 100% free for the full 80-minute block.</li>
              <li>&quot;Yellow&quot; rooms have at least 30 minutes of vacancy.</li>
            </ul>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 px-4 md:px-8 py-6 max-w-4xl mx-auto w-full">

          {/* ── Hero blurb ─────────────────────────────────────────────── */}
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl leading-tight text-[var(--color-text-primary)]">
              Find a <span className="italic">free room.</span>
            </h1>
            <p className="mt-3 font-body text-sm text-[var(--color-text-secondary)] max-w-md leading-relaxed">
              Real-time vacancy data for {semesterName}.
              Click any cell below to view a beautified list of available rooms.
            </p>
          </div>

          {/* ── Control Card ────────────────────────────────────────────── */}
          <div
            className="bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-2xl p-6 flex flex-col gap-6"
            style={{ boxShadow: 'var(--shadow-raised), var(--border-inset)' }}
          >

            {/* Option A — Specific slot */}
            <div className="flex flex-col gap-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
                Option A — Specific Slot
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Day selector */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="day-select"
                    className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
                    Day
                  </label>
                  <div className="relative">
                    <select
                      id="day-select"
                      value={selectedDay}
                      onChange={e => handleDropdownChange('day', e.target.value)}
                      className="w-full h-12 pl-4 pr-10 bg-[var(--color-bg)] border border-[var(--color-border-strong)] rounded-md font-mono text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-cs)] cursor-pointer"
                    >
                      <option value="" disabled>Select day</option>
                      {ACTIVE_DAYS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-tertiary)]">
                      <svg width="12" height="7" viewBox="0 0 12 7" fill="none" aria-hidden="true">
                        <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Time slot selector */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="slot-select"
                    className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
                    Time Slot
                  </label>
                  <div className="relative">
                    <select
                      id="slot-select"
                      value={selectedSlot}
                      onChange={e => handleDropdownChange('slot', e.target.value)}
                      className="w-full h-12 pl-4 pr-10 bg-[var(--color-bg)] border border-[var(--color-border-strong)] rounded-md font-mono text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-cs)] cursor-pointer"
                    >
                      <option value="" disabled>Select slot</option>
                      {STANDARD_SLOTS.map(s => (
                        <option key={s.raw} value={s.raw}>{s.label}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-tertiary)]">
                      <svg width="12" height="7" viewBox="0 0 12 7" fill="none" aria-hidden="true">
                        <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleFindRooms}
                disabled={!canSearch}
                className="w-full h-12 rounded-md font-body font-medium text-sm transition-all focus-visible:outline-none focus-visible:ring-2 active:scale-[0.98]"
                style={canSearch ? {
                  backgroundColor: 'var(--color-text-primary)',
                  color: 'var(--color-bg)',
                } : {
                  backgroundColor: 'var(--color-bg-subtle)',
                  color: 'var(--color-text-tertiary)',
                  cursor: 'not-allowed',
                }}
              >
                Find Free Rooms →
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--color-border)]" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">or</span>
              <div className="h-px flex-1 bg-[var(--color-border)]" />
            </div>

            {/* Option B — Full calendar */}
            <div className="flex flex-col gap-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
                Option B — Full Week Calendar
              </p>
              <button
                onClick={() => setViewMode('calendar')}
                className="w-full h-12 rounded-md border font-body font-medium text-sm transition-all focus-visible:outline-none focus-visible:ring-2 active:scale-[0.98] hover:bg-[var(--color-bg-subtle)]"
                style={{
                  borderColor: 'var(--color-border-strong)',
                  color: 'var(--color-text-primary)',
                }}
              >
                Generate Full Calendar View
              </button>
            </div>
          </div>

          {/* ── Results area ────────────────────────────────────────────── */}
          {viewMode === 'specific' && selectedSlotObj && (
            <SpecificResults
              day={selectedDay}
              slotRaw={selectedSlot}
              slotLabel={selectedSlotObj.label}
            />
          )}

          {viewMode === 'calendar' && <CalendarGrid onSelect={setSelectedCell} />}

          {/* Bottom padding for scroll-past */}
          <div className="h-[150px]" />
        </div>
      {selectedCell && (
        <RoomDetail cell={selectedCell} onClose={() => setSelectedCell(null)} />
      )}
      </div>
    </div>
  );
}