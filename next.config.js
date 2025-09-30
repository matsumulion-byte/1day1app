/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})', destination: '/:date/', permanent: false },
    ];
  },
  async rewrites() {
    return [
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})/', destination: '/apps/:date/index.html' },
    ];
  },
};
module.exports = nextConfig;
