/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sistema-reservas/shared'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/:path*',
      },
    ];
  },
}

module.exports = nextConfig
