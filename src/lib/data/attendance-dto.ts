import "server-only";
import { auth } from "@/auth";
import { AttendanceEntry } from "@/generated/prisma";
import { addDays, AttendanceStatus, calendarDateInZone, DayStatus, dayStatuses, monthDates, weekDates } from "../attendance";
import { getTimeZone } from "../config";
import prisma from "../prisma";

/** Deliberately without email: emails are only visible to admins elsewhere. */
export type BoardUser = { id: string; name: string; image: string | null };
export type BoardDay = { date: string } & Record<AttendanceStatus, BoardUser[]>;
/** The Admin API keeps its two answers until its design is settled (#132): will come is reported as AVAILABLE. */
export type ApiDayStatus = "AVAILABLE" | "UNAVAILABLE" | "NOT_FILLED";
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

/** The signed-in user's usual week, by weekday (0 = Monday). */
export async function getMyPattern(): Promise<Partial<Record<number, AttendanceStatus>>> {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { attendancePattern: true } });
  return Object.fromEntries((user?.attendancePattern ?? []).map(day => [day.weekday, toStatus(day.status)]));
}

export async function saveMyPattern(pattern: Partial<Record<number, AttendanceStatus>>): Promise<void> {
  const userId = await requireUserId();
  const days = Object.entries(pattern).flatMap(([weekday, status]) =>
    status ? [{ weekday: Number(weekday), status: STATUS_TO_DB[status] }] : []);
  await prisma.user.update({ where: { id: userId }, data: { attendancePattern: { set: days } } });
}

/** How many of the next 7 days (today included) the signed-in user hasn't answered. */
export async function countMyUnfilledDays(): Promise<number> {
  const userId = await requireUserId();
  const today = getToday();
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const filled = await prisma.attendanceEntry.count({ where: { userId, date: { in: dates }, slot: "AllDay" } });
  return dates.length - filled;
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
