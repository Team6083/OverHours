import { parseCommaList } from "@/lib/auth-roles";

/** What an Admin API caller may do. `ADMIN_API_KEY` and tokens with an admin role have every scope. */
export const API_SCOPES = [
  "attendance:read",
  "timelogs:read",
  "timelogs:write",
  "users:read",
  "users:write",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

/** `attendance:read` → `API_ROLES_ATTENDANCE_READ`. */
export const scopeRolesEnvName = (scope: ApiScope) => `API_ROLES_${scope.replace(":", "_").toUpperCase()}`;

/** Roles that grant `scope`, from its `API_ROLES_*` variable (same syntax as `ADMIN_ROLES`). */
export function rolesForScope(scope: ApiScope, env: Record<string, string | undefined>): string[] {
  return parseCommaList(env[scopeRolesEnvName(scope)]);
}

/** Whether a token with `tokenRoles` may use a scope: any admin role, or any of the roles configured for that scope. */
export function rolesGrantScope(tokenRoles: string[], adminRoles: string[], scopeRoles: string[]): boolean {
  return tokenRoles.some(role => adminRoles.includes(role) || scopeRoles.includes(role));
}
