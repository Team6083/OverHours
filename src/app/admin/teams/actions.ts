"use server";
import { revalidatePath } from "next/cache";

import { setTeamLeaders, setTeamReminderWebhook } from "@/lib/data/team-reminder-dto";
import { addTeamMembers, createTeam, deleteTeam, removeTeamMember, toTeamError, updateTeam } from "@/lib/data/team-dto";

export type TeamActionResult = {
  error?: string;
  id?: string;
};

async function run(fn: () => Promise<string | void>): Promise<TeamActionResult> {
  try {
    const id = await fn();
    revalidatePath("/admin/teams", "layout");
    // Member teams are shown on the home page
    revalidatePath("/");
    return { id: id ?? undefined };
  } catch (e) {
    // Expected failures, such as a team already deleted in another tab, become a toast instead of an error page
    const teamError = toTeamError(e);
    if (teamError) {
      return { error: teamError.message };
    }
    throw e;
  }
}

export async function createTeamAction(name: string, parentTeamId?: string) {
  return run(async () => (await createTeam(name, parentTeamId)).id);
}

export async function renameTeamAction(id: string, name: string) {
  return run(async () => { await updateTeam(id, { name }); });
}

export async function moveTeamAction(id: string, parentTeamId: string | null) {
  return run(async () => { await updateTeam(id, { parentTeamId }); });
}

export async function setAutoJoinRolesAction(id: string, roles: string) {
  return run(async () => { await updateTeam(id, { autoJoinRoles: roles }); });
}

export async function deleteTeamAction(id: string) {
  return run(async () => { await deleteTeam(id); });
}

export async function addTeamMembersAction(teamId: string, userIds: string[]) {
  return run(async () => { await addTeamMembers(teamId, userIds); });
}

export async function removeTeamMemberAction(teamId: string, userId: string) {
  return run(async () => { await removeTeamMember(teamId, userId); });
}

export async function setTeamLeadersAction(teamId: string, userIds: string[]) {
  return run(async () => { await setTeamLeaders(teamId, userIds); });
}

export async function setTeamReminderWebhookAction(teamId: string, url: string | null) {
  return run(async () => { await setTeamReminderWebhook(teamId, url); });
}
