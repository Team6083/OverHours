// Pure helpers for classifying access-token verification errors and for the "keep the previous role"
// grace window. Kept free of Auth.js / jose / env access so it is easy to test.

// jose errors meaning the token itself is bad. Anything else (JWKS fetch failure or timeout, network
// errors) is treated as transient: it says nothing about the token.
export const INVALID_TOKEN_ERROR_CODES: ReadonlySet<string> = new Set([
  "ACCESS_TOKEN_AZP_MISMATCH",
  "ERR_JWT_CLAIM_VALIDATION_FAILED",
  "ERR_JWT_EXPIRED",
  "ERR_JOSE_ALG_NOT_ALLOWED",
  "ERR_JOSE_NOT_SUPPORTED",
  "ERR_JWS_INVALID",
  "ERR_JWT_INVALID",
  "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
  "ERR_JWKS_NO_MATCHING_KEY",
  "ERR_JWKS_MULTIPLE_MATCHING_KEYS",
]);

export const KNOWN_TRANSIENT_ERROR_CODES: readonly string[] = [
  "ERR_JWKS_TIMEOUT",
  "ERR_JOSE_GENERIC",
  "ERR_JWKS_INVALID",
  "ERR_JWK_INVALID",
  // Network / fetch failures, by error name
  "TypeError",
  "AbortError",
  "TimeoutError",
  // Standard OAuth token endpoint error codes (RFC 6749 section 5.2)
  "invalid_request",
  "invalid_client",
  "invalid_grant",
  "unauthorized_client",
  "unsupported_grant_type",
  "invalid_scope",
  "temporarily_unavailable",
  "server_error",
];
const KNOWN_ERROR_CODES = [...INVALID_TOKEN_ERROR_CODES, ...KNOWN_TRANSIENT_ERROR_CODES];

// Maps an error to a short code from the fixed list above ("unknown" otherwise). The returned string is
// always one of our own literals, never the incoming value, so nothing sensitive (tokens, claims, email,
// sub) carried by an error object can reach the logs.
export function describeError(error: unknown): string {
  const { code, error: oauthError, name } = (error ?? {}) as { code?: unknown; error?: unknown; name?: unknown };
  for (const candidate of [code, oauthError, name]) {
    const known = KNOWN_ERROR_CODES.find((knownCode) => knownCode === candidate);
    if (known) {
      return known;
    }
  }
  return "unknown";
}

/** AUTH_KEYCLOAK_VERIFY_GRACE_SEC, falling back to 15 minutes when unset, empty, zero or not a number. */
export function parseVerifyGraceSec(value: string | undefined): number {
  return Number(value) || 15 * 60;
}

/** True once verification has been failing for longer than the grace window (all values in seconds). */
export function isVerifyGraceExpired(nowSec: number, failedSinceSec: number, graceSec: number): boolean {
  return nowSec - failedSinceSec > graceSec;
}
