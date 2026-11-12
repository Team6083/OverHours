import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "admin", role: "admin" } })),
  Role: { ADMIN: "admin", USER: "user" },
}));
const prismaMock = vi.hoisted(() => ({
  team: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
  user: { findMany: vi.fn() },
}));
vi.mock("../prisma", () => ({ default: prismaMock }));

import { TeamError, createTeam, getAllTeamDTOs, toTeamError, updateTeam } from "./team-dto";

// Valid ObjectIds
const A = "000000000000000000000001";
const B = "000000000000000000000002";

const prismaError = (code: string) => Object.assign(new Error(code), { code });

const team = (id: string, parentTeamId: string | null = null, userIds: string[] = []) => ({
  id, name: `Team ${id}`, parentTeamId, userIds, createdAt: new Date(0), updatedAt: new Date(0),
});

// Resolves `team.findMany`, `team.count` and `team.update` against these teams
function teamsAre(teams: ReturnType<typeof team>[]) {
  prismaMock.team.findMany.mockResolvedValue(teams);
  prismaMock.team.count.mockImplementation(async ({ where }: { where: { id: string } }) =>
    teams.filter(t => t.id === where.id).length);
  prismaMock.team.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: object }) =>
    ({ ...teams.find(t => t.id === where.id)!, ...data }));
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findMany.mockResolvedValue([]);
});

describe("createTeam", () => {
  it("creates a team under an existing parent", async () => {
    teamsAre([team(A)]);
    prismaMock.team.create.mockResolvedValue(team(B, A));

    await createTeam("New", A);

    expect(prismaMock.team.create).toHaveBeenCalledWith({ data: { name: "New", parentTeamId: A } });
  });

  it("refuses a parent that no longer exists", async () => {
    teamsAre([]);

    await expect(createTeam("New", A)).rejects.toThrow(TeamError);
    expect(prismaMock.team.create).not.toHaveBeenCalled();
  });
});

describe("updateTeam", () => {
  it("moves a team under another team", async () => {
    teamsAre([team(A), team(B)]);

    await updateTeam(B, { parentTeamId: A });

    expect(prismaMock.team.update).toHaveBeenCalledWith({ where: { id: B }, data: { name: undefined, parentTeamId: A } });
  });

  it("refuses to move a team under its own sub-team", async () => {
    teamsAre([team(A), team(B, A)]);

    await expect(updateTeam(A, { parentTeamId: B })).rejects.toThrow(TeamError);
    expect(prismaMock.team.update).not.toHaveBeenCalled();
  });

  it("refuses a parent that no longer exists", async () => {
    teamsAre([team(A)]);

    await expect(updateTeam(A, { parentTeamId: B })).rejects.toThrow("The parent team no longer exists.");
    expect(prismaMock.team.update).not.toHaveBeenCalled();
  });

  it("renames a team", async () => {
    teamsAre([team(A)]);

    await updateTeam(A, { name: " Renamed " });

    expect(prismaMock.team.update).toHaveBeenCalledWith({ where: { id: A }, data: { name: "Renamed", parentTeamId: undefined } });
  });
});

describe("memberCount", () => {
  it("counts members from User.teamIds, ignoring stale ids in Team.userIds", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(A, null, ["deleted-user", "u1"]), team(B)]);
    prismaMock.user.findMany.mockResolvedValue([{ teamIds: [A, B] }, { teamIds: [B] }]);

    const teams = await getAllTeamDTOs();

    expect(teams.map(t => [t.id, t.memberCount])).toEqual([[A, 1], [B, 2]]);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({ where: { teamIds: { hasSome: [A, B] } }, select: { teamIds: true } });
  });
});

describe("toTeamError", () => {
  it("keeps a TeamError", () => {
    const error = new TeamError("x");
    expect(toTeamError(error)).toBe(error);
  });

  it("turns a missing record into a friendly error", () => {
    expect(toTeamError(prismaError("P2025"))?.message).toBe("The team or user no longer exists.");
  });

  it("leaves other errors alone", () => {
    expect(toTeamError(prismaError("P2002"))).toBeUndefined();
    expect(toTeamError(prismaError("P2034"))).toBeUndefined();
    expect(toTeamError(new Error("boom"))).toBeUndefined();
  });
});
