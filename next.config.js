/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // /YYYY-MM-DD → /YYYY-MM-DD/ にリダイレクトして相対パスを安定
      {
        source: '/:date(\\d{4}-\\d{2}-\\d{2})',
        destination: '/:date/',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      // /YYYY-MM-DD → public/apps/YYYY-MM-DD/index.html
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})', destination: '/apps/:date/index.html' },
      // /YYYY-MM-DD/ → public/apps/YYYY-MM-DD/index.html (trailing slash)
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})/', destination: '/apps/:date/index.html' },

      // /YYYY-MM-DD/... → public/apps/YYYY-MM-DD/... （画像やJS、CSSも通す）
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})/:path*', destination: '/apps/:date/:path*' },
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
