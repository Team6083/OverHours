import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type TeamRow = {
  id: string; name: string; parentTeamId: string | null; leaderIds: string[]; reminderEnabled: boolean; reminderWeekdays: number[];
  reminderDaysAhead: number; reminderTime: string; reminderWebhookUrl: string | null; reminderSentOn: string | null;
};

const db = vi.hoisted(() => ({
  session: null as { user: { id: string; role: string } } | null,
  teams: [] as TeamRow[],
  users: [] as { id: string; email: string; name: string; teamIds: string[] }[],
  entries: [] as { userId: string; date: string }[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: async () => db.session, Role: { ADMIN: "admin", USER: "user" } }));
vi.mock("../prisma", () => {
  const byId = (id: string) => db.teams.find(team => team.id === id);
  const prisma = {
    team: {
      findMany: async ({ where }: { where?: { reminderEnabled?: boolean } } = {}) =>
        db.teams.filter(team => where?.reminderEnabled === undefined || team.reminderEnabled === where.reminderEnabled),
      findUnique: async ({ where }: { where: { id: string } }) => byId(where.id) ?? null,
      count: async ({ where }: { where: { id: string; leaderIds: { has: string } } }) =>
        byId(where.id)?.leaderIds.includes(where.leaderIds.has) ? 1 : 0,
      update: async ({ where, data }: { where: { id: string }; data: Partial<TeamRow> }) => Object.assign(byId(where.id)!, data),
      updateMany: async ({ where, data }: { where: { id: string }; data: Partial<TeamRow> }) => {
        const team = byId(where.id)!;
        if (team.reminderSentOn === data.reminderSentOn) return { count: 0 };
        Object.assign(team, data);
        return { count: 1 };
      },
    },
    user: {
      findMany: async ({ where }: { where: { teamIds: { hasSome: string[] } } }) =>
        db.users.filter(user => user.teamIds.some(id => where.teamIds.hasSome.includes(id))),
    },
    attendanceEntry: {
      findMany: async ({ where }: { where: { userId: { in: string[] }; date: { in: string[] } } }) =>
        db.entries.filter(entry => where.userId.in.includes(entry.userId) && where.date.in.includes(entry.date)),
    },
  };
  return { default: prisma };
});

import { saveTeamReminder, sendDueReminders, setTeamReminderWebhook } from "./team-reminder-dto";

const PARENT = "0000000000000000000000a1";
const CHILD = "0000000000000000000000a2";
const team = (id: string, extra: Partial<TeamRow> = {}): TeamRow => ({
  id, name: id === PARENT ? "Robot" : "Mech", parentTeamId: id === CHILD ? PARENT : null, leaderIds: [],
  reminderEnabled: true, reminderWeekdays: [6], reminderDaysAhead: 7, reminderTime: "20:00",
  reminderWebhookUrl: "https://hooks.example.test/robot", reminderSentOn: null, ...extra,
});

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv("TZ", "UTC");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockResolvedValue({ ok: true, status: 200 });
  db.session = { user: { id: "000000000000000000000001", role: "user" } };
  db.teams = [team(PARENT), team(CHILD, { reminderEnabled: false })];
  db.users = [
    { id: "u1", email: "one@example.test", name: "One", teamIds: [PARENT] },
    { id: "u2", email: "two@example.test", name: "Two", teamIds: [CHILD] },
  ];
  // 2026-11-14 is the Saturday after Friday 2026-11-13
  db.entries = [{ userId: "u1", date: "2026-11-14" }];
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sendDueReminders", () => {
  const evening = new Date("2026-11-13T20:05:00Z");

  it("tags sub-team members who haven't answered a required day, once a day", async () => {
    await expect(sendDueReminders(evening, "https://overhours.example.test")).resolves.toEqual([{ teamId: PARENT, result: "sent" }]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hooks.example.test/robot");
    const text = JSON.parse(init.body).text as string;
    expect(text).toContain("*Robot*");
    expect(text).toContain("<@two@example.test> 11/14 (Sat)");
    expect(text).not.toContain("one@example.test");
    expect(text).toContain("https://overhours.example.test/attendance");
    expect(db.teams[0].reminderSentOn).toBe("2026-11-13");

    await sendDueReminders(new Date("2026-11-13T22:00:00Z"), "https://overhours.example.test");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("waits for the team's time", async () => {
    await expect(sendDueReminders(new Date("2026-11-13T19:00:00Z"), "https://x.test")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends nothing when everyone answered, and marks the day handled", async () => {
    db.entries.push({ userId: "u2", date: "2026-11-14" });
    await expect(sendDueReminders(evening, "https://x.test")).resolves.toEqual([{ teamId: PARENT, result: "nobodyMissing" }]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("releases the day when sending fails, so the next call retries", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(sendDueReminders(evening, "https://x.test")).resolves.toEqual([{ teamId: PARENT, result: "failed" }]);
    expect(db.teams[0].reminderSentOn).toBeNull();
  });

  it("writes in zh-TW when REMINDER_LOCALE says so", async () => {
    vi.stubEnv("REMINDER_LOCALE", "zh-TW");
    await sendDueReminders(evening, "https://x.test");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).toContain("11/14 (六)");
  });
});

describe("saveTeamReminder", () => {
  const settings = { enabled: true, weekdays: [3], daysAhead: 3, time: "21:30" };

  it("lets a leader change their team", async () => {
    db.teams[1].leaderIds = [db.session!.user.id];
    await saveTeamReminder(CHILD, settings);
    expect(db.teams[1]).toMatchObject({ reminderEnabled: true, reminderWeekdays: [3], reminderDaysAhead: 3, reminderTime: "21:30" });
  });

  it("refuses members who don't lead the team", async () => {
    await expect(saveTeamReminder(CHILD, settings)).rejects.toThrow("Forbidden");
  });

  it("refuses bad settings", async () => {
    db.session = { user: { id: "000000000000000000000001", role: "admin" } };
    await expect(saveTeamReminder(CHILD, { ...settings, time: "25:00" })).rejects.toThrow("Invalid reminder settings.");
  });
});

describe("setTeamReminderWebhook", () => {
  it("is for admins only and needs https", async () => {
    db.teams[1].leaderIds = [db.session!.user.id];
    await expect(setTeamReminderWebhook(CHILD, "https://hooks.example.test/mech")).rejects.toThrow("Forbidden");

    db.session = { user: { id: "000000000000000000000001", role: "admin" } };
    await expect(setTeamReminderWebhook(CHILD, "http://hooks.example.test/mech")).rejects.toThrow("https");
    await setTeamReminderWebhook(CHILD, " https://hooks.example.test/mech ");
    expect(db.teams[1].reminderWebhookUrl).toBe("https://hooks.example.test/mech");
    await setTeamReminderWebhook(CHILD, null);
    expect(db.teams[1].reminderWebhookUrl).toBeNull();
  });
});
