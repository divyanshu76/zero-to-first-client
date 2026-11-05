import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The ThreeUI book runs in an iframe sandboxed with only `allow-scripts` (no
  // allow-same-origin), so its documents have an opaque "null" origin. ES module
  // scripts are fetched in CORS mode, so these public, static, non-credentialed
  // files must allow any origin, or viewer.js is blocked and the book never mounts.
  headers() {
    return [
      {
        source: "/3d-assets/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
