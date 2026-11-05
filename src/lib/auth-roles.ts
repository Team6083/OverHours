// Pure helpers for turning Keycloak token claims into a flat role list and checking it against
// the ADMIN_ROLES / ALLOWED_ROLES settings. Kept free of Auth.js / env access so it is easy to test.
//
// Role syntax: realm roles are written as-is ("admin"), client roles as "<client-id>:<role>".

const DEFAULT_ADMIN_ROLES = ["admin"];

/** Parses a comma-separated role list. Blank entries are dropped. */
export function parseRoleList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((role) => role.trim())
    .filter((role) => role.length > 0);
}

/** ADMIN_ROLES, falling back to the legacy hard-coded "admin" realm role when unset or blank. */
export function parseAdminRoles(value: string | undefined): string[] {
  const roles = parseRoleList(value);
  return roles.length > 0 ? roles : [...DEFAULT_ADMIN_ROLES];
}

function getClaimByPath(payload: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, payload);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/**
 * Union of realm roles (`realm_access.roles`) and client roles
 * (`resource_access.<client>.roles`, returned as `client:role`).
 * If `claimPath` (the legacy AUTH_KEYCLOAK_ROLES_CLAIM setting) is given, only the plain role names at
 * that path are returned instead.
 */
export function extractRoles(payload: unknown, claimPath?: string): string[] {
  if (claimPath) {
    return toStringArray(getClaimByPath(payload, claimPath));
  }

  const roles = new Set<string>(toStringArray(getClaimByPath(payload, "realm_access.roles")));

  const resourceAccess = getClaimByPath(payload, "resource_access");
  if (resourceAccess && typeof resourceAccess === "object") {
    for (const [client, access] of Object.entries(resourceAccess)) {
      for (const role of toStringArray((access as { roles?: unknown } | null)?.roles)) {
        roles.add(`${client}:${role}`);
      }
    }
  }

  return [...roles];
}

export function evaluateAccess(
  userRoles: string[],
  adminRoles: string[],
  allowedRoles: string[],
): { isAdmin: boolean; allowed: boolean } {
  const isAdmin = userRoles.some((role) => adminRoles.includes(role));
  // Admins are always allowed; an empty ALLOWED_ROLES means no restriction.
  const allowed = isAdmin || allowedRoles.length === 0 || userRoles.some((role) => allowedRoles.includes(role));
  return { isAdmin, allowed };
}
