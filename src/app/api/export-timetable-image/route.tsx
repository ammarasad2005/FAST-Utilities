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

// ── Parse "HH:MM" or "HH:MM-HH:MM" to minutes since midnight ──
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

// ── Parse a time range "HH:MM-HH:MM" to [startMin, endMin] ──
function parseTimeRange(t: string): [number, number] {
  const parts = t.split('-').map(s => s.trim());
  if (parts.length >= 2) {
    return [parseTimeToMinutes(parts[0]), parseTimeToMinutes(parts[parts.length - 1])];
  }
  const start = parseTimeToMinutes(t);
  return [start, start + 80]; // fallback: assume 80-min lecture
}

// ── Canonical day order ──
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Timeline bounds (FAST BS class day: 08:30 to 17:20) ──
const DAY_START_MIN = 8 * 60 + 30;   // 08:30
const DAY_END_MIN = 17 * 60 + 20;    // 17:20
const DAY_SPAN_MIN = DAY_END_MIN - DAY_START_MIN; // 530 min

// ── Pixels per minute (controls overall grid height) ──
// At 1.6 px/min: 80-min lecture = 128px, 105-min = 168px, 165-min lab = 264px
// Total grid height = 530 × 1.6 = 848px (plus header/legend/footer)
const PX_PER_MIN = 1.6;

// ── Hour markers for time labels (every 90 min = one FAST slot) ──
const HOUR_MARKERS = [
  { min: 8 * 60 + 30, label: '08:30' },
  { min: 10 * 60,      label: '10:00' },
  { min: 11 * 60 + 30, label: '11:30' },
  { min: 13 * 60,      label: '01:00' },
  { min: 14 * 60 + 30, label: '02:30' },
  { min: 15 * 60 + 55, label: '03:55' },
  { min: 17 * 60 + 20, label: '05:20' },
];

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
      if (!dayMap.has(e.day)) dayMap.set(e.day, []);
      dayMap.get(e.day)!.push(e);
    }

    // Sort each day's entries by start time
    for (const dayEntries of dayMap.values()) {
      dayEntries.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
    }

    // Build the 6-day array (Mon-Sat)
    const days = DAY_ORDER.map(dayName => ({
      day: dayName,
      dayName,
      entries: dayMap.get(dayName) || [],
    }));

    // ── Layout dimensions ──
    const timeColWidth = 110;
    const dayColWidth = (1400 - 80 - timeColWidth) / 6; // 6 day columns
    const gridHeight = DAY_SPAN_MIN * PX_PER_MIN;       // ~848px
    const dayHeaderHeight = 56;
    const headerHeight = 200;
    const footerHeight = 50;
    const padding = 80;
    const height = Math.max(
      1000,
      headerHeight + dayHeaderHeight + gridHeight + footerHeight + padding
    );

    // ── Find consecutive empty day groups for HOLIDAY rendering ──
    // 1 empty day → vertical "HOLIDAY" text
    // 2 consecutive → slanted from top-left of left day to bottom-right of right day
    // 3+ consecutive → slanted from top-left of leftmost to bottom-right of rightmost
    const holidayGroups: { startIdx: number; count: number }[] = [];
    let di = 0;
    while (di < days.length) {
      if (days[di].entries.length === 0) {
        let dj = di;
        while (dj < days.length && days[dj].entries.length === 0) {
          dj++;
        }
        holidayGroups.push({ startIdx: di, count: dj - di });
        di = dj;
      } else {
        di++;
      }
    }

    // ── Student context line ──
    const contextLine = config.isCustom
      ? 'Custom Timetable'
      : `BS(${(config.dept || 'CS').toUpperCase()}) · Section ${config.section || 'A'} · Batch ${config.batch || '2025'}`;

    const semesterLabel = config.semesterName
      ? `${config.semesterName} · Weekly Timetable`
      : 'Spring 2026 · Weekly Timetable';

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
              marginBottom: '20px',
              borderBottom: '4px solid #1F3864',
              paddingBottom: '16px',
            }}
          >
            <h1 style={{ fontSize: '52px', fontWeight: 'bold', color: '#1F3864', margin: '0 0 6px 0' }}>
              FAST NUCES, Isb
            </h1>
            <h2 style={{ fontSize: '30px', fontWeight: 'normal', color: '#4b5563', margin: 0 }}>
              {semesterLabel}
            </h2>
            <h3 style={{ fontSize: '22px', fontWeight: 'normal', color: '#6b7280', margin: '6px 0 0 0' }}>
              {contextLine}
            </h3>
          </div>

          {/* ── Week Grid (continuous timeline) ── */}
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
            <div style={{ display: 'flex', backgroundColor: '#1F3864', color: 'white', height: dayHeaderHeight }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: timeColWidth,
                  fontSize: '15px',
                  fontWeight: 'bold',
                  borderRight: '2px solid #2A4A7F',
                }}
              >
                Time
              </div>
              {days.map(d => (
                <div
                  key={d.day}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: dayColWidth,
                    fontSize: '17px',
                    fontWeight: 'bold',
                    borderRight: '2px solid #2A4A7F',
                  }}
                >
                  <div>{d.dayName.slice(0, 3).toUpperCase()}</div>
                </div>
              ))}
            </div>

            {/* Timeline body — relative positioned for absolute class cards */}
            <div style={{ display: 'flex', position: 'relative', height: gridHeight }}>
              {/* Time column with hour markers */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: timeColWidth,
                  borderRight: '2px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                  position: 'relative',
                }}
              >
                {HOUR_MARKERS.map((m, i) => {
                  const top = (m.min - DAY_START_MIN) * PX_PER_MIN;
                  // Fix top/bottom edge clipping:
                  // First marker sits at the very top, last at the very bottom,
                  // middle markers are centered on their gridline.
                  const adjustedTop =
                    i === 0 ? 2 :
                    i === HOUR_MARKERS.length - 1 ? gridHeight - 18 :
                    top - 8;
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        position: 'absolute',
                        top: adjustedTop,
                        left: 0,
                        right: 0,
                        justifyContent: 'center',
                        fontSize: '13px',
                        color: '#6b7280',
                        fontWeight: 'bold',
                        fontFamily: 'monospace',
                      }}
                    >
                      {m.label}
                    </div>
                  );
                })}
              </div>

              {/* Horizontal hour gridlines spanning all day columns */}
              {HOUR_MARKERS.map((m, i) => {
                const top = (m.min - DAY_START_MIN) * PX_PER_MIN;
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      position: 'absolute',
                      top: top,
                      left: timeColWidth,
                      right: 0,
                      height: '1px',
                      backgroundColor: '#e5e7eb',
                    }}
                  />
                );
              })}

              {/* Day columns */}
              {days.map(d => (
                <div
                  key={d.day}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: dayColWidth,
                    borderRight: '2px solid #e5e7eb',
                    position: 'relative',
                  }}
                >
                  {d.entries.map((entry, eIdx) => {
                    const [startMin, endMin] = parseTimeRange(entry.time);
                    const top = Math.max(0, (startMin - DAY_START_MIN) * PX_PER_MIN);
                    const cardHeight = Math.max(60, (endMin - startMin) * PX_PER_MIN - 4);

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
                          position: 'absolute',
                          top: top + 2,
                          left: '6px',
                          right: '6px',
                          height: cardHeight,
                          backgroundColor: isLab ? '#F0FDFA' : '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderLeft: `4px solid ${accent}`,
                          borderRadius: '5px',
                          padding: '6px 8px',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Course name + section badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 'bold',
                              color: '#1f2937',
                              flex: 1,
                              textDecoration: entry.cancelled ? 'line-through' : 'none',
                              opacity: entry.cancelled ? 0.6 : 1,
                              overflow: 'hidden',
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
                              fontSize: '10px',
                              fontWeight: 'bold',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              fontFamily: 'monospace',
                            }}
                          >
                            {entry.section}
                          </span>
                        </div>

                        {/* Room (only if card is tall enough) */}
                        {cardHeight >= 50 && (
                          <div style={{ display: 'flex', fontSize: '10px', color: '#6b7280', fontFamily: 'monospace', marginBottom: '2px' }}>
                            {entry.room === 'TBA' ? 'Room TBA' : `Room ${entry.room}`}
                          </div>
                        )}

                        {/* Badges (only if card is tall enough) */}
                        {cardHeight >= 70 && (
                          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                            {isLab && (
                              <span style={{ display: 'flex', backgroundColor: '#F0FDFA', color: '#0F766E', fontSize: '9px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '2px' }}>
                                Lab
                              </span>
                            )}
                            {isRepeat && (
                              <span style={{ display: 'flex', backgroundColor: '#FEF3C7', color: '#B45309', fontSize: '9px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '2px' }}>
                                Repeat
                              </span>
                            )}
                            {entry.exam && (
                              <span style={{ display: 'flex', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '9px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '2px' }}>
                                Exam
                              </span>
                            )}
                            {entry.rescheduled && (
                              <span style={{ display: 'flex', backgroundColor: '#FEF3C7', color: '#D97706', fontSize: '9px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '2px' }}>
                                ReSch
                              </span>
                            )}
                            {entry.cancelled && (
                              <span style={{ display: 'flex', backgroundColor: '#F3F4F6', color: '#6b7280', fontSize: '9px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '2px' }}>
                                Cancel
                              </span>
                            )}
                            {config.isCustom && (
                              <span style={{ display: 'flex', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontSize: '9px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '2px' }}>
                                {entry.department}-{entry.batch ? entry.batch.slice(-2) : ''}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              {/* ── HOLIDAY overlays for empty day groups ── */}
              {holidayGroups.map((group, gi) => {
                const totalWidth = group.count * dayColWidth;
                // 1 day = 90° (vertical), 2+ days = diagonal from top-left to bottom-right
                const angle = group.count === 1
                  ? 90
                  : Math.atan2(gridHeight, totalWidth) * 180 / Math.PI;
                return (
                  <div
                    key={`holiday-${gi}`}
                    style={{
                      display: 'flex',
                      position: 'absolute',
                      left: timeColWidth + group.startIdx * dayColWidth,
                      width: totalWidth,
                      top: 0,
                      height: gridHeight,
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 5,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        transform: `rotate(${angle}deg)`,
                        fontSize: '26px',
                        fontWeight: 'bold',
                        color: '#d1d5db',
                        letterSpacing: '0.4em',
                        fontFamily: 'monospace',
                      }}
                    >
                      HOLIDAY
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Footer ── */}
          <div
            style={{
              display: 'flex',
              marginTop: 'auto',
              justifyContent: 'space-between',
              paddingTop: '14px',
              fontSize: '13px',
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
