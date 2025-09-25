"use server";
import { revalidatePath } from "next/cache";

import { AlreadyClockedInError, clockIn, clockOut, NotClockedInError } from "@/lib/data/timelog-dto";

export async function handleAdminClockIn(userId: string) {
  await clockIn(userId);
  revalidatePath("/");
}

export async function updatePage() {
  revalidatePath("/");
}

export async function handleUserClockToggleClick(userId: string, isClockedIn: boolean) {
  try {
    if (isClockedIn) {
      await clockOut(userId);
    } else {
      await clockIn(userId);
    }
  } catch (error) {
    if (error instanceof AlreadyClockedInError || error instanceof NotClockedInError) {
      return {
        error: {
          code: error.name,
          message: error.message
        }
      };
    } else {
      throw error; // Re-throw unexpected errors
    }
  } finally {
    revalidatePath("/");
  }
}
