import type { MetadataRoute } from 'next';

const BASE = 'https://fast-nuces-isb.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Block non-public, non-indexable surfaces from being crawled.
        disallow: ['/api/', '/admin/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
