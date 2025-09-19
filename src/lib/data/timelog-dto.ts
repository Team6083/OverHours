import "server-only";
import { auth, Role } from "@/auth";
import { TimeLog } from "@/generated/prisma";
import prisma from "../prisma";

export type TimeLogDTO = {
  id: string;
  userId: string;

  status: "CURRENTLY_IN" | "DONE" | "LOCKED";
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
    status = "LOCKED";
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

  const session = await auth();
  if (!timeLog || (timeLog.userId !== session?.user.id && session?.user.role !== Role.ADMIN)) {
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

export async function getAllTimelogDTOs(userId?: string): Promise<TimeLogDTO[]> {
  const session = await auth();

  if (!session) {
    return [];
  }

  if (session.user.role !== Role.ADMIN && (!userId || userId !== session.user.id)) {
    return [];
  }

  const timeLogs = await prisma.timeLog.findMany({
    where: userId ? { userId } : {},
    orderBy: { inTime: "desc" },
  });

  return timeLogs.map(prismaTimeLogToDTO);
}

export type UserClockStatus = {
  isClockedin: boolean;
  currentLog?: TimeLogDTO;
  rank: number;
  totalTimeSec: number;
}

export async function getAllUsersTotalTimeSec(): Promise<{ [userId: string]: number }> {
  const result = await prisma.timeLog.aggregateRaw({
    pipeline: [
      {
        $match: {
          status: "Done",
        }
      },
      {
        $addFields: {
          duration: {
            $subtract: ["$outTime", "$inTime"]
          }
        }
      },
      {
        $group: {
          _id: "$userId",
          totalDuration: { $sum: "$duration" },
        }
      },
      {
        $sort: {
          totalDuration: -1
        }
      }
    ]
  });

  if (Array.isArray(result) && result.length > 0) {
    return Object.fromEntries(result.map((v) => [v._id["$oid"], Math.round(v.totalDuration as number / 1000)]));
  }

  return {};
}

export async function getUserCurrentLogDTO(userId: string): Promise<TimeLogDTO | null> {
  const session = await auth();
  if (session?.user.id !== userId && session?.user.role !== Role.ADMIN) {
    return null;
  }

  const lastLog = await prisma.timeLog.findFirst({
    where: { userId, status: "CurrentlyIn" },
    orderBy: { inTime: "desc" },
  });

  if (!lastLog) {
    return null;
  }

  return prismaTimeLogToDTO(lastLog);
}

export async function clockIn(userId: string): Promise<TimeLogDTO> {
  const session = await auth();
  if (session?.user.id !== userId && session?.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized");
  }

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
  const session = await auth();
  if (session?.user.id !== userId && session?.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized");
  }

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

export async function adminClockOut(timeLogId: string, notes?: string): Promise<TimeLogDTO> {
  const session = await auth();
  if (session?.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized");
  }

  // Find the time log
  const existingTimeLog = await prisma.timeLog.findUnique({
    where: { id: timeLogId },
  });

  if (!existingTimeLog) {
    throw new Error("No time log found");
  }

  if (existingTimeLog.status !== "CurrentlyIn") {
    throw new Error("Time log is not currently in");
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

export async function adminLockLog(timeLogId: string, notes?: string): Promise<TimeLogDTO> {
  const session = await auth();
  if (session?.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized");
  }

  // Find the time log
  const existingTimeLog = await prisma.timeLog.findUnique({
    where: { id: timeLogId },
  });

  if (!existingTimeLog) {
    throw new Error("No time log found");
  }

  if (existingTimeLog.status !== "CurrentlyIn") {
    throw new Error("Only done time logs can be locked");
  }

  const updatedTimeLog = await prisma.timeLog.update({
    where: { id: existingTimeLog.id },
    data: {
      status: "Locked",
      outTime: new Date(),
      notes: notes || existingTimeLog.notes,
    },
  });

  return prismaTimeLogToDTO(updatedTimeLog);
}

export async function createTimeLog(data: {
  userId: string;
  status: TimeLogDTO["status"];
  inTime: Date;
  outTime?: Date;
  notes: string | null;
}): Promise<TimeLogDTO> {
  const session = await auth();
  if (session?.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized");
  }

  const status = data.status === "CURRENTLY_IN"
    ? "CurrentlyIn"
    : (data.status === "DONE"
      ? "Done"
      : "Locked"
    );

  if (data.status !== "CURRENTLY_IN" && !data.outTime) {
    throw new Error("Out time is required for DONE or LOCKED status");
  }

  if (data.outTime && data.outTime <= data.inTime) {
    throw new Error("Out time must be after in time");
  }

  const result = await prisma.timeLog.create({
    data: {
      userId: data.userId,
      status,
      inTime: data.inTime,
      outTime: data.outTime,
      notes: data.notes,
    }
  });

  return prismaTimeLogToDTO(result);
}

export async function updateTimeLog(timeLogId: string, data: {
  userId: string;
  status: TimeLogDTO["status"];
  inTime: Date;
  outTime?: Date;
  notes: string | null;
}): Promise<TimeLogDTO> {
  const session = await auth();
  if (session?.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized");
  }

  const status = data.status === "CURRENTLY_IN"
    ? "CurrentlyIn"
    : (data.status === "DONE"
      ? "Done"
      : "Locked"
    );

  if (data.status !== "CURRENTLY_IN" && !data.outTime) {
    throw new Error("Out time is required for DONE or LOCKED status");
  }

  if (data.outTime && data.outTime <= data.inTime) {
    throw new Error("Out time must be after in time");
  }

  const result = await prisma.timeLog.update({
    where: { id: timeLogId },
    data: {
      userId: data.userId,
      status,
      inTime: data.inTime,
      outTime: data.outTime,
      notes: data.notes,
    }
  });

  return prismaTimeLogToDTO(result);
}

export async function deleteTimeLog(timeLogId: string): Promise<TimeLogDTO> {
  const session = await auth();
  if (session?.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized");
  }

  const timeLog = await prisma.timeLog.delete({
    where: { id: timeLogId },
  });

  return prismaTimeLogToDTO(timeLog);
}

export async function deleteTimeLogs(timeLogIds: string[]) {
  const session = await auth();
  if (session?.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized");
  }

  const payload = await prisma.timeLog.deleteMany({
    where: { id: { in: timeLogIds } },
  });

  return payload;
} 
