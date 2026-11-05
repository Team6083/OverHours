import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

const db = vi.hoisted(() => ({
  session: null as { user: { id?: string; role: string } } | null,
  season: null as Row | null,
  users: [] as Row[],
  marks: [] as Row[],
  wanted: [] as Row[],
  duties: [] as Row[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({
  Role: { USER: "user", ADMIN: "admin" },
  auth: async () => db.session,
}));
vi.mock("../slack", () => ({ withSlackIds: async (people: unknown) => people }));

const matches = (row: Row, where: Row = {}) => Object.entries(where).every(([key, value]) => {
  if (value && typeof value === "object" && "in" in value) return (value as { in: unknown[] }).in.includes(row[key]);
  return row[key] === value;
});

vi.mock("../prisma", () => {
  const prisma = {
    attendanceSeason: { findFirst: async () => db.season },
    seasonEvent: { findMany: async () => [] },
    user: { findMany: async () => db.users },
    attendanceMark: {
      findMany: async ({ where }: { where: Row }) => db.marks.filter(row => matches(row, where)),
      deleteMany: async ({ where }: { where: Row }) => { db.marks = db.marks.filter(row => !matches(row, where)); },
      createMany: async ({ data }: { data: Row[] }) => { db.marks.push(...data); },
    },
    wantedRecord: {
      findMany: async ({ where }: { where: Row }) => db.wanted.filter(row => matches(row, where)),
      createMany: async ({ data }: { data: Row[] }) => { db.wanted.push(...data); },
    },
    dutyAssignment: { findMany: async ({ where }: { where: Row }) => db.duties.filter(row => matches(row, where)) },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };
  return { default: prisma };
});

import {
  adminGetDailyBoard, buildAttendanceMessage, getDailyBoard, getMyUnavailableDates, recordWanted, saveMyWeek,
} from "./attendance-dto";

const season = { id: "s", startDate: "2027-01-09", endDate: "2027-04-09" };
const user = (id: string, overrides: Row = {}) => ({ id, name: id, email: `${id}@example.com`, attendanceExempt: null, ...overrides });

beforeEach(() => {
  db.session = { user: { id: "a", role: "user" } };
  db.season = season;
  db.users = [user("a"), user("b"), user("mentor", { attendanceExempt: true })];
  db.marks = [];
  db.wanted = [];
  db.duties = [];
});

describe("saveMyWeek", () => {
  it("replaces the user's marks for that week only", async () => {
    db.marks = [
      { userId: "a", date: "2027-01-12" },
      { userId: "a", date: "2027-01-20" },
      { userId: "b", date: "2027-01-12" },
    ];

    await expect(saveMyWeek("2027-01-11", ["2027-01-13"])).resolves.toBe(true);

    expect(db.marks).toEqual(expect.arrayContaining([
      { userId: "a", date: "2027-01-20" },
      { userId: "b", date: "2027-01-12" },
      { userId: "a", date: "2027-01-13" },
    ]));
    expect(db.marks).toHaveLength(3);
  });

  it("ignores days outside the week or season, and duplicates", async () => {
    await saveMyWeek("2027-01-04", ["2027-01-05", "2027-01-09", "2027-01-09", "2027-02-01"]);
    expect(db.marks).toEqual([{ userId: "a", date: "2027-01-09" }]);
  });

  it("clears the week when nothing is marked", async () => {
    db.marks = [{ userId: "a", date: "2027-01-12" }];
    await saveMyWeek("2027-01-11", []);
    expect(db.marks).toEqual([]);
  });

  it("refuses a week with no season days", async () => {
    await expect(saveMyWeek("2026-12-28", ["2026-12-29"])).resolves.toBe(false);
    expect(db.marks).toEqual([]);
  });

  it("refuses when no season exists", async () => {
    db.season = null;
    await expect(saveMyWeek("2027-01-11", ["2027-01-12"])).resolves.toBe(false);
  });

  it("requires a signed-in user with an id", async () => {
    db.session = null;
    await expect(saveMyWeek("2027-01-11", [])).rejects.toThrow("Unauthorized");

    db.session = { user: { role: "user" } };
    await expect(saveMyWeek("2027-01-11", [])).rejects.toThrow("Unauthorized");
  });
});

describe("getMyUnavailableDates", () => {
  it("never returns other people's marks", async () => {
    db.marks = [{ userId: "a", date: "2027-01-12" }, { userId: "b", date: "2027-01-13" }];
    await expect(getMyUnavailableDates("2027-01-11")).resolves.toEqual(["2027-01-12"]);
  });

  it("fails rather than widening the query without a user id", async () => {
    db.session = { user: { role: "user" } };
    await expect(getMyUnavailableDates("2027-01-11")).rejects.toThrow("Unauthorized");
  });
});

describe("daily board", () => {
  it("lists people without a mark and skips exempt accounts", async () => {
    db.marks = [{ userId: "a", date: "2027-01-12" }];
    const board = await adminGetDailyBoard("2027-01-12");
    expect(board.available.map(person => person.id)).toEqual(["b"]);
  });

  it("lists nobody outside the season", async () => {
    await expect(adminGetDailyBoard("2026-11-05")).resolves.toMatchObject({ available: [] });
  });

  it("lists nobody without a season", async () => {
    db.season = null;
    await expect(adminGetDailyBoard("2027-01-12")).resolves.toMatchObject({ available: [] });
  });

  it("does not give members emails", async () => {
    const board = await getDailyBoard("2027-01-12");
    expect(board.available).toEqual([{ id: "a", name: "a" }, { id: "b", name: "b" }]);
  });
});

describe("recordWanted", () => {
  const monday = "2027-01-18";

  it("records people with no marks in the week that ended", async () => {
    db.marks = [{ userId: "a", date: "2027-01-12" }];
    await expect(recordWanted(monday)).resolves.toBe(1);
    expect(db.wanted).toEqual([{ userId: "b", weekStart: "2027-01-11" }]);
  });

  it("does nothing on other days", async () => {
    await expect(recordWanted("2027-01-19")).resolves.toBe(0);
    expect(db.wanted).toEqual([]);
  });

  it("does not record twice", async () => {
    await recordWanted(monday);
    await expect(recordWanted(monday)).resolves.toBe(0);
    expect(db.wanted).toHaveLength(2);
  });

  it("skips exempt accounts", async () => {
    await recordWanted(monday);
    expect(db.wanted.map(row => row.userId)).not.toContain("mentor");
  });

  it("only looks at season days of a partial week", async () => {
    db.marks = [{ userId: "a", date: "2027-01-05" }];
    await recordWanted("2027-01-11");
    expect(db.wanted.map(row => row.userId)).toEqual(["a", "b"]);
  });

  it("does nothing outside the season", async () => {
    await expect(recordWanted("2026-11-02")).resolves.toBe(0);
  });
});

describe("buildAttendanceMessage", () => {
  it("reports next week and tomorrow", async () => {
    db.marks = [{ userId: "a", date: "2027-01-19" }, { userId: "b", date: "2027-01-13" }];
    const text = await buildAttendanceMessage("2027-01-12", "https://example.com/attendance");

    expect(text).toContain("下周出席表未填寫：b");
    expect(text).toContain("明天可來：a");
    expect(text).toContain("<https://example.com/attendance|出席表>");
  });

  it("drops the reminder in the final week", async () => {
    const text = await buildAttendanceMessage("2027-04-06");
    expect(text).not.toContain("下周");
    expect(text).toContain("明天可來");
  });

  it("is silent the day the season has ended", async () => {
    await expect(buildAttendanceMessage("2027-04-09")).resolves.toBeNull();
  });

  it("is silent before next week reaches the season", async () => {
    await expect(buildAttendanceMessage("2026-11-05")).resolves.toBeNull();
  });

  it("is silent without a season", async () => {
    db.season = null;
    await expect(buildAttendanceMessage("2027-01-12")).resolves.toBeNull();
  });
});
