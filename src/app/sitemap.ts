import type { MetadataRoute } from 'next';

const BASE = 'https://fast-nuces-isb.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  // Only public, indexable routes. /admin, /api/* and the empty builder surfaces
  // (/custom, /timetable/custom) are deliberately excluded.
  const paths: Array<{ path: string; priority: number }> = [
    { path: '', priority: 1.0 },
    { path: '/home', priority: 0.8 },
    { path: '/timetable', priority: 0.8 },
    { path: '/timetable/optimizer', priority: 0.7 },
    { path: '/rooms', priority: 0.7 },
    { path: '/faculty', priority: 0.7 },
    { path: '/semester', priority: 0.7 },
    { path: '/events', priority: 0.7 },
    { path: '/lost-found', priority: 0.6 },
    { path: '/schedule', priority: 0.5 },
  ];

  return paths.map(({ path, priority }) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority,
  }));
}
