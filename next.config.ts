import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // distDir: 'out', // Standard build goes to .next

  // Generate unique build IDs to bust cache on new deployments
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },

  // Configure cache control headers
  async headers() {
    return [
      {
        // Static assets with hash in filename - cache aggressively
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            // Immutable = never changes (hash in filename ensures unique)
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Images can be cached with revalidation
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ]
  },
};

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // Cache strategy for App Router
  runtimeCaching: [
    {
      urlPattern: /\/_next\/image\?url/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\?_rsc=/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'next-rsc',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        networkTimeoutSeconds: 5, // Fast fallback if offline/slow
      },
    },
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60,
        },
        networkTimeoutSeconds: 5,
      },
    }
  ],
  fallbacks: {
    // If you try to load a page that isn't cached (while offline), show /offline
    document: '/offline',
  }
});

export default withPWA(nextConfig);
