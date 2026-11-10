import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const prismaMock = vi.hoisted(() => {
  const mock = {
    account: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  };
  // Interactive transactions run against the same mock
  mock.$transaction.mockImplementation((fn: (tx: typeof mock) => unknown) => fn(mock));
  return mock;
});
vi.mock("../prisma", () => ({ default: prismaMock }));

import { linkProviderAccount } from "./user-account";

const ISSUER = "https://sso.example.com/realms/lab";
const identity = { provider: "keycloak", subject: "sub-1", issuer: ISSUER, email: "new@example.com", name: "Alice", image: null };
const prismaError = (code: string) => Object.assign(new Error(code), { code });

const linkedAccount = (userEmail: string, accountEmail = userEmail) => ({
  id: "a1", userId: "u1", provider: "keycloak", subject: "sub-1", issuer: ISSUER, email: accountEmail, user: { email: userEmail },
});

beforeEach(() => {
  vi.clearAllMocks();
  for (const fn of [...Object.values(prismaMock.account), ...Object.values(prismaMock.user)]) {
    fn.mockReset();
  }
});

describe("linkProviderAccount", () => {
  it("looks the account up by provider and subject, not issuer", async () => {
    prismaMock.account.findUnique.mockResolvedValue(linkedAccount("new@example.com"));

    await linkProviderAccount(identity);

    expect(prismaMock.account.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { provider_subject: { provider: "keycloak", subject: "sub-1" } },
    }));
  });

  it("keeps the linked user when the issuer URL changed, and records the new one", async () => {
    prismaMock.account.findUnique.mockResolvedValue({ ...linkedAccount("new@example.com"), issuer: "https://old-sso.example.com/realms/lab" });

    await expect(linkProviderAccount(identity)).resolves.toEqual({ ok: true, userId: "u1" });
    expect(prismaMock.account.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { email: "new@example.com", issuer: ISSUER } });
  });

  it("keeps the linked user and follows an email change at the provider", async () => {
    prismaMock.account.findUnique.mockResolvedValue(linkedAccount("old@example.com"));
    prismaMock.account.count.mockResolvedValue(1);

    await expect(linkProviderAccount(identity)).resolves.toEqual({ ok: true, userId: "u1" });
    expect(prismaMock.account.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { email: "new@example.com", issuer: ISSUER } });
    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { name: "Alice", image: null, email: "new@example.com" },
    });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("leaves the email alone when the user has several accounts", async () => {
    prismaMock.account.findUnique.mockResolvedValue(linkedAccount("old@example.com"));
    prismaMock.account.count.mockResolvedValue(2);

    await expect(linkProviderAccount(identity)).resolves.toEqual({ ok: true, userId: "u1" });
    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { name: "Alice", image: null } });
  });

  it("keeps the old email when another user already has the new one", async () => {
    prismaMock.account.findUnique.mockResolvedValue(linkedAccount("old@example.com"));
    prismaMock.account.count.mockResolvedValue(1);
    prismaMock.user.update.mockRejectedValueOnce(prismaError("P2002"));

    await expect(linkProviderAccount(identity)).resolves.toEqual({ ok: true, userId: "u1" });
    expect(prismaMock.user.update).toHaveBeenLastCalledWith({ where: { id: "u1" }, data: { name: "Alice", image: null } });
    // The account still records the provider's email, which flags the user as out of sync
    expect(prismaMock.account.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { email: "new@example.com", issuer: ISSUER } });
  });

  it("links a user with the same email and no account", async () => {
    prismaMock.account.findUnique.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2" });
    prismaMock.account.count.mockResolvedValue(0);

    await expect(linkProviderAccount(identity)).resolves.toEqual({ ok: true, userId: "u2" });
    expect(prismaMock.account.create).toHaveBeenCalledWith({
      data: { userId: "u2", provider: "keycloak", subject: "sub-1", issuer: ISSUER, email: "new@example.com" },
    });
  });

  it("refuses an email whose user is already linked to another account", async () => {
    prismaMock.account.findUnique.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({ id: "u3" });
    prismaMock.account.count.mockResolvedValue(1);

    await expect(linkProviderAccount(identity)).resolves.toEqual({ ok: false, error: "AccountConflict" });
    expect(prismaMock.account.create).not.toHaveBeenCalled();
    // The other person's profile must not overwrite this user
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("creates a new user with the account otherwise", async () => {
    prismaMock.account.findUnique.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "u4" });

    await expect(linkProviderAccount(identity)).resolves.toEqual({ ok: true, userId: "u4" });
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: "new@example.com", name: "Alice", image: null,
        accounts: { create: { provider: "keycloak", subject: "sub-1", issuer: ISSUER, email: "new@example.com" } },
      },
    });
  });

  it("retries once when a concurrent sign-in wins, then matches what it wrote", async () => {
    prismaMock.account.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(linkedAccount("new@example.com"));
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockRejectedValueOnce(prismaError("P2002"));

    await expect(linkProviderAccount(identity)).resolves.toEqual({ ok: true, userId: "u1" });
    expect(prismaMock.account.findUnique).toHaveBeenCalledTimes(2);
  });

  it("gives up after one retry", async () => {
    prismaMock.account.findUnique.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2" });
    prismaMock.user.update.mockRejectedValue(prismaError("P2034"));

    await expect(linkProviderAccount(identity)).rejects.toMatchObject({ code: "P2034" });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
  });

  it("does not retry other errors", async () => {
    prismaMock.account.findUnique.mockRejectedValue(prismaError("P1001"));

    await expect(linkProviderAccount(identity)).rejects.toMatchObject({ code: "P1001" });
    expect(prismaMock.account.findUnique).toHaveBeenCalledTimes(1);
  });
});
