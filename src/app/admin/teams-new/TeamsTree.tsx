"use client";

import { Button, ButtonGroup, HStack, IconButton, TreeView, createTreeCollection, useTreeView, useTreeViewContext } from "@chakra-ui/react";
import { isEqual } from "es-toolkit"
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LuArrowRight, LuPlus, LuSquareMinus, LuSquarePlus, LuTrash, LuUsers } from "react-icons/lu";

import { TeamDTO } from "@/lib/data/team-dto";
import { createTeamAction, deleteTeamAction } from "./actions";

const buildTree = (teams: TeamDTO[]): Node[] => {
  const teamMap = new Map<string, Node>();
  const roots: Node[] = [];

  // Create nodes for all teams
  teams.forEach(team => {
    teamMap.set(team.id, {
      id: team.id,
      name: team.name,
      children: []
    });
  });

  // Build the tree structure
  teams.forEach(team => {
    const node = teamMap.get(team.id)!;
    if (team.parentTeamId) {
      const parent = teamMap.get(team.parentTeamId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
};

const TopRightButtons = () => {
  const tree = useTreeViewContext();
  const isAllExpanded = useMemo(
    () => isEqual(tree.expandedValue, tree.collection.getBranchValues()),
    [tree.expandedValue, tree.collection],
  );

  const [loading, setLoading] = useState(false);
  const handleCreateTeamOnClick = () => {
    setLoading(true);
    createTeamAction().finally(() => {
      setLoading(false);
    });
  }

  return (
    <ButtonGroup size="2xs" variant="outline">
      <Button
        aria-label="Expand all"
        onClick={() => tree.expand()}
        hidden={isAllExpanded}
      >
        Expand all
      </Button>
      <Button
        aria-label="Collapse all"
        onClick={() => tree.collapse()}
        hidden={!isAllExpanded}
      >
        Collapse all
      </Button>
      <IconButton aria-label="Create Team" loading={loading} onClick={handleCreateTeamOnClick}><LuPlus /></IconButton>
    </ButtonGroup>
  );
}

interface TreeNodeProps extends TreeView.NodeProviderProps<Node> {
  onRemove?: (props: TreeView.NodeProviderProps<Node>) => Promise<void>
  onAdd?: (props: TreeView.NodeProviderProps<Node>) => Promise<void>
}

const TreeNodeActions = (props: TreeNodeProps) => {
  const { onRemove, onAdd, node } = props;
  const tree = useTreeViewContext();
  const router = useRouter();

  const [removeLoading, setRemoveLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const handleRemove = (e: React.MouseEvent) => {
    setRemoveLoading(true);
    e.stopPropagation();

    onRemove?.(props)
      .finally(() => {
        setRemoveLoading(false);
      });
  }

  const handleAdd = (e: React.MouseEvent) => {
    setAddLoading(true);
    e.stopPropagation();

    onAdd?.(props)
      .then(() => {
        tree.expand([node.id]);
      })
      .finally(() => {
        setAddLoading(false);
      });
  }

  return (
    <HStack
      gap="0.5"
      position="absolute"
      right="0"
      top="0"
      scale="0.8"
      css={{
        opacity: 0,
        "[role=treeitem]:hover &": { opacity: 1 },
      }}
    >
      <IconButton
        size="xs"
        variant="ghost"
        aria-label="Remove node"
        loading={removeLoading}
        disabled={!onRemove}
        onClick={handleRemove}
      >
        <LuTrash />
      </IconButton>
      <IconButton
        size="xs"
        variant="ghost"
        aria-label="Add node"
        loading={addLoading}
        disabled={!onAdd}
        onClick={handleAdd}
      >
        <LuPlus />
      </IconButton>
      <IconButton
        size="xs"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/admin/teams-new/${node.id}`);
        }}
      >
        <LuArrowRight />
      </IconButton>
    </HStack>
  )
}

export default function TeamsTree(props: { teams: TeamDTO[] }) {
  const collection = useMemo(() => createTreeCollection<Node>({
    nodeToValue: (node) => node.id,
    nodeToString: (node) => node.name,
    rootNode: {
      id: "ROOT",
      name: "",
      children: buildTree(props.teams),
    },
  }), [props.teams]);

  const store = useTreeView({
    collection,
    defaultExpandedValue: [],
  });

  return <TreeView.RootProvider value={store} size="md" animateContent>
    <HStack justify="space-between">
      <TreeView.Label>Teams</TreeView.Label>
      <TopRightButtons />
    </HStack>
    <TreeView.Tree>
      <TreeView.Node
        indentGuide={<TreeView.BranchIndentGuide />}
        render={({ node, nodeState, indexPath }) =>
          nodeState.isBranch ? (
            <TreeView.BranchControl>
              {nodeState.expanded ? <LuSquareMinus /> : <LuSquarePlus />}
              <TreeView.BranchText>{node.name}</TreeView.BranchText>
              <TreeNodeActions
                node={node}
                indexPath={indexPath}
                onAdd={() => createTeamAction(node.id)}
              />
            </TreeView.BranchControl>
          ) : (
            <TreeView.Item>
              <LuUsers />
              <TreeView.ItemText>{node.name}</TreeView.ItemText>
              <TreeNodeActions
                node={node}
                indexPath={indexPath}
                onRemove={() => deleteTeamAction(node.id)}
                onAdd={() => createTeamAction(node.id)}
              />
            </TreeView.Item>
          )
        }
      />
    </TreeView.Tree>
  </TreeView.RootProvider>;
}

interface Node {
  id: string
  name: string
  children?: Node[]
}
