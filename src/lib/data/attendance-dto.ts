import "server-only";
import { auth, Role } from "@/auth";
import { AttendanceEntry } from "@/generated/prisma";
import {
  AccuracySummary, addDays, AttendanceStatus, calendarDateInZone, DayStatus, dayStatuses, monthDates, summarizeAccuracy, weekDates,
} from "../attendance";
import { getTimeZone } from "../config";
import prisma from "../prisma";
import { fromWallTime } from "../zoned-time";

/** Deliberately without email: emails are only visible to admins elsewhere. */
export type BoardUser = { id: string; name: string; image: string | null };
export type BoardDay = { date: string } & Record<AttendanceStatus, BoardUser[]>;
/** The Admin API keeps its two answers until its design is settled (#132): will come is reported as AVAILABLE. */
export type ApiDayStatus = "AVAILABLE" | "UNAVAILABLE" | "NOT_FILLED";
export type AccuracyRow = AccuracySummary & { user: BoardUser };
export type AdminAttendanceUser = {
  id: string;
  name: string;
  email: string;
  days: { date: string; status: ApiDayStatus }[];
};

const STATUS_FROM_DB: Record<AttendanceEntry["status"], AttendanceStatus> = {
  WillCome: "WILL_COME",
  Available: "AVAILABLE",
  Unavailable: "UNAVAILABLE",
};
const STATUS_TO_DB: Record<AttendanceStatus, AttendanceEntry["status"]> = {
  WILL_COME: "WillCome",
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
};

const toStatus = (status: AttendanceEntry["status"]): AttendanceStatus => STATUS_FROM_DB[status];
const toApiStatus = (status: DayStatus): ApiDayStatus => status === "WILL_COME" ? "AVAILABLE" : status;

export function getToday(): string {
  return calendarDateInZone(new Date(), getTimeZone());
}

function startOfDay(date: string, offset: number): Date {
  const [y, m, d] = date.split("-").map(Number);
  return fromWallTime(y, m, d + offset, 0, 0, getTimeZone());
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user.id) throw new Error("Unauthorized");
  return session.user.id;
}

async function boardFor(dates: string[]): Promise<BoardDay[]> {
  await requireUserId();

  const entries = await prisma.attendanceEntry.findMany({
    where: { date: { in: dates }, slot: "AllDay" },
    select: { date: true, status: true, user: { select: { id: true, name: true, image: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const users = (date: string, status: AttendanceStatus): BoardUser[] => entries
    .filter(entry => entry.date === date && toStatus(entry.status) === status)
    .map(({ user }) => ({ id: user.id, name: user.name, image: user.image ?? null }));

  return dates.map(date => ({
    date,
    WILL_COME: users(date, "WILL_COME"),
    AVAILABLE: users(date, "AVAILABLE"),
    UNAVAILABLE: users(date, "UNAVAILABLE"),
  }));
}

export const getWeekBoard = (weekStart: string): Promise<BoardDay[]> => boardFor(weekDates(weekStart));

export async function getDayBoard(date: string): Promise<BoardDay> {
  const [day] = await boardFor([date]);
  return day;
}

/** Days of a `YYYY-MM` month on which the user clocked in, in `TZ`. */
export async function getUserAttendedDates(userId: string, month: string): Promise<string[]> {
  await requireUserId();
  const dates = monthDates(month);
  const logs = await prisma.timeLog.findMany({
    where: { userId, inTime: { gte: startOfDay(dates[0], 0), lt: startOfDay(dates[dates.length - 1], 1) } },
    select: { inTime: true },
  });
  const timeZone = getTimeZone();
  return [...new Set(logs.map(log => calendarDateInZone(log.inTime, timeZone)))];
}

/** One user's entries for a `YYYY-MM` month, for the member calendar. */
export async function getUserMonth(userId: string, month: string): Promise<Record<string, AttendanceStatus>> {
  await requireUserId();

  const entries = await prisma.attendanceEntry.findMany({
    where: { userId, date: { in: monthDates(month) }, slot: "AllDay" },
    select: { date: true, status: true },
  });

  return Object.fromEntries(entries.map(entry => [entry.date, toStatus(entry.status)]));
}

export async function getMyWeek(weekStart: string): Promise<Record<string, AttendanceStatus>> {
  const userId = await requireUserId();

  const entries = await prisma.attendanceEntry.findMany({
    where: { userId, date: { in: weekDates(weekStart) }, slot: "AllDay" },
    select: { date: true, status: true },
  });

  return Object.fromEntries(entries.map(entry => [entry.date, toStatus(entry.status)]));
}

/** Replaces the user's entries for the days of the week that have not passed; a day left out is cleared. */
export async function saveMyWeek(weekStart: string, entries: Record<string, AttendanceStatus>): Promise<boolean> {
  const userId = await requireUserId();

  const today = getToday();
  const dates = weekDates(weekStart).filter(date => date >= today);
  if (dates.length === 0) return false;

  const rows = dates.flatMap(date => {
    const status = entries[date];
    if (!status) return [];
    return [{ userId, date, status: STATUS_TO_DB[status] }];
  });

  await prisma.$transaction(async (tx) => {
    await tx.attendanceEntry.deleteMany({ where: { userId, date: { in: dates }, slot: "AllDay" } });
    if (rows.length > 0) {
      await tx.attendanceEntry.createMany({ data: rows });
    }
  });

  return true;
}

/** Answers against time logs for `dates`, for one user or (without `userId`) everyone who answered or clocked in. */
async function accuracyFor(dates: string[], userId?: string): Promise<AccuracyRow[]> {
  if (dates.length === 0) return [];
  const timeZone = getTimeZone();

  const [entries, logs] = await Promise.all([
    prisma.attendanceEntry.findMany({
      where: { userId, date: { in: dates }, slot: "AllDay" },
      select: { userId: true, date: true, status: true },
    }),
    prisma.timeLog.findMany({
      where: { userId, inTime: { gte: startOfDay(dates[0], 0), lt: startOfDay(dates[dates.length - 1], 1) } },
      select: { userId: true, inTime: true },
    }),
  ]);

  const userIds = [...new Set([...entries.map(e => e.userId), ...logs.map(l => l.userId)])];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, image: true },
    orderBy: { name: "asc" },
  });

  return users.map(user => ({
    user: { id: user.id, name: user.name, image: user.image ?? null },
    ...summarizeAccuracy(
      dates,
      entries.filter(e => e.userId === user.id).map(e => ({ date: e.date, status: toStatus(e.status) })),
      logs.filter(l => l.userId === user.id).map(l => calendarDateInZone(l.inTime, timeZone)),
    ),
  }));
}

/** Only days that are over count, so a member who will still come later today is not a no-show. */
export const pastDates = (dates: string[]): string[] => {
  const today = getToday();
  return dates.filter(date => date < today);
};

export async function getMyAccuracy(days = 30): Promise<AccuracyRow | null> {
  const userId = await requireUserId();
  const yesterday = addDays(getToday(), -1);
  const dates = Array.from({ length: days }, (_, i) => addDays(yesterday, i - days + 1));
  const [row] = await accuracyFor(dates, userId);
  return row ?? null;
}

export async function getTeamAccuracy(dates: string[]): Promise<AccuracyRow[]> {
  const session = await auth();
  if (session?.user.role !== Role.ADMIN) throw new Error("Forbidden");
  return accuracyFor(pastDates(dates));
}

// For the API-key authenticated Admin API, which gates access in the route handler.

export async function adminGetAttendance(dates: string[]): Promise<AdminAttendanceUser[]> {
  const [users, entries] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    prisma.attendanceEntry.findMany({
      where: { date: { in: dates }, slot: "AllDay" },
      select: { userId: true, date: true, status: true },
    }),
  ]);

  return users.map(user => ({
    ...user,
    days: dayStatuses(
      dates,
      entries.filter(entry => entry.userId === user.id).map(entry => ({ date: entry.date, status: toStatus(entry.status) })),
    ).map(day => ({ date: day.date, status: toApiStatus(day.status) })),
  }));
}
