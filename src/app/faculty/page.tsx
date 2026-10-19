'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LayoutGrid, List } from 'lucide-react';
import { Header } from '@/components/Header';

import { FacultyCard } from '@/components/FacultyCard';
import { FacultyDetail } from '@/components/FacultyDetail';
import {
  flattenFaculty,
  searchFaculty,
  DEPT_LABELS,
  DEPT_ORDER,
  DEPT_ACCENT,
  type FacultyMember,
  type DeptFileKey,
  type RawFacultyDepartment,
} from '@/lib/faculty';

// Bundled at build time — zero runtime fetch, served from Vercel CDN
// eslint-disable-next-line
const rawFacultyData: RawFacultyDepartment[] = require('../../../public/data/faculty/faculty_data.json');

const ALL_MEMBERS = flattenFaculty(rawFacultyData);
const PAGE_SIZE = 24;

type ActiveDept = 'ALL' | DeptFileKey;

export default function FacultyPage() {
  const router = useRouter();
  const gridRef = useRef<HTMLDivElement>(null);

  const [query, setQuery]           = useState('');
  const [activeDept, setActiveDept] = useState<ActiveDept>('ALL');
  const [page, setPage]             = useState(1);
  const [selected, setSelected]     = useState<(FacultyMember & { deptKey: DeptFileKey }) | null>(null);
  const [viewMode, setViewMode]     = useState<'grid' | 'list'>('list');

  // ── Read URL parameter on mount ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const deptParam = params.get('dept');
      if (deptParam && DEPT_ORDER.includes(deptParam as DeptFileKey)) {
        setActiveDept(deptParam as DeptFileKey);
      }
    }
  }, []);

  // ── Filtered list (all data always in memory, zero extra fetches) ──────────
  const filtered = useMemo(() => {
    const list = activeDept === 'ALL'
      ? ALL_MEMBERS
      : ALL_MEMBERS.filter(m => m.deptKey === activeDept);
    return searchFaculty(list, query);
  }, [query, activeDept]);

  // ── Reset page to 1 whenever filter/search changes ──────────────────────
  useEffect(() => { setPage(1); }, [filtered]);

  // ── Current page slice (only these members render <img> tags) ───────────
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageMembers = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  // ── Dept counts ──────────────────────────────────────────────────────────
  const totalByDept = useMemo(() => {
    const map: Record<string, number> = {};
    ALL_MEMBERS.forEach(m => { map[m.deptKey] = (map[m.deptKey] ?? 0) + 1; });
    return map;
  }, []);

  // ── Page nav — scroll grid back to top ──────────────────────────────────
  const goToPage = useCallback((next: number) => {
    setPage(next);
    // Slight delay so React flushes the new cards first
    requestAnimationFrame(() =>
      gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  }, []);

  // ── Dept / search change also resets to top ──────────────────────────────
  const handleDeptChange = useCallback((dept: ActiveDept) => {
    setActiveDept(dept);
    requestAnimationFrame(() =>
      gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  }, []);

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">

      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="hidden sm:block text-[var(--color-text-tertiary)] shrink-0">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span className="font-mono text-sm font-medium text-[var(--color-text-primary)] truncate">
              Faculty Directory
            </span>
            <span className="font-mono text-xs text-[var(--color-text-tertiary)] shrink-0">
              {ALL_MEMBERS.length} faculty
            </span>
          </div>
        </div>
      </Header>


      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1">

        {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
        <aside className="hidden md:flex md:w-56 lg:w-64 flex-col gap-5 p-6 border-r border-[var(--color-border)] sticky top-14 h-[calc(100dvh-56px)] overflow-y-auto">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-3">
              Departments
            </p>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleDeptChange('ALL')}
                className="flex items-center justify-between h-9 px-3 rounded-lg text-left transition-colors w-full hover:bg-[var(--color-text-primary)] hover:text-[var(--color-bg)]"
                style={activeDept === 'ALL' ? {
                  backgroundColor: 'var(--color-text-primary)',
                  color: 'var(--color-bg)',
                } : { color: 'var(--color-text-secondary)' }}
              >
                <span className="font-mono text-xs font-medium">All Faculty</span>
                <span className="font-mono text-[10px] opacity-70">{ALL_MEMBERS.length}</span>
              </button>

              {DEPT_ORDER.map(key => {
                const accent   = DEPT_ACCENT[key];
                const isActive = activeDept === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleDeptChange(key)}
                    className="flex items-center justify-between h-9 px-3 rounded-lg text-left transition-colors w-full hover:bg-[var(--hover-bg)] hover:text-[var(--hover-color)] hover:ring-1 hover:ring-[var(--hover-color)] group"
                    style={{
                      '--hover-bg': `var(--accent-${accent}-bg)`,
                      '--hover-color': `var(--accent-${accent})`,
                      ...(isActive ? {
                        backgroundColor: `var(--accent-${accent}-bg)`,
                        color: `var(--accent-${accent})`,
                        boxShadow: `0 0 0 1px var(--accent-${accent})`,
                      } : { color: 'var(--color-text-secondary)' })
                    } as any}
                  >
                    <span className="font-mono text-xs font-medium truncate">{key}</span>
                    <span className="font-mono text-[10px] opacity-70 group-hover:opacity-100 transition-opacity">{totalByDept[key] ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-[var(--color-border)]" />

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-1">Total</p>
            <p className="font-mono text-2xl font-medium">{ALL_MEMBERS.length}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">faculty members</p>
          </div>
        </aside>

        {/* ── Main content ────────────────────────────────────────────────── */}
        <div className="flex-1 px-4 md:px-8 py-6 max-w-[1200px] mx-auto w-full">

          {/* Search Bar */}
          <div className="relative mb-5">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, title, email, office…"
              className="w-full h-12 pl-11 pr-4 bg-[var(--color-bg-raised)] border border-[var(--color-border-strong)] rounded-xl font-body text-sm placeholder:text-[var(--color-text-tertiary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-text-primary)]/20"
              style={{ boxShadow: 'var(--shadow-card)' }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            )}
          </div>

          {/* Mobile dept filter strip */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none -mx-4 px-4">
            <button
              onClick={() => handleDeptChange('ALL')}
              className="shrink-0 h-8 px-4 rounded-full font-mono text-[11px] font-bold border transition-all hover:bg-[var(--color-text-primary)] hover:text-[var(--color-bg)] hover:border-[var(--color-text-primary)]"
              style={activeDept === 'ALL' ? {
                backgroundColor: 'var(--color-text-primary)',
                color: 'var(--color-bg)',
                borderColor: 'var(--color-text-primary)',
              } : {
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-text-secondary)',
              }}
            >
              All
            </button>
            {DEPT_ORDER.map(key => {
              const accent   = DEPT_ACCENT[key];
              const isActive = activeDept === key;
              return (
                <button
                  key={key}
                  onClick={() => handleDeptChange(key)}
                  className="shrink-0 h-8 px-4 rounded-full font-mono text-[11px] font-bold border transition-all hover:bg-[var(--hover-bg)] hover:text-[var(--hover-color)] hover:border-[var(--hover-color)]"
                  style={{
                    '--hover-bg': `var(--accent-${accent}-bg)`,
                    '--hover-color': `var(--accent-${accent})`,
                    ...(isActive ? {
                      backgroundColor: `var(--accent-${accent}-bg)`,
                      color: `var(--accent-${accent})`,
                      borderColor: `var(--accent-${accent})`,
                    } : {
                      borderColor: 'var(--color-border-strong)',
                      color: 'var(--color-text-secondary)',
                    })
                  } as any}
                >
                  {key}
                </button>
              );
            })}
          </div>

          {/* Results header — scroll anchor */}
          <div ref={gridRef} className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-[var(--color-border)]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] hidden sm:inline-block">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              {activeDept !== 'ALL' ? ` · ${activeDept}` : ''}
              {query ? ` · "${query}"` : ''}
              {totalPages > 1 ? ` · page ${page}/${totalPages}` : ''}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] sm:hidden">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
            <div className="h-px flex-1 bg-[var(--color-border)]" />
            
            {/* View Mode Toggle */}
            <div className="flex bg-[var(--color-bg-raised)] rounded-lg p-1 border border-[var(--color-border)] shrink-0 md:hidden">
               <button 
                 onClick={() => setViewMode('grid')} 
                 className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'}`}
                 aria-label="Grid view"
               >
                 <LayoutGrid size={14} strokeWidth={2.5} />
               </button>
               <button 
                 onClick={() => setViewMode('list')} 
                 className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'}`}
                 aria-label="List view"
               >
                 <List size={14} strokeWidth={2.5} />
               </button>
            </div>
          </div>

          {/* Faculty grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <div className="font-mono text-4xl text-[var(--color-text-tertiary)] mb-4">∅</div>
              <p className="font-body text-sm text-[var(--color-text-secondary)] max-w-xs">
                No faculty found matching your search. Try a different name, title, or department.
              </p>
              <button
                onClick={() => { setQuery(''); setActiveDept('ALL'); }}
                className="mt-4 font-mono text-xs text-[var(--color-text-tertiary)] underline hover:text-[var(--color-text-primary)] transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? "flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 px-4 -mx-4 scrollbar-none md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:overflow-visible md:snap-none md:px-0 md:mx-0"
                : "flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4"
            }>
              {pageMembers.map((member, i) => (
                <div key={`${member.deptKey}-${(page - 1) * PAGE_SIZE + i}`} className={viewMode === 'grid' ? "w-[85vw] shrink-0 snap-center md:w-auto md:shrink" : "w-full"}>
                  {/* Mobile version follows toggle state */}
                  <div className="md:hidden h-full">
                    <FacultyCard
                      member={member}
                      priority={i < 8}
                      viewMode={viewMode}
                      onClick={() => setSelected(member)}
                    />
                  </div>
                  {/* Desktop version is always grid */}
                  <div className="hidden md:block h-full">
                    <FacultyCard
                      member={member}
                      priority={i < 8}
                      viewMode="grid"
                      onClick={() => setSelected(member)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Pagination controls ────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10 mb-4 flex-wrap">
              {/* Prev */}
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                aria-label="Previous page"
                className="h-9 px-4 rounded-lg font-mono text-xs border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-[var(--color-bg-subtle)]"
              >
                ← Prev
              </button>

              {/* Page numbers (show up to 7, with ellipsis) */}
              {buildPageList(page, totalPages).map((p, idx) =>
                p === '…' ? (
                  <span key={`ellipsis-${idx}`} className="font-mono text-xs text-[var(--color-text-tertiary)] px-1">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p as number)}
                    aria-label={`Page ${p}`}
                    aria-current={p === page ? 'page' : undefined}
                    className="w-9 h-9 rounded-lg font-mono text-xs border transition-all"
                    style={p === page ? {
                      backgroundColor: 'var(--color-text-primary)',
                      color: 'var(--color-bg)',
                      borderColor: 'var(--color-text-primary)',
                    } : {
                      borderColor: 'var(--color-border-strong)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {p}
                  </button>
                )
              )}

              {/* Next */}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                aria-label="Next page"
                className="h-9 px-4 rounded-lg font-mono text-xs border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-[var(--color-bg-subtle)]"
              >
                Next →
              </button>
            </div>
          )}

          {/* Bottom padding for scroll-past */}
          <div className="h-[150px]" />
        </div>
      </div>

      {/* ── Detail Sheet ────────────────────────────────────────────────────── */}
      {selected && (
        <FacultyDetail
          member={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Helper: build page number list with ellipsis ─────────────────────────────
function buildPageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '…')[] = [1];

  if (current > 3)         pages.push('…');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push('…');

  pages.push(total);
  return pages;
}
