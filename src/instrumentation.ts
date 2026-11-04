import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    const { markShuttingDownOnSigterm } = await import("./lib/shutdown");
    markShuttingDownOnSigterm();
    const { startAutoLockTimer } = await import("./lib/data/auto-lock");
    startAutoLockTimer((e) => Sentry.captureException(e));
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
