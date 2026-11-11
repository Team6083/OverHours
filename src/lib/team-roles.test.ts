import { describe, expect, it } from "vitest";

import { parseAutoJoinRoles, planRoleMemberships } from "./team-roles";

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
