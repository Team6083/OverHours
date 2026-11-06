import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const adminGetAttendance = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/data/attendance-dto", () => ({ adminGetAttendance }));

import { GET } from "./route";

const call = (query: string, key = "secret") => GET(new NextRequest(`http://localhost/api/admin/attendance${query}`, {
  headers: { Authorization: `Bearer ${key}` },
}));

beforeEach(() => {
  vi.stubEnv("ADMIN_API_KEY", "secret");
  adminGetAttendance.mockReset().mockResolvedValue([{ id: "a" }]);
  vi.spyOn(console, "error").mockImplementation(() => { });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/admin/attendance", () => {
  it("rejects a wrong key without reading data", async () => {
    const response = await call("?start=2027-01-11&end=2027-01-12", "wrong");
    expect(response.status).toBe(401);
    expect(adminGetAttendance).not.toHaveBeenCalled();
  });

  it("is unavailable without a configured key", async () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    await expect(call("?start=2027-01-11&end=2027-01-12").then(r => r.status)).resolves.toBe(503);
  });

  it("returns the range with every day in it", async () => {
    const response = await call("?start=2027-01-11&end=2027-01-12");

    await expect(response.json()).resolves.toEqual({
      data: { start: "2027-01-11", end: "2027-01-12", users: [{ id: "a" }] },
    });
    expect(adminGetAttendance).toHaveBeenCalledWith(["2027-01-11", "2027-01-12"]);
  });

  it.each([
    "",
    "?start=2027-01-11",
    "?start=garbage&end=2027-01-12",
    "?start=2027-02-30&end=2027-03-01",
    "?start=2027-01-12&end=2027-01-11",
    "?start=2027-01-01&end=2027-12-31",
  ])("rejects %j", async (query) => {
    const response = await call(query);
    expect(response.status).toBe(400);
    expect(adminGetAttendance).not.toHaveBeenCalled();
  });

  it("does not leak details on failure", async () => {
    adminGetAttendance.mockRejectedValue(new Error("mongodb://secret"));

    const response = await call("?start=2027-01-11&end=2027-01-12");

    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret");
  });
});
