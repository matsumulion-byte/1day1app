/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // /YYYY-MM-DD → public/apps/YYYY-MM-DD/index.html
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})', destination: '/apps/:date/index.html' },

      // /YYYY-MM-DD/... → public/apps/YYYY-MM-DD/... （画像やJS、CSSも通す）
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})/:path*', destination: '/apps/:date/:path*' },
    ];
  },
};

module.exports = nextConfig;
