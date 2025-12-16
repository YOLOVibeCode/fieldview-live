/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker/Railway deployment
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  // Optimize for production
  poweredByHeader: false,
  compress: true,
  // Skip ESLint during builds (we lint separately)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Skip TypeScript type checking during builds (we check separately)
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
