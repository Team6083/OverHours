"use client";

import { Button, ButtonGroup, Clipboard, Icon, IconButton, Link } from "@chakra-ui/react";
import { LuArrowDown01, LuArrowDownAZ, LuArrowUp10, LuArrowUpZA, LuPen, LuTrash2 } from "react-icons/lu";

import GenericTable, { Column } from "@/components/GenericTable";
import { UserDTO } from "@/lib/data/user-dto";

type TableData = UserDTO & {

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
    dataKey: "email",
    sortable: true,
    renderHeader: (sort) => <>
      Email
      {sort && (
        sort === 1 ? <Icon ml={1}><LuArrowDownAZ /></Icon>
          : <Icon ml={1}><LuArrowUpZA /></Icon>
      )}
    </>,
    renderCell: (row) => (
      <Clipboard.Root value={row.email}>
        <Clipboard.Trigger asChild>
          <Link as="span" color="blue.fg" textStyle="sm">
            <Clipboard.ValueText />
            <Clipboard.Indicator />
          </Link>
        </Clipboard.Trigger>
      </Clipboard.Root>
    ),
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
    renderCell: () => (
      <ButtonGroup size="xs" variant="ghost">
        <IconButton><Icon><LuPen /></Icon></IconButton>
        <IconButton colorPalette="red"><Icon><LuTrash2 /></Icon></IconButton>
      </ButtonGroup>
    ),
  }
];

const sortingFn = (a: TableData, b: TableData, sortBy: [string, 1 | -1]) => {
  if (!sortBy) return 0;
  const [key, order] = sortBy;

  if (key === "name" || key === "email") {
    return (a[key].localeCompare(b[key]) * order);
  }

  if (key === "createdAt" || key === "updatedAt") {
    return (a[key].getTime() - b[key].getTime()) * order;
  }

  return 0;
}

export default function UsersTable(props: {
  users: UserDTO[];
}) {
  const { users } = props;

  const items: TableData[] = users.map(user => ({
    ...user,
  }));

  return <GenericTable<TableData>
    columns={columns}
    items={items}
    keyFn={(item) => item.id}
    sortingFn={sortingFn}
    checkboxOptions={{
      show: true,
      showActionBar: true,
      renderActionBarContent: () => (
        <ButtonGroup size="xs" variant="outline">
          <Button colorPalette="red">
            <Icon><LuTrash2 /></Icon> Delete selected
          </Button>
        </ButtonGroup>
      )
    }}
  />;
}
