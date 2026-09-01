/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    // Local faculty photos live in /public/faculty-img/ and work with next/image
    // automatically. A handful of faculty photos 404 on the origin server, so
    // their image_url is left pointing at the remote host as a fallback — this
    // pattern lets next/image optimize those too.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'isb.nu.edu.pk',
        pathname: '/assets/img/person/*',
      },
    ],
    // WebP source files are already well-compressed; let the optimizer focus on
    // resizing + format negotiation (avif/webp) per browser.
    formats: ['image/avif', 'image/webp'],
  },
  headers: async () => [
    {
      source: '/data/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
      ],
    },
    {
      // Long-cache optimized faculty images (served by Vercel CDN)
      source: '/faculty-img/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ],
};

module.exports = nextConfig;
