import { describe, expect, it } from "vitest";

import { isoWeekday } from "./attendance";
import {
  isReminderDue, membersMissing, parseRuleChannel, parseRuleCondition, reminderSettingsSchema, requiredDates,
} from "./team-reminders";

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
  const rule = { enabled: true, sendTime: "20:00" };

  it("is due once its time has passed, and not when off", () => {
    expect(isReminderDue(rule, "20:05")).toBe(true);
    expect(isReminderDue(rule, "20:00")).toBe(true);
    expect(isReminderDue(rule, "19:59")).toBe(false);
    expect(isReminderDue({ ...rule, enabled: false }, "20:05")).toBe(false);
    expect(isReminderDue({ ...rule, sendTime: "8:00" }, "20:05")).toBe(false);
  });
});

describe("parseRuleCondition and parseRuleChannel", () => {
  it("parse the known kind and channel", () => {
    expect(parseRuleCondition({ kind: "unanswered", config: { weekdays: [6, 3], daysAhead: 7 } }))
      .toEqual({ kind: "unanswered", config: { weekdays: [3, 6], daysAhead: 7 } });
    expect(parseRuleChannel({ channel: "slack-webhook", target: { url: "https://hooks.example.test/a" } }))
      .toEqual({ channel: "slack-webhook", target: { url: "https://hooks.example.test/a" } });
    expect(parseRuleChannel({ channel: "slack-webhook", target: {} })).toEqual({ channel: "slack-webhook", target: {} });
  });

  it("throw on an unknown kind or channel, or a value that doesn't fit", () => {
    expect(() => parseRuleCondition({ kind: "late", config: {} })).toThrow();
    expect(() => parseRuleCondition({ kind: "unanswered", config: { weekdays: [9], daysAhead: 7 } })).toThrow();
    expect(() => parseRuleChannel({ channel: "email", target: {} })).toThrow();
    expect(() => parseRuleChannel({ channel: "slack-webhook", target: { url: "http://hooks.example.test/a" } })).toThrow();
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
