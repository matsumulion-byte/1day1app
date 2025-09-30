/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // 単発（まずは 1001 だけ動かす）
      { source: '/1001', destination: '/apps/1001/index.html' },

      // 汎用：数字のパスをそのまま /apps/<id>/index.html に飛ばす
      // { source: '/:id(\\d+)', destination: '/apps/:id/index.html' },

      // 汎用：日付（YYYY-MM-DD）を /apps/<date>/index.html に飛ばす
      // { source: '/:date(\\d{4}-\\d{2}-\\d{2})', destination: '/apps/:date/index.html' },
    ];
  },
};
module.exports = nextConfig;
