"use server";
import { revalidatePath } from "next/cache";

import { deleteUsers } from "@/lib/data/user-dto";

export async function handleDeleteUsers(ids: string[]) {
  await deleteUsers(ids);

  revalidatePath("/admin/users");
}

