"use server";
import { revalidatePath } from "next/cache";

import { deleteStatRanges } from "@/lib/data/statrange-dto";

export async function handleDeleteStatRanges(ids: string[]) {
  await deleteStatRanges(ids);

  revalidatePath("/admin/stat-ranges");
}
