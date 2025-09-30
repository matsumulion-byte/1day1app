/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // /2025-10-01 → /2025-10-01/ に統一（相対パスの安定化）
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})', destination: '/:date/', permanent: false },
    ];
  },
  async rewrites() {
    return [
      // ページ本体
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})/', destination: '/apps/:date/index.html' },
      // 日付配下のファイル（画像/JS/CSS など）を全部 /apps 側へ転送
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})/:path*', destination: '/apps/:date/:path*' },
    ];
  },
};
module.exports = nextConfig;
