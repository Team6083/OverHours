import { describe, expect, it } from "vitest";

import {
  addDays, attendanceSlackMessage, calendarDateInZone, eventsOn, isCalendarDate, isInSeason, rowsToReassign,
  seasonDatesOfWeek, unfilledUsers, weekDates, weekStartOf,
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

describe("season", () => {
  const season = { startDate: "2027-01-09", endDate: "2027-04-09" };

  it("includes both ends", () => {
    expect(isInSeason("2027-01-09", season)).toBe(true);
    expect(isInSeason("2027-04-09", season)).toBe(true);
    expect(isInSeason("2027-01-08", season)).toBe(false);
    expect(isInSeason("2027-04-10", season)).toBe(false);
  });

  it("clips a week to the season", () => {
    expect(seasonDatesOfWeek("2027-01-04", season)).toEqual(["2027-01-09", "2027-01-10"]);
    expect(seasonDatesOfWeek("2027-04-05", season)).toHaveLength(5);
    expect(seasonDatesOfWeek("2026-12-28", season)).toEqual([]);
  });
});

describe("eventsOn", () => {
  const events = [
    { name: "Kickoff", startDate: "2027-01-09" },
    { name: "Exams", startDate: "2027-01-10", endDate: "2027-01-12" },
    { name: "Empty end", startDate: "2027-01-13", endDate: null },
  ];

  it("matches a one-day event on its day only", () => {
    expect(eventsOn("2027-01-09", events)).toEqual(["Kickoff"]);
    expect(eventsOn("2027-01-13", events)).toEqual(["Empty end"]);
  });

  it("matches a range inclusively", () => {
    expect(eventsOn("2027-01-10", events)).toEqual(["Exams"]);
    expect(eventsOn("2027-01-12", events)).toEqual(["Exams"]);
    expect(eventsOn("2027-01-14", events)).toEqual([]);
  });
});

describe("unfilledUsers", () => {
  const users = [{ id: "a" }, { id: "b" }];
  const dates = ["2027-01-11", "2027-01-12"];

  it("lists people with no mark in the range", () => {
    expect(unfilledUsers(users, [{ userId: "a", date: "2027-01-12" }], dates)).toEqual([{ id: "b" }]);
  });

  it("ignores marks outside the range", () => {
    expect(unfilledUsers(users, [{ userId: "a", date: "2027-01-13" }], dates)).toEqual(users);
  });

  it("has nobody to report without days", () => {
    expect(unfilledUsers(users, [], [])).toEqual([]);
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

describe("attendanceSlackMessage", () => {
  const alice = { name: "Alice", slackUserId: "U1" };
  const bob = { name: "Bob" };

  it("matches the Apps Script format", () => {
    expect(attendanceSlackMessage({
      nextWeekUnfilled: [alice, bob],
      tomorrowAvailable: [alice, bob],
      url: "https://example.com/attendance",
    })).toBe([
      "《出席表通知》",
      "• 下周出席表未填寫：<@U1> Bob",
      "• 明天可來：Alice、Bob",
      "尚未填寫<https://example.com/attendance|出席表>的請盡速填寫下周的範圍",
    ].join("\n"));
  });

  it("says 無 for empty lists", () => {
    const text = attendanceSlackMessage({ nextWeekUnfilled: [], tomorrowAvailable: [] });
    expect(text).toContain("下周出席表未填寫：無");
    expect(text).toContain("明天可來：無");
  });

  it("drops the reminder after the season's last week", () => {
    expect(attendanceSlackMessage({ nextWeekUnfilled: null, tomorrowAvailable: [bob] }))
      .toBe("《出席表通知》\n• 明天可來：Bob");
  });

  it("sends nothing outside the season", () => {
    expect(attendanceSlackMessage({ nextWeekUnfilled: null, tomorrowAvailable: null })).toBeNull();
  });

  it("escapes names", () => {
    expect(attendanceSlackMessage({ nextWeekUnfilled: null, tomorrowAvailable: [{ name: "A<b>" }] }))
      .toContain("A&lt;b&gt;");
  });
});
