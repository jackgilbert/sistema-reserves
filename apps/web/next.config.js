/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sistema-reservas/shared'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
}

module.exports = nextConfig
