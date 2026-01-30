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
        {
          inTime: {
            gte: dateRange[0],
            lte: dateRange[1],
          }
        },
        {
          outTime: {
            gte: dateRange[0],
            lte: dateRange[1],
          }
        },
      ]
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

  const ROWS_PER_COLUMN = 6;
  const headcountData = Array.from({ length: ROWS_PER_COLUMN }, (_, row) =>
    Array.from({ length: 24 }, (_, col) => {
      const index = row + col * ROWS_PER_COLUMN;
      return index < headcountResult.length ? headcountResult[index] : 0;
    })
  );

  const durationPerUser = processedLogs.reduce((acc, log) => {
    const duration = (log.outTime?.getTime() ?? Date.now()) - log.inTime.getTime();
    acc[log.userId] = (acc[log.userId] || 0) + duration;
    return acc;
  }, {} as Record<string, number>);

  const durationStat = Object.entries(durationPerUser).reduce((acc, [userId, duration]) => {
    acc.total += duration;
    if (duration > acc.max.value) {
      acc.max = { value: duration, userId: isAdmin ? userId : undefined };
    }

    if (duration < acc.min.value) {
      acc.min = { value: duration, userId: isAdmin ? userId : undefined };
    }

    return acc;
  }, {
    total: 0,
    max: { value: 0, userId: undefined },
    min: { value: Infinity, userId: undefined }
  } as DailyReportData['durationStat']);

  return {
    headcountHeatMap: {
      data: headcountData,
      maxHeadcount: Math.max(...headcountResult),
    },
    userDuration: Object.entries(durationPerUser).map(([userId, duration]) => ({ duration, userId: isAdmin ? userId : undefined })),
    durationStat,
  };
}
