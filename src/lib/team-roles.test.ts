import { describe, expect, it } from "vitest";

import { parseAutoJoinRoles, planMergedTeams, planRoleMemberships } from "./team-roles";

describe("parseAutoJoinRoles", () => {
  it("parses a comma-separated list, dropping blanks and duplicates", () => {
    expect(parseAutoJoinRoles(" frc-ce, overhours:mentor ,,frc-ce ")).toEqual(["frc-ce", "overhours:mentor"]);
  });

  it("accepts an array", () => {
    expect(parseAutoJoinRoles(["a", " b ", ""])).toEqual(["a", "b"]);
  });

  it.each(["two words", ":role", "client:"])("rejects %s", (value) => {
    expect(() => parseAutoJoinRoles([value])).toThrow(/is not a role/);
  });
});

describe("planRoleMemberships", () => {
  const teams = [
    { id: "ce", autoJoinRoles: ["frc-ce"] },
    { id: "pm", autoJoinRoles: ["frc-pm", "overhours:pm"] },
  ];

  it("joins every team with a matching role", () => {
    expect(planRoleMemberships({ roles: ["frc-ce", "overhours:pm"], teamIds: [], roleTeamIds: [] }, teams))
      .toEqual({ join: ["ce", "pm"], leave: [], roleTeamIds: ["ce", "pm"] });
  });

  it("leaves a role team once the role is gone", () => {
    expect(planRoleMemberships({ roles: [], teamIds: ["ce"], roleTeamIds: ["ce"] }, teams))
      .toEqual({ join: [], leave: ["ce"], roleTeamIds: [] });
  });

  it("leaves a role team whose rules were removed", () => {
    expect(planRoleMemberships({ roles: ["frc-ce"], teamIds: ["old"], roleTeamIds: ["old"] }, teams))
      .toEqual({ join: ["ce"], leave: ["old"], roleTeamIds: ["ce"] });
  });

  it("keeps hand-added memberships, with or without the role", () => {
    expect(planRoleMemberships({ roles: ["frc-ce"], teamIds: ["ce", "pm"], roleTeamIds: [] }, teams))
      .toEqual({ join: [], leave: [], roleTeamIds: [] });
  });

  it("changes nothing when memberships already match", () => {
    expect(planRoleMemberships({ roles: ["frc-ce"], teamIds: ["ce"], roleTeamIds: ["ce"] }, teams))
      .toEqual({ join: [], leave: [], roleTeamIds: ["ce"] });
  });

  it("drops a role team the user was removed from elsewhere", () => {
    expect(planRoleMemberships({ roles: [], teamIds: [], roleTeamIds: ["ce"] }, teams))
      .toEqual({ join: [], leave: [], roleTeamIds: [] });
  });
});

describe("planMergedTeams", () => {
  const kept = { id: "kept", teamIds: ["a", "b", "c"], roleTeamIds: ["b", "c"] };
  const merged = { id: "merged", teamIds: ["c", "d", "e"], roleTeamIds: ["e"] };

  it("keeps every team with its source when nothing is dropped, and joins the merged user's teams", () => {
    expect(planMergedTeams([kept, merged], "kept", [])).toEqual({
      connect: ["d", "e"],
      disconnect: [],
      // c: the kept user joined by role, the merged user by hand → hand-made
      roleTeamIds: ["b", "e"],
    });
  });

  it("leaves the dropped teams, including the kept user's own", () => {
    expect(planMergedTeams([kept, merged], "kept", ["a", "b", "d"])).toEqual({
      connect: ["e"],
      disconnect: ["a", "b"],
      roleTeamIds: ["e"],
    });
  });

  it("keeps a role membership when every merged user in the team joined by role", () => {
    const other = { id: "other", teamIds: ["b"], roleTeamIds: ["b"] };
    expect(planMergedTeams([kept, other], "kept", ["a", "c"]).roleTeamIds).toEqual(["b"]);
  });

  it("keeps no team when every team is dropped", () => {
    expect(planMergedTeams([kept, merged], "kept", ["a", "b", "c", "d", "e"])).toEqual({
      connect: [],
      disconnect: ["a", "b", "c"],
      roleTeamIds: [],
    });
  });

  it("ignores duplicate ids", () => {
    expect(planMergedTeams([kept, merged], "kept", ["d", "d"]).connect).toEqual(["e"]);
  });

  it("ignores a dropped team none of the merged users is in", () => {
    expect(planMergedTeams([kept, merged], "kept", ["a", "x"])).toEqual({
      connect: ["d", "e"],
      disconnect: ["a"],
      roleTeamIds: ["b", "e"],
    });
  });

  it("rejects a kept user that is not one of the merged users", () => {
    expect(() => planMergedTeams([kept, merged], "nobody", [])).toThrow();
  });
});
