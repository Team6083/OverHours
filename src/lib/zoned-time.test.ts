import { describe, expect, it } from "vitest";

import {
    firstCutoffAfter, formatWallTime, fromWallTime, isValidTimeZone, lastCutoffAtOrBefore, splitByDay, toWallTime,
} from "./zoned-time";

const TPE = "Asia/Taipei"; // UTC+8, no daylight saving
const NYC = "America/New_York";

describe("isValidTimeZone", () => {
  it("accepts IANA zones and rejects anything else", () => {
    expect(isValidTimeZone(TPE)).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Mars/Base")).toBe(false);
  });
});

describe("toWallTime / fromWallTime", () => {
  it("converts between an instant and the wall clock in a zone", () => {
    const instant = new Date("2026-11-05T15:30:00Z");
    expect(toWallTime(instant, TPE)).toEqual({ year: 2026, month: 11, day: 5, hour: 23, minute: 30, second: 0 });
    expect(fromWallTime(2026, 11, 5, 23, 30, TPE).toISOString()).toBe("2026-11-05T15:30:00.000Z");
  });

  it("rolls a day past month end over into the next month", () => {
    expect(fromWallTime(2026, 1, 32, 0, 0, TPE).toISOString()).toBe("2026-01-31T16:00:00.000Z");
  });

  it("resolves a wall time skipped by daylight saving to just after the jump", () => {
    // 2026-03-08 02:00 EST jumps to 03:00 EDT; 02:30 does not exist
    expect(fromWallTime(2026, 3, 8, 2, 30, NYC).toISOString()).toBe("2026-03-08T07:30:00.000Z");
    expect(formatWallTime(fromWallTime(2026, 3, 8, 2, 30, NYC), NYC)).toBe("2026-03-08 03:30:00");
  });

  it("is exact on both sides of a daylight-saving change", () => {
    expect(fromWallTime(2026, 3, 7, 23, 0, NYC).toISOString()).toBe("2026-03-08T04:00:00.000Z"); // EST
    expect(fromWallTime(2026, 3, 8, 23, 0, NYC).toISOString()).toBe("2026-03-09T03:00:00.000Z"); // EDT
  });
});

describe("formatWallTime", () => {
  it("formats as YYYY-MM-DD HH:mm:ss in the zone", () => {
    expect(formatWallTime(new Date("2026-01-01T00:00:05Z"), TPE)).toBe("2026-01-01 08:00:05");
  });
});

describe("firstCutoffAfter", () => {
  it("is the same day's cut-off when clocking in before it", () => {
    const inTime = fromWallTime(2026, 11, 5, 22, 30, TPE);
    expect(firstCutoffAfter(inTime, 23, 0, TPE)).toEqual(fromWallTime(2026, 11, 5, 23, 0, TPE));
  });

  it("is the next day's cut-off when clocking in after it", () => {
    const inTime = fromWallTime(2026, 11, 5, 23, 30, TPE);
    expect(firstCutoffAfter(inTime, 23, 0, TPE)).toEqual(fromWallTime(2026, 11, 6, 23, 0, TPE));
  });

  it("is strictly after: clocking in exactly at the cut-off gets the next one", () => {
    const inTime = fromWallTime(2026, 11, 5, 23, 0, TPE);
    expect(firstCutoffAfter(inTime, 23, 0, TPE)).toEqual(fromWallTime(2026, 11, 6, 23, 0, TPE));
  });
});

describe("lastCutoffAtOrBefore", () => {
  it("is today's cut-off once it has passed, yesterday's before that", () => {
    expect(lastCutoffAtOrBefore(fromWallTime(2026, 11, 5, 23, 10, TPE), 23, 0, TPE))
      .toEqual(fromWallTime(2026, 11, 5, 23, 0, TPE));
    expect(lastCutoffAtOrBefore(fromWallTime(2026, 11, 5, 22, 0, TPE), 23, 0, TPE))
      .toEqual(fromWallTime(2026, 11, 4, 23, 0, TPE));
  });

  it("includes a cut-off at exactly that instant", () => {
    const cutoff = fromWallTime(2026, 11, 5, 23, 0, TPE);
    expect(lastCutoffAtOrBefore(cutoff, 23, 0, TPE)).toEqual(cutoff);
  });
});

describe("splitByDay", () => {
  const h = 60 * 60 * 1000;

  it("splits a session at midnight in the zone, not in UTC", () => {
    // 11/13 22:00 to 11/15 02:00 in Taipei
    expect(splitByDay(new Date("2026-11-13T14:00:00Z"), new Date("2026-11-14T18:00:00Z"), "Asia/Taipei")).toEqual([
      { date: "2026-11-13", ms: 2 * h },
      { date: "2026-11-14", ms: 24 * h },
      { date: "2026-11-15", ms: 2 * h },
    ]);
  });

  it("keeps a session within one day whole, and gives nothing for an empty one", () => {
    // 07:00 to 09:00 in Taipei, which is the day before in UTC
    expect(splitByDay(new Date("2026-11-12T23:00:00Z"), new Date("2026-11-13T01:00:00Z"), "Asia/Taipei"))
      .toEqual([{ date: "2026-11-13", ms: 2 * h }]);
    expect(splitByDay(new Date("2026-11-13T01:00:00Z"), new Date("2026-11-13T01:00:00Z"), "Asia/Taipei")).toEqual([]);
  });
});
