import { describe, expect, it } from "vitest";

import {
  describeError,
  INVALID_TOKEN_ERROR_CODES,
  isVerifyGraceExpired,
  KNOWN_TRANSIENT_ERROR_CODES,
  parseVerifyGraceSec,
} from "./auth-errors";

const INVALID_CODES = [
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
];

describe("INVALID_TOKEN_ERROR_CODES", () => {
  it("contains exactly the codes that mean the token itself is bad", () => {
    expect([...INVALID_TOKEN_ERROR_CODES].sort()).toEqual([...INVALID_CODES].sort());
  });

  it("does not overlap with the transient codes", () => {
    for (const code of KNOWN_TRANSIENT_ERROR_CODES) {
      expect(INVALID_TOKEN_ERROR_CODES.has(code)).toBe(false);
    }
  });
});

describe("describeError", () => {
  it.each(INVALID_CODES)("reports %s as an invalid-token error", (code) => {
    const error = Object.assign(new Error("boom"), { code });
    expect(describeError(error)).toBe(code);
    expect(INVALID_TOKEN_ERROR_CODES.has(describeError(error))).toBe(true);
  });

  it.each(["ERR_JWKS_TIMEOUT", "ERR_JOSE_GENERIC", "ERR_JWKS_INVALID", "ERR_JWK_INVALID"])(
    "reports jose code %s as transient (not in the invalid set)",
    (code) => {
      const result = describeError({ code });
      expect(result).toBe(code);
      expect(INVALID_TOKEN_ERROR_CODES.has(result)).toBe(false);
    },
  );

  it("reports a network fetch failure (TypeError by name) as transient", () => {
    const result = describeError(new TypeError("fetch failed"));
    expect(result).toBe("TypeError");
    expect(INVALID_TOKEN_ERROR_CODES.has(result)).toBe(false);
  });

  it("recognises AbortError and TimeoutError by name", () => {
    const abort = new Error("aborted");
    abort.name = "AbortError";
    const timeout = new Error("slow");
    timeout.name = "TimeoutError";
    expect(describeError(abort)).toBe("AbortError");
    expect(describeError(timeout)).toBe("TimeoutError");
  });

  it.each([
    "invalid_request",
    "invalid_client",
    "invalid_grant",
    "unauthorized_client",
    "unsupported_grant_type",
    "invalid_scope",
    "temporarily_unavailable",
    "server_error",
  ])("recognises the OAuth error %s from the `error` field and treats it as transient", (oauthError) => {
    const result = describeError({ error: oauthError });
    expect(result).toBe(oauthError);
    expect(INVALID_TOKEN_ERROR_CODES.has(result)).toBe(false);
  });

  it("prefers code over error over name", () => {
    expect(describeError({ code: "ERR_JWT_EXPIRED", error: "invalid_grant", name: "TypeError" })).toBe("ERR_JWT_EXPIRED");
    expect(describeError({ error: "invalid_grant", name: "TypeError" })).toBe("invalid_grant");
  });

  it("skips an unknown code and falls through to a known later candidate", () => {
    expect(describeError({ code: "SOMETHING_ELSE", name: "TypeError" })).toBe("TypeError");
  });

  it("returns unknown for unrecognised errors, and unknown is not an invalid-token code", () => {
    for (const error of [new Error("x"), { code: "ECONNRESET" }, { code: "ERR_JWT_EXPIREDD" }, {}]) {
      const result = describeError(error);
      expect(result).toBe("unknown");
      expect(INVALID_TOKEN_ERROR_CODES.has(result)).toBe(false);
    }
  });

  it("returns unknown for non-object values", () => {
    for (const error of [null, undefined, "ERR_JWT_EXPIRED", 42, true]) {
      expect(describeError(error)).toBe("unknown");
    }
  });

  it("ignores non-string code values", () => {
    expect(describeError({ code: 500 })).toBe("unknown");
    expect(describeError({ code: ["ERR_JWT_EXPIRED"] })).toBe("unknown");
    expect(describeError({ code: { toString: () => "ERR_JWT_EXPIRED" } })).toBe("unknown");
  });

  it("is case sensitive", () => {
    expect(describeError({ code: "err_jwt_expired" })).toBe("unknown");
    expect(describeError({ name: "typeerror" })).toBe("unknown");
  });

  it("never echoes attacker-controlled or sensitive values", () => {
    const secret = "eyJhbGciOi.secret.token";
    expect(describeError({ code: secret, error: secret, name: secret, message: secret })).toBe("unknown");
  });
});

describe("parseVerifyGraceSec", () => {
  const DEFAULT = 900;

  it("defaults to 15 minutes when unset, empty, zero or not a number", () => {
    for (const value of [undefined, "", "0", "abc", "NaN"]) {
      expect(parseVerifyGraceSec(value)).toBe(DEFAULT);
    }
  });

  it("uses a positive number of seconds", () => {
    expect(parseVerifyGraceSec("60")).toBe(60);
    expect(parseVerifyGraceSec("1.5")).toBe(1.5);
    expect(parseVerifyGraceSec(" 120 ")).toBe(120);
  });

  it("passes a negative value through unchanged (current behaviour: grace is already expired)", () => {
    expect(parseVerifyGraceSec("-5")).toBe(-5);
  });
});

describe("isVerifyGraceExpired", () => {
  const GRACE = 15 * 60;
  const since = 1_000_000;

  it("is not expired just under the window", () => {
    expect(isVerifyGraceExpired(since + GRACE - 1, since, GRACE)).toBe(false);
  });

  it("is not expired exactly at the window boundary (strictly greater than)", () => {
    expect(isVerifyGraceExpired(since + GRACE, since, GRACE)).toBe(false);
  });

  it("is expired just over the window", () => {
    expect(isVerifyGraceExpired(since + GRACE + 1, since, GRACE)).toBe(true);
  });

  it("is not expired when the failure has just started", () => {
    expect(isVerifyGraceExpired(since, since, GRACE)).toBe(false);
  });

  it("is not expired if the clock went backwards", () => {
    expect(isVerifyGraceExpired(since - 100, since, GRACE)).toBe(false);
  });

  it("with a negative grace, expires immediately", () => {
    expect(isVerifyGraceExpired(since, since, -5)).toBe(true);
  });

  it("with a NaN grace, never expires (comparison is false)", () => {
    expect(isVerifyGraceExpired(since + 10_000_000, since, Number.NaN)).toBe(false);
  });

  it("combines with the env parser: a typo'd env falls back to 15 minutes", () => {
    const grace = parseVerifyGraceSec("oops");
    expect(isVerifyGraceExpired(since + 899, since, grace)).toBe(false);
    expect(isVerifyGraceExpired(since + 901, since, grace)).toBe(true);
  });
});
