"use client";
import Link from "next/link";

import { Button, ButtonGroup, Icon, IconButton, CloseButton, Dialog, Portal, Text, HStack, Badge } from "@chakra-ui/react";
import { LuArrowDown01, LuArrowDownAZ, LuArrowUp10, LuArrowUpZA, LuPen, LuTrash2, LuUserPlus } from "react-icons/lu";

import GenericTable, { Column } from "@/components/GenericTable";
import { TeamDTO } from "@/lib/data/team-dto";
import { handleDeleteTeams } from "./actions";

type TableData = TeamDTO & {

};

const columns: Column<TableData>[] = [
  {
    dataKey: "name",
    sortable: true,
    renderHeader: (sort) => <>
      Name
      {sort && (
        sort === 1 ? <Icon ml={1}><LuArrowDownAZ /></Icon>
          : <Icon ml={1}><LuArrowUpZA /></Icon>
      )}
    </>,
    renderCell: (row) => row.name,
  },
  {
    dataKey: "createdAt",
    sortable: true,
    renderHeader: (sort) => <>
      Created At
      {sort && (
        sort === 1 ? <Icon ml={1}><LuArrowDown01 /></Icon>
          : <Icon ml={1}><LuArrowUp10 /></Icon>
      )}
    </>,
    renderCell: (row) => row.createdAt.toLocaleString(),
  },
  {
    dataKey: "updatedAt",
    sortable: true,
    renderHeader: (sort) => <>
      Updated At
      {sort && (
        sort === 1 ? <Icon ml={1}><LuArrowDown01 /></Icon>
          : <Icon ml={1}><LuArrowUp10 /></Icon>
      )}
    </>,
    renderCell: (row) => row.updatedAt.toLocaleString(),
  },
  {
    dataKey: "actions",
    renderHeader: () => "Actions",
    renderCell: (row) => (
      <ButtonGroup size="xs" variant="ghost">
        {/* Edit Button */}
        <IconButton asChild><Link href={`/admin/teams/${row.id}`}>
          <Icon><LuPen /></Icon>
        </Link></IconButton>

        {/* Delete Button */}
        <IconButton colorPalette="red" asChild><Link href={`/admin/teams/${row.id}/delete`}>
          <Icon><LuTrash2 /></Icon>
        </Link></IconButton>
      </ButtonGroup>
    ),
  }
];

const sortingFn = (a: TableData, b: TableData, sortBy: [string, 1 | -1]) => {
  if (!sortBy) return 0;
  const [key, order] = sortBy;

  if (key === "name") {
    return (a[key].localeCompare(b[key]) * order);
  }

  if (key === "createdAt" || key === "updatedAt") {
    return (a[key].getTime() - b[key].getTime()) * order;
  }

  return 0;
}

export default function TeamsTable(props: {
  teams: TeamDTO[];
}) {
  const { teams } = props;

  const items: TableData[] = teams.map(team => ({
    ...team,
  }));

  const topRightElement = (<HStack justify="flex-end" w="full">
    <Button size="sm" variant="ghost" asChild>
      <Link href="/admin/teams/new">
        <Icon><LuUserPlus /></Icon>
        Create Team
      </Link>
    </Button>
  </HStack>);

  return <GenericTable<TableData>
    columns={columns}
    items={items}
    keyFn={(item) => item.id}
    sortingFn={sortingFn}
    checkboxOptions={{
      show: true,
      showActionBar: true,
      renderActionBarContent: (selection: string[]) => (<>
        <Dialog.Root size="lg">

          <ButtonGroup size="xs" variant="outline">
            <Dialog.Trigger asChild>
              <Button colorPalette="red">
                <Icon><LuTrash2 /></Icon> Delete selected
              </Button>
            </Dialog.Trigger>
          </ButtonGroup>

          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Confirm Deletion</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <Text mb={2}>Are you sure you want to delete following teams?</Text>
                  <HStack mb={4} flexWrap="wrap" gap={2}>
                    {selection.map(id => {
                      const team = teams.find(u => u.id === id);
                      if (!team) return null;
                      return <Badge key={id} colorPalette="blue">{team.name}</Badge>
                    })}
                  </HStack>
                  <Text color="fg.muted">Total {selection.length} teams selected</Text>
                </Dialog.Body>
                <Dialog.Footer>
                  <ButtonGroup size="sm">
                    <Dialog.ActionTrigger asChild>
                      <Button variant="outline">Cancel</Button>
                    </Dialog.ActionTrigger>
                    <Dialog.Context>
                      {(store) => (
                        <Button colorPalette="red" onClick={() => handleDeleteTeams(selection).then(() => store.setOpen(false))}>
                          <Icon><LuTrash2 /></Icon>
                          Delete
                        </Button>
                      )}
                    </Dialog.Context>
                  </ButtonGroup>
                </Dialog.Footer>
                <Dialog.CloseTrigger asChild>
                  <CloseButton size="sm" />
                </Dialog.CloseTrigger>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      </>
      )
    }}
    topRightElement={topRightElement}
  />;
}
