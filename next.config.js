/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // /2025-10-01 → /apps/2025-10-01/index.html
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})', destination: '/apps/:date/index.html' },
      // 末尾スラッシュでも対応（/2025-10-01/）
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})/', destination: '/apps/:date/index.html' },
    ];
  },
};
module.exports = nextConfig;
