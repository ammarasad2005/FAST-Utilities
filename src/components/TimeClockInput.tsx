'use client';

import { useState, useRef, useEffect } from 'react';

interface TimeClockInputProps {
  value: string; // "HH:MM" format (24h)
  onChange: (value: string) => void;
  label?: string;
}

/**
 * A digital clock-style time input.
 *
 * Two modes of interaction:
 * 1. Scroll arrows (up/down) for hours and minutes
 * 2. Click on the hour or minute digit area to type directly
 *
 * When editing, the field becomes a text input. On blur or Enter, the
 * value is normalized:
 * - Hours: clamped to 1–12 (12-hour entry), then combined with AM/PM
 * - Minutes: clamped to 0–59, 1-minute granularity
 * - Single digit → padded to 2 digits
 * - Empty or invalid → reverts to previous value
 */
export function TimeClockInput({ value, onChange, label }: TimeClockInputProps) {
  const parts = value.split(':');
  const hours = parseInt(parts[0] || '8', 10);
  const minutes = parseInt(parts[1] || '0', 10);

  const displayHours = hours === 0 ? 12 : hours <= 12 ? hours : hours - 12;
  const period = hours < 12 ? 'AM' : 'PM';

  // Edit state: which field is being typed into ('h' | 'm' | null)
  const [editingField, setEditingField] = useState<'h' | 'm' | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  function adjust(field: 'h' | 'm', delta: number) {
    let h = hours;
    let m = minutes;
    if (field === 'h') {
      h = (h + delta + 24) % 24;
    } else {
      // 1-minute granularity
      m = (m + delta + 60) % 60;
    }
    onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }

  function setPeriod(p: 'AM' | 'PM') {
    let h = hours;
    if (p === 'AM' && h >= 12) h -= 12;
    if (p === 'PM' && h < 12) h += 12;
    onChange(`${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
  }

  function startEditing(field: 'h' | 'm') {
    setEditingField(field);
    // Pre-fill with current display value
    if (field === 'h') {
      setEditValue(String(displayHours));
    } else {
      setEditValue(String(minutes).padStart(2, '0'));
    }
  }

  function commitEdit() {
    if (editingField === 'h') {
      // Parse entered hours (1-12 range, 12-hour format)
      let h = parseInt(editValue, 10);
      if (isNaN(h)) {
        // Invalid → revert
        setEditingField(null);
        return;
      }
      // Clamp to 1-12
      h = Math.max(1, Math.min(12, h));
      // Convert to 24-hour based on current AM/PM
      if (period === 'PM' && h < 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      onChange(`${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    } else if (editingField === 'm') {
      // Parse entered minutes (0-59, 1-minute granularity)
      let m = parseInt(editValue, 10);
      if (isNaN(m)) {
        setEditingField(null);
        return;
      }
      m = Math.max(0, Math.min(59, m));
      onChange(`${String(hours).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
    setEditingField(null);
  }

  function handleEditKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingField(null);
    }
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Only allow digits, max 2 chars
    const v = e.target.value.replace(/\D/g, '').slice(0, 2);
    setEditValue(v);
  }

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '24px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    fontSize: '10px',
    transition: 'all 0.15s',
  };

  const digitStyle: React.CSSProperties = {
    color: 'var(--color-text-primary)',
    minWidth: '2ch',
    textAlign: 'center',
    cursor: 'text',
    borderRadius: '4px',
    padding: '2px 4px',
    transition: 'background-color 0.15s',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
          {label}
        </span>
      )}
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-xl border"
        style={{ borderColor: 'var(--color-border-strong)', backgroundColor: 'var(--color-bg-raised)' }}
      >
        {/* Hours column */}
        <div className="flex flex-col items-center gap-1">
          <button type="button" style={btnStyle} onClick={() => adjust('h', 1)} aria-label="Hour up">
            <svg width="10" height="6" viewBox="0 0 12 7" fill="none"><path d="M1 6l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {editingField === 'h' ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={handleEditChange}
              onKeyDown={handleEditKey}
              onBlur={commitEdit}
              className="font-mono text-2xl font-bold tabular-nums text-center bg-transparent outline-none"
              style={{ ...digitStyle, width: '3ch', borderBottom: '2px solid var(--accent-cs)' }}
              inputMode="numeric"
              maxLength={2}
            />
          ) : (
            <span
              className="font-mono text-2xl font-bold tabular-nums hover:bg-[var(--color-bg-subtle)]"
              style={digitStyle}
              onClick={() => startEditing('h')}
              title="Click to type"
            >
              {String(displayHours).padStart(2, '0')}
            </span>
          )}
          <button type="button" style={btnStyle} onClick={() => adjust('h', -1)} aria-label="Hour down">
            <svg width="10" height="6" viewBox="0 0 12 7" fill="none"><path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <span className="font-mono text-2xl font-bold" style={{ color: 'var(--color-text-tertiary)' }}>:</span>

        {/* Minutes column */}
        <div className="flex flex-col items-center gap-1">
          <button type="button" style={btnStyle} onClick={() => adjust('m', 1)} aria-label="Minute up">
            <svg width="10" height="6" viewBox="0 0 12 7" fill="none"><path d="M1 6l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {editingField === 'm' ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={handleEditChange}
              onKeyDown={handleEditKey}
              onBlur={commitEdit}
              className="font-mono text-2xl font-bold tabular-nums text-center bg-transparent outline-none"
              style={{ ...digitStyle, width: '3ch', borderBottom: '2px solid var(--accent-cs)' }}
              inputMode="numeric"
              maxLength={2}
            />
          ) : (
            <span
              className="font-mono text-2xl font-bold tabular-nums hover:bg-[var(--color-bg-subtle)]"
              style={digitStyle}
              onClick={() => startEditing('m')}
              title="Click to type"
            >
              {String(minutes).padStart(2, '0')}
            </span>
          )}
          <button type="button" style={btnStyle} onClick={() => adjust('m', -1)} aria-label="Minute down">
            <svg width="10" height="6" viewBox="0 0 12 7" fill="none"><path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        {/* AM/PM toggle */}
        <div className="flex flex-col gap-1 ml-1">
          <button
            type="button"
            onClick={() => setPeriod('AM')}
            className="px-2 py-1 rounded text-[10px] font-bold font-mono transition-all"
            style={{
              backgroundColor: period === 'AM' ? 'var(--color-text-primary)' : 'var(--color-bg-subtle)',
              color: period === 'AM' ? 'var(--color-bg)' : 'var(--color-text-tertiary)',
              border: '1px solid var(--color-border)',
            }}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => setPeriod('PM')}
            className="px-2 py-1 rounded text-[10px] font-bold font-mono transition-all"
            style={{
              backgroundColor: period === 'PM' ? 'var(--color-text-primary)' : 'var(--color-bg-subtle)',
              color: period === 'PM' ? 'var(--color-bg)' : 'var(--color-text-tertiary)',
              border: '1px solid var(--color-border)',
            }}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  );
}
