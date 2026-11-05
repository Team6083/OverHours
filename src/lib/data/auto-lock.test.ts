import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  timeLog: { findMany: vi.fn(), updateMany: vi.fn() },
}));
vi.mock("../prisma", () => ({ default: prismaMock }));

import { fromWallTime } from "../zoned-time";
import { autoLockData, getPassedCutoff, lockOverdueTimeLogs } from "./auto-lock";

const TPE = "Asia/Taipei";
const at = (day: number, hour: number, minute = 0) => fromWallTime(2026, 11, day, hour, minute, TPE);

const originalEnv = { TZ: process.env.TZ, AUTO_LOCK_TIME: process.env.AUTO_LOCK_TIME };

beforeEach(() => {
  process.env.TZ = TPE;
  process.env.AUTO_LOCK_TIME = "23:00";
  vi.clearAllMocks();
});

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("getPassedCutoff", () => {
  it("is null before the session's first cut-off", () => {
    expect(getPassedCutoff(at(5, 22, 30), at(5, 22, 59))).toBeNull();
  });

  it("is the session's first cut-off once it has passed", () => {
    expect(getPassedCutoff(at(5, 22, 30), at(5, 23, 0))).toEqual(at(5, 23));
    expect(getPassedCutoff(at(5, 22, 30), at(7, 9))).toEqual(at(5, 23));
  });

  it("gives a session started after the cut-off until the next day's", () => {
    expect(getPassedCutoff(at(5, 23, 30), at(6, 9))).toBeNull();
    expect(getPassedCutoff(at(5, 23, 30), at(6, 23, 1))).toEqual(at(6, 23));
  });

  it("is null when auto-lock is disabled", () => {
    delete process.env.AUTO_LOCK_TIME;
    expect(getPassedCutoff(at(1, 9), at(5, 9))).toBeNull();
  });
});

describe("autoLockData", () => {
  it("locks at the cut-off with the automatic reason and no operator", () => {
    expect(autoLockData(at(5, 23), at(6, 9))).toEqual({
      status: "Locked", outTime: at(5, 23), lockReason: "AutoTimeout", lockedAt: at(6, 9), lockedById: null,
    });
  });
});

describe("lockOverdueTimeLogs", () => {
  it("locks clocked-in logs older than the last cut-off, each at its own cut-off", async () => {
    prismaMock.timeLog.findMany.mockResolvedValue([
      { id: "a", inTime: at(4, 20) },
      { id: "b", inTime: at(5, 10) },
    ]);
    prismaMock.timeLog.updateMany.mockResolvedValue({ count: 1 });

    const now = at(6, 9);
    expect(await lockOverdueTimeLogs(now)).toEqual(["a", "b"]);

    expect(prismaMock.timeLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: "CurrentlyIn", inTime: { lt: at(5, 23) } },
    }));
    expect(prismaMock.timeLog.updateMany).toHaveBeenCalledWith({
      where: { id: "a", status: "CurrentlyIn" }, data: autoLockData(at(4, 23), now),
    });
    expect(prismaMock.timeLog.updateMany).toHaveBeenCalledWith({
      where: { id: "b", status: "CurrentlyIn" }, data: autoLockData(at(5, 23), now),
    });
  });

  it("skips logs that were clocked out or locked in the meantime", async () => {
    prismaMock.timeLog.findMany.mockResolvedValue([{ id: "a", inTime: at(4, 20) }]);
    prismaMock.timeLog.updateMany.mockResolvedValue({ count: 0 });

    expect(await lockOverdueTimeLogs(at(6, 9))).toEqual([]);
  });

  it("does nothing when auto-lock is disabled", async () => {
    delete process.env.AUTO_LOCK_TIME;

    expect(await lockOverdueTimeLogs(at(6, 9))).toEqual([]);
    expect(prismaMock.timeLog.findMany).not.toHaveBeenCalled();
  });
});
