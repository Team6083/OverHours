import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { extractRoles, parseTokenAlgorithms } from "@/lib/auth-roles";

const CLOCK_TOLERANCE_SEC = 10;

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
let jwksIssuer: string | undefined;

/** Whether `token` has the shape of a JWT (three base64url parts), as opposed to a static API key. */
export const looksLikeJwt = (token: string) => /^[\w-]+\.[\w-]+\.[\w-]+$/.test(token);

/**
 * Verifies a Keycloak-issued API token (signature via the issuer's JWKS, `iss`, `exp`, and `aud` containing
 * `API_TOKEN_AUDIENCE`, default our client id) and returns its realm and client roles. Throws if verification fails.
 * Unlike a user's sign-in token, `azp` is not checked: a service account's token is issued to its own client.
 */
export async function verifyApiToken(token: string, issuer: string): Promise<string[]> {
  if (!jwks || jwksIssuer !== issuer) {
    jwks = createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));
    jwksIssuer = issuer;
  }

  const audience = process.env.API_TOKEN_AUDIENCE || process.env.AUTH_KEYCLOAK_ID;
  if (!audience) {
    throw new Error("API_TOKEN_AUDIENCE or AUTH_KEYCLOAK_ID must be set to accept API tokens");
  }

  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience,
    algorithms: parseTokenAlgorithms(process.env.AUTH_KEYCLOAK_ALGORITHMS),
    clockTolerance: CLOCK_TOLERANCE_SEC,
  });

  return extractRoles(payload);
}
