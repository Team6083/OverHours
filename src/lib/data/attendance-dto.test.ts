import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

const db = vi.hoisted(() => ({
  session: null as { user: { id?: string } } | null,
  users: [] as Row[],
  entries: [] as Row[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: async () => db.session }));

const matches = (row: Row, where: Row = {}) => Object.entries(where).every(([key, value]) => {
  if (value && typeof value === "object" && "in" in value) return (value as { in: unknown[] }).in.includes(row[key]);
  return (row[key] ?? "AllDay") === value;
});

vi.mock("../prisma", () => {
  const prisma = {
    user: { findMany: async () => db.users },
    attendanceEntry: {
      findMany: async ({ where }: { where: Row }) => db.entries
        .filter(row => matches(row, where))
        .map(row => ({ ...row, user: db.users.find(user => user.id === row.userId) })),
      deleteMany: async ({ where }: { where: Row }) => { db.entries = db.entries.filter(row => !matches(row, where)); },
      createMany: async ({ data }: { data: Row[] }) => { db.entries.push(...data); },
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };
  return { default: prisma };
});

import { adminGetAttendance, getMyWeek, getWeekBoard, saveMyWeek } from "./attendance-dto";

const entry = (userId: string, date: string, status = "Available") => ({ userId, date, status });

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2027-01-13T04:00:00Z"), toFake: ["Date"] });
  vi.stubEnv("TZ", "UTC");
  db.session = { user: { id: "a" } };
  db.users = [{ id: "a", name: "A", email: "a@example.com" }, { id: "b", name: "B", email: "b@example.com" }];
  db.entries = [];
});

describe("saveMyWeek", () => {
  it("stores both available and unavailable", async () => {
    await expect(saveMyWeek("2027-01-11", { "2027-01-14": "AVAILABLE", "2027-01-15": "UNAVAILABLE" })).resolves.toBe(true);
    expect(db.entries).toEqual([entry("a", "2027-01-14"), entry("a", "2027-01-15", "Unavailable")]);
  });

  it("clears a day left out, back to not filled in", async () => {
    db.entries = [entry("a", "2027-01-14")];
    await saveMyWeek("2027-01-11", {});
    expect(db.entries).toEqual([]);
  });

  it("does not touch past days", async () => {
    db.entries = [entry("a", "2027-01-11")];
    await saveMyWeek("2027-01-11", { "2027-01-11": "UNAVAILABLE", "2027-01-12": "AVAILABLE" });
    expect(db.entries).toEqual([entry("a", "2027-01-11")]);
  });

  it("allows today", async () => {
    await saveMyWeek("2027-01-11", { "2027-01-13": "AVAILABLE" });
    expect(db.entries).toEqual([entry("a", "2027-01-13")]);
  });

  it("refuses a week that has passed", async () => {
    await expect(saveMyWeek("2027-01-04", { "2027-01-05": "AVAILABLE" })).resolves.toBe(false);
    expect(db.entries).toEqual([]);
  });

  it("ignores days outside the week", async () => {
    await saveMyWeek("2027-01-18", { "2027-02-01": "AVAILABLE" });
    expect(db.entries).toEqual([]);
  });

  it("leaves other people and other weeks alone", async () => {
    db.entries = [entry("b", "2027-01-14"), entry("a", "2027-01-20")];
    await saveMyWeek("2027-01-11", {});
    expect(db.entries).toHaveLength(2);
  });

  it("requires a user id", async () => {
    db.session = null;
    await expect(saveMyWeek("2027-01-11", {})).rejects.toThrow("Unauthorized");

    db.session = { user: {} };
    await expect(saveMyWeek("2027-01-11", {})).rejects.toThrow("Unauthorized");
  });
});

describe("getMyWeek", () => {
  it("returns only the user's own entries", async () => {
    db.entries = [entry("a", "2027-01-12", "Unavailable"), entry("b", "2027-01-13")];
    await expect(getMyWeek("2027-01-11")).resolves.toEqual({ "2027-01-12": "UNAVAILABLE" });
  });

  it("fails rather than widening the query without a user id", async () => {
    db.session = { user: {} };
    await expect(getMyWeek("2027-01-11")).rejects.toThrow("Unauthorized");
  });
});

describe("getWeekBoard", () => {
  it("groups names by status and leaves out people who have not filled in", async () => {
    db.entries = [entry("a", "2027-01-12"), entry("b", "2027-01-12", "Unavailable")];

    const board = await getWeekBoard("2027-01-11");

    expect(board).toHaveLength(7);
    expect(board[1]).toEqual({ date: "2027-01-12", available: ["A"], unavailable: ["B"] });
    expect(board[2]).toEqual({ date: "2027-01-13", available: [], unavailable: [] });
  });

  it("requires sign-in", async () => {
    db.session = null;
    await expect(getWeekBoard("2027-01-11")).rejects.toThrow("Unauthorized");
  });
});

describe("adminGetAttendance", () => {
  it("returns everyone with all three states and their email", async () => {
    db.entries = [entry("a", "d1"), entry("a", "d2", "Unavailable")];

    await expect(adminGetAttendance(["d1", "d2"])).resolves.toEqual([
      {
        id: "a", name: "A", email: "a@example.com",
        days: [{ date: "d1", status: "AVAILABLE" }, { date: "d2", status: "UNAVAILABLE" }],
      },
      {
        id: "b", name: "B", email: "b@example.com",
        days: [{ date: "d1", status: "NOT_FILLED" }, { date: "d2", status: "NOT_FILLED" }],
      },
    ]);
  });
});
