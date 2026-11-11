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
const OTHER = "0000000000000000000000a9";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findMany.mockResolvedValue([
    { id: KEPT, teamIds: [T1, T2], roleTeamIds: [T2] },
    { id: MERGED, teamIds: [T2, T3], roleTeamIds: [T3] },
  ]);
  prismaMock.team.findMany.mockImplementation(async ({ where }: { where: { id?: { in: string[] } } }) =>
    (where.id?.in ?? [T1, T2, T3]).filter(id => [T1, T2, T3].includes(id)).map(id => ({ id, userIds: [] })));
  prismaMock.timeLog.findMany.mockResolvedValue([]);
  prismaMock.attendanceEntry.findMany.mockResolvedValue([]);
});

describe("mergeUsers teams", () => {
  it("keeps the chosen teams with their source and drops the others", async () => {
    await mergeUsers(KEPT, [KEPT, MERGED], [T2, T3]);

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

  it("refuses a team that is not a team of the merged users", async () => {
    await expect(mergeUsers(KEPT, [KEPT, MERGED], [T1, OTHER])).rejects.toBeInstanceOf(MergeUsersError);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.user.deleteMany).not.toHaveBeenCalled();
  });

  it("refuses team ids that are not ids", async () => {
    await expect(mergeUsers(KEPT, [KEPT, MERGED], ["nope"])).rejects.toBeInstanceOf(MergeUsersError);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
