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
  locks: [] as string[],
  saveConflicts: [] as string[],
}));

const CHILD_ID = "0000000000000000000000a2";

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: async () => db.session, Role: { ADMIN: "admin", USER: "user" } }));
vi.mock("../prisma", () => {
  const ruleMatches = (rule: RuleRow, where: Partial<RuleRow>) =>
    Object.entries(where).every(([key, value]) => rule[key as keyof RuleRow] === value);
  const prisma = {
    team: {
      findMany: async () => db.teams,
      findUnique: async ({ where }: { where: { id: string } }) => db.teams.find(team => team.id === where.id) ?? null,
      count: async ({ where }: { where: { id: string } }) => db.teams.filter(team => team.id === where.id).length,
    },
    reminderRuleLock: {
      upsert: async ({ where }: { where: { teamId: string } }) => {
        if (!db.locks.includes(where.teamId)) db.locks.push(where.teamId);
      },
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const code = db.saveConflicts.shift();
      if (code) {
        // Another first save for the same team committed first.
        if (!db.rules.some(rule => rule.teamId === CHILD_ID)) {
          db.rules.push({ id: "other", teamId: CHILD_ID, enabled: false, kind: "unanswered", config: { weekdays: [], daysAhead: 7 },
            sendTime: "20:00", channel: "slack-webhook", target: {}, createdAt: new Date(0) });
        }
        throw Object.assign(new Error("Transaction failed"), { code });
      }
      return fn(prisma);
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
  db.locks = [];
  db.saveConflicts = [];
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
  it("lists sub-team members who haven't answered a required day as Slack blocks, once a day", async () => {
    await expect(sendDueReminders(evening, "https://overhours.example.test"))
      .resolves.toEqual([{ ruleId: "r1", teamId: PARENT, result: "sent" }]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hooks.example.test/robot");
    expect(JSON.parse(init.body)).toEqual({
      text: "*Robot*: 1 member hasn't filled in their availability for 11/14 (Sat)",
      blocks: [
        { type: "header", text: { type: "plain_text", text: "Robot" } },
        { type: "section", text: { type: "plain_text", text: "1 member hasn't filled in their availability for 11/14 (Sat)" } },
        { type: "divider" },
        {
          type: "rich_text",
          elements: [{
            type: "rich_text_list",
            style: "bullet",
            elements: [{
              type: "rich_text_section",
              elements: [{ type: "text", text: "11/14 (Sat)", style: { bold: true } }, { type: "text", text: "  " }, { type: "text", text: "Two" }],
            }],
          }],
        },
        { type: "context", elements: [{ type: "mrkdwn", text: "<https://overhours.example.test/attendance|Fill in your availability>" }] },
      ],
    });
    expect(init.body).not.toContain("one@example.test");
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

  type Section = { elements: { type: string; text?: string; user_id?: string }[] };
  const bullets = (payload: { blocks: { type: string; elements?: { elements: Section[] }[] }[] }) =>
    payload.blocks.filter(block => block.type === "rich_text").flatMap(block => block.elements![0].elements)
      .map(item => item.elements.map(e => e.text ?? `@${e.user_id}`).join(""));
  const sent = () => fetchMock.mock.calls.map(call => JSON.parse(call[1].body));
  const team = (count: number, answered: (i: number) => string[] = () => []) => {
    db.users = Array.from({ length: count }, (_, i) => ({ id: `m${i}`, email: `m${i}@example.test`, name: `M${String(i).padStart(2, "0")}`, teamIds: [PARENT] }));
    db.entries = db.users.flatMap((user, i) => answered(i).map(date => ({ userId: user.id, date })));
  };

  it("puts members missing the same days on one bullet, most days first", async () => {
    db.rules[0].config = { weekdays: [1, 2, 3, 4, 5, 6, 7], daysAhead: 3 };
    team(5, i => (i < 2 ? [] : i < 4 ? ["2026-11-14"] : ["2026-11-14", "2026-11-15"]));
    await sendDueReminders(evening, "https://x.test");
    const [payload] = sent();
    expect(payload.text).toBe("*Robot*: 5 members haven't filled in their availability for 11/14–11/16");
    expect(bullets(payload)).toEqual([
      "11/14–11/16 (3 days)  M00, M01",
      "11/15–11/16 (2 days)  M02, M03",
      "11/16 (Mon)  M04",
    ]);
  });

  it("lists all 30 missing members, with no cap", async () => {
    team(30);
    await sendDueReminders(evening, "https://x.test");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [payload] = sent();
    expect(payload.blocks[1].text.text).toBe("30 members haven't filled in their availability for 11/14 (Sat)");
    const names = bullets(payload).join(", ");
    for (let i = 0; i < 30; i++) expect(names).toContain(`M${String(i).padStart(2, "0")}`);
    expect(payload.blocks.at(-1).elements[0].text).toContain("/attendance");
  });

  it("splits a list too large for one message into several, the link closing the last", async () => {
    team(1200);
    await sendDueReminders(evening, "https://x.test");
    const payloads = sent();
    expect(payloads.length).toBeGreaterThan(1);
    expect(payloads[0].blocks[0].type).toBe("header");
    expect(payloads[1].blocks[0].type).toBe("rich_text");
    expect(payloads[0].text).toMatch(new RegExp(`\\(1/${payloads.length}\\)$`));
    expect(payloads.filter(payload => JSON.stringify(payload).includes("/attendance"))).toEqual([payloads.at(-1)]);
    for (const payload of payloads) expect(payload.blocks.length).toBeLessThanOrEqual(50);
    expect(payloads.flatMap(bullets).join(", ").match(/M\d+/g)).toHaveLength(1200);
  });

  it("releases the run when a later part fails, so the whole reminder is sent again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    team(1200);
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 }).mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(sendDueReminders(evening, "https://x.test")).resolves.toEqual([{ ruleId: "r1", teamId: PARENT, result: "failed" }]);
    expect(db.deliveries).toEqual([]);
  });

  it("lists names and sends no email unless REMINDER_MENTION is on", async () => {
    for (const value of [undefined, "off", "yes"]) {
      fetchMock.mockClear();
      db.deliveries = [];
      if (value) vi.stubEnv("REMINDER_MENTION", value);
      await sendDueReminders(evening, "https://x.test");
      expect(bullets(sent()[0])).toEqual(["11/14 (Sat)  Two"]);
      expect(fetchMock.mock.calls[0][1].body).not.toContain("@example.test");
    }
  });

  it("tags members as user elements by email when REMINDER_MENTION is on", async () => {
    vi.stubEnv("REMINDER_MENTION", "on");
    db.users.push({ id: "u3", email: "three@example.test", name: "Three", teamIds: [CHILD] });
    await sendDueReminders(evening, "https://x.test");
    const [payload] = sent();
    expect(payload.blocks[3].elements[0].elements[0].elements).toEqual([
      { type: "text", text: "11/14 (Sat)", style: { bold: true } },
      { type: "text", text: "  " },
      { type: "user", user_id: "two@example.test" },
      { type: "text", text: " " },
      { type: "user", user_id: "three@example.test" },
    ]);
    expect(payload.text).not.toContain("@example.test");
  });

  it("escapes Slack control characters in the team name where Slack parses them", async () => {
    db.teams[0].name = "R&D <!channel>";
    await sendDueReminders(evening, "https://x.test");
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.text).toMatch(/^\*R&amp;D &lt;!channel&gt;\*: /);
    expect(payload.blocks[0].text).toEqual({ type: "plain_text", text: "R&D <!channel>" });
  });

  it("writes in zh-TW when REMINDER_LOCALE says so", async () => {
    vi.stubEnv("REMINDER_LOCALE", "zh-TW");
    await sendDueReminders(evening, "https://x.test");
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.text).toBe("*Robot*: 1 人還沒填 11/14 (六) 的可出席時間");
    expect(payload.blocks.at(-1).elements[0].text).toContain("|去填可出席時間>");
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

  it("shows a rule that no longer parses as unset instead of failing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.rules[0].target = { url: "http://hooks.example.test/robot" };
    db.rules[0].config = { weekdays: [9], daysAhead: 7 };
    expect(await getTeamReminder(PARENT)).toMatchObject({ settings: { enabled: false, weekdays: [] }, hasWebhook: false });
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

  it("ends with one rule when another first save for the team wins, updating that rule", async () => {
    for (const code of ["P2034", "P2002"]) {
      db.rules = [];
      db.saveConflicts = [code];
      await saveTeamReminder(CHILD, settings);
      expect(db.rules).toHaveLength(1);
      expect(db.rules[0]).toMatchObject({ id: "other", enabled: true, sendTime: "21:30" });
    }
    expect(db.locks).toEqual([CHILD]);
  });

  it("refuses a team that doesn't exist", async () => {
    await expect(saveTeamReminder("0000000000000000000000ff", settings)).rejects.toThrow("Team not found.");
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
