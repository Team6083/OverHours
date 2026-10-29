// Shared via globalThis because instrumentation and route handlers may be
// bundled as separate module instances.
const SHUTDOWN_KEY = Symbol.for("overhours.shuttingDown");
const INSTALLED_KEY = Symbol.for("overhours.shutdownHookInstalled");

type ShutdownGlobal = typeof globalThis & {
    [SHUTDOWN_KEY]?: boolean;
    [INSTALLED_KEY]?: boolean;
};

export function isShuttingDown(): boolean {
    return (globalThis as ShutdownGlobal)[SHUTDOWN_KEY] === true;
}

/**
 * Flag the process as shutting down on SIGTERM so /api/readyz returns 503.
 * This only adds a listener: Next's standalone server already handles SIGTERM
 * itself (stops accepting connections, lets in-flight requests finish, then
 * exits with code 143).
 *
 * Next skips its own handler when NEXT_MANUAL_SIG_HANDLE is set. Our listener
 * would then be the only one and would swallow SIGTERM, so we do not install
 * it in that case (readyz then never reports shutting_down).
 */
export function markShuttingDownOnSigterm() {
    const g = globalThis as ShutdownGlobal;
    if (process.env.NEXT_MANUAL_SIG_HANDLE || g[INSTALLED_KEY]) return;
    g[INSTALLED_KEY] = true;

    process.once("SIGTERM", () => {
        g[SHUTDOWN_KEY] = true;
    });
}
