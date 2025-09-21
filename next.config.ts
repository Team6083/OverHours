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
  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
  // Pass the auth token
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  tunnelRoute: true,

  reactComponentAnnotation: {
    enabled: true,
  },

  automaticVercelMonitors: true,
});
