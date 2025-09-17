"use server";
import { revalidatePath } from "next/cache";

import { deleteLogs } from "@/lib/data/timelog-dto";

export async function handleDeleteLogs(ids: string[]) {
  await deleteLogs(ids);

  revalidatePath("/logs");
}
