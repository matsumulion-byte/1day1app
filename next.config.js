/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracing: false,
  },
  // Vercelビルドエラー回避のため、静的エクスポートを明示的に指定
  output: 'standalone',
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
