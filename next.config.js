const nextConfig = {
  async rewrites() {
    return [
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})/', destination: '/apps/:date/index.html' },
      { source: '/:date(\\d{4}-\\d{2}-\\d{2})/:path*', destination: '/apps/:date/:path*' },
    ];
  },
};
module.exports = nextConfig;
