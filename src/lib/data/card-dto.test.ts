import { beforeEach, describe, expect, it, vi } from "vitest";

type CardRow = { id: string; uid: string; userId: string; lastUsedAt: Date | null; createdAt: Date };
type RequestRow = { id: string; uid: string; code: string };

const db = vi.hoisted(() => ({
  session: null as { user: { id?: string; role?: string; canTapCards?: boolean } } | null,
  cards: [] as CardRow[],
  requests: [] as RequestRow[],
  currentlyIn: new Set<string>(),
}));

const timelog = vi.hoisted(() => ({ clockInUser: vi.fn(), clockOutUser: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: async () => db.session, Role: { ADMIN: "admin", USER: "user" } }));
vi.mock("./timelog-dto", () => {
  class AutoLockedError extends Error { }
  class TimeLogTooShortError extends Error { }
  class AlreadyClockedInError extends Error { }
  class NotClockedInError extends Error { }
  return { ...timelog, AutoLockedError, TimeLogTooShortError, AlreadyClockedInError, NotClockedInError };
});

vi.mock("../prisma", () => {
  const users: Record<string, { id: string; name: string }> = { a: { id: "a", name: "A" }, b: { id: "b", name: "B" } };
  const prisma = {
    card: {
      findUnique: async ({ where }: { where: { uid?: string; id?: string } }) => {
        const card = db.cards.find(c => (where.uid ? c.uid === where.uid : c.id === where.id));
        return card ? { ...card, user: users[card.userId] } : null;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<CardRow> }) => {
        Object.assign(db.cards.find(c => c.id === where.id)!, data);
      },
      // Check and write happen in one step, like the database's conditional update.
      updateMany: async ({ where, data }: { where: { id: string; OR: { lastUsedAt: { lte?: Date } | null }[] }; data: { lastUsedAt: Date } }) => {
        const found = db.cards.find(c => c.id === where.id);
        const cutoff = where.OR.map(cond => cond.lastUsedAt).find(cond => cond && "lte" in cond)?.lte;
        if (!found || (found.lastUsedAt && cutoff && found.lastUsedAt > cutoff)) return { count: 0 };
        found.lastUsedAt = data.lastUsedAt;
        return { count: 1 };
      },
      create: async ({ data }: { data: { uid: string; userId: string } }) => {
        db.cards.push({ id: `c${db.cards.length + 1}`, lastUsedAt: null, createdAt: new Date(), ...data });
      },
      delete: async ({ where }: { where: { id: string } }) => {
        db.cards = db.cards.filter(c => c.id !== where.id);
      },
    },
    cardBindRequest: {
      deleteMany: async () => {
        db.requests = [];
      },
      create: async ({ data }: { data: Omit<RequestRow, "id"> }) => {
        db.requests.push({ id: `r${db.requests.length + 1}`, ...data });
      },
      findUnique: async ({ where }: { where: { code: string } }) => db.requests.find(r => r.code === where.code) ?? null,
      count: async ({ where }: { where: { code: string } }) => db.requests.filter(r => r.code === where.code).length,
      delete: async ({ where }: { where: { id: string } }) => {
        db.requests = db.requests.filter(r => r.id !== where.id);
      },
    },
    timeLog: {
      findFirst: async ({ where }: { where: { userId: string } }) => (db.currentlyIn.has(where.userId) ? { id: "log" } : null),
    },
    $transaction: async (arg: unknown) => (typeof arg === "function" ? arg(prisma) : Promise.all(arg as Promise<unknown>[])),
  };
  return { default: prisma };
});

import { AlreadyClockedInError, AutoLockedError, NotClockedInError } from "./timelog-dto";
import { bindCard, getBindRequest, isCurrentBindCode, removeCard, tapCard } from "./card-dto";

const NOW = new Date("2027-01-13T09:00:00Z");
const later = (ms: number) => new Date(NOW.getTime() + ms);
const card = (userId: string, lastUsedAt: Date | null = null): CardRow =>
  ({ id: "c1", uid: "04A1B2C3", userId, lastUsedAt, createdAt: NOW });

beforeEach(() => {
  db.session = { user: { id: "a", role: "user" } };
  db.cards = [];
  db.requests = [];
  db.currentlyIn = new Set();
  timelog.clockInUser.mockReset().mockResolvedValue({});
  timelog.clockOutUser.mockReset().mockResolvedValue({});
});

describe("tapCard", () => {
  it("gives an unknown card a bind code, and the next unbound tap replaces it", async () => {
    const first = await tapCard("04A1B2C3", NOW);
    expect(first).toMatchObject({ result: "unbound" });
    const firstCode = db.requests[0].code;

    await tapCard("0A0B0C0D", later(1000));
    expect(db.requests).toEqual([expect.objectContaining({ uid: "0A0B0C0D" })]);
    expect(db.requests[0].code).not.toBe(firstCode);
  });

  it("leaves the code on screen alone when a linked card is tapped", async () => {
    db.requests = [{ id: "r1", uid: "0A0B0C0D", code: "code" }];
    db.cards = [card("a")];
    await tapCard("04A1B2C3", NOW);
    expect(db.requests).toHaveLength(1);
  });

  it("clocks a bound card's user in, then out on a later tap", async () => {
    db.cards = [card("a")];

    await expect(tapCard("04A1B2C3", NOW)).resolves.toEqual({ result: "clockedIn", user: { id: "a", name: "A" } });
    expect(timelog.clockInUser).toHaveBeenCalledWith("a");

    db.currentlyIn.add("a");
    await expect(tapCard("04A1B2C3", later(60_000))).resolves.toMatchObject({ result: "clockedOut" });
    expect(timelog.clockOutUser).toHaveBeenCalledWith("a");
  });

  it("ignores a second tap within the cooldown", async () => {
    db.cards = [card("a", NOW)];
    await expect(tapCard("04A1B2C3", later(5000))).resolves.toMatchObject({ result: "tooSoon" });
    expect(timelog.clockInUser).not.toHaveBeenCalled();
  });

  it("counts two taps arriving together once", async () => {
    db.cards = [card("a")];
    const results = await Promise.all([tapCard("04A1B2C3", NOW), tapCard("04A1B2C3", NOW)]);
    expect(results.map(r => r.result).sort()).toEqual(["clockedIn", "tooSoon"]);
    expect(timelog.clockInUser).toHaveBeenCalledTimes(1);
  });

  it("accepts a tap again once the cooldown has passed", async () => {
    db.cards = [card("a", NOW)];
    await expect(tapCard("04A1B2C3", later(15_000))).resolves.toMatchObject({ result: "clockedIn" });
  });

  it("reports clocked in or out when someone else did it at the same moment", async () => {
    db.cards = [card("a")];
    timelog.clockInUser.mockRejectedValue(new AlreadyClockedInError("in"));
    await expect(tapCard("04A1B2C3", NOW)).resolves.toMatchObject({ result: "clockedIn" });

    db.currentlyIn.add("a");
    timelog.clockOutUser.mockRejectedValue(new NotClockedInError("out"));
    await expect(tapCard("04A1B2C3", later(60_000))).resolves.toMatchObject({ result: "clockedOut" });
  });

  it("reports a clock-out past the cut-off as locked", async () => {
    db.cards = [card("a")];
    db.currentlyIn.add("a");
    timelog.clockOutUser.mockRejectedValue(new AutoLockedError("locked"));
    await expect(tapCard("04A1B2C3", NOW)).resolves.toMatchObject({ result: "locked" });
  });
});

describe("binding", () => {
  beforeEach(() => {
    db.requests = [{ id: "r1", uid: "04A1B2C3", code: "code" }];
  });

  it("binds the card to the signed-in member and uses up the code", async () => {
    await expect(getBindRequest("code")).resolves.toMatchObject({ uid: "04A1B2C3" });
    await expect(bindCard("code")).resolves.toEqual({ uid: "04A1B2C3", userId: "a" });
    expect(db.cards).toMatchObject([{ uid: "04A1B2C3", userId: "a" }]);
    expect(db.requests).toEqual([]);
  });

  it("lets only an admin bind the card to someone else", async () => {
    await expect(bindCard("code", "b")).rejects.toThrow("Forbidden");

    db.session = { user: { id: "a", role: "admin" } };
    await expect(bindCard("code", "b")).resolves.toEqual({ uid: "04A1B2C3", userId: "b" });
  });

  it("refuses a code that a later tap replaced, and a card that is already bound", async () => {
    await tapCard("0A0B0C0D", NOW);
    await expect(getBindRequest("code")).resolves.toBeNull();
    await expect(bindCard("code")).rejects.toMatchObject({ reason: "replaced" });

    db.requests = [{ id: "r1", uid: "04A1B2C3", code: "code" }];
    db.cards = [card("b")];
    await expect(bindCard("code")).rejects.toMatchObject({ reason: "taken" });
  });

  it("requires sign-in", async () => {
    db.session = null;
    await expect(getBindRequest("code")).rejects.toThrow("Unauthorized");
    await expect(bindCard("code")).rejects.toThrow("Unauthorized");
  });
});

describe("removeCard", () => {
  it("lets the owner or an admin remove a card, nobody else", async () => {
    db.cards = [card("b")];
    await expect(removeCard("c1")).rejects.toThrow("Forbidden");

    db.session = { user: { id: "b", role: "user" } };
    await removeCard("c1");
    expect(db.cards).toEqual([]);
  });
});

describe("isCurrentBindCode", () => {
  it("is true until the code is used, and only for kiosk accounts", async () => {
    db.requests = [{ id: "r1", uid: "04A1B2C3", code: "code" }];
    await expect(isCurrentBindCode("code")).rejects.toThrow("Unauthorized");

    db.session = { user: { id: "k", canTapCards: true } };
    await expect(isCurrentBindCode("code")).resolves.toBe(true);
    db.requests = [];
    await expect(isCurrentBindCode("code")).resolves.toBe(false);
  });
});
