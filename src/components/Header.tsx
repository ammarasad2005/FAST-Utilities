'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ReactNode } from 'react';

interface HeaderProps {
  children?: ReactNode;
  rightActions?: ReactNode;
}

export function Header({ children, rightActions }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between h-[3.75rem] flex-shrink-0 glass-header-laser px-5 md:px-10"
      style={{ boxShadow: 'var(--shadow-header)' }}
    >
      {/* Left: Logo */}
      <div className="flex items-center min-w-[60px] md:min-w-[100px]">
        <Link href="/" className="flex items-center cursor-pointer group">
          <div 
            className="h-6 w-[72px] transition-colors duration-300 group-hover:scale-105 active:scale-95 bg-[var(--color-text-primary)] group-hover:bg-[var(--laser-rail-mid)]"
            style={{
              maskImage: 'url(/logo/logo.png)',
              WebkitMaskImage: 'url(/logo/logo.png)',
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'left center',
              WebkitMaskPosition: 'left center',
            }}
          />
        </Link>
      </div>

      {/* Center: Dynamic Content */}
      <div className="flex-1 flex justify-center mx-2 md:mx-4 overflow-hidden min-w-0">
        {children}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end min-w-[60px] md:min-w-[100px] gap-3 md:gap-4">
        {rightActions}
        <a 
          href="https://github.com/ammarasad2005/Exam-Table" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="md:hidden text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors" 
          aria-label="GitHub"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
          </svg>
        </a>
        <a 
          href="https://linkedin.com/in/muhammad-ammar-asad" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="md:hidden text-[var(--color-text-secondary)] hover:text-[#0a66c2] transition-colors dark:hover:text-[#3b82f6]" 
          aria-label="LinkedIn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}
