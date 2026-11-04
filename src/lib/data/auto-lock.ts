import { getAutoLockConfig } from "../config";
import prisma from "../prisma";
import { firstCutoffAfter, lastCutoffAtOrBefore } from "../zoned-time";

/**
 * Lock every clocked-in log that has passed the daily auto-lock cut-off (`OVERHOURS_AUTO_LOCK_TIME`).
 * The log's outTime is set to the cut-off it passed. No-op when auto-lock is disabled.
 *
 * Called at the start of reads and clock actions so data is correct without a scheduler, and from a
 * periodic timer (see instrumentation.ts). Each update is conditional on the log still being clocked in,
 * so concurrent runs (several requests or replicas) are safe. Returns the ids of logs it locked.
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

const TIMER_KEY = Symbol.for("overhours.autoLockTimer");
const SWEEP_INTERVAL_MS = 60 * 1000;

/**
 * Run the sweep every minute in this server process so the "currently in" list updates on time even
 * when nobody triggers a read. Reads and clock actions also sweep, so this is only for timeliness.
 * Guarded via globalThis so it is installed once per process (dev reloads re-run instrumentation).
 */
export function startAutoLockTimer(onError: (e: unknown) => void) {
  const g = globalThis as typeof globalThis & { [TIMER_KEY]?: NodeJS.Timeout };
  if (g[TIMER_KEY]) return;

  const timer = setInterval(() => {
    if (!getAutoLockConfig()) return;
    lockOverdueTimeLogs().catch(onError);
  }, SWEEP_INTERVAL_MS);
  timer.unref();
  g[TIMER_KEY] = timer;
}
