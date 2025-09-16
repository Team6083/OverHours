import "server-only";

import { User } from "@/generated/prisma";
import prisma from "../prisma";

export type UserDTO = {
  id: string;

  email: string;
  name: string;

  createdAt: Date;
  updatedAt: Date;
}

function prismaUserToDTO(user: User): UserDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  };
}

export async function getUserDTO(id: string): Promise<UserDTO | null> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    return null;
  }

  return prismaUserToDTO(user);
}

export async function getAllUserDTOs(): Promise<UserDTO[]> {
  const users = await prisma.user.findMany({});

  return users.map(prismaUserToDTO);
}
