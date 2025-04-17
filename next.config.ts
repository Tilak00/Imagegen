import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Production optimizations */
  output: 'standalone', // Optimizes for production deployments
  poweredByHeader: false, // Removes the X-Powered-By header
  reactStrictMode: true, // Helps catch bugs early

  // Configure image domains if you're using next/image with external sources
  images: {
    domains: ['supabase.co'], // Add domains you need to load images from
    formats: ['image/avif', 'image/webp'],
  },

  // Add any environment variables you want to expose to the browser
  // These will be available via process.env.NEXT_PUBLIC_*
  env: {
    NEXT_PUBLIC_APP_VERSION: '0.1.0',
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
