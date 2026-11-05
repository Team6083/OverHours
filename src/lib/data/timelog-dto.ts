import "server-only";
import { auth, Role } from "@/auth";
import { Prisma, TimeLog } from "@/generated/prisma";
import prisma from "../prisma";
import { autoLockData, getPassedCutoff } from "./auto-lock";
import { toApiLockReason } from "./locked-export";

export type TimeLogDTO = {
  id: string;
  userId: string;

  status: "CURRENTLY_IN" | "DONE" | "LOCKED";
  inTime: Date;
  outTime?: Date;
  notes?: string;

  /** Why the log was locked; absent on logs locked before this was recorded. */
  lockReason?: "AUTO_TIMEOUT" | "ADMIN";
  lockedAt?: Date;
  /** Admin who locked the log; absent for automatic and Admin API locks. */
  lockedById?: string;

  createdAt: Date;
  updatedAt: Date;
}

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
    lockReason: toApiLockReason(timeLog.lockReason),
    lockedAt: timeLog.lockedAt ?? undefined,
    lockedById: timeLog.lockedById ?? undefined,
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

export type GetAllTimelogDTOsOptions = {
  userId: string;
  startTime: Date;
  endTime: Date;
  status: TimeLogDTO["status"]
}

export async function getAllTimelogDTOs(opts?: Partial<GetAllTimelogDTOsOptions>): Promise<TimeLogDTO[]> {
  const { userId, startTime, endTime, status } = opts || {};

  const session = await auth();

  if (!session) {
    return [];
  }

  if (session.user.role !== Role.ADMIN && (!userId || userId !== session.user.id)) {
    return [];
  }

  const where: Prisma.TimeLogWhereInput = {};

  if (userId) {
    where.userId = userId;
  }

  if (startTime || endTime) {
    where.OR = [
      {
        inTime: {
          gte: startTime,
          lt: endTime,
        },
      },
      {
        outTime: {
          gte: startTime,
          lt: endTime,
        },
      },
    ];
  }

  if (status) {
    if (status === "CURRENTLY_IN") {
      where.status = "CurrentlyIn";
    } else if (status === "DONE") {
      where.status = "Done";
    } else if (status === "LOCKED") {
      where.status = "Locked";
    }
  }

  const timeLogs = await prisma.timeLog.findMany({
    where,
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

export async function getAllUsersTotalTimeSec(opts?: {
  startDate?: Date;
  endDate?: Date;
}): Promise<{ [userId: string]: number }> {
  const { startDate, endDate } = opts || {};

  const matchStage: { status: string; $expr?: Prisma.InputJsonObject } = {
    status: "Done",
  };

  // Add date range filter if provided
  // A time log overlaps with the date range if:
  // - It starts before the range ends AND ends after the range starts
  if (startDate && endDate) {
    // Convert to Date objects if they're strings (from client serialization)
    const start = new Date(startDate);
    // Add one day to endDate to make it inclusive (since endDate is typically start of day)
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1); // Move to start of next day to include all of endDate

    // Use MongoDB extended JSON format for dates in aggregateRaw
    matchStage["$expr"] = {
      $and: [
        { $lt: ["$inTime", { $dateFromString: { dateString: end.toISOString() } }] },
        { $gte: ["$outTime", { $dateFromString: { dateString: start.toISOString() } }] },
      ]
    };
  } else if (startDate) {
    const start = new Date(startDate);

    matchStage["$expr"] = {
      $gte: ["$outTime", { $dateFromString: { dateString: start.toISOString() } }]
    };
  } else if (endDate) {
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1); // Make it inclusive

    matchStage["$expr"] = {
      $lt: ["$inTime", { $dateFromString: { dateString: end.toISOString() } }]
    };
  }

  const result = await prisma.timeLog.aggregateRaw({
    pipeline: [
      {
        $match: matchStage,
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

export async function getUserLastLogDTO(userId: string): Promise<TimeLogDTO | null> {
  const session = await auth();
  if (session?.user.id !== userId && session?.user.role !== Role.ADMIN) {
    return null;
  }

  const lastLog = await prisma.timeLog.findFirst({
    where: { userId },
    orderBy: { inTime: "desc" },
  });

  if (!lastLog) {
    return null;
  }

  return prismaTimeLogToDTO(lastLog);
}

export class AlreadyClockedInError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlreadyClockedInError";
  }
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
    throw new AlreadyClockedInError("User already has a currently in time log");
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

export async function getTimeLogMinDurationSec(): Promise<number> {
  const envVar = process.env.OVERHOURS_TIMELOG_MIN_DURATION_SEC;
  const minDurationSec = envVar ? parseInt(envVar, 10) : 0;

  return isNaN(minDurationSec) ? 0 : minDurationSec;
}

export class NotClockedInError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotClockedInError";
  }
}

export class AutoLockedError extends Error {
  constructor(message: string, public cutoff?: Date) {
    super(message);
    this.name = "AutoLockedError";
  }
}

export class TimeLogTooShortError extends Error {
  constructor(message: string, public minDurationSec: number) {
    super(message);
    this.name = "TimeLogTooShortError";
  }
}

/**
 * Close a clocked-in log at `now`. A log that has passed its daily cut-off is locked at the cut-off
 * instead of being closed as Done. Writes are conditional on the log still being clocked in, so a
 * concurrent clock-out or scheduled auto-lock cannot be overwritten; returns null if the log was no
 * longer clocked in.
 */
async function closeCurrentlyInLog(
  log: TimeLog,
  opts: { now: Date; notes?: string; minDurationSec?: number },
): Promise<{ result: "done" | "locked" | "tooShort"; log: TimeLog | null; cutoff?: Date }> {
  const { now, notes, minDurationSec = 0 } = opts;
  const where = { id: log.id, status: "CurrentlyIn" as const };
  const notesValue = notes || log.notes;

  const cutoff = getPassedCutoff(log.inTime, now);
  if (cutoff) {
    const { count } = await prisma.timeLog.updateMany({
      where, data: { ...autoLockData(cutoff, now), notes: notesValue },
    });
    return { result: "locked", cutoff, log: count > 0 ? await prisma.timeLog.findUnique({ where: { id: log.id } }) : null };
  }

  if ((now.getTime() - log.inTime.getTime()) / 1000 < minDurationSec) {
    const { count } = await prisma.timeLog.deleteMany({ where });
    return { result: "tooShort", log: count > 0 ? log : null };
  }

  const { count } = await prisma.timeLog.updateMany({
    where, data: { status: "Done", outTime: now, notes: notesValue },
  });
  return { result: "done", log: count > 0 ? await prisma.timeLog.findUnique({ where: { id: log.id } }) : null };
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
    // A scheduled auto-lock may have locked the session before the user clocked out
    const lastLog = await prisma.timeLog.findFirst({ where: { userId }, orderBy: { inTime: "desc" } });
    if (lastLog?.status === "Locked" && lastLog.lockReason === "AutoTimeout") {
      throw new AutoLockedError(
        "The session passed the daily cut-off and has been locked",
        lastLog.outTime ?? undefined,
      );
    }

    throw new NotClockedInError("No currently in time log found for user");
  }

  const minDurationSec = await getTimeLogMinDurationSec();
  const { result, log, cutoff } = await closeCurrentlyInLog(existingTimeLog, {
    now: new Date(), notes, minDurationSec,
  });

  if (!log) {
    throw new NotClockedInError("The time log was closed by another request");
  }

  if (result === "locked") {
    throw new AutoLockedError("Clock-out came after the daily cut-off; the time log has been locked", cutoff);
  }

  if (result === "tooShort") {
    throw new TimeLogTooShortError(
      `Time log duration is less than the minimum of ${minDurationSec} seconds and has been deleted`,
      minDurationSec
    );
  }

  return prismaTimeLogToDTO(log);
}

/**
 * Clock out a user's session on their behalf. A session past its daily cut-off is locked (as an
 * automatic lock) instead; the returned log's status shows which happened.
 */
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

  const { log } = await closeCurrentlyInLog(existingTimeLog, { now: new Date(), notes });
  if (!log) {
    throw new Error("Time log is not currently in");
  }

  return prismaTimeLogToDTO(log);
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
    throw new Error("Only currently in time logs can be locked");
  }

  const now = new Date();
  // Conditional, so a scheduled auto-lock that got there first is not overwritten
  const { count } = await prisma.timeLog.updateMany({
    where: { id: existingTimeLog.id, status: "CurrentlyIn" },
    data: {
      status: "Locked",
      outTime: now,
      notes: notes || existingTimeLog.notes,
      lockReason: "Admin",
      lockedAt: now,
      lockedById: session.user.id,
    },
  });

  const updatedTimeLog = await prisma.timeLog.findUnique({ where: { id: existingTimeLog.id } });
  if (count === 0 || !updatedTimeLog) {
    throw new Error("Only currently in time logs can be locked");
  }

  return prismaTimeLogToDTO(updatedTimeLog);
}

type PrismaTimeLogStatus = "CurrentlyIn" | "Done" | "Locked";

/**
 * Lock metadata to write when a log's status is set by an admin (form or Admin API): entering Locked
 * records a manual lock, leaving Locked clears it, and staying Locked keeps the existing values.
 */
function lockFieldsForStatusChange(
  prevStatus: PrismaTimeLogStatus | null,
  nextStatus: PrismaTimeLogStatus,
  lockedById: string | null | undefined,
): { lockReason?: "Admin" | null; lockedAt?: Date | null; lockedById?: string | null } {
  if (nextStatus === "Locked") {
    if (prevStatus === "Locked") return {};
    return { lockReason: "Admin", lockedAt: new Date(), lockedById: lockedById ?? null };
  }

  return { lockReason: null, lockedAt: null, lockedById: null };
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
      ...lockFieldsForStatusChange(null, status, session.user.id),
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

  const existing = await prisma.timeLog.findUnique({ where: { id: timeLogId }, select: { status: true } });

  const result = await prisma.timeLog.update({
    where: { id: timeLogId },
    data: {
      userId: data.userId,
      status,
      inTime: data.inTime,
      outTime: data.outTime,
      notes: data.notes,
      ...lockFieldsForStatusChange(existing?.status ?? null, status, session.user.id),
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

// The functions below are for the API-key authenticated Admin API
// (see src/lib/admin-api-auth.ts). They intentionally skip the NextAuth
// session/role checks above, since the route handlers calling them already
// gate access via the admin API key.

function toPrismaTimeLogStatus(status: TimeLogDTO["status"]): PrismaTimeLogStatus {
  if (status === "CURRENTLY_IN") return "CurrentlyIn";
  if (status === "DONE") return "Done";
  return "Locked";
}

export type AdminGetAllTimeLogsOptions = {
  userId: string;
  startTime: Date;
  endTime: Date;
  status: TimeLogDTO["status"];
}

export async function adminGetAllTimeLogs(opts?: Partial<AdminGetAllTimeLogsOptions>): Promise<TimeLogDTO[]> {
  const { userId, startTime, endTime, status } = opts || {};

  const where: Prisma.TimeLogWhereInput = {};

  if (userId) {
    where.userId = userId;
  }

  if (startTime || endTime) {
    where.OR = [
      {
        inTime: {
          gte: startTime,
          lt: endTime,
        },
      },
      {
        outTime: {
          gte: startTime,
          lt: endTime,
        },
      },
    ];
  }

  if (status) {
    where.status = toPrismaTimeLogStatus(status);
  }

  const timeLogs = await prisma.timeLog.findMany({
    where,
    orderBy: { inTime: "desc" },
  });

  return timeLogs.map(prismaTimeLogToDTO);
}

export async function adminGetTimeLog(id: string): Promise<TimeLogDTO | null> {
  const timeLog = await prisma.timeLog.findUnique({
    where: { id },
  });

  return timeLog ? prismaTimeLogToDTO(timeLog) : null;
}

export async function adminCreateTimeLog(data: {
  userId: string;
  status: TimeLogDTO["status"];
  inTime: Date;
  outTime?: Date;
  notes?: string | null;
}): Promise<TimeLogDTO> {
  const status = toPrismaTimeLogStatus(data.status);

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
      ...lockFieldsForStatusChange(null, status, null),
    },
  });

  return prismaTimeLogToDTO(result);
}

export async function adminUpdateTimeLog(timeLogId: string, data: {
  userId: string;
  status: TimeLogDTO["status"];
  inTime: Date;
  outTime?: Date;
  notes?: string | null;
}): Promise<TimeLogDTO> {
  const status = toPrismaTimeLogStatus(data.status);

  if (data.status !== "CURRENTLY_IN" && !data.outTime) {
    throw new Error("Out time is required for DONE or LOCKED status");
  }

  if (data.outTime && data.outTime <= data.inTime) {
    throw new Error("Out time must be after in time");
  }

  const existing = await prisma.timeLog.findUnique({ where: { id: timeLogId }, select: { status: true } });

  const result = await prisma.timeLog.update({
    where: { id: timeLogId },
    data: {
      userId: data.userId,
      status,
      inTime: data.inTime,
      outTime: data.outTime ?? null,
      notes: data.notes ?? null,
      ...lockFieldsForStatusChange(existing?.status ?? null, status, null),
    },
  });

  return prismaTimeLogToDTO(result);
}

export async function adminDeleteTimeLog(timeLogId: string): Promise<TimeLogDTO> {
  const timeLog = await prisma.timeLog.delete({
    where: { id: timeLogId },
  });

  return prismaTimeLogToDTO(timeLog);
}
