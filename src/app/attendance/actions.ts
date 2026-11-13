"use server";
import { revalidatePath } from "next/cache";
import * as z from "zod";

import { ATTENDANCE_STATUSES, AttendanceStatus, isCalendarDate, isMonth, weekStartOf } from "@/lib/attendance";
import { BoardDay, getDayBoard, getMyWeek, getUserAttendedDates, getUserMonth, saveMyPattern, saveMyWeek } from "@/lib/data/attendance-dto";

const calendarDate = z.string().refine(isCalendarDate);
const schema = z.object({
  weekStart: calendarDate.refine(date => weekStartOf(date) === date),
  entries: z.record(calendarDate, z.enum(ATTENDANCE_STATUSES)),
});

export async function saveWeek(weekStart: string, entries: Record<string, AttendanceStatus>): Promise<{ ok: boolean }> {
  const parsed = schema.safeParse({ weekStart, entries });
  if (!parsed.success) return { ok: false };

  const ok = await saveMyWeek(parsed.data.weekStart, parsed.data.entries);

  revalidatePath("/attendance");
  return { ok };
}

const monthSchema = z.object({ userId: z.string().min(1).max(64), month: z.string().refine(isMonth) });

export async function getPersonMonth(
  userId: string,
  month: string,
): Promise<{ ok: true; days: Record<string, AttendanceStatus>; attended: string[] } | { ok: false }> {
  const parsed = monthSchema.safeParse({ userId, month });
  if (!parsed.success) return { ok: false };

  try {
    const [days, attended] = await Promise.all([
      getUserMonth(parsed.data.userId, parsed.data.month),
      getUserAttendedDates(parsed.data.userId, parsed.data.month),
    ]);
    return { ok: true, days, attended };
  } catch (error) {
    console.error("Failed to load a member's attendance month", error);
    return { ok: false };
  }
}

export async function getBoardDay(date: string): Promise<{ ok: true; day: BoardDay } | { ok: false }> {
  if (!isCalendarDate(date)) return { ok: false };

  try {
    return { ok: true, day: await getDayBoard(date) };
  } catch (error) {
    console.error("Failed to load the attendance of a day", error);
    return { ok: false };
  }
}

/** The signed-in user's answers for a week, for copying them into another week. */
export async function getMyWeekAnswers(weekStart: string): Promise<{ ok: true; entries: Record<string, AttendanceStatus> } | { ok: false }> {
  if (!isCalendarDate(weekStart) || weekStartOf(weekStart) !== weekStart) return { ok: false };

  try {
    return { ok: true, entries: await getMyWeek(weekStart) };
  } catch (error) {
    console.error("Failed to load a week of answers", error);
    return { ok: false };
  }
}

// Partial: weekdays left out have no usual answer.
const patternSchema = z.partialRecord(z.enum(["0", "1", "2", "3", "4", "5", "6"]), z.enum(ATTENDANCE_STATUSES));

export async function savePattern(pattern: Partial<Record<number, AttendanceStatus>>): Promise<{ ok: boolean }> {
  const parsed = patternSchema.safeParse(pattern);
  if (!parsed.success) return { ok: false };

  try {
    await saveMyPattern(Object.fromEntries(Object.entries(parsed.data).map(([weekday, status]) => [Number(weekday), status])));
  } catch (error) {
    console.error("Failed to save the usual week", error);
    return { ok: false };
  }

  revalidatePath("/attendance");
  return { ok: true };
}
