"use server";
import { revalidatePath } from "next/cache";
import * as z from "zod";

import { AttendanceStatus, isCalendarDate, weekStartOf } from "@/lib/attendance";
import { saveMyWeek } from "@/lib/data/attendance-dto";

const calendarDate = z.string().refine(isCalendarDate);
const schema = z.object({
  weekStart: calendarDate.refine(date => weekStartOf(date) === date),
  entries: z.record(calendarDate, z.enum(["AVAILABLE", "UNAVAILABLE"])),
});

export async function saveWeek(weekStart: string, entries: Record<string, AttendanceStatus>): Promise<{ ok: boolean }> {
  const parsed = schema.safeParse({ weekStart, entries });
  if (!parsed.success) return { ok: false };

  const ok = await saveMyWeek(parsed.data.weekStart, parsed.data.entries);

  revalidatePath("/attendance");
  return { ok };
}
