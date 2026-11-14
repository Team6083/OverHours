import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  session: null as { user: { id: string; role: string } } | null,
  users: [] as string[],
  logs: [] as { id: string; userId: string; status: string; inTime: Date; createdAt: Date; updatedAt: Date }[],
  locks: [] as string[],
  conflicts: [] as string[],
  userWrites: 0,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: async () => db.session, Role: { ADMIN: "admin", USER: "user" } }));
vi.mock("../prisma", () => {
  const countLogs = ({ where }: { where: { userId: string; status: string } }) =>
    db.logs.filter(log => log.userId === where.userId && log.status === where.status).length;
  const tx = {
    user: {
      count: async ({ where }: { where: { id: string } }) => db.users.filter(id => id === where.id).length,
      update: async () => { db.userWrites++; },
    },
    clockInLock: {
      upsert: async ({ where }: { where: { userId: string } }) => {
        if (!db.locks.includes(where.userId)) db.locks.push(where.userId);
      },
    },
    timeLog: {
      findFirst: async ({ where }: { where: { userId: string; status: string } }) =>
        db.logs.find(log => log.userId === where.userId && log.status === where.status) ?? null,
      create: async ({ data }: { data: { userId: string; status: string; inTime: Date } }) => {
        const log = { ...data, id: `l${db.logs.length + 1}`, createdAt: data.inTime, updatedAt: data.inTime };
        db.logs.push(log);
        return log;
      },
    },
  };
  return {
    default: {
      timeLog: { count: async (args: { where: { userId: string; status: string } }) => countLogs(args) },
      $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => {
        const code = db.conflicts.shift();
        if (code) {
          // Another clock-in for the same user committed first.
          if (db.logs.length === 0) await tx.timeLog.create({ data: { userId: "u1", status: "CurrentlyIn", inTime: new Date() } });
          throw Object.assign(new Error("Transaction failed"), { code });
        }
        return fn(tx);
      },
    },
  };
});

import { AlreadyClockedInError, clockIn } from "./timelog-dto";

beforeEach(() => {
  db.session = { user: { id: "u1", role: "user" } };
  db.users = ["u1", "u2"];
  db.logs = [];
  db.locks = [];
  db.conflicts = [];
  db.userWrites = 0;
});

describe("clockIn", () => {
  it("creates one CurrentlyIn log behind the user's lock, without writing the user", async () => {
    await expect(clockIn("u1")).resolves.toMatchObject({ userId: "u1", status: "CURRENTLY_IN" });
    expect(db.logs).toHaveLength(1);
    expect(db.locks).toEqual(["u1"]);
    expect(db.userWrites).toBe(0);
  });

  it("refuses when the user is already clocked in", async () => {
    await clockIn("u1");
    await expect(clockIn("u1")).rejects.toBeInstanceOf(AlreadyClockedInError);
    expect(db.logs).toHaveLength(1);
  });

  it("retries a write conflict, then sees the other clock-in", async () => {
    db.conflicts = ["P2034"];
    await expect(clockIn("u1")).rejects.toBeInstanceOf(AlreadyClockedInError);
    expect(db.logs).toHaveLength(1);
  });

  it("treats two first-time lock inserts hitting the unique index as a conflict too", async () => {
    db.conflicts = ["P2002"];
    await expect(clockIn("u1")).rejects.toBeInstanceOf(AlreadyClockedInError);
    expect(db.logs).toHaveLength(1);
  });

  it("after the last conflict, reports the other clock-in as already clocked in", async () => {
    db.conflicts = ["P2034", "P2034", "P2034"];
    await expect(clockIn("u1")).rejects.toBeInstanceOf(AlreadyClockedInError);
    expect(db.logs).toHaveLength(1);
  });

  it("refuses a user that doesn't exist instead of creating a lock or log for it", async () => {
    db.session = { user: { id: "admin", role: "admin" } };
    await expect(clockIn("gone")).rejects.toThrow("User not found");
    expect(db.locks).toEqual([]);
    expect(db.logs).toEqual([]);
  });

  it("only lets the user or an admin clock in", async () => {
    await expect(clockIn("u2")).rejects.toThrow("Unauthorized");
    db.session = { user: { id: "admin", role: "admin" } };
    await expect(clockIn("u2")).resolves.toMatchObject({ userId: "u2" });
  });
});
