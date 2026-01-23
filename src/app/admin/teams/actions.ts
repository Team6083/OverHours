"use server";
import { revalidatePath } from "next/cache";

import { deleteTeams } from "@/lib/data/team-dto";

export async function handleDeleteTeams(ids: string[]) {
  await deleteTeams(ids);

  revalidatePath("/admin/teams");
}

