import type { NextConfig } from "next";

import createNextIntlPlugin from 'next-intl/plugin';

import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
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

  // NOTE: these webpack-specific options are not supported when building with
  // Turbopack (as this project does) — they're kept here for when webpack is
  // used (e.g. a future/fallback build), but currently are no-ops.
  webpack: {
    // Automatically tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },
    reactComponentAnnotation: {
      enabled: true,
    },
    automaticVercelMonitors: true,
  },
});
