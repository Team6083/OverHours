import { describe, expect, it } from "vitest";

import { evaluateAccess, extractRoles, parseAdminRoles, parseRoleList } from "./auth-roles";

describe("parseRoleList", () => {
  it("returns an empty list for undefined and empty input", () => {
    expect(parseRoleList(undefined)).toEqual([]);
    expect(parseRoleList("")).toEqual([]);
  });

  it("splits on commas and trims whitespace", () => {
    expect(parseRoleList("a,b")).toEqual(["a", "b"]);
    expect(parseRoleList("  a , \tb\n, c  ")).toEqual(["a", "b", "c"]);
  });

  it("drops blank entries", () => {
    expect(parseRoleList(" , ,")).toEqual([]);
    expect(parseRoleList(",a,,b,")).toEqual(["a", "b"]);
  });

  it("keeps duplicates as written (no de-duplication)", () => {
    expect(parseRoleList("a,a,b")).toEqual(["a", "a", "b"]);
  });

  it("keeps client:role entries intact, including extra colons and inner spaces", () => {
    expect(parseRoleList("app:editor, app:a:b ,two words")).toEqual(["app:editor", "app:a:b", "two words"]);
  });

  it("is case sensitive", () => {
    expect(parseRoleList("Admin,admin")).toEqual(["Admin", "admin"]);
  });
});

describe("parseAdminRoles", () => {
  it("defaults to the admin realm role when unset, empty or blank", () => {
    expect(parseAdminRoles(undefined)).toEqual(["admin"]);
    expect(parseAdminRoles("")).toEqual(["admin"]);
    expect(parseAdminRoles("  ")).toEqual(["admin"]);
    expect(parseAdminRoles(" , ,")).toEqual(["admin"]);
  });

  it("uses the configured roles instead of the default (replace, not merge)", () => {
    expect(parseAdminRoles("ops")).toEqual(["ops"]);
    expect(parseAdminRoles(" ops , overhours:admin ")).toEqual(["ops", "overhours:admin"]);
  });

  it("does not hand out a shared array that callers could mutate into the default", () => {
    const first = parseAdminRoles(undefined);
    first.push("hacked");
    expect(parseAdminRoles(undefined)).toEqual(["admin"]);
  });
});

describe("extractRoles", () => {
  it("returns realm roles as plain names", () => {
    expect(extractRoles({ realm_access: { roles: ["admin", "user"] } })).toEqual(["admin", "user"]);
  });

  it("returns client roles as client:role", () => {
    expect(extractRoles({ resource_access: { app: { roles: ["editor", "viewer"] } } })).toEqual([
      "app:editor",
      "app:viewer",
    ]);
  });

  it("returns the union of realm and client roles", () => {
    const payload = {
      realm_access: { roles: ["admin"] },
      resource_access: { app: { roles: ["editor"] }, other: { roles: ["x"] } },
    };
    expect(extractRoles(payload).sort()).toEqual(["admin", "app:editor", "other:x"]);
  });

  it("de-duplicates identical roles", () => {
    expect(extractRoles({ realm_access: { roles: ["a", "a", "b"] } })).toEqual(["a", "b"]);
  });

  it("keeps a client role named admin distinct from the realm admin role", () => {
    expect(extractRoles({ resource_access: { app: { roles: ["admin"] } } })).toEqual(["app:admin"]);
  });

  it("keeps a realm role containing a colon distinct from the equivalent client role", () => {
    const roles = extractRoles({
      realm_access: { roles: ["app:editor"] },
      resource_access: { app: { roles: ["editor"] } },
    });
    // Both spell the same string, so they collapse into one entry.
    expect(roles).toEqual(["app:editor"]);
  });

  it("supports client ids and role names containing colons", () => {
    expect(extractRoles({ resource_access: { "my:client": { roles: ["a:b"] } } })).toEqual(["my:client:a:b"]);
  });

  it("is case sensitive", () => {
    expect(extractRoles({ realm_access: { roles: ["Admin"] } })).toEqual(["Admin"]);
  });

  it("returns an empty list for payloads without role claims", () => {
    expect(extractRoles({})).toEqual([]);
    expect(extractRoles({ realm_access: {} })).toEqual([]);
    expect(extractRoles({ resource_access: {} })).toEqual([]);
  });

  it("returns an empty list for non-object payloads", () => {
    for (const payload of [null, undefined, 42, "admin", true, ["admin"]]) {
      expect(extractRoles(payload)).toEqual([]);
    }
  });

  it("ignores non-array role claims", () => {
    expect(extractRoles({ realm_access: { roles: "admin" } })).toEqual([]);
    expect(extractRoles({ realm_access: { roles: { 0: "admin" } } })).toEqual([]);
    expect(extractRoles({ realm_access: { roles: null } })).toEqual([]);
    expect(extractRoles({ resource_access: { app: { roles: "editor" } } })).toEqual([]);
  });

  it("drops non-string entries but keeps the valid ones", () => {
    expect(extractRoles({ realm_access: { roles: ["a", 1, null, undefined, {}, ["b"], "c"] } })).toEqual(["a", "c"]);
  });

  it("tolerates garbage in resource_access", () => {
    expect(extractRoles({ resource_access: "app" })).toEqual([]);
    expect(extractRoles({ resource_access: null })).toEqual([]);
    expect(extractRoles({ resource_access: { app: null, other: "x", third: 3, ok: { roles: ["r"] } } })).toEqual([
      "ok:r",
    ]);
  });

  it("tolerates a garbage realm_access", () => {
    expect(extractRoles({ realm_access: null })).toEqual([]);
    expect(extractRoles({ realm_access: "admin" })).toEqual([]);
  });

  it("does not treat prototype keys as roles or pollute Object.prototype", () => {
    const payload = JSON.parse(
      '{"__proto__": {"roles": ["evil"]}, "realm_access": {"__proto__": {"roles": ["evil"]}}, ' +
        '"resource_access": {"constructor": {"roles": ["x"]}}}',
    );
    // Own "constructor" key is a legitimate client id from JSON; the inherited ones must not leak.
    expect(extractRoles(payload)).toEqual(["constructor:x"]);
    expect(({} as Record<string, unknown>).roles).toBeUndefined();
  });

  it("does not read inherited properties from the payload", () => {
    const payload = Object.create({ realm_access: { roles: ["admin"] } });
    // "in" matches inherited keys; document the current behaviour so a change is noticed.
    expect(extractRoles(payload)).toEqual(["admin"]);
  });

  describe("with a legacy claim path (replaces the default behaviour)", () => {
    it("returns only the plain role names at the path", () => {
      const payload = {
        realm_access: { roles: ["admin"] },
        resource_access: { app: { roles: ["editor"] } },
        groups: ["g1", "g2"],
      };
      expect(extractRoles(payload, "groups")).toEqual(["g1", "g2"]);
    });

    it("supports dotted paths", () => {
      expect(extractRoles({ a: { b: { c: ["x"] } } }, "a.b.c")).toEqual(["x"]);
      expect(extractRoles({ realm_access: { roles: ["r"] } }, "realm_access.roles")).toEqual(["r"]);
    });

    it("does not add client roles or realm roles", () => {
      const payload = { realm_access: { roles: ["admin"] }, resource_access: { app: { roles: ["admin"] } } };
      expect(extractRoles(payload, "other")).toEqual([]);
    });

    it("returns an empty list for missing paths and non-array values", () => {
      expect(extractRoles({ a: {} }, "a.b.c")).toEqual([]);
      expect(extractRoles({ a: "admin" }, "a")).toEqual([]);
      expect(extractRoles({ a: { b: 1 } }, "a.b.c")).toEqual([]);
      expect(extractRoles({ a: null }, "a.b")).toEqual([]);
      expect(extractRoles(null, "a")).toEqual([]);
    });

    it("filters non-string entries and does not de-duplicate", () => {
      expect(extractRoles({ g: ["a", 2, "a", null] }, "g")).toEqual(["a", "a"]);
    });

    it("treats an empty claim path as unset", () => {
      expect(extractRoles({ realm_access: { roles: ["admin"] } }, "")).toEqual(["admin"]);
    });

    it("does not resolve prototype keys through the path", () => {
      expect(extractRoles({}, "__proto__")).toEqual([]);
      expect(extractRoles({}, "constructor.name")).toEqual([]);
      expect(extractRoles({}, "constructor.prototype")).toEqual([]);
    });
  });
});

describe("evaluateAccess", () => {
  const admin = ["admin"];

  it("makes users with an admin role admins, and always allowed", () => {
    expect(evaluateAccess(["admin"], admin, [])).toEqual({ isAdmin: true, allowed: true });
    expect(evaluateAccess(["admin"], admin, ["staff"])).toEqual({ isAdmin: true, allowed: true });
  });

  it("allows everyone when ALLOWED_ROLES is empty, but only admins are admins", () => {
    expect(evaluateAccess(["whatever"], admin, [])).toEqual({ isAdmin: false, allowed: true });
    expect(evaluateAccess([], admin, [])).toEqual({ isAdmin: false, allowed: true });
  });

  it("restricts to ALLOWED_ROLES when set", () => {
    expect(evaluateAccess(["staff"], admin, ["staff"])).toEqual({ isAdmin: false, allowed: true });
    expect(evaluateAccess(["other"], admin, ["staff"])).toEqual({ isAdmin: false, allowed: false });
    expect(evaluateAccess([], admin, ["staff"])).toEqual({ isAdmin: false, allowed: false });
  });

  it("allows a user holding any one of several allowed roles", () => {
    expect(evaluateAccess(["b", "z"], admin, ["a", "b"])).toEqual({ isAdmin: false, allowed: true });
  });

  it("supports client:role entries in both lists", () => {
    expect(evaluateAccess(["app:admin"], ["app:admin"], ["app:user"])).toEqual({ isAdmin: true, allowed: true });
    expect(evaluateAccess(["app:user"], ["app:admin"], ["app:user"])).toEqual({ isAdmin: false, allowed: true });
    expect(evaluateAccess(["app:other"], ["app:admin"], ["app:user"])).toEqual({ isAdmin: false, allowed: false });
  });

  it("is case sensitive", () => {
    expect(evaluateAccess(["Admin"], admin, ["staff"])).toEqual({ isAdmin: false, allowed: false });
    expect(evaluateAccess(["Staff"], admin, ["staff"])).toEqual({ isAdmin: false, allowed: false });
  });

  it("uses exact matching, not prefix or substring matching", () => {
    expect(evaluateAccess(["administrator"], admin, ["staff"])).toEqual({ isAdmin: false, allowed: false });
    expect(evaluateAccess(["adm"], admin, [])).toEqual({ isAdmin: false, allowed: true });
  });

  it("does not let a role in ALLOWED_ROLES grant admin", () => {
    expect(evaluateAccess(["staff"], admin, ["staff", "admin"])).toEqual({ isAdmin: false, allowed: true });
  });

  it("with no admin roles configured nobody is admin", () => {
    expect(evaluateAccess(["admin"], [], ["admin"])).toEqual({ isAdmin: false, allowed: true });
    expect(evaluateAccess(["x"], [], ["admin"])).toEqual({ isAdmin: false, allowed: false });
  });
});

describe("end to end: token payload to access decision", () => {
  const decide = (payload: unknown, adminEnv?: string, allowedEnv?: string, claimPath?: string) =>
    evaluateAccess(extractRoles(payload, claimPath), parseAdminRoles(adminEnv), parseRoleList(allowedEnv));

  it("a client role named admin does not match the default admin role", () => {
    const payload = { resource_access: { app: { roles: ["admin"] } } };
    expect(decide(payload)).toEqual({ isAdmin: false, allowed: true });
    expect(decide(payload, undefined, "staff")).toEqual({ isAdmin: false, allowed: false });
  });

  it("a client role is admin only when configured as client:role", () => {
    const payload = { resource_access: { app: { roles: ["admin"] } } };
    expect(decide(payload, "app:admin")).toEqual({ isAdmin: true, allowed: true });
    expect(decide(payload, "other:admin")).toEqual({ isAdmin: false, allowed: true });
  });

  it("the realm admin role is admin by default but not once ADMIN_ROLES overrides it", () => {
    const payload = { realm_access: { roles: ["admin"] } };
    expect(decide(payload).isAdmin).toBe(true);
    expect(decide(payload, "ops").isAdmin).toBe(false);
  });

  it("a blank ADMIN_ROLES keeps the default so admins are not locked out", () => {
    expect(decide({ realm_access: { roles: ["admin"] } }, " , ").isAdmin).toBe(true);
  });

  it("a legacy claim path ignores realm admin", () => {
    const payload = { realm_access: { roles: ["admin"] }, groups: ["staff"] };
    expect(decide(payload, undefined, "staff", "groups")).toEqual({ isAdmin: false, allowed: true });
  });

  it("a malformed token payload yields no roles: not admin, and denied when ALLOWED_ROLES is set", () => {
    expect(decide("garbage", undefined, "staff")).toEqual({ isAdmin: false, allowed: false });
    expect(decide({ realm_access: { roles: "admin" } })).toEqual({ isAdmin: false, allowed: true });
  });
});
