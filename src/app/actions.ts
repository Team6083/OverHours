"use server";
import { revalidatePath } from "next/cache";

import { AlreadyClockedInError, clockIn, clockOut, NotClockedInError, TimeLogTooShortError } from "@/lib/data/timelog-dto";

export async function handleAdminClockIn(userId: string) {
  await clockIn(userId);
  revalidatePath("/");
}

export async function updatePage() {
  revalidatePath("/");
}

export type UserClockToggleActionState = {
  ok: boolean;
  error?: {
    name: string;
    message: string;

    minDurationSec?: number; // Only for TimeLogTooShortError
  }
};

export async function userClockToggle(userId: string, isClockedIn: boolean): Promise<UserClockToggleActionState> {
  try {
    if (isClockedIn) {
      await clockOut(userId);
    } else {
      await clockIn(userId);
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof AlreadyClockedInError || error instanceof NotClockedInError || error instanceof TimeLogTooShortError) {
      return {
        ok: false,
        error: {
          name: error.name,
          message: error.message,
          ...(error instanceof TimeLogTooShortError ? { minDurationSec: error.minDurationSec } : {})
        },
      };
    } else {
      throw error; // Re-throw unexpected errors
    }
  } finally {
    revalidatePath("/");
  }
}
