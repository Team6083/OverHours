import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jose = vi.hoisted(() => ({ jwtVerify: vi.fn(), createRemoteJWKSet: vi.fn(() => "jwks") }));

vi.mock("server-only", () => ({}));
vi.mock("jose", () => jose);

import { looksLikeJwt, verifyApiToken } from "./api-token";

const ISSUER = "https://keycloak.example.test/realms/team";

beforeEach(() => {
  vi.stubEnv("AUTH_KEYCLOAK_ID", "overhours");
  jose.jwtVerify.mockReset().mockResolvedValue({
    payload: { typ: "Bearer", sub: "service-account", realm_access: { roles: ["reader"] }, resource_access: { overhours: { roles: ["attendance"] } } },
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyApiToken", () => {
  it("checks issuer and audience (our client id by default) and returns realm and client roles", async () => {
    await expect(verifyApiToken("a.b.c", ISSUER)).resolves.toEqual(["reader", "overhours:attendance"]);
    expect(jose.createRemoteJWKSet).toHaveBeenCalledWith(new URL(`${ISSUER}/protocol/openid-connect/certs`));
    expect(jose.jwtVerify).toHaveBeenCalledWith("a.b.c", "jwks", expect.objectContaining({
      issuer: ISSUER,
      audience: "overhours",
      algorithms: ["RS256"],
      requiredClaims: ["sub"],
    }));
  });

  it("uses OIDC_AUDIENCE when set", async () => {
    vi.stubEnv("OIDC_AUDIENCE", "overhours-api");
    await verifyApiToken("a.b.c", ISSUER);
    expect(jose.jwtVerify).toHaveBeenCalledWith("a.b.c", "jwks", expect.objectContaining({ audience: "overhours-api" }));
  });

  it("rejects ID and refresh tokens as invalid", async () => {
    for (const typ of ["ID", "Refresh", undefined]) {
      jose.jwtVerify.mockResolvedValueOnce({ payload: { typ, sub: "user" } });
      await expect(verifyApiToken("a.b.c", ISSUER)).rejects.toMatchObject({ code: "ERR_JWT_CLAIM_VALIDATION_FAILED" });
    }
  });
});

describe("looksLikeJwt", () => {
  it("tells tokens from static keys", () => {
    expect(looksLikeJwt("eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ4In0.c2ln")).toBe(true);
    expect(looksLikeJwt("secret")).toBe(false);
    expect(looksLikeJwt("a.b")).toBe(false);
  });
});
