import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Refuse to start with invalid settings, listing every problem at once
    const { validateConfig } = await import("./lib/config");
    const { errors, summary } = validateConfig();
    if (errors.length > 0) {
      for (const error of errors) console.error(`Invalid configuration: ${error}`);
      process.exit(1);
    }
    console.info(summary);

    await import("./sentry.server.config");
    const { markShuttingDownOnSigterm } = await import("./lib/shutdown");
    markShuttingDownOnSigterm();
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
