import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "admin", role: "admin" } })),
  Role: { ADMIN: "admin", USER: "user" },
}));
const prismaMock = vi.hoisted(() => {
  const mock = {
    team: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
    user: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  };
  // Interactive transactions run against the same mock
  mock.$transaction.mockImplementation((fn: (tx: typeof mock) => unknown) => fn(mock));
  return mock;
});
vi.mock("../prisma", () => ({ default: prismaMock }));

import {
  TeamError, createTeam, getAllTeamDTOs, getTeamMembers, removeTeamMember, toTeamError, updateTeam,
} from "./team-dto";

// Valid ObjectIds
const A = "000000000000000000000001";
const B = "000000000000000000000002";
const C = "000000000000000000000003";
const U = "000000000000000000000011";

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

  it("saves the auto-join roles", async () => {
    teamsAre([team(A)]);

    await updateTeam(A, { autoJoinRoles: "frc-ce, overhours:mentor, frc-ce" });

    expect(prismaMock.team.update).toHaveBeenCalledWith({
      where: { id: A },
      data: { name: undefined, parentTeamId: undefined, autoJoinRoles: ["frc-ce", "overhours:mentor"] },
    });
  });

  it("refuses an invalid auto-join role", async () => {
    teamsAre([team(A)]);

    await expect(updateTeam(A, { autoJoinRoles: ["bad role"] })).rejects.toThrow(TeamError);
    expect(prismaMock.team.update).not.toHaveBeenCalled();
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

  it("counts each member of a sub-team once in every ancestor", async () => {
    teamsAre([team(A), team(B, A), team(C, B)]);
    prismaMock.user.findMany.mockResolvedValue([{ teamIds: [A, B] }, { teamIds: [C] }, { teamIds: [B] }]);

    const teams = await getAllTeamDTOs();

    expect(teams.map(t => [t.id, t.memberCount])).toEqual([[A, 3], [B, 3], [C, 1]]);
    expect(prismaMock.user.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({ where: { teamIds: { hasSome: [A, B, C] } }, select: { teamIds: true } });
  });
});

const user = (id: string, name: string, teamIds: string[], roleTeamIds: string[] = []) => ({
  id, name, email: `${name}@x`, image: null, teamIds, roleTeamIds,
});

describe("getTeamMembers", () => {
  it("lists direct members and members of sub-teams at any depth, with role membership of this team only", async () => {
    teamsAre([team(A), team(B, A), team(C, B)]);
    prismaMock.user.findMany.mockResolvedValue([
      user("u1", "Direct", [A], [A]),
      user("u2", "Both", [A, B]),
      user("u3", "Grandchild", [C], [C]),
    ]);

    const members = await getTeamMembers(A);

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: { teamIds: { hasSome: [A, B, C] } },
      orderBy: { name: "asc" },
    });
    expect(members.map(m => [m.id, m.direct, m.viaRole, m.viaTeams.map(t => t.name)])).toEqual([
      ["u1", true, true, []],
      ["u2", true, false, [`Team ${B}`]],
      ["u3", false, false, [`Team ${C}`]],
    ]);
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

describe("removeTeamMember", () => {
  // A client of its own, so that reading or writing outside the transaction fails these tests
  const tx = {
    team: { findMany: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
  };

  beforeEach(() => {
    tx.team.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementationOnce((fn: (client: typeof tx) => unknown) => fn(tx));
  });

  function expectNoGlobalClientCalls() {
    expect(prismaMock.team.findMany).not.toHaveBeenCalled();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  }

  it("removes a member who joined by role, clearing the team from both lists", async () => {
    tx.user.findUnique.mockResolvedValue({ teamIds: [A, B], roleTeamIds: [A, B] });

    await removeTeamMember(A, C);

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: C },
      data: { teams: { disconnect: { id: A } }, roleTeamIds: [B] },
    });
    expectNoGlobalClientCalls();
  });

  it("removes a member added by hand", async () => {
    tx.user.findUnique.mockResolvedValue({ teamIds: [A, B], roleTeamIds: [B] });

    await removeTeamMember(A, C);

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: C },
      data: { teams: { disconnect: { id: A } }, roleTeamIds: [B] },
    });
    expectNoGlobalClientCalls();
  });

  it("refuses a member who is only in a sub-team, even one who joined it by role", async () => {
    // Only the transaction sees the sub-team, so a tree read through the global client finds none
    tx.team.findMany.mockResolvedValue([team(A), team(B, A)]);
    prismaMock.team.findMany.mockResolvedValue([team(A)]);
    tx.user.findUnique.mockResolvedValue({ teamIds: [B], roleTeamIds: [B] });

    await expect(removeTeamMember(A, U)).rejects.toThrow(`member through "Team ${B}"`);
    expect(tx.user.update).not.toHaveBeenCalled();
    expectNoGlobalClientCalls();
  });

  it("reports a user that no longer exists", async () => {
    tx.user.findUnique.mockResolvedValue(null);

    await expect(removeTeamMember(A, C)).rejects.toBeInstanceOf(TeamError);
    expect(tx.user.update).not.toHaveBeenCalled();
    expectNoGlobalClientCalls();
  });
});
