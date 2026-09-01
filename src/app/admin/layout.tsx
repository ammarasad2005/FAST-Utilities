import type { Metadata } from 'next';

/**
 * Admin portal must never enter the index.
 * Even though robots.txt already disallows /admin/, an explicit noindex meta is
 * a hard guarantee against accidental indexing of an unauthenticated admin UI.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
