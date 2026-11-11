import { describe, expect, it } from "vitest";

import { buildTeamTree, getTeamAncestors, wouldCreateCycle } from "./team-tree";

const teams = [
  { id: "root" },
  { id: "a", parentTeamId: "root" },
  { id: "a1", parentTeamId: "a" },
  { id: "b", parentTeamId: "root" },
  { id: "orphan", parentTeamId: "gone" },
];

describe("buildTeamTree", () => {
  it("nests teams under their parents and keeps orphans as roots", () => {
    const tree = buildTeamTree(teams);

    expect(tree.map(n => n.id)).toEqual(["root", "orphan"]);
    expect(tree[0].children.map(n => n.id)).toEqual(["a", "b"]);
    expect(tree[0].children[0].children.map(n => n.id)).toEqual(["a1"]);
  });
});

describe("getTeamAncestors", () => {
  it("lists ancestors nearest first", () => {
    expect(getTeamAncestors(teams, "a1").map(t => t.id)).toEqual(["a", "root"]);
  });

  it("stops at a missing parent", () => {
    expect(getTeamAncestors(teams, "orphan")).toEqual([]);
  });

  it("terminates on a cycle", () => {
    const cyclic = [{ id: "x", parentTeamId: "y" }, { id: "y", parentTeamId: "x" }];
    expect(getTeamAncestors(cyclic, "x").map(t => t.id)).toEqual(["y"]);
  });
});

describe("wouldCreateCycle", () => {
  it("refuses a team as its own parent", () => {
    expect(wouldCreateCycle(teams, "a", "a")).toBe(true);
  });

  it("refuses moving a team under its descendant", () => {
    expect(wouldCreateCycle(teams, "root", "a1")).toBe(true);
  });

  it("allows moving a team under an unrelated team", () => {
    expect(wouldCreateCycle(teams, "a1", "b")).toBe(false);
  });
});
