// Pure helpers for joining teams by Keycloak role. Kept free of Prisma / Auth.js so it is easy to test.
//
// A team's auto-join roles use the ADMIN_ROLES syntax: realm roles as-is (`frc-ce`), client roles as
// `client:role` (`overhours:mentor`). A user with any of them joins the team.

import { parseCommaList } from "./auth-roles";

const MAX_ROLE_LENGTH = 255;

/**
 * Parses an admin-entered, comma-separated role list: trimmed, blanks and duplicates dropped. Throws when
 * an entry is not a valid role name.
 */
export function parseAutoJoinRoles(value: string | string[]): string[] {
  const roles = Array.isArray(value) ? value.map(role => role.trim()).filter(Boolean) : parseCommaList(value);

  for (const role of roles) {
    if (role.length > MAX_ROLE_LENGTH || /[\s,]/.test(role) || role.startsWith(":") || role.endsWith(":")) {
      throw new Error(`"${role}" is not a role. Use a realm role name, or client:role for a client role.`);
    }
  }

  return [...new Set(roles)];
}

export type RoleRuleTeam = { id: string; autoJoinRoles: string[] };

export type RoleMembershipPlan = {
  join: string[];
  leave: string[];
  // The user's role-joined teams after the change
  roleTeamIds: string[];
};

/**
 * Works out which teams the user joins or leaves for their roles:
 * - a matching team they are not in → join (as a role member);
 * - a team they joined by role and no longer match (or that has no rules any more) → leave;
 * - a team they were added to by hand → untouched, matching or not.
 */
export function planRoleMemberships(
  user: { roles: string[]; teamIds: string[]; roleTeamIds: string[] },
  teams: RoleRuleTeam[],
): RoleMembershipPlan {
  const roles = new Set(user.roles);
  const teamIds = new Set(user.teamIds);
  const matching = new Set(teams.filter(team => team.autoJoinRoles.some(role => roles.has(role))).map(team => team.id));

  const join = [...matching].filter(id => !teamIds.has(id));
  // A role team the user is no longer in (removed elsewhere) is just dropped from the list
  const leave = user.roleTeamIds.filter(id => !matching.has(id) && teamIds.has(id));

  const roleTeamIds = [...new Set([
    ...user.roleTeamIds.filter(id => matching.has(id) && teamIds.has(id)),
    ...join,
  ])];

  return { join, leave, roleTeamIds };
}

export type MergeTeamsUser = { id: string; teamIds: string[]; roleTeamIds: string[] };

export type MergedTeamsPlan = {
  // Teams the kept user joins or leaves
  connect: string[];
  disconnect: string[];
  // The kept user's role-joined teams after the merge
  roleTeamIds: string[];
};

/**
 * Works out the kept user's teams after a merge, from the teams the admin chose to drop:
 * - the kept user ends up in every team any merged user is in, except the dropped ones, so a team that was
 *   joined after the admin made the choice is kept;
 * - a kept team stays a role membership only if every merged user in it joined by role; if any of them was
 *   added by hand, the kept user is now a hand-made member, so the role sync never removes them;
 * - dropped teams are left, including the kept user's own; a dropped id that is no team of the merged users is
 *   ignored, as there is nothing to drop.
 */
export function planMergedTeams(users: MergeTeamsUser[], targetId: string, dropTeamIds: string[]): MergedTeamsPlan {
  const target = users.find(user => user.id === targetId);
  if (!target) {
    throw new Error("The kept user must be one of the merged users.");
  }

  const drop = new Set(dropTeamIds);
  const keep = [...new Set(users.flatMap(user => user.teamIds))].filter(id => !drop.has(id));

  const holders = (teamId: string) => users.filter(user => user.teamIds.includes(teamId));
  const roleTeamIds = keep.filter(id => holders(id).every(user => user.roleTeamIds.includes(id)));

  return {
    connect: keep.filter(id => !target.teamIds.includes(id)),
    disconnect: target.teamIds.filter(id => drop.has(id)),
    roleTeamIds,
  };
}
