"use client";
import Link from "next/link";

import { Badge, Button, ButtonGroup, Clipboard, HStack, Icon, IconButton, Link as ChakraLink } from "@chakra-ui/react";
import { Tooltip } from "@team6083/ui";
import { LuArrowDown01, LuArrowDownAZ, LuArrowUp10, LuArrowUpZA, LuMerge, LuPen, LuTrash2, LuUserPlus } from "react-icons/lu";

import GenericTable, { Column } from "@/components/common/GenericTable";
import { UserDTO } from "@/lib/data/user-dto";
import DeleteUsersDialog from "./DeleteUsersDialog";

type TableData = UserDTO & {
  /** Emails this user signs in with that another user already has. */
  takenEmails?: string[];
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
    renderCell: (row) => (<HStack gap={2}>
      <Clipboard.Root value={row.email}>
        <Clipboard.Trigger asChild>
          <ChakraLink as="span" color="brand.fg" textStyle="sm">
            <Clipboard.ValueText />
            <Clipboard.Indicator />
          </ChakraLink>
        </Clipboard.Trigger>
      </Clipboard.Root>
      {row.takenEmails && (
        <Tooltip content={`Signs in as ${row.takenEmails.join(", ")}, which another user has. Merge the users to fix it.`}>
          <Badge colorPalette="orange">Out of sync</Badge>
        </Tooltip>
      )}
    </HStack>),
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
        <IconButton asChild><Link href={`/admin/users/${row.id}`}>
          <Icon><LuPen /></Icon>
        </Link></IconButton>

        {/* Delete Button */}
        <DeleteUsersDialog
          users={[row]}
          trigger={<IconButton colorPalette="red" aria-label="Delete"><Icon><LuTrash2 /></Icon></IconButton>}
        />
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

export default function UsersLegacyTable(props: {
  users: UserDTO[];
  outOfSyncEmails: Record<string, string[]>;
}) {
  const { users, outOfSyncEmails } = props;

  const items: TableData[] = users.map(user => ({
    ...user,
    takenEmails: outOfSyncEmails[user.id],
  }));

  const topRightElement = (<HStack justify="flex-end" w="full">
    <Button size="sm" variant="ghost" asChild>
      <Link href="/admin/users/new">
        <Icon><LuUserPlus /></Icon>
        Create User
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
        <ButtonGroup size="xs" variant="outline">
          <Button disabled={selection.length < 2} asChild={selection.length >= 2}>
            {selection.length >= 2
              ? <Link href={`/admin/users/merge?ids=${selection.join(",")}`}>
                <Icon><LuMerge /></Icon> Merge selected
              </Link>
              : <><Icon><LuMerge /></Icon> Merge selected</>}
          </Button>
          <DeleteUsersDialog
            users={users.filter(user => selection.includes(user.id))}
            trigger={<Button colorPalette="red">
              <Icon><LuTrash2 /></Icon> Delete selected
            </Button>}
          />
        </ButtonGroup>
      </>
      )
    }}
    topRightElement={topRightElement}
  />;
}
