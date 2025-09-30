/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // 日付形式（YYYY-MM-DD）を public/apps/YYYY-MM-DD/index.html に飛ばす
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})', destination: '/apps/:date/index.html' },
    ];
  },
};

module.exports = nextConfig;
