import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const verifyApiToken = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api-token", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/api-token")>(),
  verifyApiToken,
}));

import { verifyAdminApiKey, verifyApiKey, verifyCronSecret } from "./admin-api-auth";

const JWT = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ4In0.c2ln";
const ISSUER = "https://keycloak.example.test/realms/team";

const request = (key?: string) => new NextRequest("http://localhost/api/admin/attendance", {
  headers: key ? { Authorization: `Bearer ${key}` } : {},
});
const status = async (key: string | undefined, scope: Parameters<typeof verifyApiKey>[1] = "attendance:read") =>
  (await verifyApiKey(request(key), scope))?.status ?? 200;

const joseError = (code: string) => Object.assign(new Error(code), { code });

beforeEach(() => {
  vi.stubEnv("ADMIN_API_KEY", "secret");
  vi.stubEnv("AUTH_KEYCLOAK_ISSUER", ISSUER);
  vi.stubEnv("ADMIN_ROLES", "admin");
  vi.stubEnv("API_ROLES_ATTENDANCE_READ", "overhours:attendance-reader");
  verifyApiToken.mockReset().mockResolvedValue(["overhours:attendance-reader"]);
  vi.spyOn(console, "error").mockImplementation(() => { });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("verifyApiKey with ADMIN_API_KEY", () => {
  it("lets ADMIN_API_KEY use every scope without verifying a token", async () => {
    expect(await status("secret", "users:write")).toBe(200);
    expect(verifyApiToken).not.toHaveBeenCalled();
  });

  it("rejects a missing or wrong key", async () => {
    expect(await status(undefined)).toBe(401);
    expect(await status("wrong")).toBe(401);
  });

  it("is unavailable for a plain key when ADMIN_API_KEY is unset", async () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    expect(await status("secret")).toBe(503);
  });
});

describe("verifyApiKey with a Keycloak token", () => {
  it("lets a token with a role configured for the scope through", async () => {
    expect(await status(JWT)).toBe(200);
    expect(verifyApiToken).toHaveBeenCalledWith(JWT, ISSUER);
  });

  it("works when ADMIN_API_KEY is unset", async () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    expect(await status(JWT)).toBe(200);
  });

  it("refuses other scopes with 403", async () => {
    expect(await status(JWT, "users:read")).toBe(403);
    expect(await status(JWT, "timelogs:write")).toBe(403);
  });

  it("gives an admin role every scope", async () => {
    verifyApiToken.mockResolvedValue(["admin"]);
    expect(await status(JWT, "users:write")).toBe(200);
  });

  it("refuses everything when no roles are configured for the scope", async () => {
    vi.stubEnv("API_ROLES_ATTENDANCE_READ", "");
    expect(await status(JWT)).toBe(403);
  });

  it("returns 401 for a token that fails verification", async () => {
    for (const code of ["ERR_JWT_EXPIRED", "ERR_JWS_SIGNATURE_VERIFICATION_FAILED", "ERR_JWT_CLAIM_VALIDATION_FAILED"]) {
      verifyApiToken.mockRejectedValueOnce(joseError(code));
      expect(await status(JWT)).toBe(401);
    }
  });

  it("returns 503 when Keycloak can't be reached", async () => {
    verifyApiToken.mockRejectedValue(joseError("ERR_JWKS_TIMEOUT"));
    expect(await status(JWT)).toBe(503);
  });

  it("is unavailable without AUTH_KEYCLOAK_ISSUER", async () => {
    vi.stubEnv("AUTH_KEYCLOAK_ISSUER", "");
    expect(await status(JWT)).toBe(503);
    expect(verifyApiToken).not.toHaveBeenCalled();
  });
});

const secretRequest = (token?: string) => new NextRequest("http://localhost/api/admin/x", {
  headers: token === undefined ? {} : { Authorization: `Bearer ${token}` },
});

describe("static secrets", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_API_KEY", "admin-secret");
    vi.stubEnv("CRON_SECRET", "cron-secret");
  });

  describe("verifyAdminApiKey", () => {
    it("accepts ADMIN_API_KEY", () => {
      expect(verifyAdminApiKey(secretRequest("admin-secret"))).toBeNull();
    });

    it("rejects CRON_SECRET, a wrong token and a missing header with 401", () => {
      expect(verifyAdminApiKey(secretRequest("cron-secret"))?.status).toBe(401);
      expect(verifyAdminApiKey(secretRequest("wrong"))?.status).toBe(401);
      expect(verifyAdminApiKey(secretRequest())?.status).toBe(401);
    });

    it("is unavailable (503) when ADMIN_API_KEY is unset", () => {
      vi.stubEnv("ADMIN_API_KEY", "");
      expect(verifyAdminApiKey(secretRequest("admin-secret"))?.status).toBe(503);
    });
  });

  describe("verifyCronSecret", () => {
    it("accepts CRON_SECRET", () => {
      expect(verifyCronSecret(secretRequest("cron-secret"))).toBeNull();
    });

    it("rejects ADMIN_API_KEY, a wrong token and a missing header with 401", () => {
      expect(verifyCronSecret(secretRequest("admin-secret"))?.status).toBe(401);
      expect(verifyCronSecret(secretRequest("wrong"))?.status).toBe(401);
      expect(verifyCronSecret(secretRequest())?.status).toBe(401);
    });

    it("is unavailable (503) when CRON_SECRET is unset, even if ADMIN_API_KEY is set", () => {
      vi.stubEnv("CRON_SECRET", "");
      expect(verifyCronSecret(secretRequest("admin-secret"))?.status).toBe(503);
    });
  });
});
