import "server-only";
import prisma from "../prisma";
import { planRoleMemberships } from "../team-roles";

/**
 * Makes the user's role memberships match their verified roles (see `planRoleMemberships`). Called at
 * sign-in and on every access token refresh; writes nothing when nothing changes.
 */
export async function syncUserRoleTeams(userId: string, roles: string[]) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { teamIds: true, roleTeamIds: true },
  });
  if (!user) return;

  const teams = await prisma.team.findMany({
    where: { autoJoinRoles: { isEmpty: false } },
    select: { id: true, autoJoinRoles: true },
  });

  const plan = planRoleMemberships({ roles, teamIds: user.teamIds, roleTeamIds: user.roleTeamIds }, teams);

  const unchanged = plan.join.length === 0 && plan.leave.length === 0
    && plan.roleTeamIds.length === user.roleTeamIds.length
    && plan.roleTeamIds.every(id => user.roleTeamIds.includes(id));
  if (unchanged) return;

  // One update: it sets the user's own document, and the nested connect / disconnect also writes each joined
  // or left Team's `userIds`. Prisma changes those with atomic add / remove operators rather than rewriting
  // the whole list, so concurrent syncs of other users on the same teams cannot undo each other.
  await prisma.user.update({
    where: { id: userId },
    data: {
      roleTeamIds: plan.roleTeamIds,
      teams: {
        connect: plan.join.map(id => ({ id })),
        disconnect: plan.leave.map(id => ({ id })),
      },
    },
  });
}
