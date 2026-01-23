"use server";

import { updateTeam } from "@/lib/data/team-dto";
import { revalidatePath } from "next/cache";

export async function updateTeamName(id: string, name: string) {
  await updateTeam(id, { name });

  revalidatePath("/admin/teams-new");
}
