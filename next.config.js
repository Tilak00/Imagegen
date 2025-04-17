/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable TypeScript type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configure output for better compatibility
  output: 'standalone',
  // Ensure proper asset prefixes
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : undefined,
  // Disable image optimization for now to simplify deployment
  images: {
    unoptimized: true,
  },
  // Ensure proper trailing slashes
  trailingSlash: false,
};

module.exports = nextConfig;
