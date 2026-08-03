import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import type { TimetableEntry } from '@/lib/types';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const entries = payload.entries as any[];
    const config = payload.config as { isCustom?: boolean; subtitle?: string; semesterName?: string } | undefined;

    if (!entries || !Array.isArray(entries)) {
      return new Response('Invalid entries', { status: 400 });
    }

    // Dynamic height based on number of entries.
    // Base height for header/footer + space per entry.
    const height = Math.max(800, entries.length * 150 + 250);

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
          {/* Header */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '40px',
              borderBottom: '4px solid #1F3864',
              paddingBottom: '20px',
            }}
          >
            <h1
              style={{
                fontSize: '60px',
                fontWeight: 'bold',
                color: '#1F3864',
                margin: '0 0 10px 0',
              }}
            >
              FAST NUCES, Isb
            </h1>
            <h2
              style={{
                fontSize: '40px',
                fontWeight: 'normal',
                color: '#4b5563',
                margin: 0,
              }}
            >
              {config?.semesterName ? `${config.semesterName} Finals` : 'Spring 2026 Finals'}
            </h2>
            {config?.subtitle && (
              <h3
                style={{
                  fontSize: '32px',
                  fontWeight: 'normal',
                  color: '#6b7280',
                  margin: '10px 0 0 0',
                }}
              >
                {config.subtitle}
              </h3>
            )}
          </div>

          {/* Table Header */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#1F3864',
              color: 'white',
              padding: '20px',
              fontSize: '24px',
              fontWeight: 'bold',
              borderRadius: '8px 8px 0 0',
            }}
          >
            <div style={{ display: 'flex', width: config?.isCustom ? '15%' : '20%' }}>Date</div>
            <div style={{ display: 'flex', width: config?.isCustom ? '15%' : '20%' }}>Day</div>
            <div style={{ display: 'flex', width: config?.isCustom ? '35%' : '40%' }}>Course</div>
            {config?.isCustom && (
              <div style={{ display: 'flex', width: '15%' }}>Dept</div>
            )}
            <div style={{ display: 'flex', width: '20%' }}>Time</div>
          </div>

          {/* Entries */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {entries.map((entry, idx) => {
              let displayDate = '-';
              let displayDay = entry.day;

              if ((entry as any).date) {
                displayDate = (entry as any).date;
                const parts = displayDate.split('/');
                if (parts.length === 3) {
                  const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
                  if (!isNaN(d.getTime())) {
                    displayDay = d.toLocaleDateString('en-US', { weekday: 'long' });
                  }
                }
              }

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    borderBottom: '2px solid #e5e7eb',
                    borderLeft: '2px solid #e5e7eb',
                    borderRight: '2px solid #e5e7eb',
                    padding: '20px',
                    fontSize: '20px',
                    backgroundColor: idx % 2 === 0 ? '#f9fafb' : '#ffffff',
                    color: '#1f2937',
                    borderBottomLeftRadius: idx === entries.length - 1 ? '8px' : '0',
                    borderBottomRightRadius: idx === entries.length - 1 ? '8px' : '0',
                  }}
                >
                  <div style={{ display: 'flex', width: config?.isCustom ? '15%' : '20%' }}>{displayDate}</div>
                  <div style={{ display: 'flex', width: config?.isCustom ? '15%' : '20%' }}>{displayDay}</div>
                  <div style={{ display: 'flex', width: config?.isCustom ? '35%' : '40%', paddingRight: '10px' }}>
                    {entry.courseName} {entry.section ? `(${entry.section})` : ''}
                  </div>
                  {config?.isCustom && (
                    <div style={{ display: 'flex', width: '15%' }}>
                      {entry.department}-{entry.batch ? entry.batch.slice(-2) : ''}
                    </div>
                  )}
                  <div style={{ display: 'flex', width: '20%' }}>{entry.time}</div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              marginTop: 'auto',
              justifyContent: 'space-between',
              paddingTop: '20px',
              fontSize: '18px',
              color: '#6b7280',
            }}
          >
            <span style={{ display: 'flex' }}>Generated automatically</span>
            <span style={{ display: 'flex' }}>{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height,
      }
    );
  } catch (e: any) {
    return new Response('Failed to generate image', { status: 500 });
  }
}
