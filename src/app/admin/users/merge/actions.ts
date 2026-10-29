"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { MergeUsersError, mergeUsers } from "@/lib/data/user-merge";

export type MergeUsersState = {
  error?: string;
};

export async function handleMergeUsers(targetId: string, userIds: string[]): Promise<MergeUsersState> {
  try {
    await mergeUsers(targetId, userIds);
  } catch (e) {
    if (e instanceof MergeUsersError) {
      return { error: e.message };
    }
    throw e;
  }

  for (const path of ["/admin/users", "/", "/logs"]) {
    revalidatePath(path);
  }

  redirect("/admin/users");
}
