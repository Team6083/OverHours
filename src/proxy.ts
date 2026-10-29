export { auth as proxy } from "@/auth";

// Health probes must be reachable without authentication (or a session lookup).
export const config = {
    matcher: ["/((?!api/healthz$|api/readyz$).*)"],
};
