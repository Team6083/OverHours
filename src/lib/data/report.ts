"use server";
import "server-only";

import { getAllTimelogDTOs, TimeLogDTO } from "./timelog-dto";

type HeadCountOptions = {
  bucketSize: number;
  minTime: Date;
  maxTime: Date;
}

function headcount(logs: Pick<TimeLogDTO, "inTime" | "outTime" | "userId">[], options?: Partial<HeadCountOptions>): number[] {
  const {
    bucketSize = 10 * 60 * 1000, // 10 minutes in ms
  } = options || {};

  type Event = { time: number, user: string, type: "in" | "out" };
  const events: Event[] = logs
    .map((l) => {
      const evts: Event[] = [];
      evts.push({ time: l.inTime.getTime(), user: l.userId, type: "in" });
      evts.push({ time: l.outTime?.getTime() ?? Date.now(), user: l.userId, type: "out" });
      return evts;
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

  let idx = 0;
  for (let t = bucketStart; t <= maxTime; t += bucketSize) {
    let bucketUsers = new Set(currentlyInUsers);

    while (idx < events.length && events[idx].time < t + bucketSize) {
      if (events[idx].type === "in") {
        currentlyInUsers.add(events[idx].user);
      } else {
        currentlyInUsers.delete(events[idx].user);
      }

      bucketUsers = bucketUsers.union(currentlyInUsers)

      idx++;
    }

    result.push(bucketUsers.size);
  }

  return result;
}

export type DailyReportData = {
  headcountHeatMap: number[][];
  maxHeadcount: number;
  users: string[];
  durationStat: {
    total: number;
    max: { userId: string, value: number } | null;
    min: { userId: string, value: number } | null
  }
}

export async function getDailyReportData(dateRange: [Date, Date]): Promise<DailyReportData | null> {
  const logs = await getAllTimelogDTOs({
    startTime: dateRange[0],
    endTime: dateRange[1],
  });

  if (logs.length === 0) {
    return null;
  }

  const headcountResult = headcount(logs, { minTime: dateRange[0], maxTime: dateRange[1] });
  const maxHeadcount = Math.max(...headcountResult);

  const headcountHeatMap = Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: 24 }, (_, col) => {
      const index = row + col * 6;
      return index < headcountResult.length ? headcountResult[index] : 0;
    })
  );

  const durationPerUser = logs.reduce((acc, log) => {
    const duration = (log.outTime?.getTime() ?? Date.now()) - log.inTime.getTime();
    acc[log.userId] = (acc[log.userId] || 0) + duration;
    return acc;
  }, {} as Record<string, number>);

  const durationStat = Object.entries(durationPerUser).reduce((acc, [userId, duration]) => {
    acc.total += duration;
    if (!acc.max || duration > acc.max.value) {
      acc.max = { userId, value: duration };
    }

    if (acc.min === null || duration < acc.min.value) {
      acc.min = { userId, value: duration };
    }

    return acc;
  }, { total: 0, max: null, min: null } as DailyReportData['durationStat']);

  return {
    headcountHeatMap,
    maxHeadcount,
    users: Array.from(new Set(logs.map(l => l.userId))),
    durationStat,
  };
}
