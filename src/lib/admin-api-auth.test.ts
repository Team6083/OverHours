import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

import { verifyAdminApiKey, verifyCronSecret } from "./admin-api-auth";

const request = (token?: string) => new NextRequest("http://localhost/api/admin/x", {
  headers: token === undefined ? {} : { Authorization: `Bearer ${token}` },
});

beforeEach(() => {
  vi.stubEnv("ADMIN_API_KEY", "admin-secret");
  vi.stubEnv("CRON_SECRET", "cron-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyAdminApiKey", () => {
  it("accepts ADMIN_API_KEY", () => {
    expect(verifyAdminApiKey(request("admin-secret"))).toBeNull();
  });

  it("rejects CRON_SECRET, a wrong token and a missing header with 401", () => {
    expect(verifyAdminApiKey(request("cron-secret"))?.status).toBe(401);
    expect(verifyAdminApiKey(request("wrong"))?.status).toBe(401);
    expect(verifyAdminApiKey(request())?.status).toBe(401);
  });

  it("is unavailable (503) when ADMIN_API_KEY is unset", () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    expect(verifyAdminApiKey(request("admin-secret"))?.status).toBe(503);
  });
});

describe("verifyCronSecret", () => {
  it("accepts CRON_SECRET", () => {
    expect(verifyCronSecret(request("cron-secret"))).toBeNull();
  });

  it("rejects ADMIN_API_KEY, a wrong token and a missing header with 401", () => {
    expect(verifyCronSecret(request("admin-secret"))?.status).toBe(401);
    expect(verifyCronSecret(request("wrong"))?.status).toBe(401);
    expect(verifyCronSecret(request())?.status).toBe(401);
  });

  it("is unavailable (503) when CRON_SECRET is unset, even if ADMIN_API_KEY is set", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(verifyCronSecret(request("admin-secret"))?.status).toBe(503);
  });
});
