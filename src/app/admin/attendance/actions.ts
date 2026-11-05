"use server";
import { revalidatePath } from "next/cache";
import * as z from "zod";

import { isCalendarDate } from "@/lib/attendance";
import {
  createSeasonEvent, deleteSeasonEvent, saveAttendanceSeason, toggleDutyAssignment,
} from "@/lib/data/attendance-dto";
import { objectIdSchema } from "@/lib/objectid";

const calendarDate = z.string().refine(isCalendarDate, "Enter a valid date");

const seasonSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    startDate: calendarDate,
    endDate: calendarDate,
  })
  .refine(data => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

const eventSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    startDate: calendarDate,
    endDate: z.union([calendarDate, z.literal("")]).transform(v => v || undefined),
    notes: z.string().trim().transform(v => v || undefined),
  })
  .refine(data => !data.endDate || data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export type FormState = { error?: string };

function refresh() {
  revalidatePath("/admin/attendance");
  revalidatePath("/attendance");
}

export async function submitSeason(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = seasonSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await saveAttendanceSeason(parsed.data);
  refresh();
  return {};
}

export async function submitEvent(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = eventSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await createSeasonEvent(parsed.data);
  refresh();
  return {};
}

export async function removeEvent(id: string) {
  await deleteSeasonEvent(objectIdSchema.parse(id));
  refresh();
}

export async function toggleDuty(userId: string, date: string) {
  await toggleDutyAssignment(objectIdSchema.parse(userId), calendarDate.parse(date));
  refresh();
}
