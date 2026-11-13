"use server";
import { revalidatePath } from "next/cache";
import * as z from "zod";

import { ATTENDANCE_STATUSES, AttendanceStatus, isCalendarDate, isMonth, weekStartOf } from "@/lib/attendance";
import { BoardDay, getDayBoard, getUserMonth, saveMyWeek } from "@/lib/data/attendance-dto";

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
): Promise<{ ok: true; days: Record<string, AttendanceStatus> } | { ok: false }> {
  const parsed = monthSchema.safeParse({ userId, month });
  if (!parsed.success) return { ok: false };

  try {
    return { ok: true, days: await getUserMonth(parsed.data.userId, parsed.data.month) };
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
