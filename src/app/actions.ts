"use server";
import { revalidatePath } from "next/cache";

import { AlreadyClockedInError, clockIn, clockOut, NotClockedInError, TimeLogTooShortError, getAllUsersTotalTimeSec } from "@/lib/data/timelog-dto";
import { getAllUserNames } from "@/lib/data/user-dto";

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

export async function getLeaderboardRankings(opts?: {
  startDate?: Date;
  endDate?: Date;
}): Promise<{ id: string; name: string; duration: number }[]> {
  // Get All User Names
  const allUserNames = await getAllUserNames();
  const userNameMap = Object.fromEntries(allUserNames.map(user => [user.id, user.name]));

  // Get All Users Total Time with optional date range
  const allUsersTotalTimeSec = await getAllUsersTotalTimeSec(opts);
  
  // Create rankings sorted by duration
  const rankings = Object.entries(allUsersTotalTimeSec)
    .sort((a, b) => b[1] - a[1])
    .map(([id, duration]) => ({ id, name: userNameMap[id], duration }));

  return rankings;
}
