import "server-only";
import prisma from "../prisma";
import { TimeLog } from "@/generated/prisma";

export type TimeLogDTO = {
  id: string;
  userId: string;

  status: "CURRENTLY_IN" | "DONE" | "CANCELLED";
  inTime: Date;
  outTime?: Date;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
};

function prismaTimeLogToDTO(timeLog: TimeLog): TimeLogDTO {
  let status: TimeLogDTO["status"];
  if (timeLog.status === "CurrentlyIn") {
    status = "CURRENTLY_IN";
  } else if (timeLog.status === "Done") {
    status = "DONE";
  } else if (timeLog.status === "Locked") {
    status = "CANCELLED";
  } else {
    throw new Error("Unknown TimeLog status");
  }

  return {
    id: timeLog.id,
    userId: timeLog.userId,
    status,
    inTime: timeLog.inTime,
    outTime: timeLog.outTime ?? undefined,
    notes: timeLog.notes || undefined,
    createdAt: timeLog.createdAt,
    updatedAt: timeLog.updatedAt,
  };
}

export async function getTimelogDTO(id: string): Promise<TimeLogDTO | null> {
  const timeLog = await prisma.timeLog.findUnique({
    where: { id },
  });

  if (!timeLog) {
    return null;
  }

  return prismaTimeLogToDTO(timeLog);
}

export async function getAllCurrentlyInTimelogDTOs(): Promise<TimeLogDTO[]> {
  const timeLogs = await prisma.timeLog.findMany({
    where: { status: "CurrentlyIn" },
    orderBy: { inTime: "desc" },
  });

  return timeLogs.map(prismaTimeLogToDTO);
}

export async function getAllTimelogDTOsForUser(userId: string): Promise<TimeLogDTO[]> {
  const timeLogs = await prisma.timeLog.findMany({
    where: { userId },
    orderBy: { inTime: "desc" },
  });

  return timeLogs.map(prismaTimeLogToDTO);
}

export async function clockIn(userId: string): Promise<TimeLogDTO> {
  // Check if user already has a currently in time log
  const existingTimeLog = await prisma.timeLog.findFirst({
    where: {
      userId,
      status: "CurrentlyIn",
    },
  });

  if (existingTimeLog) {
    throw new Error("User already has a currently in time log");
  }

  const newTimeLog = await prisma.timeLog.create({
    data: {
      userId,
      status: "CurrentlyIn",
      inTime: new Date(),
    },
  });

  return prismaTimeLogToDTO(newTimeLog);
}

export async function clockOut(userId: string, notes?: string): Promise<TimeLogDTO> {
  // Find the currently in time log
  const existingTimeLog = await prisma.timeLog.findFirst({
    where: {
      userId,
      status: "CurrentlyIn",
    },
  });

  if (!existingTimeLog) {
    throw new Error("No currently in time log found for user");
  }

  const updatedTimeLog = await prisma.timeLog.update({
    where: { id: existingTimeLog.id },
    data: {
      status: "Done",
      outTime: new Date(),
      notes: notes || existingTimeLog.notes,
    },
  });

  return prismaTimeLogToDTO(updatedTimeLog);
}
