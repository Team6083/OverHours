"use server";
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

  redirect("/admin/users");
}
