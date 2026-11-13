import { toWallTime } from "./zoned-time";

/** The answers in the order they are shown: will come (promised), if needed, can't come. */
export const ATTENDANCE_STATUSES = ["WILL_COME", "AVAILABLE", "UNAVAILABLE"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export type DayStatus = AttendanceStatus | "NOT_FILLED";

export const STATUS_PALETTE: Record<AttendanceStatus, string> = { WILL_COME: "green", AVAILABLE: "cyan", UNAVAILABLE: "red" };

export const MAX_RANGE_DAYS = 92;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toUtc = (date: string) => new Date(`${date}T00:00:00Z`);
const fromUtc = (date: Date) => date.toISOString().slice(0, 10);

export function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = toUtc(value);
  return !Number.isNaN(parsed.getTime()) && fromUtc(parsed) === value;
}

export function addDays(date: string, days: number): string {
  const result = toUtc(date);
  result.setUTCDate(result.getUTCDate() + days);
  return fromUtc(result);
}

export function calendarDateInZone(now: Date, timeZone: string): string {
  const { year, month, day } = toWallTime(now, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 1 (Monday) to 7 (Sunday). */
export const isoWeekday = (date: string): number => ((toUtc(date).getUTCDay() + 6) % 7) + 1;

/** `YYYY-MM-DD` → `MM/DD`. */
export const shortDate = (date: string): string => date.slice(5).replace("-", "/");

export function weekStartOf(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** Every day from `start` to `end` inclusive; null when the range is backwards or too long. */
export function datesInRange(start: string, end: string, maxDays = MAX_RANGE_DAYS): string[] | null {
  const days = (toUtc(end).getTime() - toUtc(start).getTime()) / 864e5 + 1;
  if (days < 1 || days > maxDays) return null;

  return Array.from({ length: days }, (_, i) => addDays(start, i));
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const isMonth = (value: string): boolean => MONTH_PATTERN.test(value);

export function addMonths(month: string, count: number): string {
  const result = toUtc(`${month}-01`);
  result.setUTCMonth(result.getUTCMonth() + count);
  return fromUtc(result).slice(0, 7);
}

/** Every day of a `YYYY-MM` month. */
export function monthDates(month: string): string[] {
  const start = `${month}-01`;
  const next = `${addMonths(month, 1)}-01`;
  return datesInRange(start, addDays(next, -1)) ?? [];
}

export function dayStatuses(
  dates: string[],
  entries: { date: string; status: AttendanceStatus }[],
): { date: string; status: DayStatus }[] {
  const byDate = new Map(entries.map(entry => [entry.date, entry.status]));
  return dates.map(date => ({ date, status: byDate.get(date) ?? "NOT_FILLED" }));
}

/** Source rows that can move to `targetId` without breaking the unique index, one per key. */
export function rowsToReassign<T extends { id: string; userId: string }>(
  rows: T[],
  targetId: string,
  key: (row: T) => string,
): string[] {
  const taken = new Set(rows.filter(row => row.userId === targetId).map(key));
  const ids: string[] = [];

  for (const row of rows) {
    if (row.userId === targetId || taken.has(key(row))) continue;
    taken.add(key(row));
    ids.push(row.id);
  }

  return ids;
}

export type ReliabilitySummary = {
  /** Answered days compared. */
  answered: number;
  /** Of those, days where what the member did matched what they said. */
  matched: number;
  /** `matched / answered`; null without answered days. */
  reliability: number | null;
  /** Said will come, no time log that day. */
  brokenPromises: string[];
  /** Said can't come, clocked in anyway. */
  unexpected: string[];
};

/**
 * How reliable one member's answers were: will come should mean a time log that day, can't come should mean none,
 * and if needed promises nothing, so it always matches. Days without an answer are not counted.
 */
export function summarizeReliability(
  answers: { date: string; status: AttendanceStatus }[],
  attendedDates: Iterable<string>,
): ReliabilitySummary {
  const attended = new Set(attendedDates);
  const summary: ReliabilitySummary = { answered: answers.length, matched: 0, reliability: null, brokenPromises: [], unexpected: [] };

  for (const { date, status } of [...answers].sort((a, b) => a.date.localeCompare(b.date))) {
    const came = attended.has(date);
    if (status === "WILL_COME" && !came) summary.brokenPromises.push(date);
    else if (status === "UNAVAILABLE" && came) summary.unexpected.push(date);
    else summary.matched++;
  }

  summary.reliability = summary.answered > 0 ? summary.matched / summary.answered : null;
  return summary;
}
