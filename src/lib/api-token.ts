import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { extractRoles, parseTokenAlgorithms } from "@/lib/auth-roles";
import { getOidcAudience } from "@/lib/config";

const CLOCK_TOLERANCE_SEC = 10;

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
let jwksIssuer: string | undefined;

/** Whether `token` has the shape of a JWT (three base64url parts), as opposed to a static API key. */
export const looksLikeJwt = (token: string) => /^[\w-]+\.[\w-]+\.[\w-]+$/.test(token);

/**
 * Verifies a Keycloak-issued access token (signature via the issuer's JWKS, `iss`, `exp`, `sub`, `typ` Bearer, and `aud`
 * containing `OIDC_AUDIENCE`, default our client id) and returns its realm and client roles. Throws if verification fails.
 * The audience is checked at startup.
 * Unlike a user's sign-in token, `azp` is not checked: a service account's token is issued to its own client.
 */
export async function verifyApiToken(token: string, issuer: string): Promise<string[]> {
  if (!jwks || jwksIssuer !== issuer) {
    jwks = createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));
    jwksIssuer = issuer;
  }

  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience: getOidcAudience()!,
    requiredClaims: ["sub"],
    algorithms: parseTokenAlgorithms(process.env.AUTH_KEYCLOAK_ALGORITHMS),
    clockTolerance: CLOCK_TOLERANCE_SEC,
  });

  // An ID or refresh token issued to our client has the same aud, so only access tokens are accepted.
  if (payload.typ !== "Bearer") {
    throw Object.assign(new Error("Not an access token"), { code: "ERR_JWT_CLAIM_VALIDATION_FAILED" });
  }

  return extractRoles(payload);
}
