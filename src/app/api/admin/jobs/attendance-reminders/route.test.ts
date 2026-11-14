import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sendDueReminders = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/data/team-reminder-dto", () => ({ sendDueReminders }));

import { POST } from "./route";

const call = (key: string) => POST(new NextRequest("http://localhost/api/admin/jobs/attendance-reminders", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}` },
}));

beforeEach(() => {
  vi.stubEnv("ADMIN_API_KEY", "admin-secret");
  vi.stubEnv("CRON_SECRET", "cron-secret");
  vi.stubEnv("AUTH_URL", "https://overhours.example.test/api/auth");
  sendDueReminders.mockReset().mockResolvedValue([{ ruleId: "r", teamId: "t", result: "sent" }]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/admin/jobs/attendance-reminders", () => {
  it("sends due reminders with CRON_SECRET, linking to AUTH_URL", async () => {
    const response = await call("cron-secret");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { runs: [{ ruleId: "r", teamId: "t", result: "sent" }] } });
    expect(sendDueReminders).toHaveBeenCalledWith(expect.any(Date), "https://overhours.example.test");
  });

  it("rejects ADMIN_API_KEY", async () => {
    expect((await call("admin-secret")).status).toBe(401);
    expect(sendDueReminders).not.toHaveBeenCalled();
  });
});
