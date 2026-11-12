import "server-only";
import { auth, Role } from "@/auth";
import { Prisma, Team } from "@/generated/prisma";
import { objectIdSchema } from "../objectid";
import prisma from "../prisma";
import { wouldCreateCycle } from "../team-tree";

export type TeamDTO = {
  id: string;
  name: string;
  parentTeamId?: string;
  memberCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export type TeamMemberDTO = {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export class TeamError extends Error { }

function prismaErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
}

/**
 * Turns an error from a team mutation into a {@link TeamError} the admin can be shown, or `undefined` when it
 * is unexpected.
 */
export function toTeamError(error: unknown): TeamError | undefined {
  if (error instanceof TeamError) {
    return error;
  }

  switch (prismaErrorCode(error)) {
    // Record not found: another admin deleted the team or user in the meantime
    case "P2025":
      return new TeamError("The team or user no longer exists.");
  }

  return undefined;
}

/**
 * Counts members from `User.teamIds`, the side the member list reads. `Team.userIds` may still hold ids of
 * users deleted before teams were cleaned up on user deletion.
 */
async function countMembers(teamIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (teamIds.length === 0) {
    return counts;
  }

  const users = await prisma.user.findMany({
    where: { teamIds: { hasSome: teamIds } },
    select: { teamIds: true },
  });
  for (const user of users) {
    for (const teamId of user.teamIds) {
      counts.set(teamId, (counts.get(teamId) ?? 0) + 1);
    }
  }

  return counts;
}

async function teamsToDTOs(teams: Team[]): Promise<TeamDTO[]> {
  const counts = await countMembers(teams.map(team => team.id));
  return teams.map(team => prismaTeamToDTO(team, counts.get(team.id) ?? 0));
}

export function prismaTeamToDTO(team: Team, memberCount: number): TeamDTO {
  return {
    id: team.id,
    name: team.name,
    parentTeamId: team.parentTeamId ?? undefined,
    memberCount,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

async function requireAdmin() {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  if (session.user.role !== Role.ADMIN) {
    throw new Error("Forbidden");
  }

  return session;
}

function assertValidId(id: string) {
  if (!objectIdSchema.safeParse(id).success) {
    throw new TeamError("Invalid team id.");
  }
}

function normalizeName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new TeamError("Team name cannot be empty.");
  }
  return trimmed;
}

export async function getTeamDTO(id: string): Promise<TeamDTO | null> {
  await requireAdmin();

  if (!objectIdSchema.safeParse(id).success) {
    return null;
  }

  const team = await prisma.team.findUnique({ where: { id } });
  return team ? (await teamsToDTOs([team]))[0] : null;
}

export async function getAllTeamDTOs(): Promise<TeamDTO[]> {
  await requireAdmin();

  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });
  return teamsToDTOs(teams);
}

export async function getTeamsForUser(userId: string): Promise<TeamDTO[] | undefined> {
  const session = await auth();
  if (!session || (session.user.id !== userId && session.user.role !== Role.ADMIN)) {
    return undefined;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { teams: { orderBy: { name: "asc" } } },
  });

  if (!user) {
    return undefined;
  }

  return teamsToDTOs(user.teams);
}

export async function getTeamMembers(teamId: string): Promise<TeamMemberDTO[]> {
  await requireAdmin();
  assertValidId(teamId);

  const users = await prisma.user.findMany({
    where: { teamIds: { has: teamId } },
    orderBy: { name: "asc" },
  });

  return users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? undefined,
  }));
}

export async function createTeam(name: string, parentTeamId?: string): Promise<TeamDTO> {
  await requireAdmin();

  if (parentTeamId) {
    assertValidId(parentTeamId);
    if (await prisma.team.count({ where: { id: parentTeamId } }) === 0) {
      throw new TeamError("The parent team no longer exists.");
    }
  }

  const team = await prisma.team.create({
    data: { name: normalizeName(name), parentTeamId },
  });

  return prismaTeamToDTO(team, 0);
}

export async function updateTeam(id: string, data: { name?: string; parentTeamId?: string | null }): Promise<TeamDTO> {
  await requireAdmin();
  assertValidId(id);

  if (data.parentTeamId) {
    const parentTeamId = data.parentTeamId;
    assertValidId(parentTeamId);

    const teams = await prisma.team.findMany({ select: { id: true, parentTeamId: true } });
    if (!teams.some(team => team.id === parentTeamId)) {
      throw new TeamError("The parent team no longer exists.");
    }
    const tree = teams.map(team => ({ id: team.id, parentTeamId: team.parentTeamId ?? undefined }));
    if (wouldCreateCycle(tree, id, parentTeamId)) {
      throw new TeamError("A team cannot be moved under itself or one of its sub-teams.");
    }
  }

  const team = await prisma.team.update({
    where: { id },
    data: {
      name: data.name === undefined ? undefined : normalizeName(data.name),
      parentTeamId: data.parentTeamId,
    },
  });

  return (await teamsToDTOs([team]))[0];
}

/** Deletes a team that has no sub-teams, and removes it from its members. */
export async function deleteTeam(id: string) {
  await requireAdmin();
  assertValidId(id);

  await prisma.$transaction(async (tx) => {
    if (await tx.team.count({ where: { parentTeamId: id } }) > 0) {
      throw new TeamError("Delete or move the sub-teams of this team first.");
    }

    const members = await tx.user.findMany({
      where: { teamIds: { has: id } },
      select: { id: true, teamIds: true },
    });
    for (const member of members) {
      await tx.user.update({
        where: { id: member.id },
        data: { teamIds: member.teamIds.filter(teamId => teamId !== id) },
      });
    }

    await tx.team.delete({ where: { id } });
  });
}

export async function addTeamMembers(teamId: string, userIds: string[]) {
  await requireAdmin();
  assertValidId(teamId);
  userIds.forEach(assertValidId);

  await prisma.team.update({
    where: { id: teamId },
    data: { users: { connect: userIds.map(id => ({ id })) } },
  });
}

export async function removeTeamMember(teamId: string, userId: string) {
  await requireAdmin();
  assertValidId(teamId);
  assertValidId(userId);

  await prisma.team.update({
    where: { id: teamId },
    data: { users: { disconnect: { id: userId } } },
  });
}

/**
 * Removes users from every team they belong to. On MongoDB, Prisma does not clear the ids that a deleted
 * user leaves in `Team.userIds`, so call this before deleting users.
 */
export async function removeUsersFromAllTeams(tx: Prisma.TransactionClient, userIds: string[]) {
  const teams = await tx.team.findMany({
    where: { userIds: { hasSome: userIds } },
    select: { id: true, userIds: true },
  });

  for (const team of teams) {
    await tx.team.update({
      where: { id: team.id },
      data: { userIds: team.userIds.filter(id => !userIds.includes(id)) },
    });
  }
}
