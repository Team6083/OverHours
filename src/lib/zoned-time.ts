/**
 * Small time zone helpers built on Intl, so wall-clock times can be resolved in a configured IANA zone
 * regardless of the server's own zone (containers usually run in UTC).
 */

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

type WallTime = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/** Wall-clock fields of `date` as seen in `timeZone` (month is 1-based). */
export function toWallTime(date: Date, timeZone: string): WallTime {
  const parts = Object.fromEntries(
    getFormatter(timeZone).formatToParts(date).map(p => [p.type, p.value])
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function offsetMs(date: Date, timeZone: string): number {
  const w = toWallTime(date, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * The instant at which the wall clock in `timeZone` shows the given date and time. Day overflow is
 * allowed (`day + 1` past month end rolls over), as with `Date.UTC`. A wall time skipped by a
 * daylight-saving jump resolves to the instant just after the jump (e.g. 02:30 → 03:30).
 */
export function fromWallTime(
  year: number, month: number, day: number, hour: number, minute: number, timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - offsetMs(new Date(guess), timeZone);
  const second = guess - offsetMs(new Date(first), timeZone);

  // `second` is exact unless the wall time does not exist (DST gap); then take the later candidate
  const w = toWallTime(new Date(second), timeZone);
  if (w.hour === hour && w.minute === minute) return new Date(second);
  return new Date(Math.max(first, second));
}

/** `YYYY-MM-DD HH:mm:ss` in `timeZone`. */
export function formatWallTime(date: Date, timeZone: string): string {
  const w = toWallTime(date, timeZone);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${w.year}-${p(w.month)}-${p(w.day)} ${p(w.hour)}:${p(w.minute)}:${p(w.second)}`;
}

/** The first daily cut-off (`hour:minute` in `timeZone`) strictly after `time`. */
export function firstCutoffAfter(time: Date, hour: number, minute: number, timeZone: string): Date {
  const w = toWallTime(time, timeZone);
  const sameDay = fromWallTime(w.year, w.month, w.day, hour, minute, timeZone);
  if (sameDay.getTime() > time.getTime()) return sameDay;
  return fromWallTime(w.year, w.month, w.day + 1, hour, minute, timeZone);
}

/** The latest daily cut-off (`hour:minute` in `timeZone`) at or before `time`. */
export function lastCutoffAtOrBefore(time: Date, hour: number, minute: number, timeZone: string): Date {
  const w = toWallTime(time, timeZone);
  const sameDay = fromWallTime(w.year, w.month, w.day, hour, minute, timeZone);
  if (sameDay.getTime() <= time.getTime()) return sameDay;
  return fromWallTime(w.year, w.month, w.day - 1, hour, minute, timeZone);
}
