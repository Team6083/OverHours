import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "admin", role: "admin" } })),
  Role: { ADMIN: "admin", USER: "user" },
}));
const prismaMock = vi.hoisted(() => {
  const mock = {
    team: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    user: { findMany: vi.fn() },
    $transaction: vi.fn(),
  };
  // Interactive transactions run against the same mock
  mock.$transaction.mockImplementation((fn: (tx: typeof mock) => unknown) => fn(mock));
  return mock;
});
vi.mock("../prisma", () => ({ default: prismaMock }));

import { TeamError, createTeam, getAllTeamDTOs, toTeamError, updateTeam } from "./team-dto";

// Valid ObjectIds
const A = "000000000000000000000001";
const B = "000000000000000000000002";
const C = "000000000000000000000003";

const prismaError = (code: string) => Object.assign(new Error(code), { code });

const team = (id: string, parentTeamId: string | null = null, userIds: string[] = []) => ({
  id, name: `Team ${id}`, parentTeamId, userIds, createdAt: new Date(0), updatedAt: new Date(0),
});

// Resolves `team.findMany` and `team.update` against these teams, and `team.updateMany` by matching ids
function teamsAre(teams: ReturnType<typeof team>[]) {
  prismaMock.team.findMany.mockResolvedValue(teams);
  prismaMock.team.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: object }) =>
    ({ ...teams.find(t => t.id === where.id)!, ...data }));
  prismaMock.team.updateMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) =>
    ({ count: where.id.in.filter(id => teams.some(t => t.id === id)).length }));
}

/** The ids of every team a move writes: the touched teams and the moved team itself. */
function writtenTeamIds() {
  const touched = prismaMock.team.updateMany.mock.calls.flatMap(([args]) => args.where.id.in as string[]);
  const updated = prismaMock.team.update.mock.calls.map(([args]) => args.where.id as string);
  return new Set([...touched, ...updated]);
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findMany.mockResolvedValue([]);
});

describe("createTeam", () => {
  it("writes the parent in the same transaction, so a concurrent delete of it conflicts", async () => {
    teamsAre([team(A)]);
    prismaMock.team.create.mockResolvedValue(team(B, A));

    await createTeam("New", A);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.team.updateMany).toHaveBeenCalledWith({ where: { id: { in: [A] } }, data: { updatedAt: expect.any(Date) } });
    expect(prismaMock.team.create).toHaveBeenCalledWith({ data: { name: "New", parentTeamId: A } });
  });

  it("refuses a parent that no longer exists", async () => {
    teamsAre([]);

    await expect(createTeam("New", A)).rejects.toThrow(TeamError);
    expect(prismaMock.team.create).not.toHaveBeenCalled();
  });

  it("does not touch any team for a top-level team", async () => {
    prismaMock.team.create.mockResolvedValue(team(A));

    await createTeam("New");

    expect(prismaMock.team.updateMany).not.toHaveBeenCalled();
  });
});

describe("updateTeam", () => {
  it("writes the new parent and its ancestors with the move, in one transaction", async () => {
    // C is under B, which is under A; move a fresh team under C
    const D = "000000000000000000000004";
    teamsAre([team(A), team(B, A), team(C, B), team(D)]);

    await updateTeam(D, { parentTeamId: C });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.team.updateMany).toHaveBeenCalledWith({ where: { id: { in: [C, B, A] } }, data: { updatedAt: expect.any(Date) } });
    expect(prismaMock.team.update).toHaveBeenCalledWith({ where: { id: D }, data: { name: undefined, parentTeamId: C } });
  });

  it("makes opposite concurrent moves write a common team, so one of them fails", async () => {
    const snapshot = [team(A), team(B)];

    teamsAre(snapshot);
    await updateTeam(A, { parentTeamId: B });
    const first = writtenTeamIds();

    vi.clearAllMocks();
    prismaMock.user.findMany.mockResolvedValue([]);
    teamsAre(snapshot);
    await updateTeam(B, { parentTeamId: A });
    const second = writtenTeamIds();

    expect([...first].some(id => second.has(id))).toBe(true);
  });

  it("makes moves that close a longer cycle write a common team", async () => {
    // B is under A. Moving A under C while C moves under B would form A -> C -> B -> A.
    const snapshot = [team(A), team(B, A), team(C)];

    teamsAre(snapshot);
    await updateTeam(A, { parentTeamId: C });
    const first = writtenTeamIds();

    vi.clearAllMocks();
    prismaMock.user.findMany.mockResolvedValue([]);
    teamsAre(snapshot);
    await updateTeam(C, { parentTeamId: B });
    const second = writtenTeamIds();

    expect([...first].some(id => second.has(id))).toBe(true);
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

  it("does not touch other teams for a rename", async () => {
    teamsAre([team(A)]);

    await updateTeam(A, { name: " Renamed " });

    expect(prismaMock.team.updateMany).not.toHaveBeenCalled();
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

  it("asks to retry after a write conflict", () => {
    expect(toTeamError(prismaError("P2034"))?.message).toMatch(/try again/);
  });

  it("leaves other errors alone", () => {
    expect(toTeamError(prismaError("P2002"))).toBeUndefined();
    expect(toTeamError(new Error("boom"))).toBeUndefined();
  });
});
