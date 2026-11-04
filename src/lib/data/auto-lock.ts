import { getAutoLockConfig } from "../config";
import prisma from "../prisma";
import { firstCutoffAfter, lastCutoffAtOrBefore } from "../zoned-time";

/**
 * Lock every clocked-in log that has passed the daily auto-lock cut-off (`OVERHOURS_AUTO_LOCK_TIME`).
 * The log's outTime is set to the cut-off it passed. No-op when auto-lock is disabled.
 *
 * Called at the start of every read and clock action, so data is correct without a scheduler or
 * background job. Each update is conditional on the log still being clocked in, so concurrent runs
 * (several requests or replicas) are safe. Returns the ids of logs it locked.
 */
export async function lockOverdueTimeLogs(now: Date = new Date()): Promise<string[]> {
  const config = getAutoLockConfig();
  if (!config) return [];

  const { hour, minute, timeZone } = config;
  const lastCutoff = lastCutoffAtOrBefore(now, hour, minute, timeZone);

  const overdue = await prisma.timeLog.findMany({
    where: { status: "CurrentlyIn", inTime: { lt: lastCutoff } },
    select: { id: true, inTime: true },
  });

  const locked: string[] = [];
  for (const log of overdue) {
    const { count } = await prisma.timeLog.updateMany({
      where: { id: log.id, status: "CurrentlyIn" },
      data: {
        status: "Locked",
        outTime: firstCutoffAfter(log.inTime, hour, minute, timeZone),
        lockReason: "AutoTimeout",
        lockedAt: now,
        lockedById: null,
      },
    });
    if (count > 0) locked.push(log.id);
  }

  return locked;
}
