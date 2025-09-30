/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // 末尾スラ無しをスラ有りに統一（相対パスを安定させる）
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})', destination: '/:date/', permanent: false },
    ];
  },
  async rewrites() {
    return [
      // ページ本体
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})/', destination: '/apps/:date/index.html' },
      // 日付配下の静的ファイル(JS/CSS/画像)全部を /apps 側に中継
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})/:path*', destination: '/apps/:date/:path*' },
    ];
  },
};
module.exports = nextConfig;
