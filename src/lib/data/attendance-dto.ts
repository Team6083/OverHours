import "server-only";
import { auth, Role } from "@/auth";
import {
  addDays, attendanceSlackMessage, calendarDateInZone, DailyBoard, DutyRoleName, eventsOn, isInSeason,
  seasonDatesOfWeek, unfilledUsers, weekDates, weekStartOf,
} from "../attendance";
import { getTimeZone } from "../config";
import prisma from "../prisma";
import { withSlackIds } from "../slack";

export type AttendanceSeasonDTO = { id: string; name: string; startDate: string; endDate: string };
export type SeasonEventDTO = { id: string; name: string; startDate: string; endDate?: string; notes?: string };
export type AttendancePerson = { id: string; name: string; email: string };
export type PublicPerson = { id: string; name: string };
export type WantedRow = { userId: string; name: string; weeks: string[] };
export type DutyGrid = {
  users: { id: string; name: string; dutyRole: DutyRoleName }[];
  assignments: { userId: string; date: string; role: DutyRoleName }[];
  unavailable: { userId: string; date: string }[];
};

export function getToday(): string {
  return calendarDateInZone(new Date(), getTimeZone());
}

async function requireSession() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  return session;
}

async function requireUserId(): Promise<string> {
  const session = await requireSession();
  if (!session.user.id) throw new Error("Unauthorized");
  return session.user.id;
}

async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== Role.ADMIN) throw new Error("Forbidden");
  return session;
}

async function findSeason(): Promise<AttendanceSeasonDTO | null> {
  const season = await prisma.attendanceSeason.findFirst({ orderBy: { startDate: "desc" } });
  return season && { id: season.id, name: season.name, startDate: season.startDate, endDate: season.endDate };
}

async function findEvents(): Promise<SeasonEventDTO[]> {
  const events = await prisma.seasonEvent.findMany({ orderBy: { startDate: "asc" } });
  return events.map(event => ({
    id: event.id,
    name: event.name,
    startDate: event.startDate,
    endDate: event.endDate ?? undefined,
    notes: event.notes ?? undefined,
  }));
}

async function findRoster(): Promise<AttendancePerson[]> {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, attendanceExempt: true },
    orderBy: { name: "asc" },
  });

  return users
    .filter(user => user.attendanceExempt !== true)
    .map(({ id, name, email }) => ({ id, name, email }));
}

const findMarks = (dates: string[]) => prisma.attendanceMark.findMany({
  where: { date: { in: dates } },
  select: { userId: true, date: true },
});

async function buildDailyBoard(date: string): Promise<DailyBoard<AttendancePerson>> {
  const [events, roster, marks, duties] = await Promise.all([
    findEvents(),
    findRoster(),
    findMarks([date]),
    prisma.dutyAssignment.findMany({
      where: { date },
      select: { role: true, user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const unavailable = new Set(marks.map(mark => mark.userId));
  const onDuty = (role: DutyRoleName) => duties
    .filter(duty => duty.role === role)
    .map(({ user }) => user);

  return {
    date,
    events: eventsOn(date, events),
    duty: { CE: onDuty("CE"), PM: onDuty("PM"), MACHINING: onDuty("MACHINING") },
    available: roster.filter(person => !unavailable.has(person.id)),
  };
}

const toPublicPeople = (people: AttendancePerson[]): PublicPerson[] => people.map(({ id, name }) => ({ id, name }));

export async function getAttendanceSeason(): Promise<AttendanceSeasonDTO | null> {
  await requireSession();
  return findSeason();
}

export async function getSeasonEvents(): Promise<SeasonEventDTO[]> {
  await requireSession();
  return findEvents();
}

export async function getDailyBoard(date: string): Promise<DailyBoard<PublicPerson>> {
  await requireSession();

  const board = await buildDailyBoard(date);
  return {
    ...board,
    duty: {
      CE: toPublicPeople(board.duty.CE),
      PM: toPublicPeople(board.duty.PM),
      MACHINING: toPublicPeople(board.duty.MACHINING),
    },
    available: toPublicPeople(board.available),
  };
}

export async function getMyUnavailableDates(weekStart: string): Promise<string[]> {
  const userId = await requireUserId();

  const marks = await prisma.attendanceMark.findMany({
    where: { userId, date: { in: weekDates(weekStart) } },
    select: { date: true },
  });

  return marks.map(mark => mark.date);
}

export async function saveMyWeek(weekStart: string, unavailable: string[]): Promise<boolean> {
  const userId = await requireUserId();

  const season = await findSeason();
  const dates = season ? seasonDatesOfWeek(weekStart, season) : [];
  if (dates.length === 0) return false;

  const marks = Array.from(new Set(unavailable)).filter(date => dates.includes(date));

  await prisma.$transaction(async (tx) => {
    await tx.attendanceMark.deleteMany({ where: { userId, date: { in: dates } } });
    if (marks.length > 0) {
      await tx.attendanceMark.createMany({ data: marks.map(date => ({ userId, date })) });
    }
  });

  return true;
}

export async function saveAttendanceSeason(data: { name: string; startDate: string; endDate: string }) {
  await requireAdmin();

  const current = await findSeason();
  if (current) {
    await prisma.attendanceSeason.update({ where: { id: current.id }, data });
  } else {
    await prisma.attendanceSeason.create({ data });
  }
}

export async function createSeasonEvent(data: { name: string; startDate: string; endDate?: string; notes?: string }) {
  await requireAdmin();
  await prisma.seasonEvent.create({ data });
}

export async function deleteSeasonEvent(id: string) {
  await requireAdmin();
  await prisma.seasonEvent.delete({ where: { id } });
}

export async function getDutyGrid(weekStart: string): Promise<DutyGrid> {
  await requireAdmin();

  const dates = weekDates(weekStart);
  const [users, assignments, unavailable] = await Promise.all([
    prisma.user.findMany({
      where: { dutyRole: { not: null } },
      select: { id: true, name: true, dutyRole: true },
      orderBy: { name: "asc" },
    }),
    prisma.dutyAssignment.findMany({ where: { date: { in: dates } }, select: { userId: true, date: true, role: true } }),
    findMarks(dates),
  ]);

  return {
    users: users.flatMap(({ id, name, dutyRole }) => dutyRole ? [{ id, name, dutyRole }] : []),
    assignments,
    unavailable,
  };
}

export async function toggleDutyAssignment(userId: string, date: string) {
  await requireAdmin();

  const existing = await prisma.dutyAssignment.findUnique({ where: { userId_date: { userId, date } } });
  if (existing) {
    await prisma.dutyAssignment.delete({ where: { id: existing.id } });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { dutyRole: true } });
  if (!user?.dutyRole) throw new Error("User has no duty role");

  await prisma.dutyAssignment.create({ data: { userId, date, role: user.dutyRole } });
}

export async function getWantedList(): Promise<WantedRow[]> {
  await requireAdmin();

  const records = await prisma.wantedRecord.findMany({
    select: { userId: true, weekStart: true, user: { select: { name: true } } },
    orderBy: { weekStart: "desc" },
  });

  const rows = new Map<string, WantedRow>();
  for (const { userId, weekStart, user } of records) {
    const row = rows.get(userId) ?? { userId, name: user.name, weeks: [] };
    row.weeks.push(weekStart);
    rows.set(userId, row);
  }

  return Array.from(rows.values()).sort((a, b) => b.weeks.length - a.weeks.length);
}

// For the API-key authenticated Admin API, which gates access in the route handlers.

export function adminGetDailyBoard(date: string): Promise<DailyBoard<AttendancePerson>> {
  return buildDailyBoard(date);
}

/** Records the week that just ended, on Mondays only. Safe to repeat. */
export async function recordWanted(today: string): Promise<number> {
  if (weekStartOf(today) !== today) return 0;

  const season = await findSeason();
  const weekStart = addDays(today, -7);
  const dates = season ? seasonDatesOfWeek(weekStart, season) : [];
  if (dates.length === 0) return 0;

  const [roster, marks, existing] = await Promise.all([
    findRoster(),
    findMarks(dates),
    prisma.wantedRecord.findMany({ where: { weekStart }, select: { userId: true } }),
  ]);

  const done = new Set(existing.map(record => record.userId));
  const fresh = unfilledUsers(roster, marks, dates).filter(person => !done.has(person.id));
  if (fresh.length === 0) return 0;

  await prisma.wantedRecord.createMany({ data: fresh.map(person => ({ userId: person.id, weekStart })) });
  return fresh.length;
}

export async function buildAttendanceMessage(today: string, url?: string): Promise<string | null> {
  const season = await findSeason();
  if (!season) return null;

  const tomorrow = addDays(today, 1);
  const nextWeekDates = seasonDatesOfWeek(addDays(weekStartOf(today), 7), season);

  const [roster, marks, board] = await Promise.all([
    findRoster(),
    findMarks(nextWeekDates),
    buildDailyBoard(tomorrow),
  ]);

  const nextWeekUnfilled = nextWeekDates.length > 0
    ? await withSlackIds(unfilledUsers(roster, marks, nextWeekDates), process.env.SLACK_BOT_TOKEN?.trim())
    : null;

  return attendanceSlackMessage({
    nextWeekUnfilled,
    tomorrowAvailable: isInSeason(tomorrow, season) ? board.available : null,
    url,
  });
}
