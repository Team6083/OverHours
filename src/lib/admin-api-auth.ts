import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

import { apiError } from "@/lib/api-error";
import { ApiScope, rolesForScope, rolesGrantScope } from "@/lib/api-scopes";
import { looksLikeJwt, verifyApiToken } from "@/lib/api-token";
import { describeError, INVALID_TOKEN_ERROR_CODES } from "@/lib/auth-errors";
import { parseAdminRoles } from "@/lib/auth-roles";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

function bearerToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
}

/** `ADMIN_API_KEY` only; used by endpoints that have no scope. */
export function verifyAdminApiKey(req: NextRequest): NextResponse | null {
  const adminApiKey = process.env.ADMIN_API_KEY;
  if (!adminApiKey) {
    return apiError("service_unavailable", "Admin API is not configured");
  }

  const token = bearerToken(req);
  if (!token || !safeCompare(token, adminApiKey)) {
    return apiError("unauthenticated", "Unauthorized");
  }

  return null;
}

/**
 * Lets a request through when its Bearer token is `ADMIN_API_KEY` (every scope), or a Keycloak-issued token with an
 * admin role or a role configured for `scope` in its `API_ROLES_*` variable. Returns the error response to send otherwise.
 */
export async function verifyApiKey(req: NextRequest, scope: ApiScope): Promise<NextResponse | null> {
  const token = bearerToken(req);
  const adminApiKey = process.env.ADMIN_API_KEY;
  if (token && adminApiKey && safeCompare(token, adminApiKey)) {
    return null;
  }
  if (!token || !looksLikeJwt(token)) {
    // Not a token, so only ADMIN_API_KEY can match: same responses as before tokens were accepted.
    return verifyAdminApiKey(req);
  }

  const issuer = process.env.AUTH_KEYCLOAK_ISSUER;
  if (!issuer) {
    return apiError("service_unavailable", "Admin API tokens are not configured");
  }

  let roles: string[];
  try {
    roles = await verifyApiToken(token, issuer);
  } catch (error) {
    const code = describeError(error);
    if (INVALID_TOKEN_ERROR_CODES.has(code)) {
      return apiError("unauthenticated", "Unauthorized");
    }
    console.error(`Could not verify API token (${code})`);
    return apiError("service_unavailable", "Could not verify the token, try again later");
  }

  if (!rolesGrantScope(roles, parseAdminRoles(process.env.ADMIN_ROLES), rolesForScope(scope, process.env))) {
    return apiError("forbidden", `This token does not have the ${scope} permission`);
  }

  return null;
}
