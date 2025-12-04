import { auth, Role } from "@/auth";
import { Team } from "@/generated/prisma";
import prisma from "../prisma";

export type TeamDTO = {
  id: string;
  name: string;
}

export function prismaTeamToDTO(team: Team): TeamDTO {
  return {
    id: team.id,
    name: team.name,
  };
}

export async function getTeamDTO(id: string): Promise<TeamDTO | null> {
  const team = await prisma.team.findUnique({
    where: { id },
  });

  if (!team) {
    return null;
  }

  return prismaTeamToDTO(team);
}

export async function getAllTeamDTOs(): Promise<TeamDTO[]> {
  const teams = await prisma.team.findMany({});

  return teams.map(prismaTeamToDTO);
}

export async function getTeamsForUser(userId: string): Promise<TeamDTO[] | undefined> {
  const session = await getAuthSession();
  if (!session || (session.user.id !== userId && session.user.role !== Role.ADMIN)) {
    return undefined;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { teams: true },
  });

  if (!user) {
    return undefined;
  }

  return user.teams.map(prismaTeamToDTO);
}

export async function createTeam(name: string): Promise<TeamDTO> {
  const session = await getAuthSession();
  if (!session || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized");
  }

  const team = await prisma.team.create({
    data: { name },
  });

  return prismaTeamToDTO(team);
}

export async function updateTeam(id: string, data: { name: string }): Promise<TeamDTO | null> {
  const session = await getAuthSession();
  if (!session || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized");
  }

  const team = await prisma.team.update({
    where: { id },
    data: {
      name: data.name,
    },
  });

  return prismaTeamToDTO(team);
}

export async function deleteTeam(id: string) {
  const session = await getAuthSession();
  if (!session || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized");
  }

  return prisma.team.delete({
    where: { id },
  });
}
