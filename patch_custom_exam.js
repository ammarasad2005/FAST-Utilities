const fs = require('fs');

const path = '/home/ammarasad2005/projects/exams/src/app/custom/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add use effect to import
code = code.replace(/import \{ useState, useMemo, useId, Suspense \} from 'react';/, "import { useState, useMemo, useId, Suspense, useEffect } from 'react';");

// Add Bundle interface
code = code.replace(/interface CourseRow \{/, "interface Bundle {\n  id: string;\n  name: string;\n  rows: CourseRow[];\n}\n\ninterface CourseRow {");

// Add state
const stateToAdd = `
  const [isMobileClassesExpanded, setIsMobileClassesExpanded] = useState(false);
  const [isDesktopClassesExpanded, setIsDesktopClassesExpanded] = useState(false);

  // ── Bundle Management State ──
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [editingBundleId, setEditingBundleId] = useState<string|null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newBundleName, setNewBundleName] = useState('');
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
    const base = \`loaded-\${bundle.id}\`;
    const newRows = bundle.rows.map((r, i) => ({
      ...r,
      id: \`\${base}-\${i}\`
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

`;

code = code.replace(/  \/\/ ── Row management ────────────────────────────────────────────────────────/, stateToAdd + "  // ── Row management ────────────────────────────────────────────────────────");

// Update handleSave
code = code.replace(/    setRows\(validated\);\n    if \(!hasError\) setSaved\(true\);/, `    setRows(validated);
    if (!hasError) {
      setSaved(true);
      setIsMobileClassesExpanded(false);
      setIsDesktopClassesExpanded(false);
    }`);

// Replace sidebars
const sidebarRegex = /<aside className="hidden md:flex md:w-72 lg:w-80 flex-col border-r border-\[var\(--color-border\)\] sticky top-14 h-\[calc\(100dvh-56px\)\] overflow-y-auto">[\s\S]*?<\/aside>/;
const newSidebar = `        {/* ── Sidebar (desktop) ── */}
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
                className={\`text-[var(--color-text-secondary)] transition-transform duration-200 \${isDesktopClassesExpanded ? 'rotate-0' : 'rotate-180'}\`}
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
                className={\`h-10 rounded-md font-body text-[10px] sm:text-xs font-medium transition-all active:scale-95 \${saved ? 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border-strong)]' : 'bg-[var(--color-text-primary)] text-[var(--color-bg)]'}\`}
              >
                {saved ? 'Update View' : 'Find Exams'}
              </button>
              
              {editingBundleId ? (
                <button
                  onClick={handleUpdateBundle}
                  className="h-10 rounded-md bg-[var(--accent-cs)] text-white font-body text-[10px] sm:text-xs font-medium hover:opacity-90 active:scale-95 transition-all truncate px-1"
                >
                  Update "{bundles.find(b => b.id === editingBundleId)?.name.split(' ')[0]}..."
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
              <ExportButton entries={filtered} variant="sidebar" />
            )}
          </div>
        </aside>`;
code = code.replace(sidebarRegex, newSidebar);

// Mobile view replacement
const mobileRegex = /<div className="md:hidden border-b border-\[var\(--color-border\)\] px-4 py-4 bg-\[var\(--color-bg\)\] flex flex-col gap-3">[\s\S]*?<\/div>\n\n          \{\/\* Search bar \*\/\}/;

const newMobile = `<div className="md:hidden border-b border-[var(--color-border)] px-4 py-4 bg-[var(--color-bg)] flex flex-col gap-3">
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
                className={\`text-[var(--color-text-secondary)] transition-transform duration-200 \${isMobileClassesExpanded ? 'rotate-0' : 'rotate-180'}\`}
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

          {/* Search bar */}`;

code = code.replace(mobileRegex, newMobile);

// IsSaving modal inject
const closingDiv = /\n    <\/div>\n  \);\n}\n\n\/\/ ── RowEditor sub-component/;
const savingModal = `
      {isSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="font-display text-xl mb-4">Save Course Bundle</h3>
            <p className="text-xs text-[var(--color-text-secondary)] mb-4 leading-relaxed">
              Give this set of courses a name like "Semester 6" or "Fall 2026". You can load it later with one click.
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

// ── RowEditor sub-component`;
code = code.replace(closingDiv, savingModal);

// Add BundleCard at the very end
const bundleCard = `
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
      className={\`group relative flex flex-col gap-2 p-3 rounded-lg border transition-all cursor-pointer \${
        isActive
          ? 'bg-[var(--accent-cs)]/5 border-[var(--accent-cs)] shadow-sm'
          : 'bg-[var(--color-bg)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
      }\`}
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
              <span className={\`font-mono text-xs font-medium truncate \${isActive ? 'text-[var(--accent-cs)]' : 'text-[var(--color-text-primary)]'}\`}>
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
            className={\`h-7 rounded border font-mono text-[9px] uppercase tracking-wider font-bold transition-all \${
              isActive ? 'bg-[var(--accent-cs)] text-white border-transparent' : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border-strong)]'
            }\`}
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
`;

code += bundleCard;

fs.writeFileSync(path, code);
