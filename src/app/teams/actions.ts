"use server";
import { revalidatePath } from "next/cache";

import { saveTeamReminder } from "@/lib/data/team-reminder-dto";
import { toTeamError } from "@/lib/data/team-dto";

export async function saveTeamReminderAction(teamId: string, settings: unknown): Promise<{ ok: boolean }> {
  try {
    await saveTeamReminder(teamId, settings);
    revalidatePath(`/teams/${teamId}`);
    return { ok: true };
  } catch (error) {
    if (toTeamError(error)) return { ok: false };
    throw error;
  }
}
