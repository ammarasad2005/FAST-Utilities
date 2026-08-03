'use client';
import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { FacultyMember, DeptFileKey } from '@/lib/faculty';
import { DEPT_LABELS, DEPT_ACCENT } from '@/lib/faculty';
import { useMobileSwipe } from '@/hooks/useMobileSwipe';

interface Props {
  member: FacultyMember & { deptKey: DeptFileKey };
  onClose: () => void;
}

export function FacultyDetail({ member, onClose }: Props) {
  const { drawerRef, handleRef, backdropRef, closeDrawer } = useMobileSwipe({ onClose, defaultHeightStr: '90dvh' });
  const accent = DEPT_ACCENT[member.deptKey];
  const accentColor = `var(--accent-${accent})`;
  const accentBg = `var(--accent-${accent}-bg)`;
  const [imgError, setImgError] = useState(false);

  // Lock body scroll on mobile
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Extract initials for fallback
  const initials = member.name
    .replace(/^(Dr\.|Mr\.|Ms\.|Prof\.)\s*/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-30 bg-black/30 md:hidden animate-in fade-in duration-300 ease-out"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${member.name} profile`}
        className="fixed z-40 bottom-0 left-0 right-0 rounded-t-2xl overflow-y-auto md:bottom-0 md:top-14 md:left-auto md:right-0 md:w-[400px] md:rounded-none md:rounded-l-2xl md:max-h-[calc(100dvh-56px)] animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-300 ease-out h-[90dvh] md:h-auto"
        style={{ backgroundColor: 'var(--color-bg-raised)', boxShadow: 'var(--shadow-float)' }}
      >
        {/* Mobile drag handle */}
        <div ref={handleRef} className="md:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border-strong)] pointer-events-none" />
        </div>

        {/* Close button */}
        <div className="flex justify-end px-5 pt-4">
          <button
            onClick={closeDrawer}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Photo + Identity hero */}
        <div className="px-6 pb-5 flex flex-col items-center text-center gap-4">
          {/* Photo */}
          <div className="relative w-28 h-28 rounded-2xl overflow-hidden" style={{ boxShadow: `0 0 0 4px ${accentBg}` }}>
            {!imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.image_url}
                alt={member.name}
                className="w-full h-full object-cover object-top"
                onError={() => setImgError(true)}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center font-display text-3xl font-bold"
                style={{ backgroundColor: accentBg, color: accentColor }}
              >
                {initials}
              </div>
            )}
          </div>

          {/* Dept badge */}
          <span
            className="font-mono text-xs font-bold px-3 py-1 rounded-full"
            style={{ backgroundColor: accentBg, color: accentColor }}
          >
            {DEPT_LABELS[member.deptKey]}
          </span>

          {/* Name & title */}
          <div>
            <h2 className="font-display text-2xl leading-tight text-[var(--color-text-primary)]">
              {member.name}
            </h2>
            <p className="mt-1 font-body text-sm text-[var(--color-text-secondary)]">
              {member.status}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mx-6 bg-[var(--color-border)]" />

        {/* Detail rows */}
        <div className="px-6 py-5 flex flex-col gap-3">
          {/* Office */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-bg-subtle)]">
            <MapPin size={16} className="text-[var(--color-text-tertiary)] shrink-0" />
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">Office</p>
              <p className="font-mono text-sm font-medium text-[var(--color-text-primary)]">{member.office_room || 'N/A'}</p>
            </div>
          </div>

          {/* Email */}
          <a
            href={`mailto:${member.email}`}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-bg-subtle)] hover:bg-[var(--color-bg)] transition-colors group"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-tertiary)] shrink-0">
              <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">Email</p>
              <p className="font-mono text-sm font-medium text-[var(--color-text-primary)] truncate group-hover:underline">{member.email}</p>
            </div>
          </a>

          {/* LinkedIn — only if not null */}
          {member.linkedin_profile && (
            <a
              href={member.linkedin_profile}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-bg-subtle)] hover:bg-[var(--color-bg)] transition-colors group"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#0A66C2] shrink-0">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">LinkedIn</p>
                <p className="font-mono text-sm font-medium text-[var(--color-text-primary)] truncate group-hover:underline">View Profile</p>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto text-[var(--color-text-tertiary)]">
                <path d="M7 7h10v10M7 17 17 7"/>
              </svg>
            </a>
          )}

          {/* View FAST profile */}
          <a
            href={member.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border-strong)] font-body text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] active:scale-[0.98] transition-all"
          >
            View FAST Profile
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 7h10v10M7 17 17 7"/>
            </svg>
          </a>
        </div>
      </div>
    </>
  );
}
