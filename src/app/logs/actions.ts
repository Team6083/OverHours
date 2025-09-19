"use server";
import { revalidatePath } from "next/cache";

import { deleteTimeLogs } from "@/lib/data/timelog-dto";

export async function handleDeleteLogs(ids: string[]) {
  await deleteTimeLogs(ids);

  revalidatePath("/logs");
}
