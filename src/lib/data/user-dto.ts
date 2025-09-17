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

export function prismaUserToDTO(user: User): UserDTO {
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

export async function getAllUserNames(): Promise<{ id: string; name: string }[]> {
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
  });

  return users.map(user => ({ id: user.id, name: user.name }));
}

export async function createUser(data: {
  email: string;
  name: string;
}): Promise<UserDTO> {
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
    },
  });

  return prismaUserToDTO(user);
}

export async function updateUser(id: string, data: {
  email: string;
  name: string;
}): Promise<UserDTO | null> {
  const user = await prisma.user.update({
    where: { id },
    data: {
      email: data.email,
      name: data.name,
    },
  });

  if (!user) {
    return null;
  }

  return prismaUserToDTO(user);
}

export async function deleteUser(id: string): Promise<UserDTO> {
  const user = await prisma.user.delete({
    where: { id },
  });

  return prismaUserToDTO(user);
}

export async function deleteUsers(ids: string[]) {
  const payload = await prisma.user.deleteMany({
    where: { id: { in: ids } },
  });

  return payload;
}
