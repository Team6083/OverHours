import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  team: { findMany: vi.fn() },
}));
vi.mock("../prisma", () => ({ default: prismaMock }));

import { syncUserRoleTeams } from "./team-role-sync";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.team.findMany.mockResolvedValue([
    { id: "ce", autoJoinRoles: ["frc-ce"] },
    { id: "pm", autoJoinRoles: ["frc-pm"] },
  ]);
});

describe("syncUserRoleTeams", () => {
  it("joins matching teams and leaves role teams in one write", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ teamIds: ["pm", "manual"], roleTeamIds: ["pm"] });

    await syncUserRoleTeams("u1", ["frc-ce"]);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        roleTeamIds: ["ce"],
        teams: { connect: [{ id: "ce" }], disconnect: [{ id: "pm" }] },
      },
    });
  });

  it("writes nothing when memberships already match", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ teamIds: ["ce"], roleTeamIds: ["ce"] });

    await syncUserRoleTeams("u1", ["frc-ce"]);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("cleans up a stale role team id without touching memberships", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ teamIds: [], roleTeamIds: ["ce"] });

    await syncUserRoleTeams("u1", []);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { roleTeamIds: [], teams: { connect: [], disconnect: [] } },
    });
  });

  it("does nothing for a deleted user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await syncUserRoleTeams("u1", ["frc-ce"]);

    expect(prismaMock.team.findMany).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
