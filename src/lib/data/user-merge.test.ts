import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "admin", role: "admin" } })),
  Role: { ADMIN: "admin", USER: "user" },
}));
const prismaMock = vi.hoisted(() => {
  const mock = {
    user: { findMany: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    team: { findMany: vi.fn(), update: vi.fn() },
    timeLog: { findMany: vi.fn(), updateMany: vi.fn() },
    attendanceEntry: { findMany: vi.fn(), updateMany: vi.fn() },
    account: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  };
  mock.$transaction.mockImplementation((fn: (tx: typeof mock) => unknown) => fn(mock));
  return mock;
});
vi.mock("../prisma", () => ({ default: prismaMock }));

import { MergeUsersError, mergeUsers } from "./user-merge";

// Valid ObjectIds
const KEPT = "000000000000000000000001";
const MERGED = "000000000000000000000002";
const T1 = "0000000000000000000000a1";
const T2 = "0000000000000000000000a2";
const T3 = "0000000000000000000000a3";
const T4 = "0000000000000000000000a4";
const OTHER = "0000000000000000000000a9";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findMany.mockResolvedValue([
    { id: KEPT, teamIds: [T1, T2], roleTeamIds: [T2] },
    { id: MERGED, teamIds: [T2, T3], roleTeamIds: [T3] },
  ]);
  prismaMock.team.findMany.mockImplementation(async ({ where }: { where: { id?: { in: string[] } } }) =>
    (where.id?.in ?? [T1, T2, T3, T4]).filter(id => [T1, T2, T3, T4].includes(id)).map(id => ({ id, userIds: [] })));
  prismaMock.timeLog.findMany.mockResolvedValue([]);
  prismaMock.attendanceEntry.findMany.mockResolvedValue([]);
});

describe("mergeUsers teams", () => {
  it("keeps the teams that were not dropped with their source and drops the others", async () => {
    await mergeUsers(KEPT, [KEPT, MERGED], [T1]);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: KEPT },
      data: {
        teams: { connect: [{ id: T3 }], disconnect: [{ id: T1 }] },
        // T2: joined by hand by the merged user; T3: by role only
        roleTeamIds: [T3],
      },
    });
    expect(prismaMock.user.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [MERGED] } } });
  });

  it("keeps a team the users joined after the page loaded", async () => {
    // T4 was joined by the merged user after the admin loaded the page, so it was never shown or unticked
    prismaMock.user.findMany.mockResolvedValue([
      { id: KEPT, teamIds: [T1, T2], roleTeamIds: [T2] },
      { id: MERGED, teamIds: [T2, T3, T4], roleTeamIds: [T3] },
    ]);

    await mergeUsers(KEPT, [KEPT, MERGED], [T1]);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: KEPT },
      data: {
        teams: { connect: [{ id: T3 }, { id: T4 }], disconnect: [{ id: T1 }] },
        roleTeamIds: [T3],
      },
    });
  });

  it("ignores a dropped team that is no longer a team of the selected users", async () => {
    await mergeUsers(KEPT, [KEPT, MERGED], [OTHER]);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: KEPT },
      data: {
        teams: { connect: [{ id: T3 }], disconnect: [] },
        roleTeamIds: [T3],
      },
    });
  });

  it("skips stale ids of deleted teams", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: KEPT, teamIds: [T1, T2], roleTeamIds: [T2] },
      { id: MERGED, teamIds: [T2, T3, OTHER], roleTeamIds: [T3] },
    ]);

    await mergeUsers(KEPT, [KEPT, MERGED], []);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: KEPT },
      data: {
        teams: { connect: [{ id: T3 }], disconnect: [] },
        roleTeamIds: [T3],
      },
    });
  });

  it("refuses team ids that are not ids", async () => {
    await expect(mergeUsers(KEPT, [KEPT, MERGED], ["nope"])).rejects.toBeInstanceOf(MergeUsersError);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
