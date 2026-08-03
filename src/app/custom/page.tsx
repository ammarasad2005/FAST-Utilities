'use client';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useId, Suspense, useEffect } from 'react';
import { ExamCard } from '@/components/ExamCard';
import { ExamDetail } from '@/components/ExamDetail';
import { SearchBar } from '@/components/SearchBar';
import { ExportButton } from '@/components/ExportButton';
import { EmptyState } from '@/components/EmptyState';
import { Header } from '@/components/Header';

import { ThemeToggle } from '@/components/ThemeToggle';
import { groupByDay } from '@/lib/filter';
import { sortByChronological } from '@/lib/dates';
import { DEPARTMENTS, DEPARTMENT_LABELS } from '@/lib/types';
import type { ExamEntry } from '@/lib/types';

// eslint-disable-next-line
const scheduleData = require('../../../public/data/regular_schedule.json');
const allExams = scheduleData as ExamEntry[];

// Derive available batches from data
const availableBatches: string[] = [...new Set<string>(allExams.map(e => e.batch))]
  .sort()
  .reverse();

interface Bundle {
  id: string;
  name: string;
  rows: CourseRow[];
}

interface CourseRow {
  id: string;
  batch: string;
  stream: string;
  code: string;
  // validation state
  errorBatch: boolean;
  errorStream: boolean;
  errorCode: boolean;
}

function makeRow(id: string): CourseRow {
  return {
    id,
    batch: availableBatches[0] ?? '2023',
    stream: '',
    code: '',
    errorBatch: false,
    errorStream: false,
    errorCode: false,
  };
}

function findExams(entry: CourseRow): ExamEntry[] {
  const code = entry.code.trim().toUpperCase();
  if (!code || !entry.stream || !entry.batch) return [];
  return allExams.filter(e =>
    e.courseCode === code &&
    e.department === entry.stream &&
    e.batch === entry.batch
  );
}

function CustomPageInner() {
  const router = useRouter();
  const baseId = useId();
  const [rows, setRows] = useState<CourseRow[]>([makeRow(`${baseId}-0`)]);
  const [nextIdx, setNextIdx] = useState(1);
  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ExamEntry | null>(null);


  const [isMobileClassesExpanded, setIsMobileClassesExpanded] = useState(false);
  const [isDesktopClassesExpanded, setIsDesktopClassesExpanded] = useState(false);

  // ── Bundle Management State ──
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [editingBundleId, setEditingBundleId] = useState<string|null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newBundleName, setNewBundleName] = useState('');
  const [semesterName, setSemesterName] = useState<string>('Spring 2026');
  const [renamingId, setRenamingId] = useState<string|null>(null);
  const [tempName, setTempName] = useState('');
  const [activeBundleId, setActiveBundleId] = useState<string|null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('fsc_custom_exam_bundles');
    if (stored) {
      try {
        setBundles(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse bundles', e);
      }
    }
    const savedSemesterName = localStorage.getItem('fsc_semester_name');
    if (savedSemesterName) {
      setSemesterName(savedSemesterName);
    }
    async function loadSemesterSettings() {
      try {
        const { supabase } = await import('@/lib/supabase');
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
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('fsc_custom_exam_bundles', JSON.stringify(bundles));
    }
  }, [bundles, isLoaded]);

  useEffect(() => {
    if (!renamingId) return;
    const handler = () => setRenamingId(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [renamingId]);

  function handleCreateBundle() {
    if (!newBundleName.trim()) return;

    const newBundle: Bundle = {
      id: crypto.randomUUID(),
      name: newBundleName.trim(),
      rows: rows.map(r => ({ ...r, errorBatch: false, errorStream: false, errorCode: false }))
    };
    setBundles(prev => [newBundle, ...prev]);
    setEditingBundleId(newBundle.id);
    setIsSaving(false);
    setNewBundleName('');
  }

  function handleUpdateBundle() {
    if (!editingBundleId) return;
    setBundles(prev => prev.map(b => b.id === editingBundleId ? { ...b, rows: rows.map(r => ({ ...r, errorBatch: false, errorStream: false, errorCode: false })) } : b));
  }

  function handleDeleteBundle(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setBundles(prev => prev.filter(b => b.id !== id));
    if (editingBundleId === id) setEditingBundleId(null);
  }

  function handleRenameBundle(id: string, name: string) {
    setBundles(prev => prev.map(b => b.id === id ? { ...b, name } : b));
    setRenamingId(null);
  }

  function loadBundle(bundle: Bundle, andGenerate: boolean = false) {
    const base = `loaded-${bundle.id}`;
    const newRows = bundle.rows.map((r, i) => ({
      ...r,
      id: `${base}-${i}`
    }));
    setRows(newRows);
    setEditingBundleId(bundle.id);
    if (andGenerate) {
      setSaved(true);
      setIsMobileClassesExpanded(false);
      setIsDesktopClassesExpanded(false);
    } else {
      setSaved(false);
      setIsMobileClassesExpanded(true);
      setIsDesktopClassesExpanded(true);
    }
  }

  // ── Row management ────────────────────────────────────────────────────────
  function addRow() {
    const id = `${baseId}-${nextIdx}`;
    setNextIdx(n => n + 1);
    setRows(prev => [...prev, makeRow(id)]);
    setSaved(false);
  }

  function updateRow(id: string, patch: Partial<CourseRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    setSaved(false);
  }

  function removeRow(id: string) {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
    setSaved(false);
  }

  // ── Save / validate ──────────────────────────────────────────────────────
  function handleSave() {
    let hasError = false;
    const validated = rows.map(r => {
      const codeOk = !!r.code.trim();
      const eb = !r.batch;
      const es = !r.stream;
      const ec = !codeOk;
      if (eb || es || ec) hasError = true;
      return { ...r, errorBatch: eb, errorStream: es, errorCode: ec };
    });
    setRows(validated);
    if (!hasError) {
      setSaved(true);
      setIsMobileClassesExpanded(false);
      setIsDesktopClassesExpanded(false);
    }
  }

  // ── Compute results ──────────────────────────────────────────────────────
  const savedMatches = useMemo(() => {
    if (!saved) return [];
    const seen = new Set<string>();
    const result: ExamEntry[] = [];
    for (const row of rows) {
      for (const exam of findExams(row)) {
        const key = `${exam.date}|${exam.time}|${exam.courseCode}|${exam.batch}|${exam.department}`;
        if (!seen.has(key)) { seen.add(key); result.push(exam); }
      }
    }
    return result.sort(sortByChronological);
  }, [saved, rows]);

  const filtered = useMemo(() => {
    if (!query.trim()) return savedMatches;
    const q = query.toLowerCase();
    return savedMatches.filter(e =>
      e.courseCode.toLowerCase().includes(q) ||
      e.courseName.toLowerCase().includes(q)
    );
  }, [savedMatches, query]);

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  // ── Per-row "not found" hint ─────────────────────────────────────────────
  const rowMatches = useMemo(() =>
    rows.map(r => ({ id: r.id, count: findExams(r).length })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows]
  );

  const anyError = saved === false && rows.some(r => r.errorBatch || r.errorStream || r.errorCode);

  return (
    <div className="min-h-dvh flex flex-col">

      {/* ── Sticky header ── */}
      <Header rightActions={saved && <ExportButton entries={filtered} config={{ isCustom: true, subtitle: 'CUSTOM COURSES' }} />}>
        <div className="flex flex-1 items-center gap-2 md:gap-3 w-full max-w-full min-w-0">
          <button
            onClick={() => router.push('/')}
            aria-label="Back to setup"
            className="w-8 h-8 flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 shrink-0 -ml-2"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M11 4l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <span className="font-mono text-sm font-medium text-[var(--color-text-primary)]">Custom Courses</span>
          </div>
        </div>
      </Header>

      <div className="flex flex-1 md:gap-0">

        {/* ── Sidebar (desktop) ── */}
                {/* ── Sidebar (desktop) ── */}
        <aside className="hidden md:flex md:w-[350px] lg:w-[400px] flex-col border-r border-[var(--color-border)] sticky top-14 h-[calc(100dvh-56px)] overflow-y-auto">
          <div className="flex-1 px-5 py-5 flex flex-col gap-4">
            <button
              onClick={() => setIsDesktopClassesExpanded(prev => !prev)}
              aria-expanded={isDesktopClassesExpanded}
              className="w-full flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-raised)] px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2"
            >
              <div className="flex flex-col gap-0.5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
                  Your Courses
                </p>
                <p className="font-mono text-[10px] text-[var(--color-text-secondary)]">
                  {isDesktopClassesExpanded ? 'Tap to collapse' : 'Expand to add courses'}
                </p>
              </div>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`text-[var(--color-text-secondary)] transition-transform duration-200 ${isDesktopClassesExpanded ? 'rotate-0' : 'rotate-180'}`}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isDesktopClassesExpanded && (
              <>
                <div className="flex flex-col gap-3">
                  {rows.map((row, idx) => (
                    <RowEditor
                      key={row.id}
                      row={row}
                      index={idx}
                      matchCount={rowMatches.find(m => m.id === row.id)?.count ?? 0}
                      showMatchHint={saved}
                      onUpdate={patch => updateRow(row.id, patch)}
                      onRemove={() => removeRow(row.id)}
                      canRemove={rows.length > 1}
                    />
                  ))}
                </div>

                <button
                  onClick={addRow}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-md border border-dashed border-[var(--color-border-strong)] font-mono text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:border-[var(--color-text-tertiary)] transition-all focus-visible:outline-none"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Add another course
                </button>

                {anyError && (
                  <p className="text-xs text-red-500 font-mono">Fill all highlighted fields first.</p>
                )}
              </>
            )}
          </div>

          <div className="h-px bg-[var(--color-border)] opacity-50 mx-5" />

          {/* Bundles Section */}
          <div className="px-5 py-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
                Saved Sets
              </p>
              <button
                onClick={() => setIsSaving(true)}
                className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                title="Save current as bundle"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              </button>
            </div>

            {bundles.length === 0 ? (
              <p className="font-mono text-[10px] text-[var(--color-text-tertiary)] italic px-1">No bundles yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {bundles.map(bundle => (
                  <BundleCard
                    key={bundle.id}
                    bundle={bundle}
                    isActive={editingBundleId === bundle.id}
                    isFocused={activeBundleId === bundle.id}
                    renamingId={renamingId}
                    tempName={tempName}
                    setTempName={setTempName}
                    onFocus={() => setActiveBundleId(activeBundleId === bundle.id ? null : bundle.id)}
                    onRenameStart={() => {
                      setRenamingId(bundle.id);
                      setTempName(bundle.name);
                    }}
                    onRenameConfirm={() => handleRenameBundle(bundle.id, tempName)}
                    onDelete={(e) => handleDeleteBundle(e, bundle.id)}
                    onLoad={() => loadBundle(bundle, false)}
                    onGenerate={() => loadBundle(bundle, true)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Save + stats */}
          <div className="px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-raised)]/50 flex flex-col gap-2">
            {saved && (
              <p className="font-mono text-xs text-[var(--color-text-tertiary)]">
                {savedMatches.length} exam slot{savedMatches.length !== 1 ? 's' : ''} found
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSave}
                className={`h-10 rounded-md font-body text-[10px] sm:text-xs font-medium transition-all active:scale-95 ${saved ? 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border-strong)]' : 'bg-[var(--color-text-primary)] text-[var(--color-bg)]'}`}
              >
                {saved ? 'Update View' : 'Find Exams'}
              </button>
              
              {editingBundleId ? (
                <button
                  onClick={handleUpdateBundle}
                  className="h-10 rounded-md bg-[var(--accent-cs)] text-white font-body text-[10px] sm:text-xs font-medium hover:opacity-90 active:scale-95 transition-all truncate px-1"
                >
                  Update &quot;{bundles.find(b => b.id === editingBundleId)?.name.split(' ')[0]}...&quot;
                </button>
              ) : (
                <button
                  onClick={() => setIsSaving(true)}
                  className="h-10 rounded-md border border-[var(--color-border-strong)] text-[var(--color-text-primary)] font-body text-[10px] sm:text-xs font-medium hover:bg-[var(--color-bg-subtle)] active:scale-95 transition-all"
                >
                  Save as Bundle
                </button>
              )}
            </div>
            
            {saved && (
              <ExportButton entries={filtered} variant="sidebar" config={{ isCustom: true, subtitle: 'CUSTOM COURSES' }} />
            )}
          </div>
        </aside>

        {/* ── Main list area ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Mobile: row editor */}
          <div className="md:hidden border-b border-[var(--color-border)] px-4 py-4 bg-[var(--color-bg)] flex flex-col gap-3">
            <button
              onClick={() => setIsMobileClassesExpanded(prev => !prev)}
              aria-expanded={isMobileClassesExpanded}
              className="w-full flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-raised)] px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2"
            >
              <div className="flex flex-col gap-0.5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
                  Your Courses
                </p>
                <p className="font-mono text-[10px] text-[var(--color-text-secondary)]">
                  {isMobileClassesExpanded ? 'Tap to collapse' : 'Expand to add courses'}
                </p>
              </div>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`text-[var(--color-text-secondary)] transition-transform duration-200 ${isMobileClassesExpanded ? 'rotate-0' : 'rotate-180'}`}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isMobileClassesExpanded && (
              <>
                <div className="flex flex-col gap-3">
                  {rows.map((row, idx) => (
                    <RowEditor
                      key={row.id}
                      row={row}
                      index={idx}
                      matchCount={rowMatches.find(m => m.id === row.id)?.count ?? 0}
                      showMatchHint={saved}
                      onUpdate={patch => updateRow(row.id, patch)}
                      onRemove={() => removeRow(row.id)}
                      canRemove={rows.length > 1}
                    />
                  ))}
                </div>

                <button
                  onClick={addRow}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-md border border-dashed border-[var(--color-border-strong)] font-mono text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-all focus-visible:outline-none"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Add another course
                </button>

                {anyError && (
                  <p className="text-xs text-red-500 font-mono mt-1">Fill all highlighted fields first.</p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSave}
                    className="h-11 rounded-md bg-[var(--color-text-primary)] text-[var(--color-bg)] font-body text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2"
                  >
                    {saved ? 'Update View' : 'Find Exams'}
                  </button>
                  {editingBundleId ? (
                    <button
                      onClick={handleUpdateBundle}
                      className="h-11 rounded-md bg-[var(--accent-cs)] text-white font-body text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                      Update Bundle
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsSaving(true)}
                      className="h-11 rounded-md border border-[var(--color-border-strong)] text-[var(--color-text-primary)] font-body text-sm font-medium hover:bg-[var(--color-bg-subtle)] active:scale-[0.98] transition-all"
                    >
                      Save Bundle
                    </button>
                  )}
                </div>
              </>
            )}

            <div className="mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-raised)] p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
                  Saved Sets
                </p>
                <button
                  onClick={() => setIsSaving(true)}
                  className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                  title="Save current as bundle"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                </button>
              </div>

              {bundles.length === 0 ? (
                <p className="font-mono text-[10px] text-[var(--color-text-tertiary)] italic">No bundles yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {bundles.map(bundle => (
                    <BundleCard
                      key={bundle.id}
                      bundle={bundle}
                      isActive={editingBundleId === bundle.id}
                      isFocused={activeBundleId === bundle.id}
                      renamingId={renamingId}
                      tempName={tempName}
                      setTempName={setTempName}
                      onFocus={() => setActiveBundleId(activeBundleId === bundle.id ? null : bundle.id)}
                      onRenameStart={() => {
                        setRenamingId(bundle.id);
                        setTempName(bundle.name);
                      }}
                      onRenameConfirm={() => handleRenameBundle(bundle.id, tempName)}
                      onDelete={(e) => handleDeleteBundle(e, bundle.id)}
                      onLoad={() => loadBundle(bundle, false)}
                      onGenerate={() => loadBundle(bundle, true)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search bar */}
          {saved && (
            <div className="sticky top-14 z-10 bg-[var(--color-bg)] px-4 py-3 border-b border-[var(--color-border)]">
              <SearchBar value={query} onChange={setQuery} />
            </div>
          )}

          {/* Results */}
          <div id="print-area" className="flex-1 px-4 pb-24 md:pb-8 bg-[var(--color-bg)]">
            {!saved ? (
              <div className="flex flex-col items-center justify-center text-center py-24 px-6">
                <div className="text-4xl mb-4 select-none">📋</div>
                <p className="font-body text-sm text-[var(--color-text-secondary)] max-w-xs leading-relaxed">
                  Add your course rows above, then tap{' '}
                  <strong className="text-[var(--color-text-primary)]">Save & Find Exams</strong>{' '}
                  to see your schedule.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState query={query} batch="" dept="CS" />
            ) : (
              grouped.map(({ label, entries }) => (
                <section key={label} className="mt-6 first:mt-4">
                  <h2 className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-3">
                    {label}
                  </h2>
                  <div className="flex flex-col gap-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
                    {entries.map(exam => (
                      <ExamCard
                        key={`${exam.date}-${exam.courseCode}-${exam.time}-${exam.department}-${exam.batch}`}
                        exam={exam}
                        dept={exam.department}
                        onClick={() => setSelected(exam)}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      </div>

      {selected && (
        <ExamDetail
          exam={selected}
          dept={selected.department}
          onClose={() => setSelected(null)}
        />
      )}
      {isSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="font-display text-xl mb-4">Save Course Bundle</h3>
            <p className="text-xs text-[var(--color-text-secondary)] mb-4 leading-relaxed">
              Give this set of courses a name like &quot;Semester 6&quot; or &quot;{semesterName}&quot;. You can load it later with one click.
            </p>
            <input
              autoFocus
              type="text"
              placeholder="e.g. My Schedule"
              value={newBundleName}
              onChange={e => setNewBundleName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateBundle()}
              className="w-full h-11 px-4 mb-4 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-bg)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-cs)]"
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsSaving(false)}
                className="h-11 rounded-md border border-[var(--color-border-strong)] font-body text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBundle}
                disabled={!newBundleName.trim()}
                className="h-11 rounded-md bg-[var(--color-text-primary)] text-[var(--color-bg)] font-body text-sm font-medium disabled:opacity-50 transition-all active:scale-95"
              >
                Save Bundle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── RowEditor sub-component ────────────────────────────────────────────────
interface RowEditorProps {
  row: CourseRow;
  index: number;
  matchCount: number;
  showMatchHint: boolean;
  onUpdate: (patch: Partial<CourseRow>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function RowEditor({ row, index, matchCount, showMatchHint, onUpdate, onRemove, canRemove }: RowEditorProps) {
  const errorBase = 'border-red-400 ring-1 ring-red-400';
  const normalBase = 'border-[var(--color-border-strong)]';

  const availableCourses = useMemo(() => {
    if (!row.batch || !row.stream) return [];
    const coursesMap = new Map<string, string>();
    for (const e of allExams) {
      if (e.batch === row.batch && e.department === row.stream) {
        if (!coursesMap.has(e.courseCode)) {
          coursesMap.set(e.courseCode, e.courseName);
        }
      }
    }
    return Array.from(coursesMap.entries()).map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [row.batch, row.stream]);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-raised)] p-3 flex flex-col gap-2">
      {/* Row header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
          Course {index + 1}
        </span>
        <div className="flex items-center gap-2">
          {showMatchHint && (
            <span
              className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={matchCount > 0
                ? { backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }
                : { backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-tertiary)' }
              }
            >
              {matchCount > 0 ? `${matchCount} slot${matchCount !== 1 ? 's' : ''}` : 'not found'}
            </span>
          )}
          {canRemove && (
            <button
              onClick={onRemove}
              aria-label={`Remove course ${index + 1}`}
              className="w-6 h-6 flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-red-500 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Three fields in a row */}
      <div className="grid grid-cols-3 gap-2">
        {/* Batch */}
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
            Batch
          </label>
          <select
            value={row.batch}
            onChange={e => onUpdate({ batch: e.target.value, code: '', errorBatch: false, errorCode: false })}
            className={`h-9 px-2 rounded-md border text-xs font-mono bg-[var(--color-bg)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-cs)] cursor-pointer ${row.errorBatch ? errorBase : normalBase}`}
            aria-invalid={row.errorBatch}
          >
            {availableBatches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Stream */}
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
            Stream
          </label>
          <select
            value={row.stream}
            onChange={e => onUpdate({ stream: e.target.value, code: '', errorStream: false, errorCode: false })}
            className={`h-9 px-2 rounded-md border text-xs font-mono bg-[var(--color-bg)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-cs)] cursor-pointer ${row.errorStream ? errorBase : normalBase}`}
            aria-invalid={row.errorStream}
          >
            <option value="" disabled>—</option>
            {DEPARTMENTS.map(d => (
              <option key={d} value={d} title={DEPARTMENT_LABELS[d]}>{d}</option>
            ))}
          </select>
        </div>

        {/* Course */}
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
            Course
          </label>
          <div className="relative">
            <select
              value={row.code}
              onChange={e => onUpdate({ code: e.target.value, errorCode: false })}
              className={`w-full h-9 pl-2 pr-6 rounded-md border text-xs font-mono bg-[var(--color-bg)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-cs)] cursor-pointer truncate ${row.errorCode ? errorBase : normalBase}`}
              aria-invalid={row.errorCode}
              disabled={!row.stream || availableCourses.length === 0}
            >
              <option value="" disabled>
                {!row.stream ? 'Select Stream' : availableCourses.length === 0 ? 'No courses found' : 'Select Course'}
              </option>
              {availableCourses.map(c => (
                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-tertiary)]">
              <svg width="10" height="6" viewBox="0 0 12 7" fill="none" aria-hidden="true"><path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Inline error hints */}
      {(row.errorBatch || row.errorStream || row.errorCode) && (
        <p className="font-mono text-[10px] text-red-500">
          {[
            row.errorStream && 'Select a stream',
            row.errorCode && 'Select a course',
          ].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  );
}

export default function CustomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center">
        <p className="font-mono text-sm text-[var(--color-text-tertiary)]">Loading…</p>
      </div>
    }>
      <CustomPageInner />
    </Suspense>
  );
}

// ── BundleCard Sub-component ──
interface BundleCardProps {
  bundle: Bundle;
  isActive: boolean;
  isFocused: boolean;
  renamingId: string | null;
  tempName: string;
  setTempName: (s: string) => void;
  onFocus: () => void;
  onRenameStart: () => void;
  onRenameConfirm: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onLoad: () => void;
  onGenerate: () => void;
}

function BundleCard({
  bundle, isActive, isFocused, renamingId, tempName, setTempName,
  onFocus, onRenameStart, onRenameConfirm, onDelete, onLoad, onGenerate
}: BundleCardProps) {
  const isRenaming = renamingId === bundle.id;

  return (
    <div
      onClick={onFocus}
      className={`group relative flex flex-col gap-2 p-3 rounded-lg border transition-all cursor-pointer ${
        isActive
          ? 'bg-[var(--accent-cs)]/5 border-[var(--accent-cs)] shadow-sm'
          : 'bg-[var(--color-bg)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0" onClick={e => isRenaming && e.stopPropagation()}>
          {isRenaming ? (
            <input
              autoFocus
              value={tempName}
              onChange={e => setTempName(e.target.value)}
              onBlur={onRenameConfirm}
              onKeyDown={e => e.key === 'Enter' && onRenameConfirm()}
              className="w-full bg-transparent border-b border-[var(--accent-cs)] font-mono text-xs focus:outline-none text-[var(--color-text-primary)]"
            />
          ) : (
            <div className="flex items-center gap-1.5 group/name">
              <span className={`font-mono text-xs font-medium truncate ${isActive ? 'text-[var(--accent-cs)]' : 'text-[var(--color-text-primary)]'}`}>
                {bundle.name}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onRenameStart(); }}
                className="opacity-0 group-hover/name:opacity-100 p-0.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-all"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
          )}
        </div>
        
        <button
          onClick={onDelete}
          className="shrink-0 p-1 text-[var(--color-text-tertiary)] hover:text-red-500 transition-colors"
          aria-label="Delete bundle"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>

      {isFocused && (
        <div className="grid grid-cols-2 gap-2 mt-1 animate-in slide-in-from-top-1 duration-200">
          <button
            onClick={(e) => { e.stopPropagation(); onLoad(); }}
            className={`h-7 rounded border font-mono text-[9px] uppercase tracking-wider font-bold transition-all ${
              isActive ? 'bg-[var(--accent-cs)] text-white border-transparent' : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border-strong)]'
            }`}
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onGenerate(); }}
            className="h-7 rounded bg-[var(--color-text-primary)] text-[var(--color-bg)] font-mono text-[9px] uppercase tracking-wider font-bold active:scale-95 transition-all"
          >
            Find Exams
          </button>
        </div>
      )}
    </div>
  );
}
