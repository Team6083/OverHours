import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const apiKey = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ default: { apiKey } }));

import { generateApiKey, hashApiKey, verifyApiKey } from "./admin-api-auth";

const SCOPED = "ohk_attendance-only";
const request = (key?: string) => new NextRequest("http://localhost/api/admin/attendance", {
  headers: key ? { Authorization: `Bearer ${key}` } : {},
});

beforeEach(() => {
  vi.stubEnv("ADMIN_API_KEY", "secret");
  apiKey.findUnique.mockReset().mockImplementation(async ({ where }: { where: { keyHash: string } }) =>
    where.keyHash === hashApiKey(SCOPED) ? { id: "k1", scopes: ["attendance:read"] } : null);
  apiKey.update.mockReset().mockResolvedValue({});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyApiKey", () => {
  it("lets ADMIN_API_KEY use every scope without a database lookup", async () => {
    expect(await verifyApiKey(request("secret"), "users:write")).toBeNull();
    expect(apiKey.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a missing or wrong admin key", async () => {
    expect((await verifyApiKey(request(), "attendance:read"))?.status).toBe(401);
    expect((await verifyApiKey(request("wrong"), "attendance:read"))?.status).toBe(401);
  });

  it("is unavailable without ADMIN_API_KEY for non-scoped keys", async () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    expect((await verifyApiKey(request("secret"), "attendance:read"))?.status).toBe(503);
  });

  it("lets a scoped key use its scope and records the use", async () => {
    expect(await verifyApiKey(request(SCOPED), "attendance:read")).toBeNull();
    expect(apiKey.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "k1" } }));
  });

  it("works for scoped keys even without ADMIN_API_KEY", async () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    expect(await verifyApiKey(request(SCOPED), "attendance:read")).toBeNull();
  });

  it("forbids a scoped key outside its scopes", async () => {
    const response = await verifyApiKey(request(SCOPED), "users:read");
    expect(response?.status).toBe(403);
    expect(apiKey.update).not.toHaveBeenCalled();
  });

  it("rejects an unknown scoped key", async () => {
    expect((await verifyApiKey(request("ohk_unknown"), "attendance:read"))?.status).toBe(401);
  });

  it("looks scoped keys up by hash, never the key itself", async () => {
    await verifyApiKey(request(SCOPED), "attendance:read");
    expect(apiKey.findUnique.mock.calls[0][0].where).toEqual({ keyHash: hashApiKey(SCOPED) });
  });

  it("generates prefixed, random keys", () => {
    const key = generateApiKey();
    expect(key).toMatch(/^ohk_[A-Za-z0-9_-]{43}$/);
    expect(generateApiKey()).not.toBe(key);
  });
});
