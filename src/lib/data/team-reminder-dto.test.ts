import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type RuleRow = {
  id: string; teamId: string; enabled: boolean; kind: string; config: unknown; sendTime: string; channel: string;
  target: unknown; createdAt: Date;
};
type DeliveryRow = { ruleId: string; runKey: string; result: string };

const db = vi.hoisted(() => ({
  session: null as { user: { id: string; role: string } } | null,
  teams: [] as { id: string; name: string; parentTeamId: string | null }[],
  rules: [] as RuleRow[],
  deliveries: [] as DeliveryRow[],
  users: [] as { id: string; email: string; name: string; teamIds: string[] }[],
  entries: [] as { userId: string; date: string }[],
  entriesFail: false,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: async () => db.session, Role: { ADMIN: "admin", USER: "user" } }));
vi.mock("../prisma", () => {
  const ruleMatches = (rule: RuleRow, where: Partial<RuleRow>) =>
    Object.entries(where).every(([key, value]) => rule[key as keyof RuleRow] === value);
  const prisma = {
    team: {
      findMany: async () => db.teams,
      findUnique: async ({ where }: { where: { id: string } }) => db.teams.find(team => team.id === where.id) ?? null,
    },
    reminderRule: {
      findMany: async ({ where }: { where: Partial<RuleRow> }) => db.rules.filter(rule => ruleMatches(rule, where)),
      findFirst: async ({ where }: { where: Partial<RuleRow> }) => db.rules.find(rule => ruleMatches(rule, where)) ?? null,
      create: async ({ data }: { data: Omit<RuleRow, "id" | "createdAt"> }) => {
        const rule = { ...data, id: `r${db.rules.length + 1}`, createdAt: new Date() };
        db.rules.push(rule);
        return rule;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<RuleRow> }) =>
        Object.assign(db.rules.find(rule => rule.id === where.id)!, data),
    },
    reminderDelivery: {
      create: async ({ data }: { data: DeliveryRow }) => {
        if (db.deliveries.some(row => row.ruleId === data.ruleId && row.runKey === data.runKey)) {
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        }
        db.deliveries.push({ ...data });
        return data;
      },
      update: async ({ where, data }: { where: { ruleId_runKey: { ruleId: string; runKey: string } }; data: { result: string } }) => {
        const { ruleId, runKey } = where.ruleId_runKey;
        return Object.assign(db.deliveries.find(row => row.ruleId === ruleId && row.runKey === runKey)!, data);
      },
      deleteMany: async ({ where }: { where: { ruleId: string; runKey: string } }) => {
        db.deliveries = db.deliveries.filter(row => !(row.ruleId === where.ruleId && row.runKey === where.runKey));
      },
    },
    user: {
      findMany: async ({ where }: { where: { teamIds: { hasSome: string[] } } }) =>
        db.users.filter(user => user.teamIds.some(id => where.teamIds.hasSome.includes(id))),
    },
    attendanceEntry: {
      findMany: async ({ where }: { where: { userId: { in: string[] }; date: { in: string[] } } }) => {
        if (db.entriesFail) throw new Error("connection reset");
        return db.entries.filter(entry => where.userId.in.includes(entry.userId) && where.date.in.includes(entry.date));
      },
    },
  };
  return { default: prisma };
});

import { getTeamReminder, saveTeamReminder, sendDueReminders, setTeamReminderWebhook } from "./team-reminder-dto";

const PARENT = "0000000000000000000000a1";
const CHILD = "0000000000000000000000a2";
const rule = (id: string, teamId: string, extra: Partial<RuleRow> = {}): RuleRow => ({
  id, teamId, enabled: true, kind: "unanswered", config: { weekdays: [6], daysAhead: 7 }, sendTime: "20:00",
  channel: "slack-webhook", target: { url: "https://hooks.example.test/robot" }, createdAt: new Date(0), ...extra,
});

const fetchMock = vi.fn();
const evening = new Date("2026-11-13T20:05:00Z");

beforeEach(() => {
  vi.stubEnv("TZ", "UTC");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockResolvedValue({ ok: true, status: 200 });
  db.session = { user: { id: "000000000000000000000001", role: "admin" } };
  db.entriesFail = false;
  db.teams = [{ id: PARENT, name: "Robot", parentTeamId: null }, { id: CHILD, name: "Mech", parentTeamId: PARENT }];
  db.rules = [rule("r1", PARENT), rule("r2", CHILD, { enabled: false })];
  db.deliveries = [];
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
  vi.restoreAllMocks();
});

describe("sendDueReminders", () => {
  it("tags sub-team members who haven't answered a required day, once a day", async () => {
    await expect(sendDueReminders(evening, "https://overhours.example.test"))
      .resolves.toEqual([{ ruleId: "r1", teamId: PARENT, result: "sent" }]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hooks.example.test/robot");
    const text = JSON.parse(init.body).text as string;
    expect(text).toContain("*Robot*");
    expect(text).toContain("<@two@example.test> 11/14 (Sat)");
    expect(text).not.toContain("one@example.test");
    expect(text).toContain("https://overhours.example.test/attendance");
    expect(db.deliveries).toEqual([{ ruleId: "r1", runKey: "2026-11-13", result: "sent" }]);

    await expect(sendDueReminders(new Date("2026-11-13T22:00:00Z"), "https://x.test")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("waits for the rule's time", async () => {
    await expect(sendDueReminders(new Date("2026-11-13T19:00:00Z"), "https://x.test")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends nothing when everyone answered, and records the run", async () => {
    db.entries.push({ userId: "u2", date: "2026-11-14" });
    await expect(sendDueReminders(evening, "https://x.test")).resolves.toEqual([{ ruleId: "r1", teamId: PARENT, result: "nobodyMissing" }]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.deliveries[0].result).toBe("nobodyMissing");
  });

  it("sends each rule of a team", async () => {
    db.rules.push(rule("r3", PARENT, { target: { url: "https://hooks.example.test/other" } }));
    const runs = await sendDueReminders(evening, "https://x.test");
    expect(runs.map(run => run.ruleId)).toEqual(["r1", "r3"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("releases the run when sending fails, so the next call retries", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(sendDueReminders(evening, "https://x.test")).resolves.toEqual([{ ruleId: "r1", teamId: PARENT, result: "failed" }]);
    expect(db.deliveries).toEqual([]);
  });

  it("releases the run when reading members fails, and goes on with the other rules", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.rules[1].enabled = true;
    db.entriesFail = true;

    await expect(sendDueReminders(evening, "https://x.test")).resolves.toEqual([
      { ruleId: "r1", teamId: PARENT, result: "failed" },
      { ruleId: "r2", teamId: CHILD, result: "failed" },
    ]);
    expect(db.deliveries).toEqual([]);
  });

  it("skips a run another call has already claimed", async () => {
    db.deliveries = [{ ruleId: "r1", runKey: "2026-11-13", result: "claimed" }];
    await expect(sendDueReminders(evening, "https://x.test")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("doesn't claim a rule without a webhook, so adding one later the same day still sends", async () => {
    db.rules[0].target = {};
    await expect(sendDueReminders(evening, "https://x.test")).resolves.toEqual([{ ruleId: "r1", teamId: PARENT, result: "noWebhook" }]);
    expect(db.deliveries).toEqual([]);

    db.rules[0].target = { url: "https://hooks.example.test/robot" };
    await expect(sendDueReminders(evening, "https://x.test")).resolves.toEqual([{ ruleId: "r1", teamId: PARENT, result: "sent" }]);
  });

  it("fails loudly on an unknown kind or channel without claiming, and goes on", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    db.rules.unshift(rule("r0", CHILD, { kind: "late" }), rule("r9", CHILD, { channel: "email" }));

    const runs = await sendDueReminders(evening, "https://x.test");
    expect(runs).toEqual([
      { ruleId: "r0", teamId: CHILD, result: "failed" },
      { ruleId: "r9", teamId: CHILD, result: "failed" },
      { ruleId: "r1", teamId: PARENT, result: "sent" },
    ]);
    expect(error).toHaveBeenCalledTimes(2);
    expect(db.deliveries.map(row => row.ruleId)).toEqual(["r1"]);
  });

  it("escapes Slack control characters in the team name", async () => {
    db.teams[0].name = "R&D <!channel>";
    await sendDueReminders(evening, "https://x.test");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).toContain("*R&amp;D &lt;!channel&gt;*");
  });

  it("writes in zh-TW when REMINDER_LOCALE says so", async () => {
    vi.stubEnv("REMINDER_LOCALE", "zh-TW");
    await sendDueReminders(evening, "https://x.test");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).toContain("11/14 (六)");
  });
});

describe("getTeamReminder", () => {
  it("shows the team's rule without its webhook", async () => {
    const reminder = await getTeamReminder(PARENT);
    expect(reminder).toEqual({
      team: { id: PARENT, name: "Robot" },
      settings: { enabled: true, weekdays: [6], daysAhead: 7, time: "20:00" },
      hasWebhook: true,
      missing: expect.any(Array),
    });
    expect(JSON.stringify(reminder)).not.toContain("hooks.example.test");
  });

  it("has defaults for a team without a rule", async () => {
    db.rules = [];
    expect(await getTeamReminder(CHILD)).toMatchObject({ settings: { enabled: false, weekdays: [] }, hasWebhook: false });
  });
});

describe("saveTeamReminder", () => {
  const settings = { enabled: true, weekdays: [3], daysAhead: 3, time: "21:30" };

  it("lets an admin change a team's rule, or create it", async () => {
    await saveTeamReminder(CHILD, settings);
    expect(db.rules[1]).toMatchObject({ enabled: true, sendTime: "21:30", config: { weekdays: [3], daysAhead: 3 } });

    db.rules = [];
    await saveTeamReminder(CHILD, settings);
    expect(db.rules).toEqual([expect.objectContaining({
      teamId: CHILD, kind: "unanswered", channel: "slack-webhook", target: {}, config: { weekdays: [3], daysAhead: 3 },
    })]);
  });

  it("refuses members who aren't admins", async () => {
    db.session = { user: { id: "000000000000000000000001", role: "user" } };
    await expect(saveTeamReminder(CHILD, settings)).rejects.toThrow("Forbidden");
  });

  it("refuses bad settings", async () => {
    await expect(saveTeamReminder(CHILD, { ...settings, time: "25:00" })).rejects.toThrow("Invalid reminder settings.");
  });
});

describe("setTeamReminderWebhook", () => {
  it("is for admins only and needs https", async () => {
    db.session = { user: { id: "000000000000000000000001", role: "user" } };
    await expect(setTeamReminderWebhook(CHILD, "https://hooks.example.test/mech")).rejects.toThrow("Forbidden");

    db.session = { user: { id: "000000000000000000000001", role: "admin" } };
    await expect(setTeamReminderWebhook(CHILD, "http://hooks.example.test/mech")).rejects.toThrow("https");
    await setTeamReminderWebhook(CHILD, " https://hooks.example.test/mech ");
    expect(db.rules[1].target).toEqual({ url: "https://hooks.example.test/mech" });
    await setTeamReminderWebhook(CHILD, null);
    expect(db.rules[1].target).toEqual({});
  });

  it("creates a switched-off rule for a team without one", async () => {
    db.rules = [];
    await setTeamReminderWebhook(CHILD, "https://hooks.example.test/mech");
    expect(db.rules).toEqual([expect.objectContaining({ teamId: CHILD, enabled: false, target: { url: "https://hooks.example.test/mech" } })]);
  });
});
