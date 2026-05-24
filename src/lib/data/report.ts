"use server";
import "server-only";

import { auth, Role } from "@/auth";
import { TimeLog } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import { TimeLogDTO } from "./timelog-dto";

type HeadCountOptions = {
  bucketSize: number;
  minTime: Date;
  maxTime: Date;
}

const ROWS_PER_COLUMN = 6;

function headcount(logs: Pick<TimeLog | TimeLogDTO, "inTime" | "outTime" | "userId">[], options?: Partial<HeadCountOptions>): number[] {
  const {
    bucketSize = 10 * 60 * 1000, // 10 minutes in ms
  } = options || {};

  type Event = { time: number, user: string, type: "in" | "out" };
  const events: Event[] = logs
    .map((log) => {
      const userEvents: Event[] = [];
      userEvents.push({ time: log.inTime.getTime(), user: log.userId, type: "in" });
      userEvents.push({ time: log.outTime?.getTime() ?? Date.now(), user: log.userId, type: "out" });
      return userEvents;
    })
    .flat();

  events.sort((a, b) => a.time - b.time);

  if (events.length === 0) {
    return [];
  }

  const minTime = options?.minTime?.getTime() ?? events[0].time;
  const maxTime = options?.maxTime?.getTime() ?? events[events.length - 1].time;

  const currentlyInUsers = new Set();
  const bucketStart = Math.floor(minTime / bucketSize) * bucketSize;

  const result: number[] = [];

  let eventIndex = 0;
  for (let bucketTime = bucketStart; bucketTime <= maxTime; bucketTime += bucketSize) {
    let bucketUsers = new Set(currentlyInUsers);

    while (eventIndex < events.length && events[eventIndex].time < bucketTime + bucketSize) {
      if (events[eventIndex].type === "in") {
        currentlyInUsers.add(events[eventIndex].user);
      } else {
        currentlyInUsers.delete(events[eventIndex].user);
      }

      bucketUsers = bucketUsers.union(currentlyInUsers);

      eventIndex++;
    }

    result.push(bucketUsers.size);
  }

  return result;
}

export type DailyReportData = {
  headcountHeatMap: {
    data: number[][];
    maxHeadcount: number;
  };
  userDuration: { duration: number, userId?: string }[];
  durationStat: {
    total: number;
    max: { value: number, userId?: string };
    min: { value: number, userId?: string };
  };
  lockedCount: number;
}

export type OverviewStats = {
  totalMs: number;
  uniqueUsers: number;
  totalSessions: number;
  leaderboard: { userId: string; totalMs: number }[];
}

export async function getOverviewStats(
  opts?: { startDate?: Date; endDate?: Date }
): Promise<OverviewStats | null> {
  const session = await auth();
  if (!session) return null;

  const { startDate, endDate } = opts || {};

  // Convert to Date objects in case they arrive as strings from client serialization
  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : undefined;
  if (end) end.setDate(end.getDate() + 1); // make endDate inclusive

  const dateFilter = (start || end) ? {
    AND: [
      ...(end ? [{ inTime: { lt: end } }] : []),
      ...(start ? [{ outTime: { gte: start } }] : []),
    ],
  } : {};

  const logs = await prisma.timeLog.findMany({
    where: { status: "Done", ...dateFilter },
  });

  const durationByUser: Record<string, number> = {};
  let totalMs = 0;

  for (const log of logs) {
    if (!log.outTime) continue;
    const duration = log.outTime.getTime() - log.inTime.getTime();
    durationByUser[log.userId] = (durationByUser[log.userId] || 0) + duration;
    totalMs += duration;
  }

  const leaderboard = Object.entries(durationByUser)
    .map(([userId, ms]) => ({ userId, totalMs: ms }))
    .sort((a, b) => b.totalMs - a.totalMs);

  return {
    totalMs,
    uniqueUsers: leaderboard.length,
    totalSessions: logs.length,
    leaderboard,
  };
}

export type WeeklyReportData = {
  days: {
    date: Date;
    userCount: number;
    sessions: number;
    totalMs: number;
  }[];
  summary: {
    totalMs: number;
    uniqueUsers: number;
    avgDailyMs: number;
    peakDayIndex: number;
  };
  headcountHeatMap: {
    data: number[][];
    maxHeadcount: number;
  };
}

export async function getWeeklyReportData(
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyReportData | null> {
  const session = await auth();
  if (!session) return null;

  // Convert to Date objects in case they arrive as strings from client serialization
  const start = new Date(weekStart);
  const end = new Date(weekEnd);

  const logs = await prisma.timeLog.findMany({
    where: {
      OR: [
        // Done logs that overlap the week
        {
          status: "Done",
          AND: [{ inTime: { lt: end } }, { outTime: { gte: start } }],
        },
        // Locked logs: match only by inTime (outTime may be null or unreliable)
        {
          status: "Locked",
          inTime: { gte: start, lt: end },
        },
      ],
    },
  });

  if (logs.length === 0) return null;

  // Collapse Locked logs to a point event (same as getDailyReportData)
  const processedLogs = logs.map(log =>
    log.status === "Locked" ? { ...log, outTime: log.inTime } : log
  );

  const days: WeeklyReportData['days'] = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(start.getTime() + i * 86400000),
    userCount: 0,
    sessions: 0,
    totalMs: 0,
  }));

  const dayUserSets: Set<string>[] = Array.from({ length: 7 }, () => new Set());
  const uniqueUsersSet = new Set<string>();

  for (const log of processedLogs) {
    if (!log.outTime) continue;
    const logStart = log.inTime.getTime();
    const logEnd = log.outTime.getTime();

    for (let i = 0; i < 7; i++) {
      const dStart = start.getTime() + i * 86400000;
      const dEnd = dStart + 86400000;

      if (logStart < dEnd && logEnd > dStart) {
        const overlap = Math.min(logEnd, dEnd) - Math.max(logStart, dStart);
        days[i].totalMs += overlap;
        days[i].sessions++;
        dayUserSets[i].add(log.userId);
      }
    }

    uniqueUsersSet.add(log.userId);
  }

  for (let i = 0; i < 7; i++) {
    days[i].userCount = dayUserSets[i].size;
  }

  const totalMs = days.reduce((sum, d) => sum + d.totalMs, 0);
  const peakDayIndex = days.reduce((maxI, d, i, arr) => d.totalMs > arr[maxI].totalMs ? i : maxI, 0);

  const headcountResult = headcount(processedLogs, {
    bucketSize: 60 * 60 * 1000,
    minTime: start,
    maxTime: end,
  });

  const heatmapData = Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 24 }, (_, hour) => {
      const index = day * 24 + hour;
      return index < headcountResult.length ? headcountResult[index] : 0;
    })
  );

  return {
    days,
    summary: {
      totalMs,
      uniqueUsers: uniqueUsersSet.size,
      avgDailyMs: totalMs / 7,
      peakDayIndex,
    },
    headcountHeatMap: {
      data: heatmapData,
      maxHeadcount: Math.max(...headcountResult, 0),
    },
  };
}

export async function getDailyReportData(dateRange: [Date, Date]): Promise<DailyReportData | null> {
  const session = await auth();
  if (!session) {
    return null;
  }

  const isAdmin = session.user.role === Role.ADMIN;

  const logs = await prisma.timeLog.findMany({
    where: {
      OR: [
        // Non-locked logs: either inTime or outTime overlaps the day
        {
          NOT: { status: "Locked" },
          OR: [
            { inTime: { gte: dateRange[0], lte: dateRange[1] } },
            { outTime: { gte: dateRange[0], lte: dateRange[1] } },
          ],
        },
        // Locked logs: only match by inTime (counted as point event at start time)
        {
          status: "Locked",
          inTime: { gte: dateRange[0], lte: dateRange[1] },
        },
      ],
    },
  });

  if (logs.length === 0) {
    return null;
  }

  const processedLogs = logs.map(log => {
    if (log.status === "Locked") return {
      ...log,
      outTime: log.inTime,
    };

    return log;
  });

  const headcountResult = headcount(processedLogs, { minTime: dateRange[0], maxTime: dateRange[1] });

  const headcountData = Array.from({ length: ROWS_PER_COLUMN }, (_, row) =>
    Array.from({ length: 24 }, (_, col) => {
      const index = row + col * ROWS_PER_COLUMN;
      return index < headcountResult.length ? headcountResult[index] : 0;
    })
  );

  const lockedCount = logs.filter(log => log.status === "Locked").length;

  // Exclude Locked logs from duration stats so they don't skew shortest/longest
  const durationPerUser = processedLogs
    .filter(log => log.status !== "Locked")
    .reduce((acc, log) => {
      const duration = (log.outTime?.getTime() ?? Date.now()) - log.inTime.getTime();
      acc[log.userId] = (acc[log.userId] || 0) + duration;
      return acc;
    }, {} as Record<string, number>);

  const durationEntries = Object.entries(durationPerUser);
  const durationStat: DailyReportData['durationStat'] = durationEntries.length === 0
    ? { total: 0, max: { value: 0, userId: undefined }, min: { value: 0, userId: undefined } }
    : durationEntries.reduce((acc, [userId, duration]) => {
        acc.total += duration;
        if (duration > acc.max.value) acc.max = { value: duration, userId: isAdmin ? userId : undefined };
        if (duration < acc.min.value) acc.min = { value: duration, userId: isAdmin ? userId : undefined };
        return acc;
      }, {
        total: 0,
        max: { value: 0, userId: undefined },
        min: { value: Infinity, userId: undefined },
      } as DailyReportData['durationStat']);

  return {
    headcountHeatMap: {
      data: headcountData,
      maxHeadcount: Math.max(...headcountResult),
    },
    userDuration: Object.entries(durationPerUser).map(([userId, duration]) => ({ duration, userId: isAdmin ? userId : undefined })),
    durationStat,
    lockedCount,
  };
}

export type UserReportSession = {
  id: string;
  inTime: Date;
  outTime?: Date;
  durationMs: number;
  status: "DONE" | "LOCKED" | "CURRENTLY_IN";
  notes?: string;
}

export type UserReportData = {
  sessions: UserReportSession[];
  dailyBreakdown: { date: Date; totalMs: number; sessions: number }[];
  stats: {
    totalMs: number;
    totalSessions: number;
    lockedCount: number;
    daysAttended: number;
  };
}

export async function getUserReportData(
  userId: string,
  opts?: { startDate?: Date; endDate?: Date }
): Promise<UserReportData | null> {
  const session = await auth();
  if (!session || session.user.role !== Role.ADMIN) return null;

  const { startDate, endDate } = opts || {};
  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : undefined;
  if (end) end.setDate(end.getDate() + 1);

  const logs = await prisma.timeLog.findMany({
    where: {
      userId,
      ...(start || end ? {
        OR: [
          {
            status: "Done",
            AND: [
              ...(end ? [{ inTime: { lt: end } }] : []),
              ...(start ? [{ outTime: { gte: start } }] : []),
            ],
          },
          {
            status: "Locked",
            inTime: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lt: end } : {}),
            },
          },
        ],
      } : {
        status: { in: ["Done", "Locked"] },
      }),
    },
    orderBy: { inTime: "desc" },
  });

  const sessions: UserReportSession[] = logs.map(log => {
    const durationMs = log.status !== "Locked" && log.outTime
      ? log.outTime.getTime() - log.inTime.getTime()
      : 0;

    let status: UserReportSession["status"];
    if (log.status === "Done") status = "DONE";
    else if (log.status === "Locked") status = "LOCKED";
    else status = "CURRENTLY_IN";

    return {
      id: log.id,
      inTime: log.inTime,
      outTime: log.status !== "Locked" ? (log.outTime ?? undefined) : undefined,
      durationMs,
      status,
      notes: log.notes ?? undefined,
    };
  });

  const doneSessions = sessions.filter(s => s.status === "DONE");
  const totalMs = doneSessions.reduce((sum, s) => sum + s.durationMs, 0);
  const lockedCount = sessions.filter(s => s.status === "LOCKED").length;

  // Daily breakdown (Done sessions only, keyed by UTC date)
  const dailyMap = new Map<string, { totalMs: number; sessions: number }>();
  for (const s of doneSessions) {
    const key = s.inTime.toISOString().slice(0, 10);
    const existing = dailyMap.get(key) ?? { totalMs: 0, sessions: 0 };
    existing.totalMs += s.durationMs;
    existing.sessions += 1;
    dailyMap.set(key, existing);
  }
  const dailyBreakdown = Array.from(dailyMap.entries())
    .map(([dateStr, data]) => ({ date: new Date(dateStr + "T00:00:00Z"), ...data }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const daysAttended = dailyMap.size;

  return {
    sessions,
    dailyBreakdown,
    stats: {
      totalMs,
      totalSessions: sessions.length,
      lockedCount,
      daysAttended,
    },
  };
}
