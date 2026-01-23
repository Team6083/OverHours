"use server";
import { revalidatePath } from "next/cache";

import { createTeam, deleteTeam } from "@/lib/data/team-dto";

export async function createTeamAction(parentTeamId?: string) {
  await createTeam("New Team", parentTeamId);

  revalidatePath("/admin/teams-new");
}

export async function deleteTeamAction(teamId: string) {
  await deleteTeam(teamId);

  revalidatePath("/admin/teams-new");
}
