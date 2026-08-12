import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import type { TimetableEntry } from '@/lib/types';

export const runtime = 'edge';

// ── Department accent colors (hardcoded — Satori can't use CSS variables) ──
const DEPT_COLORS: Record<string, string> = {
  cs: '#1D4ED8',
  ai: '#7C3AED',
  ds: '#0F766E',
  cy: '#B45309',
  se: '#BE185D',
  bba: '#1D4ED8',
  af: '#047857',
  ba: '#D97706',
  ft: '#9333EA',
  ee: '#E11D48',
  ce: '#0284C7',
};

// ── Time slot rows (matches the live timetable grid) ──
const TIME_SLOTS = [
  { label: '08:30 – 09:50', start: '08:30' },
  { label: '10:00 – 11:20', start: '10:00' },
  { label: '11:30 – 12:50', start: '11:30' },
  { label: '01:00 – 02:20', start: '13:00' },
  { label: '02:30 – 03:50', start: '14:30' },
  { label: '03:55 – 05:15', start: '15:55' },
];

// ── Parse "HH:MM" to minutes since midnight ──
function parseTimeToMinutes(t: string): number {
  if (!t || t === 'TBA' || t === 'Unknown Time') return -1;
  const m = t.match(/(\d{1,2}):(\d{2})/);
  if (!m) return -1;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  // FAST classes: hours 1-7 mean PM (13:00-19:00)
  if (h >= 1 && h <= 7) h += 12;
  return h * 60 + min;
}

// ── Find which time slot an entry belongs to ──
function findSlotIndex(entry: TimetableEntry): number {
  const startMin = parseTimeToMinutes(entry.time);
  if (startMin < 0) return -1;
  for (let i = 0; i < TIME_SLOTS.length; i++) {
    const slotStart = parseTimeToMinutes(TIME_SLOTS[i].start);
    if (Math.abs(startMin - slotStart) <= 30) return i;
  }
  return -1;
}

// ── Canonical day order ──
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ExportConfig {
  batch?: string;
  dept?: string;
  section?: string;
  semesterName?: string;
  isCustom?: boolean;
  isSummer?: boolean;
  todayDayName?: string;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const entries = payload.entries as TimetableEntry[];
    const config = (payload.config as ExportConfig) || {};

    if (!entries || !Array.isArray(entries)) {
      return new Response('Invalid entries', { status: 400 });
    }

    // ── Group entries by day ──
    const dayMap = new Map<string, TimetableEntry[]>();
    for (const e of entries) {
      const dayKey = e.day;
      if (!dayMap.has(dayKey)) dayMap.set(dayKey, []);
      dayMap.get(dayKey)!.push(e);
    }

    // Sort each day's entries by start time
    for (const dayEntries of dayMap.values()) {
      dayEntries.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
    }

    // Build the 6-day array (Mon-Sat)
    const days = DAY_ORDER.map(dayName => ({
      day: dayName,
      dayName,
      dateStr: '',
      isToday: config.todayDayName?.toLowerCase() === dayName.toLowerCase(),
      entries: dayMap.get(dayName) || [],
    }));

    // ── Detect which badges are needed in the legend ──
    const hasLab = entries.some(e => e.type === 'lab');
    const hasRepeat = entries.some(e => e.category === 'repeat');
    const hasExam = entries.some(e => e.exam);
    const hasRescheduled = entries.some(e => e.rescheduled);
    const hasCancelled = entries.some(e => e.cancelled);

    // ── Dynamic height calculation ──
    // Header (220) + day-header (70) + time-rows (6 × 170) + legend (90) + footer (60) + padding (80)
    const baseHeight = 220 + 70 + (TIME_SLOTS.length * 170) + 90 + 60 + 80;
    const height = Math.max(1000, baseHeight);

    // ── Student context line ──
    const contextLine = config.isCustom
      ? 'Custom Timetable'
      : `BS(${(config.dept || 'CS').toUpperCase()}) · Section ${config.section || 'A'} · Batch ${config.batch || '2025'}`;

    const semesterLabel = config.semesterName
      ? `${config.semesterName} · Weekly Timetable`
      : 'Spring 2026 · Weekly Timetable';

    // ── Column widths ──
    const timeColWidth = 130;
    const dayColWidth = (1400 - 80 - timeColWidth) / 6; // 6 day columns, 40px padding each side

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            backgroundColor: '#ffffff',
            fontFamily: 'sans-serif',
            padding: '40px',
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              borderBottom: '4px solid #1F3864',
              paddingBottom: '20px',
            }}
          >
            <h1
              style={{
                fontSize: '56px',
                fontWeight: 'bold',
                color: '#1F3864',
                margin: '0 0 8px 0',
              }}
            >
              FAST NUCES, Isb
            </h1>
            <h2
              style={{
                fontSize: '32px',
                fontWeight: 'normal',
                color: '#4b5563',
                margin: 0,
              }}
            >
              {semesterLabel}
            </h2>
            <h3
              style={{
                fontSize: '24px',
                fontWeight: 'normal',
                color: '#6b7280',
                margin: '8px 0 0 0',
              }}
            >
              {contextLine}
            </h3>
          </div>

          {/* ── Week Grid ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              border: '2px solid #1F3864',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {/* Day header row */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#1F3864',
                color: 'white',
              }}
            >
              {/* Time column header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: timeColWidth,
                  padding: '16px 8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  borderRight: '2px solid #2A4A7F',
                }}
              >
                Time
              </div>
              {/* Day columns */}
              {days.map(d => (
                <div
                  key={d.day}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: dayColWidth,
                    padding: '12px 8px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    borderRight: '2px solid #2A4A7F',
                    backgroundColor: d.isToday ? '#2A4A7F' : 'transparent',
                  }}
                >
                  <div>{d.dayName.slice(0, 3).toUpperCase()}</div>
                  {d.isToday && (
                    <div style={{ fontSize: '12px', fontWeight: 'normal', marginTop: '2px', opacity: 0.9 }}>
                      TODAY
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Time slot rows */}
            {TIME_SLOTS.map((slot, slotIdx) => (
              <div
                key={slotIdx}
                style={{
                  display: 'flex',
                  backgroundColor: slotIdx % 2 === 0 ? '#f9fafb' : '#ffffff',
                  borderBottom: slotIdx < TIME_SLOTS.length - 1 ? '1px solid #e5e7eb' : 'none',
                }}
              >
                {/* Time label */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: timeColWidth,
                    padding: '16px 8px',
                    fontSize: '14px',
                    color: '#6b7280',
                    fontWeight: 'bold',
                    borderRight: '2px solid #e5e7eb',
                    fontFamily: 'monospace',
                  }}
                >
                  {slot.label.split(' – ').map((t, i) => (
                    <div key={i}>{t}</div>
                  ))}
                </div>

                {/* Day cells */}
                {days.map(d => {
                  const cellEntries = d.entries.filter(e => findSlotIndex(e) === slotIdx);

                  if (cellEntries.length === 0) {
                    return (
                      <div
                        key={d.day}
                        style={{
                          display: 'flex',
                          width: dayColWidth,
                          minHeight: '160px',
                          borderRight: '2px solid #e5e7eb',
                          backgroundColor: d.isToday ? '#F0F4FA' : 'transparent',
                        }}
                      />
                    );
                  }

                  return (
                    <div
                      key={d.day}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: dayColWidth,
                        minHeight: '160px',
                        padding: '8px',
                        gap: '6px',
                        borderRight: '2px solid #e5e7eb',
                        backgroundColor: d.isToday ? '#F0F4FA' : 'transparent',
                      }}
                    >
                      {cellEntries.map((entry, eIdx) => {
                        const deptKey = entry.department.toLowerCase().split('/')[0];
                        const accent = DEPT_COLORS[deptKey] || '#6b7280';
                        const isLab = entry.type === 'lab';
                        const isRepeat = entry.category === 'repeat';

                        return (
                          <div
                            key={eIdx}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              width: '100%',
                              backgroundColor: '#ffffff',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              padding: '8px 10px',
                              borderLeft: `4px solid ${accent}`,
                            }}
                          >
                            {/* Course name + section badge */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '4px',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '14px',
                                  fontWeight: 'bold',
                                  color: '#1f2937',
                                  flex: 1,
                                  textDecoration: entry.cancelled ? 'line-through' : 'none',
                                  opacity: entry.cancelled ? 0.6 : 1,
                                }}
                              >
                                {entry.courseName}
                              </span>
                              <span
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: accent,
                                  color: 'white',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {entry.section}
                              </span>
                            </div>

                            {/* Room */}
                            <div
                              style={{
                                display: 'flex',
                                fontSize: '11px',
                                color: '#6b7280',
                                fontFamily: 'monospace',
                                marginBottom: '4px',
                              }}
                            >
                              {entry.room === 'TBA' ? 'Room TBA' : `Room ${entry.room}`}
                            </div>

                            {/* Badges */}
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {isLab && (
                                <span style={{ display: 'flex', backgroundColor: '#F0FDFA', color: '#0F766E', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '3px' }}>
                                  Lab
                                </span>
                              )}
                              {isRepeat && (
                                <span style={{ display: 'flex', backgroundColor: '#FEF3C7', color: '#B45309', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '3px' }}>
                                  Repeat
                                </span>
                              )}
                              {entry.exam && (
                                <span style={{ display: 'flex', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '3px' }}>
                                  Exam
                                </span>
                              )}
                              {entry.rescheduled && (
                                <span style={{ display: 'flex', backgroundColor: '#FEF3C7', color: '#D97706', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '3px' }}>
                                  ReSch
                                </span>
                              )}
                              {entry.cancelled && (
                                <span style={{ display: 'flex', backgroundColor: '#F3F4F6', color: '#6b7280', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '3px' }}>
                                  Cancel
                                </span>
                              )}
                              {config.isCustom && (
                                <span style={{ display: 'flex', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '3px' }}>
                                  {entry.department}-{entry.batch ? entry.batch.slice(-2) : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* ── Legend ── */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginTop: '20px',
              padding: '12px 16px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#4b5563',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ display: 'flex', fontWeight: 'bold', color: '#1f2937' }}>Legend:</span>

            {/* Department color dots */}
            {(() => {
              const deptsInSchedule = [...new Set(entries.map(e => e.department.toLowerCase().split('/')[0]))];
              return deptsInSchedule.slice(0, 5).map(d => (
                <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ display: 'flex', width: '12px', height: '12px', borderRadius: '2px', backgroundColor: DEPT_COLORS[d] || '#6b7280' }} />
                  <span style={{ display: 'flex', textTransform: 'uppercase' }}>{d}</span>
                </div>
              ));
            })()}

            {hasLab && (
              <span style={{ display: 'flex', backgroundColor: '#F0FDFA', color: '#0F766E', fontSize: '12px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '3px' }}>Lab</span>
            )}
            {hasRepeat && (
              <span style={{ display: 'flex', backgroundColor: '#FEF3C7', color: '#B45309', fontSize: '12px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '3px' }}>Repeat</span>
            )}
            {hasExam && (
              <span style={{ display: 'flex', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '12px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '3px' }}>Exam</span>
            )}
            {hasRescheduled && (
              <span style={{ display: 'flex', backgroundColor: '#FEF3C7', color: '#D97706', fontSize: '12px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '3px' }}>Rescheduled</span>
            )}
            {hasCancelled && (
              <span style={{ display: 'flex', backgroundColor: '#F3F4F6', color: '#6b7280', fontSize: '12px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '3px' }}>Cancelled</span>
            )}
          </div>

          {/* ── Footer ── */}
          <div
            style={{
              display: 'flex',
              marginTop: 'auto',
              justifyContent: 'space-between',
              paddingTop: '16px',
              fontSize: '14px',
              color: '#6b7280',
            }}
          >
            <span style={{ display: 'flex' }}>Generated automatically</span>
            <span style={{ display: 'flex' }}>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      ),
      {
        width: 1400,
        height,
      }
    );
  } catch (e: any) {
    console.error('Timetable image export failed:', e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
