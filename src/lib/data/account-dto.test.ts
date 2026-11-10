import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "admin", role: "admin" } })),
  Role: { ADMIN: "admin", USER: "user" },
}));
const prismaMock = vi.hoisted(() => ({
  account: { findMany: vi.fn(), deleteMany: vi.fn() },
  user: { findMany: vi.fn() },
}));
vi.mock("../prisma", () => ({ default: prismaMock }));

import { getOutOfSyncEmails, getUserAccounts, unlinkAccount } from "./account-dto";

const account = (id: string, userId: string, email: string, userEmail: string) => ({
  id, userId, email, user: { email: userEmail },
  provider: "keycloak", subject: `sub-${id}`, issuer: "https://sso.example.com/realms/lab", createdAt: new Date(0),
});

// Resolves `user.findMany({ where: { email: { in } } })` against these users
function usersAre(users: { id: string; email: string }[]) {
  prismaMock.user.findMany.mockImplementation(async ({ where }: { where: { email: { in: string[] } } }) =>
    users.filter(user => where.email.in.includes(user.email)));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getOutOfSyncEmails", () => {
  it("lists a user whose provider email another user has", async () => {
    prismaMock.account.findMany.mockResolvedValue([account("a1", "u1", "y@example.com", "x@example.com")]);
    usersAre([{ id: "u1", email: "x@example.com" }, { id: "u2", email: "y@example.com" }]);

    await expect(getOutOfSyncEmails()).resolves.toEqual({ u1: ["y@example.com"] });
  });

  it("does not list a merged user whose other account emails are free", async () => {
    prismaMock.account.findMany.mockResolvedValue([
      account("a1", "u1", "x@example.com", "x@example.com"),
      account("a2", "u1", "y@example.com", "x@example.com"),
    ]);
    usersAre([{ id: "u1", email: "x@example.com" }]);

    await expect(getOutOfSyncEmails()).resolves.toEqual({});
  });

  it("keeps every taken email of a user with several accounts", async () => {
    prismaMock.account.findMany.mockResolvedValue([
      account("a1", "u1", "y@example.com", "x@example.com"),
      account("a2", "u1", "z@example.com", "x@example.com"),
    ]);
    usersAre([{ id: "u2", email: "y@example.com" }, { id: "u3", email: "z@example.com" }]);

    await expect(getOutOfSyncEmails()).resolves.toEqual({ u1: ["y@example.com", "z@example.com"] });
  });
});

describe("getUserAccounts", () => {
  it("flags only accounts whose email another user has", async () => {
    prismaMock.account.findMany.mockResolvedValue([
      account("a1", "u1", "x@example.com", "x@example.com"),
      account("a2", "u1", "y@example.com", "x@example.com"),
      account("a3", "u1", "z@example.com", "x@example.com"),
    ]);
    usersAre([{ id: "u1", email: "x@example.com" }, { id: "u2", email: "z@example.com" }]);

    const accounts = await getUserAccounts("u1");
    expect(accounts.map(a => [a.id, a.emailTakenByOtherUser])).toEqual([["a1", false], ["a2", false], ["a3", true]]);
  });
});

describe("unlinkAccount", () => {
  it("only deletes the account if it belongs to the user", async () => {
    await unlinkAccount("u1", "a1");
    expect(prismaMock.account.deleteMany).toHaveBeenCalledWith({ where: { id: "a1", userId: "u1" } });
  });
});
