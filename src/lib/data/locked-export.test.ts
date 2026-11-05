import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../prisma", () => ({ default: {} }));

import { fromWallTime } from "../zoned-time";
import {
  dayRangeInZone, lockedCsvFilename, lockedCsvResponse, lockedTimeLogRowsToCsv, type LockedTimeLogRow,
} from "./locked-export";

const TPE = "Asia/Taipei";

const row = (overrides: Partial<LockedTimeLogRow> = {}): LockedTimeLogRow => ({
  id: "log1",
  userId: "user1",
  userName: "Alice",
  userEmail: "alice@example.com",
  inTime: new Date("2026-11-05T13:00:00Z"),
  outTime: new Date("2026-11-05T15:00:00Z"),
  lockReason: "AUTO_TIMEOUT",
  lockedAt: new Date("2026-11-06T01:00:00Z"),
  ...overrides,
});

describe("dayRangeInZone", () => {
  it("covers whole days in the zone, both ends inclusive", () => {
    expect(dayRangeInZone("2026-11-01", "2026-11-05", TPE)).toEqual({
      startTime: fromWallTime(2026, 11, 1, 0, 0, TPE),
      endTime: fromWallTime(2026, 11, 6, 0, 0, TPE),
    });
  });

  it("leaves an end open when its date is missing", () => {
    expect(dayRangeInZone(undefined, undefined, TPE)).toEqual({ startTime: undefined, endTime: undefined });
  });
});

describe("lockedTimeLogRowsToCsv", () => {
  it("starts with a BOM, uses CRLF and names the zone in the headers", () => {
    const csv = lockedTimeLogRowsToCsv([row()], TPE);
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe(
      "Log ID,User,Email,In Time (Asia/Taipei),Out / Cut-off Time (Asia/Taipei),Locked At (Asia/Taipei),Lock Reason,Locked By,Notes",
    );
    expect(lines[1]).toBe("log1,Alice,alice@example.com,2026-11-05 21:00:00,2026-11-05 23:00:00,2026-11-06 09:00:00,AUTO_TIMEOUT,,");
    expect(lines[2]).toBe("");
  });

  it("quotes commas, quotes and line breaks", () => {
    const csv = lockedTimeLogRowsToCsv([row({ userName: "Doe, \"J\"", notes: "line1\nline2" })], TPE);
    expect(csv).toContain("\"Doe, \"\"J\"\"\"");
    expect(csv).toContain("\"line1\nline2\"");
  });

  it.each(["=1+1", "+1", "-1", "@SUM(A1)", "\tx"])("neutralises a formula-like value %j", (value) => {
    const line = lockedTimeLogRowsToCsv([row({ notes: value })], TPE).split("\r\n")[1];
    expect(line.endsWith(`,'${value}`)).toBe(true);
  });

  it("shows the locker's name, falling back to the id", () => {
    expect(lockedTimeLogRowsToCsv([row({ lockedById: "admin1", lockedByName: "Bob" })], TPE)).toContain(",Bob,");
    expect(lockedTimeLogRowsToCsv([row({ lockedById: "admin1" })], TPE)).toContain(",admin1,");
  });
});

describe("lockedCsvFilename", () => {
  it("names the inclusive day range", () => {
    expect(lockedCsvFilename(dayRangeInZone("2026-11-01", "2026-11-05", TPE), TPE))
      .toBe("locked-logs_2026-11-01_2026-11-05.csv");
    expect(lockedCsvFilename({}, TPE)).toBe("locked-logs.csv");
  });
});

describe("lockedCsvResponse", () => {
  it("downloads as an attachment that browsers will not run or sniff", () => {
    const res = lockedCsvResponse([row()], {}, TPE);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe("attachment; filename=\"locked-logs.csv\"");
    expect(res.headers.get("Content-Security-Policy")).toBe("sandbox");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});
