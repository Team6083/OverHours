import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const lockOverdueTimeLogs = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/data/auto-lock", () => ({ lockOverdueTimeLogs }));

import { POST } from "./route";

const call = (key: string) => POST(new NextRequest("http://localhost/api/admin/jobs/auto-lock", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}` },
}));

beforeEach(() => {
  vi.stubEnv("ADMIN_API_KEY", "admin-secret");
  vi.stubEnv("CRON_SECRET", "cron-secret");
  vi.stubEnv("AUTO_LOCK_TIME", "23:00");
  lockOverdueTimeLogs.mockReset().mockResolvedValue(["a", "b"]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/admin/jobs/auto-lock", () => {
  it("runs the sweep with CRON_SECRET", async () => {
    const response = await call("cron-secret");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { enabled: true, lockedCount: 2, lockedIds: ["a", "b"] } });
  });

  it("rejects ADMIN_API_KEY without locking anything", async () => {
    const response = await call("admin-secret");

    expect(response.status).toBe(401);
    expect(lockOverdueTimeLogs).not.toHaveBeenCalled();
  });

  it("is unavailable without CRON_SECRET, even with ADMIN_API_KEY", async () => {
    vi.stubEnv("CRON_SECRET", "");

    expect((await call("admin-secret")).status).toBe(503);
    expect(lockOverdueTimeLogs).not.toHaveBeenCalled();
  });
});
