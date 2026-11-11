export type TeamLike = { id: string; parentTeamId?: string };

export type TeamTreeNode<T extends TeamLike> = T & { children: TeamTreeNode<T>[] };

/** Builds the team forest. A team whose parent is missing is treated as a root. */
export function buildTeamTree<T extends TeamLike>(teams: T[]): TeamTreeNode<T>[] {
  const nodes = new Map<string, TeamTreeNode<T>>(teams.map(team => [team.id, { ...team, children: [] }]));
  const roots: TeamTreeNode<T>[] = [];

  for (const node of nodes.values()) {
    const parent = node.parentTeamId ? nodes.get(node.parentTeamId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** The ancestors of a team, nearest first. Stops at a missing parent or a cycle. */
export function getTeamAncestors<T extends TeamLike>(teams: T[], id: string): T[] {
  const byId = new Map(teams.map(team => [team.id, team]));
  const ancestors: T[] = [];
  const seen = new Set([id]);

  let parentId = byId.get(id)?.parentTeamId;
  while (parentId && !seen.has(parentId)) {
    const parent = byId.get(parentId);
    if (!parent) break;
    ancestors.push(parent);
    seen.add(parentId);
    parentId = parent.parentTeamId;
  }

  return ancestors;
}

/** Whether making `parentId` the parent of team `id` would put the team under itself. */
export function wouldCreateCycle(teams: TeamLike[], id: string, parentId: string): boolean {
  if (id === parentId) return true;
  return getTeamAncestors(teams, parentId).some(team => team.id === id);
}
