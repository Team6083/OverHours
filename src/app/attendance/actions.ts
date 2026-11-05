"use server";
import { revalidatePath } from "next/cache";
import * as z from "zod";

import { isCalendarDate, weekStartOf } from "@/lib/attendance";
import { saveMyWeek } from "@/lib/data/attendance-dto";

const calendarDate = z.string().refine(isCalendarDate);
const schema = z.object({
  weekStart: calendarDate.refine(date => weekStartOf(date) === date),
  unavailable: z.array(calendarDate).max(7),
});

export async function saveWeek(weekStart: string, unavailable: string[]): Promise<{ ok: boolean }> {
  const parsed = schema.safeParse({ weekStart, unavailable });
  if (!parsed.success) return { ok: false };

  const ok = await saveMyWeek(parsed.data.weekStart, parsed.data.unavailable);

  revalidatePath("/attendance");
  revalidatePath("/admin/attendance");
  return { ok };
}
