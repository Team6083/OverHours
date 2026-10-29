import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { buildCsp, generateNonce } from "@/lib/csp";

// Authenticates (refreshing the session cookie) and sets a per-request nonce CSP. Next.js reads the CSP from the
// request headers and puts the nonce on the scripts it emits; the layout reads `x-nonce` for next-themes' inline script.
// Set CSP_REPORT_ONLY=true to only report violations in the browser console instead of blocking them.
export const proxy = auth((req) => {
  const nonce = generateNonce();
  const csp = buildCsp({
    nonce,
    keycloakIssuer: process.env.AUTH_KEYCLOAK_ISSUER,
    production: process.env.NODE_ENV === "production",
  });
  const cspHeader = process.env.CSP_REPORT_ONLY === "true"
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(cspHeader, csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(cspHeader, csp);
  return response;
});

// Health probes must be reachable without authentication (or a session lookup).
export const config = {
    matcher: ["/((?!api/healthz$|api/readyz$).*)"],
};
