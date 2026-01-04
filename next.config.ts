import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Generate unique build IDs to bust cache on new deployments
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },

  // Configure cache control headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            // Private (not CDN cached), must revalidate with server
            value: "private, no-cache, no-store, must-revalidate",
          },
        ],
      },
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

export default nextConfig;
