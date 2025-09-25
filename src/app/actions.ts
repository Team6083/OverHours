"use server";
import { revalidatePath } from "next/cache";

import { clockIn, clockOut } from "@/lib/data/timelog-dto";

export async function handleAdminClockIn(userId: string) {
  await clockIn(userId);
  revalidatePath("/");
}

export async function updatePage() {
  revalidatePath("/");
}

export async function handleUserClockToggleClick(userId: string, isClockedIn: boolean) {
  if (isClockedIn) {
    await clockOut(userId);
  } else {
    await clockIn(userId);
  }
  revalidatePath("/");
}
