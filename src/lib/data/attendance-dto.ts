import "server-only";
import { auth } from "@/auth";
import { AttendanceEntry } from "@/generated/prisma";
import { AttendanceStatus, calendarDateInZone, DayStatus, dayStatuses, weekDates } from "../attendance";
import { getTimeZone } from "../config";
import prisma from "../prisma";

export type BoardDay = { date: string; available: string[]; unavailable: string[] };
export type AdminAttendanceUser = {
  id: string;
  name: string;
  email: string;
  days: { date: string; status: DayStatus }[];
};

const toStatus = (status: AttendanceEntry["status"]): AttendanceStatus =>
  status === "Available" ? "AVAILABLE" : "UNAVAILABLE";

export function getToday(): string {
  return calendarDateInZone(new Date(), getTimeZone());
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getWeekBoard(weekStart: string): Promise<BoardDay[]> {
  await requireUserId();

  const dates = weekDates(weekStart);
  const entries = await prisma.attendanceEntry.findMany({
    where: { date: { in: dates }, slot: "AllDay" },
    select: { date: true, status: true, user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const names = (date: string, status: AttendanceEntry["status"]) => entries
    .filter(entry => entry.date === date && entry.status === status)
    .map(entry => entry.user.name);

  return dates.map(date => ({ date, available: names(date, "Available"), unavailable: names(date, "Unavailable") }));
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
    return [{ userId, date, status: status === "AVAILABLE" ? "Available" as const : "Unavailable" as const }];
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
    ),
  }));
}
