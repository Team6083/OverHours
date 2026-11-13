import { describe, expect, it } from "vitest";

import { isoWeekday, isReminderDue, membersMissing, reminderSettingsSchema, requiredDates } from "./team-reminders";

describe("isoWeekday", () => {
  it("numbers Monday 1 to Sunday 7", () => {
    expect(isoWeekday("2026-11-16")).toBe(1);
    expect(isoWeekday("2026-11-22")).toBe(7);
  });
});

describe("requiredDates", () => {
  it("takes the chosen weekdays from tomorrow within the look-ahead", () => {
    // 2026-11-13 is a Friday
    expect(requiredDates("2026-11-13", [3, 6], 7)).toEqual(["2026-11-14", "2026-11-18"]);
    expect(requiredDates("2026-11-13", [5], 6)).toEqual([]);
    expect(requiredDates("2026-11-13", [5], 7)).toEqual(["2026-11-20"]);
  });

  it("is every day of the window when all weekdays are chosen", () => {
    expect(requiredDates("2026-11-13", [1, 2, 3, 4, 5, 6, 7], 3)).toEqual(["2026-11-14", "2026-11-15", "2026-11-16"]);
  });
});

describe("isReminderDue", () => {
  const team = { reminderEnabled: true, reminderTime: "20:00", reminderSentOn: "2026-11-12" };
  const now = { date: "2026-11-13", time: "20:05" };

  it("is due once its time has passed and it hasn't gone out today", () => {
    expect(isReminderDue(team, now)).toBe(true);
    expect(isReminderDue({ ...team, reminderSentOn: null }, now)).toBe(true);
  });

  it("waits for its time, skips a day already handled, and stays quiet when off", () => {
    expect(isReminderDue(team, { ...now, time: "19:59" })).toBe(false);
    expect(isReminderDue({ ...team, reminderSentOn: "2026-11-13" }, now)).toBe(false);
    expect(isReminderDue({ ...team, reminderEnabled: false }, now)).toBe(false);
  });
});

describe("membersMissing", () => {
  it("lists members with required days they haven't answered, with those days", () => {
    const members = [
      { id: "a", email: "a@example.com", name: "A" },
      { id: "b", email: "b@example.com", name: "B" },
    ];
    const answered = [{ userId: "a", date: "d1" }, { userId: "a", date: "d2" }, { userId: "b", date: "d2" }];

    expect(membersMissing(members, ["d1", "d2"], answered)).toEqual([{ email: "b@example.com", name: "B", dates: ["d1"] }]);
  });
});

describe("reminderSettingsSchema", () => {
  it("sorts and dedupes weekdays and rejects bad values", () => {
    expect(reminderSettingsSchema.parse({ enabled: true, weekdays: [6, 3, 6], daysAhead: 7, time: "08:30" }).weekdays).toEqual([3, 6]);
    expect(reminderSettingsSchema.safeParse({ enabled: true, weekdays: [8], daysAhead: 7, time: "08:30" }).success).toBe(false);
    expect(reminderSettingsSchema.safeParse({ enabled: true, weekdays: [], daysAhead: 0, time: "08:30" }).success).toBe(false);
    expect(reminderSettingsSchema.safeParse({ enabled: true, weekdays: [], daysAhead: 7, time: "8:30" }).success).toBe(false);
  });
});
