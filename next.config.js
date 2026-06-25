/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})', destination: '/apps/:date/index.html' },
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})/:path*', destination: '/apps/:date/:path*' },
      { source: '/apps/:date(\\d{4}-\\d{2}-\\d{2})', destination: '/apps/:date/index.html' },
    ];
  },
  async headers() {
    return [
      {
        source: '/apps/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
