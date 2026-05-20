import "server-only";
import { auth, Role } from "@/auth";
import { StatRange } from "@/generated/prisma";
import prisma from "../prisma";

export type StatRangeDTO = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
}

export function prismaStatRangeToDTO(statRange: StatRange): StatRangeDTO {
  let status: StatRangeDTO["status"];
  if (statRange.status === "Active") {
    status = "ACTIVE";
  } else if (statRange.status === "Archived") {
    status = "ARCHIVED";
  } else {
    throw new Error("Unknown StatRange status");
  }

  return {
    id: statRange.id,
    name: statRange.name,
    startDate: new Date(statRange.startDate),
    endDate: new Date(statRange.endDate),
    status,
    createdAt: new Date(statRange.createdAt),
    updatedAt: new Date(statRange.updatedAt),
  };
}

export async function getStatRangeDTO(id: string): Promise<StatRangeDTO | null> {
  const session = await auth();

  if (!session || session.user.role !== Role.ADMIN) {
    return null;
  }

  const statRange = await prisma.statRange.findUnique({
    where: { id },
  });

  if (!statRange) {
    return null;
  }

  return prismaStatRangeToDTO(statRange);
}

export async function getAllStatRangeDTOs(): Promise<StatRangeDTO[]> {
  const session = await auth();

  if (!session || session.user.role !== Role.ADMIN) {
    return [];
  }

  const statRanges = await prisma.statRange.findMany({
    orderBy: { startDate: "desc" },
  });

  return statRanges.map(prismaStatRangeToDTO);
}

export async function getActiveStatRangeDTOs(): Promise<StatRangeDTO[]> {
  const session = await auth();

  if (!session) {
    return [];
  }

  const statRanges = await prisma.statRange.findMany({
    where: { status: "Active" },
    orderBy: { startDate: "desc" },
  });

  return statRanges.map(prismaStatRangeToDTO);
}

export async function createStatRange(data: {
  name: string;
  startDate: Date;
  endDate: Date;
  status: StatRangeDTO["status"];
}): Promise<StatRangeDTO> {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  if (session.user.role !== Role.ADMIN) {
    throw new Error("Forbidden");
  }

  const statRange = await prisma.statRange.create({
    data: {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status === "ACTIVE" ? "Active" : "Archived",
    },
  });

  return prismaStatRangeToDTO(statRange);
}

export async function updateStatRange(id: string, data: {
  name: string;
  startDate: Date;
  endDate: Date;
  status: StatRangeDTO["status"];
}): Promise<StatRangeDTO | null> {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  if (session.user.role !== Role.ADMIN) {
    throw new Error("Forbidden");
  }

  const statRange = await prisma.statRange.update({
    where: { id },
    data: {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status === "ACTIVE" ? "Active" : "Archived",
    },
  });

  if (!statRange) {
    return null;
  }

  return prismaStatRangeToDTO(statRange);
}

export async function deleteStatRange(id: string): Promise<StatRangeDTO> {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  if (session.user.role !== Role.ADMIN) {
    throw new Error("Forbidden");
  }

  const statRange = await prisma.statRange.delete({
    where: { id },
  });

  return prismaStatRangeToDTO(statRange);
}

export async function deleteStatRanges(ids: string[]) {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  if (session.user.role !== Role.ADMIN) {
    throw new Error("Forbidden");
  }

  const payload = await prisma.statRange.deleteMany({
    where: { id: { in: ids } },
  });

  return payload;
}
