import { describe, expect, it } from "vitest";

import {
  addDays, addMonths, calendarDateInZone, datesInRange, dayStatuses, isCalendarDate, isMonth, monthDates, rowsToReassign, summarizeAccuracy, weekDates, weekStartOf,
} from "./attendance";

describe("isCalendarDate", () => {
  it("accepts real days only", () => {
    expect(isCalendarDate("2027-02-28")).toBe(true);
    expect(isCalendarDate("2028-02-29")).toBe(true);
    expect(isCalendarDate("2027-02-29")).toBe(false);
    expect(isCalendarDate("2027-13-01")).toBe(false);
    expect(isCalendarDate("2027-1-1")).toBe(false);
  });
});

describe("calendar helpers", () => {
  it("rolls over months and years", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
  });

  it("finds the Monday of a week", () => {
    expect(weekStartOf("2027-01-09")).toBe("2027-01-04");
    expect(weekStartOf("2027-01-10")).toBe("2027-01-04");
    expect(weekStartOf("2027-01-11")).toBe("2027-01-11");
  });

  it("lists the seven days of a week", () => {
    expect(weekDates("2027-01-04")).toEqual([
      "2027-01-04", "2027-01-05", "2027-01-06", "2027-01-07", "2027-01-08", "2027-01-09", "2027-01-10",
    ]);
  });

  it("uses the day in the configured zone, not UTC", () => {
    expect(calendarDateInZone(new Date("2027-01-08T16:30:00Z"), "Asia/Taipei")).toBe("2027-01-09");
    expect(calendarDateInZone(new Date("2027-01-08T15:30:00Z"), "Asia/Taipei")).toBe("2027-01-08");
  });
});

describe("datesInRange", () => {
  it("includes both ends", () => {
    expect(datesInRange("2027-01-30", "2027-02-01")).toEqual(["2027-01-30", "2027-01-31", "2027-02-01"]);
  });

  it("allows a single day", () => {
    expect(datesInRange("2027-01-30", "2027-01-30")).toEqual(["2027-01-30"]);
  });

  it("rejects a backwards range", () => {
    expect(datesInRange("2027-02-01", "2027-01-30")).toBeNull();
  });

  it("rejects a range over the limit", () => {
    expect(datesInRange("2027-01-01", "2027-01-03", 3)).toHaveLength(3);
    expect(datesInRange("2027-01-01", "2027-01-04", 3)).toBeNull();
  });
});

describe("dayStatuses", () => {
  it("tells the three states apart", () => {
    expect(dayStatuses(["d1", "d2", "d3"], [
      { date: "d1", status: "AVAILABLE" },
      { date: "d2", status: "UNAVAILABLE" },
    ])).toEqual([
      { date: "d1", status: "AVAILABLE" },
      { date: "d2", status: "UNAVAILABLE" },
      { date: "d3", status: "NOT_FILLED" },
    ]);
  });
});

describe("rowsToReassign", () => {
  const key = (row: { date: string }) => row.date;

  it("moves source rows for days the target does not have", () => {
    const rows = [
      { id: "1", userId: "target", date: "d1" },
      { id: "2", userId: "source", date: "d1" },
      { id: "3", userId: "source", date: "d2" },
    ];
    expect(rowsToReassign(rows, "target", key)).toEqual(["3"]);
  });

  it("moves only one row when two sources share a day", () => {
    const rows = [
      { id: "1", userId: "s1", date: "d1" },
      { id: "2", userId: "s2", date: "d1" },
    ];
    expect(rowsToReassign(rows, "target", key)).toEqual(["1"]);
  });
});

describe("months", () => {
  it("validates YYYY-MM", () => {
    expect(isMonth("2027-12")).toBe(true);
    expect(isMonth("2027-13")).toBe(false);
    expect(isMonth("2027-1")).toBe(false);
  });

  it("moves across year boundaries", () => {
    expect(addMonths("2027-12", 1)).toBe("2028-01");
    expect(addMonths("2027-01", -1)).toBe("2026-12");
  });

  it("lists every day of the month", () => {
    expect(monthDates("2028-02")).toHaveLength(29);
    expect(monthDates("2027-02")).toHaveLength(28);
    expect(monthDates("2027-01")[30]).toBe("2027-01-31");
  });
});

describe("summarizeAccuracy", () => {
  const dates = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"];

  it("sorts each day into matched, no-show, unexpected or unannounced", () => {
    const summary = summarizeAccuracy(
      dates,
      [
        { date: "2026-11-02", status: "AVAILABLE" },
        { date: "2026-11-03", status: "AVAILABLE" },
        { date: "2026-11-04", status: "UNAVAILABLE" },
        { date: "2026-11-05", status: "UNAVAILABLE" },
      ],
      ["2026-11-02", "2026-11-04", "2026-11-06"],
    );

    expect(summary).toEqual({
      matched: 2,
      filled: 4,
      noShows: ["2026-11-03"],
      unexpected: ["2026-11-04"],
      unannounced: ["2026-11-06"],
    });
  });

  it("ignores answers and time logs outside the dates", () => {
    const summary = summarizeAccuracy(["2026-11-02"], [{ date: "2026-11-09", status: "AVAILABLE" }], ["2026-11-10"]);
    expect(summary).toEqual({ matched: 0, filled: 0, noShows: [], unexpected: [], unannounced: [] });
  });
});
