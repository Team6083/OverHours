import { getAutoLockConfig } from "../config";
import prisma from "../prisma";
import { firstCutoffAfter, lastCutoffAtOrBefore } from "../zoned-time";

/**
 * The daily cut-off (`AUTO_LOCK_TIME`) that a session clocked in at `inTime` has already
 * passed by `now`, or null if it has not passed one (or auto-lock is disabled). A session may not span
 * a cut-off; one that did is locked with this cut-off as its outTime.
 */
export function getPassedCutoff(inTime: Date, now: Date = new Date()): Date | null {
  const config = getAutoLockConfig();
  if (!config) return null;

  const cutoff = firstCutoffAfter(inTime, config.hour, config.minute, config.timeZone);
  return cutoff.getTime() <= now.getTime() ? cutoff : null;
}

/** Data that locks a log automatically at `cutoff`. */
export function autoLockData(cutoff: Date, now: Date = new Date()) {
  return {
    status: "Locked",
    outTime: cutoff,
    lockReason: "AutoTimeout",
    lockedAt: now,
    lockedById: null,
  } as const;
}

/**
 * Lock every clocked-in log that has passed its daily cut-off. Not called by the app itself (clock-out
 * checks its own log); meant for an external scheduler through `POST /api/admin/jobs/auto-lock`, so
 * forgotten sessions are locked even if the user never clocks out. Each update is conditional on the
 * log still being clocked in, so it is safe to run concurrently with clock-outs or itself. Returns the
 * ids of the logs it locked.
 */
export async function lockOverdueTimeLogs(now: Date = new Date()): Promise<string[]> {
  const config = getAutoLockConfig();
  if (!config) return [];

  const lastCutoff = lastCutoffAtOrBefore(now, config.hour, config.minute, config.timeZone);

  const overdue = await prisma.timeLog.findMany({
    where: { status: "CurrentlyIn", inTime: { lt: lastCutoff } },
    select: { id: true, inTime: true },
  });

  const locked: string[] = [];
  for (const log of overdue) {
    const cutoff = getPassedCutoff(log.inTime, now);
    if (!cutoff) continue;

    const { count } = await prisma.timeLog.updateMany({
      where: { id: log.id, status: "CurrentlyIn" },
      data: autoLockData(cutoff, now),
    });
    if (count > 0) locked.push(log.id);
  }

  return locked;
}
