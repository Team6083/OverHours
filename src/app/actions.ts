"use server";
import { clockIn } from "@/lib/data/timelog-dto";
import { revalidatePath } from "next/cache";

export async function handleAdminClockIn(userId: string) {
  await clockIn(userId);
  revalidatePath("/");
}
