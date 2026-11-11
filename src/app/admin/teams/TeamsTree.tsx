"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge, Button, ButtonGroup, HStack, IconButton, TreeView, createTreeCollection, useTreeView, useTreeViewContext } from "@chakra-ui/react";
import { LuPlus, LuSquareMinus, LuSquarePlus, LuUsers } from "react-icons/lu";

import { toaster } from "@/components/ui/toaster";
import type { TeamDTO } from "@/lib/data/team-dto";
import { buildTeamTree, getTeamAncestors, type TeamTreeNode } from "@/lib/team-tree";
import { createTeamAction } from "./actions";

type Node = TeamTreeNode<TeamDTO>;

function useCreateTeam() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const create = async (parentTeamId?: string) => {
    setLoading(true);
    try {
      const result = await createTeamAction("New Team", parentTeamId);
      if (result.error) {
        toaster.error({ title: result.error });
      } else if (result.id) {
        router.push(`/admin/teams/${result.id}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return { create, loading };
}

export function CreateTeamButton() {
  const { create, loading } = useCreateTeam();
  return <Button loading={loading} onClick={() => create()}>
    <LuPlus /> Create team
  </Button>;
}

function TreeToolbar() {
  const tree = useTreeViewContext();
  const { create, loading } = useCreateTeam();

  const branches = tree.collection.getBranchValues();
  const isAllExpanded = branches.length > 0 && branches.every(value => tree.expandedValue.includes(value));

  return (
    <ButtonGroup size="2xs" variant="outline">
      {branches.length > 0 && (isAllExpanded
        ? <Button onClick={() => tree.collapse()}>Collapse all</Button>
        : <Button onClick={() => tree.expand()}>Expand all</Button>)}
      <IconButton aria-label="Create top-level team" loading={loading} onClick={() => create()}>
        <LuPlus />
      </IconButton>
    </ButtonGroup>
  );
}

function AddSubTeamButton(props: { node: Node }) {
  const tree = useTreeViewContext();
  const { create, loading } = useCreateTeam();

  return (
    <IconButton
      size="2xs"
      variant="ghost"
      aria-label={`Add sub-team to ${props.node.name}`}
      loading={loading}
      css={{ opacity: 0, "[role=treeitem]:hover > * > &, [role=treeitem]:hover > &": { opacity: 1 } }}
      onClick={(e) => {
        e.stopPropagation();
        tree.expand([props.node.id]);
        create(props.node.id);
      }}
    >
      <LuPlus />
    </IconButton>
  );
}

export default function TeamsTree(props: { teams: TeamDTO[] }) {
  const { teams } = props;
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const selectedId = params.id;

  const collection = useMemo(() => createTreeCollection<Node>({
    nodeToValue: (node) => node.id,
    nodeToString: (node) => node.name,
    rootNode: {
      id: "ROOT",
      name: "",
      memberCount: 0,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      children: buildTeamTree(teams),
    },
  }), [teams]);

  // Open the path to the selected team, so it is visible after navigating to it
  const defaultExpandedValue = useMemo(
    () => selectedId ? getTeamAncestors(teams, selectedId).map(team => team.id) : [],
    [teams, selectedId],
  );

  const store = useTreeView({
    collection,
    defaultExpandedValue,
    selectedValue: selectedId ? [selectedId] : [],
    onSelectionChange: (details) => {
      const id = details.selectedValue[0];
      if (id && id !== selectedId) {
        router.push(`/admin/teams/${id}`);
      }
    },
  });

  const label = (node: Node) => <>
    {node.name}
    {node.memberCount > 0 && <Badge size="xs" variant="surface" ms={1}>{node.memberCount}</Badge>}
  </>;

  return <TreeView.RootProvider value={store} size="md">
    <HStack justify="space-between">
      <TreeView.Label>Teams</TreeView.Label>
      <TreeToolbar />
    </HStack>
    <TreeView.Tree>
      <TreeView.Node<Node>
        indentGuide={<TreeView.BranchIndentGuide />}
        render={({ node, nodeState }) =>
          nodeState.isBranch ? (
            <TreeView.BranchControl>
              {nodeState.expanded ? <LuSquareMinus /> : <LuSquarePlus />}
              <TreeView.BranchText flex="1">{label(node)}</TreeView.BranchText>
              <AddSubTeamButton node={node} />
            </TreeView.BranchControl>
          ) : (
            <TreeView.Item>
              <LuUsers />
              <TreeView.ItemText flex="1">{label(node)}</TreeView.ItemText>
              <AddSubTeamButton node={node} />
            </TreeView.Item>
          )
        }
      />
    </TreeView.Tree>
  </TreeView.RootProvider>;
}
