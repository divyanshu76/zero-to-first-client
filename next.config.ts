import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Two root layouts (English at /, Hindi at /hi) need a routing-level 404.
  experimental: { globalNotFound: true },
  // The ThreeUI book runs in an iframe sandboxed with only `allow-scripts` (no
  // allow-same-origin), so its documents have an opaque "null" origin. ES module
  // scripts are fetched in CORS mode, so these public, static, non-credentialed
  // files must allow any origin, or viewer.js is blocked and the book never mounts.
  headers() {
    return [
      {
        // Baseline hardening for every response. (HSTS is added by Vercel on its domains.)
        // Permissions-Policy leaves "payment" alone: Razorpay's checkout frame needs it.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
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
  // The paid ebook must never ship with the deployment, whatever a route traces.
  outputFileTracingExcludes: { "/*": ["reference/**", "tests/**", "**/*.pdf", "**/*.docx", "**/*.xlsx", "**/*.zip", ".env*"] },
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
