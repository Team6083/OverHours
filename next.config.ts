import type { NextConfig } from "next";

import createNextIntlPlugin from 'next-intl/plugin';

import { withSentryConfig } from "@sentry/nextjs/config";

// Evaluated at build time (the Docker build args are exported as env vars there) and baked into the standalone
// server, so these reflect the image, not the runtime environment. Unset values emit no header.
const appHeaders = [
  { key: "X-App-Version", value: process.env.NEXT_PUBLIC_VERSION },
  { key: "X-App-Commit", value: process.env.NEXT_PUBLIC_COMMIT_SHA },
].filter((header): header is { key: string; value: string } => Boolean(header.value));

// HSTS is intentionally not set here; it is set at the edge. The CSP is set per request in src/proxy.ts.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
  // Applies to every path, including API routes, static assets and the health endpoints that bypass src/proxy.ts.
  async headers() {
    return [{ source: "/:path*", headers: [...appHeaders, ...securityHeaders] }];
  },
};

const withNextIntl = createNextIntlPlugin();
const nextConfigWithIntl = withNextIntl(nextConfig);

export default withSentryConfig(nextConfigWithIntl, {
  org: "team6083",
  project: "overhours",
  // Only print logs for uploading source maps in CI
  // Set to `true` to suppress logs
  silent: !process.env.CI,
  // Pass the auth token
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  tunnelRoute: true,

  // NOTE: the options under `webpack` are not supported when building with
  // Turbopack (as this project does) — they're kept here for when webpack is
  // used (e.g. a future/fallback build), but currently are no-ops.
  // `reactComponentAnnotation` below is top-level, so it applies to both bundlers
  // (adds `data-sentry-*` attributes to React elements).
  webpack: {
    // Automatically tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: true,
  },

  reactComponentAnnotation: {
    enabled: true,
  },
});
