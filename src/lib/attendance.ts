import { toWallTime } from "./zoned-time";

export type DutyRoleName = "CE" | "PM" | "MACHINING";

export type SeasonRange = { startDate: string; endDate: string };
export type SeasonEventRange = { name: string; startDate: string; endDate?: string | null };

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

export function isInSeason(date: string, season: SeasonRange): boolean {
  return season.startDate <= date && date <= season.endDate;
}

export function seasonDatesOfWeek(weekStart: string, season: SeasonRange): string[] {
  return weekDates(weekStart).filter(date => isInSeason(date, season));
}

export function eventsOn(date: string, events: SeasonEventRange[]): string[] {
  return events
    .filter(event => event.startDate <= date && date <= (event.endDate || event.startDate))
    .map(event => event.name);
}

/** People with no mark on any of `dates`: a week with no X counts as not filled in. */
export function unfilledUsers<U extends { id: string }>(
  users: U[],
  marks: { userId: string; date: string }[],
  dates: string[],
): U[] {
  if (dates.length === 0) return [];

  const marked = new Set(marks.filter(mark => dates.includes(mark.date)).map(mark => mark.userId));
  return users.filter(user => !marked.has(user.id));
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

export type SlackPerson = { name: string; slackUserId?: string | null };

export type DailyBoard<P> = {
  date: string;
  events: string[];
  duty: Record<DutyRoleName, P[]>;
  available: P[];
};

const escapeSlack = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** `null` for a line means its day or week is outside the season, so the line is left out. */
export function attendanceSlackMessage(input: {
  nextWeekUnfilled: SlackPerson[] | null;
  tomorrowAvailable: SlackPerson[] | null;
  url?: string;
}): string | null {
  const { nextWeekUnfilled, tomorrowAvailable, url } = input;
  const lines: string[] = [];

  if (nextWeekUnfilled) {
    const people = nextWeekUnfilled.map(p => p.slackUserId ? `<@${p.slackUserId}>` : escapeSlack(p.name));
    lines.push(`• 下周出席表未填寫：${people.join(" ") || "無"}`);
  }

  if (tomorrowAvailable) {
    lines.push(`• 明天可來：${tomorrowAvailable.map(p => escapeSlack(p.name)).join("、") || "無"}`);
  }

  if (lines.length === 0) return null;

  if (nextWeekUnfilled) {
    lines.push(`尚未填寫${url ? `<${url}|出席表>` : "出席表"}的請盡速填寫下周的範圍`);
  }

  return ["《出席表通知》", ...lines].join("\n");
}
