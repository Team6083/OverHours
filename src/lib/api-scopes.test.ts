import { describe, expect, it } from "vitest";

import { rolesForScope, rolesGrantScope, scopeRolesEnvName } from "./api-scopes";

describe("API scope roles", () => {
  it("names one variable per scope", () => {
    expect(scopeRolesEnvName("attendance:read")).toBe("API_ROLES_ATTENDANCE_READ");
    expect(scopeRolesEnvName("timelogs:write")).toBe("API_ROLES_TIMELOGS_WRITE");
  });

  it("reads the scope's roles in the ADMIN_ROLES syntax", () => {
    expect(rolesForScope("users:read", { API_ROLES_USERS_READ: " reader, overhours:users-read ,," }))
      .toEqual(["reader", "overhours:users-read"]);
    expect(rolesForScope("users:read", {})).toEqual([]);
  });

  it("grants a scope for an admin role or one of its roles", () => {
    expect(rolesGrantScope(["overhours:reader"], ["admin"], ["overhours:reader"])).toBe(true);
    expect(rolesGrantScope(["admin"], ["admin"], [])).toBe(true);
    expect(rolesGrantScope(["reader"], ["admin"], ["overhours:reader"])).toBe(false);
    expect(rolesGrantScope([], ["admin"], [])).toBe(false);
  });
});
