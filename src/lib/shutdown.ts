// Shared via globalThis because instrumentation and route handlers may be
// bundled as separate module instances.
const SHUTDOWN_KEY = Symbol.for("overhours.shuttingDown");

type ShutdownGlobal = typeof globalThis & { [SHUTDOWN_KEY]?: boolean };

export function isShuttingDown(): boolean {
    return (globalThis as ShutdownGlobal)[SHUTDOWN_KEY] === true;
}

/**
 * Flag the process as shutting down on SIGTERM so /api/readyz starts returning
 * 503 immediately. This only adds a listener: Next's standalone server already
 * handles SIGTERM itself (stops accepting connections, lets in-flight requests
 * finish, then exits with code 143).
 */
export function markShuttingDownOnSigterm() {
    process.once("SIGTERM", () => {
        (globalThis as ShutdownGlobal)[SHUTDOWN_KEY] = true;
    });
}
