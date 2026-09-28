/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['traklet', 'lit'],
  // Enable standalone output for Docker/Railway deployment
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301',
    NEXT_PUBLIC_TRAKLET_GITHUB_TOKEN: process.env.NEXT_PUBLIC_TRAKLET_GITHUB_TOKEN || '',
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
