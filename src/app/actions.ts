"use server";
import { revalidatePath } from "next/cache";

import { clockIn } from "@/lib/data/timelog-dto";

export async function handleAdminClockIn(userId: string) {
  await clockIn(userId);
  revalidatePath("/");
}

export async function refreshPage() {
  revalidatePath("/");
}
