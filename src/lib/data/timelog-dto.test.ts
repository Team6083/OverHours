import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  session: null as { user: { id: string; role: string } } | null,
  logs: [] as { id: string; userId: string; status: string; inTime: Date; createdAt: Date; updatedAt: Date }[],
  conflicts: 0,
  userWrites: 0,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: async () => db.session, Role: { ADMIN: "admin", USER: "user" } }));
vi.mock("../prisma", () => {
  const tx = {
    user: { update: async () => { db.userWrites++; } },
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
      timeLog: { count: async ({ where }: { where: { userId: string; status: string } }) => db.logs.filter(log => log.userId === where.userId && log.status === where.status).length },
      $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => {
        if (db.conflicts > 0) {
          db.conflicts--;
          // Another clock-in for the same user committed first.
          if (db.logs.length === 0) await tx.timeLog.create({ data: { userId: "u1", status: "CurrentlyIn", inTime: new Date() } });
          throw Object.assign(new Error("Transaction failed due to a write conflict"), { code: "P2034" });
        }
        return fn(tx);
      },
    },
  };
});

import { AlreadyClockedInError, clockIn } from "./timelog-dto";

beforeEach(() => {
  db.session = { user: { id: "u1", role: "user" } };
  db.logs = [];
  db.conflicts = 0;
  db.userWrites = 0;
});

describe("clockIn", () => {
  it("creates one CurrentlyIn log, writing the user in the same transaction", async () => {
    await expect(clockIn("u1")).resolves.toMatchObject({ userId: "u1", status: "CURRENTLY_IN" });
    expect(db.logs).toHaveLength(1);
    expect(db.userWrites).toBe(1);
  });

  it("refuses when the user is already clocked in", async () => {
    await clockIn("u1");
    await expect(clockIn("u1")).rejects.toBeInstanceOf(AlreadyClockedInError);
    expect(db.logs).toHaveLength(1);
  });

  it("retries a write conflict once, then sees the other clock-in", async () => {
    db.conflicts = 1;
    await expect(clockIn("u1")).rejects.toBeInstanceOf(AlreadyClockedInError);
    expect(db.logs).toHaveLength(1);
  });

  it("after a second write conflict, reports the other clock-in as already clocked in", async () => {
    db.conflicts = 2;
    await expect(clockIn("u1")).rejects.toBeInstanceOf(AlreadyClockedInError);
    expect(db.logs).toHaveLength(1);
  });

  it("only lets the user or an admin clock in", async () => {
    await expect(clockIn("u2")).rejects.toThrow("Unauthorized");
    db.session = { user: { id: "admin", role: "admin" } };
    await expect(clockIn("u2")).resolves.toMatchObject({ userId: "u2" });
  });
});
