import { describe, expect, it } from "vitest";

import { formatDuration, safeReturnTo } from "./util";

describe("formatDuration", () => {
  it("keeps seconds by default", () => {
    expect(formatDuration(7185)).toBe("1h 59m 45s");
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(90061)).toBe("1d 1h 1m 1s");
  });

  it("drops seconds from a minute on, rounding down", () => {
    const compact = { hideSecondsFromMinute: true };
    expect(formatDuration(7185, compact)).toBe("1h 59m");
    expect(formatDuration(3599, compact)).toBe("59m");
    expect(formatDuration(7200, compact)).toBe("2h");
    expect(formatDuration(60, compact)).toBe("1m");
  });

  it("still shows seconds under a minute", () => {
    expect(formatDuration(42, { hideSecondsFromMinute: true })).toBe("42s");
    expect(formatDuration(59.9, { hideSecondsFromMinute: true })).toBe("59s");
  });
});

describe("safeReturnTo", () => {
  it("keeps paths on this site", () => {
    expect(safeReturnTo("/", "/logs")).toBe("/");
    expect(safeReturnTo("/admin/stat-ranges?x=1", "/logs")).toBe("/admin/stat-ranges?x=1");
  });

  it("keeps spaces in a path", () => {
    expect(safeReturnTo("/report?name=a b", "/logs")).toBe("/report?name=a b");
  });

  // A URL parser drops tab, LF and CR, so "/\t//evil.com" resolves to evil.com.
  it.each([
    "https://example.com/", "//example.com", "///example.com", "/\\example.com",
    "/\t//example.com", "/\n//example.com", "/\r//example.com", "/logs\u0000",
    "javascript:alert(1)", "logs", "", undefined, ["/"],
  ])("falls back for %j", bad => {
    expect(safeReturnTo(bad, "/logs")).toBe("/logs");
  });
});
