import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    typescript: {
    // Allow production build even when TypeScript reports errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Optional: also skip ESLint during build
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;