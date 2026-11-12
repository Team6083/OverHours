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

export function weekStartOf(date: string): string {
  const daysSinceMonday = (toUtc(date).getUTCDay() + 6) % 7;
  return addDays(date, -daysSinceMonday);
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

/** What happened on one day: the answer, and whether the member clocked in. */
export type Outcome = `${DayStatus}:${"came" | "absent"}`;

/**
 * How much each outcome counts toward the score, from 0 (bad) to 1 (fine). Only will come + absent and
 * not filled + absent are the problems the answers are meant to catch; can come is a "maybe", so either way is fine.
 */
export const DEFAULT_WEIGHTS: Readonly<Record<Outcome, number>> = {
  "WILL_COME:came": 1,
  "WILL_COME:absent": 0,
  "AVAILABLE:came": 1,
  "AVAILABLE:absent": 1,
  "UNAVAILABLE:came": 1,
  "UNAVAILABLE:absent": 1,
  "NOT_FILLED:came": 0.5,
  "NOT_FILLED:absent": 0,
};

const isOutcome = (value: string): value is Outcome => value in DEFAULT_WEIGHTS;

/** `ATTENDANCE_SCORE_WEIGHTS`, e.g. `NOT_FILLED:came=1,WILL_COME:absent=0`, over the defaults. Bad entries are returned, not used. */
export function parseWeights(value: string | undefined): { weights: Record<Outcome, number>; invalid: string[] } {
  const weights = { ...DEFAULT_WEIGHTS };
  const invalid: string[] = [];

  for (const item of (value ?? "").split(",").map(part => part.trim()).filter(Boolean)) {
    const [key, raw] = item.split("=").map(part => part.trim());
    const weight = Number(raw);
    if (!isOutcome(key) || raw === undefined || raw === "" || !(weight >= 0 && weight <= 1)) invalid.push(item);
    else weights[key] = weight;
  }

  return { weights, invalid };
}

export type AccuracySummary = {
  /** Days compared: team days that are over. */
  days: number;
  /** Of those, days the member answered. */
  answered: number;
  /** Weighted average of the outcomes, 0–1; null when there were no days. */
  score: number | null;
  /** Said will come, no time log that day. */
  brokenPromises: string[];
  /** Not filled in and didn't come. */
  silentAbsences: string[];
  /** Not filled in, came anyway. */
  unannounced: string[];
};

/**
 * Compares one member's answers with the days they clocked in. `dates` should only hold days that are over and
 * that the team met (someone clocked in), so days with nothing on don't count as missed.
 */
export function summarizeAccuracy(
  dates: string[],
  answers: { date: string; status: AttendanceStatus }[],
  attendedDates: Iterable<string>,
  weights: Record<Outcome, number> = DEFAULT_WEIGHTS,
): AccuracySummary {
  const attended = new Set(attendedDates);
  const summary: AccuracySummary = { days: dates.length, answered: 0, score: null, brokenPromises: [], silentAbsences: [], unannounced: [] };
  let total = 0;

  for (const { date, status } of dayStatuses(dates, answers)) {
    const outcome: Outcome = `${status}:${attended.has(date) ? "came" : "absent"}`;
    total += weights[outcome];
    if (status !== "NOT_FILLED") summary.answered++;

    if (outcome === "WILL_COME:absent") summary.brokenPromises.push(date);
    else if (outcome === "NOT_FILLED:absent") summary.silentAbsences.push(date);
    else if (outcome === "NOT_FILLED:came") summary.unannounced.push(date);
  }

  summary.score = dates.length > 0 ? total / dates.length : null;
  return summary;
}

/** `YYYY-MM-DD` → `MM/DD`. */
export const shortDate = (date: string) => date.slice(5).replace("-", "/");
