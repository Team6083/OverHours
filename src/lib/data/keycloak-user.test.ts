import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
}));
vi.mock("../prisma", () => ({ default: prismaMock }));

import { linkKeycloakUser } from "./keycloak-user";

const identity = { keycloakId: "sub-1", email: "new@example.com", name: "Alice", image: null };
const uniqueViolation = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => { });
});

describe("linkKeycloakUser", () => {
  it("keeps the linked user and updates their email when it changed in Keycloak", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "u1", email: "old@example.com", keycloakId: "sub-1" });

    await expect(linkKeycloakUser(identity)).resolves.toEqual({ ok: true, userId: "u1" });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { name: "Alice", image: null, email: "new@example.com" },
    });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("keeps the old email when another user already has the new one", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "u1", email: "old@example.com", keycloakId: "sub-1" });
    prismaMock.user.update.mockRejectedValueOnce(uniqueViolation);

    await expect(linkKeycloakUser(identity)).resolves.toEqual({ ok: true, userId: "u1" });
    expect(prismaMock.user.update).toHaveBeenLastCalledWith({ where: { id: "u1" }, data: { name: "Alice", image: null } });
  });

  it("links an unlinked user with the same email", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2", email: "new@example.com", keycloakId: null });

    await expect(linkKeycloakUser(identity)).resolves.toEqual({ ok: true, userId: "u2" });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "u2" },
      data: { keycloakId: "sub-1", name: "Alice", image: null },
    });
  });

  it("refuses an email that belongs to a user linked to another Keycloak account", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({ id: "u3", email: "new@example.com", keycloakId: "sub-other" });

    await expect(linkKeycloakUser(identity)).resolves.toEqual({ ok: false, error: "AccountConflict" });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("creates a new linked user otherwise", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "u4" });

    await expect(linkKeycloakUser(identity)).resolves.toEqual({ ok: true, userId: "u4" });
    expect(prismaMock.user.create).toHaveBeenCalledWith({ data: identity });
  });
});
