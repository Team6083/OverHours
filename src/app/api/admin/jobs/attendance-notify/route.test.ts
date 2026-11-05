import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  recordWanted: vi.fn(),
  buildAttendanceMessage: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/data/attendance-dto", () => ({
  getToday: () => "2027-01-18",
  recordWanted: mocks.recordWanted,
  buildAttendanceMessage: mocks.buildAttendanceMessage,
}));

import { POST } from "./route";

const url = "http://localhost/api/admin/jobs/attendance-notify";
const call = (query = "", key = "secret") => POST(new NextRequest(`${url}${query}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}` },
}));

beforeEach(() => {
  vi.stubEnv("ADMIN_API_KEY", "secret");
  vi.stubEnv("SLACK_ATTENDANCE_WEBHOOK_URL", "https://slack.test/hook");
  vi.stubEnv("AUTH_URL", "https://overhours.example.com");
  mocks.recordWanted.mockReset().mockResolvedValue(2);
  mocks.buildAttendanceMessage.mockReset().mockResolvedValue("hello");
  vi.spyOn(console, "error").mockImplementation(() => { });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST attendance-notify", () => {
  it("rejects a wrong key without doing anything", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await call("", "wrong");

    expect(response.status).toBe(401);
    expect(mocks.recordWanted).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to Slack and links the attendance page", async () => {
    const fetchMock = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);

    const response = await call();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { sent: true, wantedRecorded: 2, text: "hello" } });
    expect(mocks.buildAttendanceMessage).toHaveBeenCalledWith("2027-01-18", "https://overhours.example.com/attendance");
    const [target, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(target).toBe("https://slack.test/hook");
    expect(init.body).toBe(JSON.stringify({ text: "hello" }));
  });

  it("does not post or record on a dry run", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await call("?dryRun=true");

    await expect(response.json()).resolves.toEqual({ data: { sent: false, wantedRecorded: 0, text: "hello" } });
    expect(mocks.recordWanted).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("works on a dry run without a webhook", async () => {
    vi.stubEnv("SLACK_ATTENDANCE_WEBHOOK_URL", "");
    await expect(call("?dryRun=true").then(r => r.status)).resolves.toBe(200);
  });

  it("refuses to run for real without a webhook", async () => {
    vi.stubEnv("SLACK_ATTENDANCE_WEBHOOK_URL", "");

    const response = await call();

    expect(response.status).toBe(503);
    expect(mocks.recordWanted).not.toHaveBeenCalled();
  });

  it("still records but sends nothing when there is no message", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mocks.buildAttendanceMessage.mockResolvedValue(null);

    const response = await call();

    await expect(response.json()).resolves.toEqual({ data: { sent: false, wantedRecorded: 2, text: null } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports when Slack rejects the message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 500 })));
    await expect(call().then(r => r.status)).resolves.toBe(503);
  });

  it("does not leak details when Slack is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("https://slack.test/hook failed"); }));

    const response = await call();

    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("slack.test");
  });

  it("works without AUTH_URL", async () => {
    vi.stubEnv("AUTH_URL", "");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("ok")));

    await call();

    expect(mocks.buildAttendanceMessage).toHaveBeenCalledWith("2027-01-18", undefined);
  });
});
