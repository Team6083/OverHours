import { describe, expect, it } from "vitest";

import { formatDuration } from "./util";

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
