import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jose = vi.hoisted(() => ({ jwtVerify: vi.fn(), createRemoteJWKSet: vi.fn(() => "jwks") }));

vi.mock("server-only", () => ({}));
vi.mock("jose", () => jose);

import { looksLikeJwt, verifyApiToken } from "./api-token";

const ISSUER = "https://keycloak.example.test/realms/team";

beforeEach(() => {
  vi.stubEnv("AUTH_KEYCLOAK_ID", "overhours");
  jose.jwtVerify.mockReset().mockResolvedValue({
    payload: { realm_access: { roles: ["reader"] }, resource_access: { overhours: { roles: ["attendance"] } } },
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
    }));
  });

  it("uses API_TOKEN_AUDIENCE when set", async () => {
    vi.stubEnv("API_TOKEN_AUDIENCE", "overhours-api");
    await verifyApiToken("a.b.c", ISSUER);
    expect(jose.jwtVerify).toHaveBeenCalledWith("a.b.c", "jwks", expect.objectContaining({ audience: "overhours-api" }));
  });

  it("refuses to verify without an audience", async () => {
    vi.stubEnv("AUTH_KEYCLOAK_ID", "");
    await expect(verifyApiToken("a.b.c", ISSUER)).rejects.toThrow(/API_TOKEN_AUDIENCE/);
    expect(jose.jwtVerify).not.toHaveBeenCalled();
  });
});

describe("looksLikeJwt", () => {
  it("tells tokens from static keys", () => {
    expect(looksLikeJwt("eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ4In0.c2ln")).toBe(true);
    expect(looksLikeJwt("secret")).toBe(false);
    expect(looksLikeJwt("a.b")).toBe(false);
  });
});
