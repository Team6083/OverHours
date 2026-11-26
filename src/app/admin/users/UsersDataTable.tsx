"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Button, ButtonGroup, Clipboard, HStack, Icon, Link as ChakraLink } from "@chakra-ui/react";
import { type DataColumn, type DataSort, DataTable, FilterBar, SelectionBar, Tooltip } from "@team6083/ui";
import { LuMerge, LuPen, LuTrash2, LuUserPlus } from "react-icons/lu";

import { UserDTO } from "@/lib/data/user-dto";
import DeleteUsersDialog from "./DeleteUsersDialog";

type TableData = UserDTO & {
  /** Emails this user signs in with that another user already has. */
  takenEmails?: string[];
};

const columns: DataColumn<TableData>[] = [
  { key: "name", header: "Name", priority: "primary", cell: (row) => row.name, sortValue: (row) => row.name.toLowerCase() },
  {
    key: "email",
    header: "Email",
    sortValue: (row) => row.email.toLowerCase(),
    cell: (row) => (<HStack gap={2}>
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
  { key: "createdAt", header: "Created At", cell: (row) => row.createdAt.toLocaleString(), sortValue: (row) => row.createdAt },
  { key: "updatedAt", header: "Updated At", cell: (row) => row.updatedAt.toLocaleString(), sortValue: (row) => row.updatedAt },
];

export default function UsersDataTable(props: {
  users: UserDTO[];
  outOfSyncEmails: Record<string, string[]>;
}) {
  const router = useRouter();
  const { users, outOfSyncEmails } = props;

  const [sortBy, setSortBy] = useState<DataSort["by"]>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selection, setSelection] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<TableData>();

  const items: TableData[] = users.map(user => ({
    ...user,
    takenEmails: outOfSyncEmails[user.id],
  }));

  return <>
    <FilterBar actions={
      <Button size="sm" variant="ghost" asChild>
        <Link href="/admin/users/new">
          <Icon><LuUserPlus /></Icon>
          Create User
        </Link>
      </Button>
    } />

    <DataTable<TableData>
      aria-label="Users"
      rows={items}
      columns={columns}
      getRowId={(item) => item.id}
      sort={{ by: sortBy, onChange: setSortBy }}
      pagination={{ page, pageSize, onPageChange: setPage, onPageSizeChange: setPageSize, pageSizes: [10, 25, 50, 100] }}
      selection={{ selected: selection, onChange: setSelection }}
      rowActions={(row) => [
        { value: "edit", label: "Edit", icon: <LuPen />, onSelect: () => router.push(`/admin/users/${row.id}`) },
        { value: "delete", label: "Delete", icon: <LuTrash2 />, danger: true, onSelect: () => setDeleteTarget(row) },
      ]}
    />

    <SelectionBar count={selection.length} onClear={() => setSelection([])}>
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
          onDeleted={() => setSelection([])}
          trigger={<Button colorPalette="red">
            <Icon><LuTrash2 /></Icon> Delete selected
          </Button>}
        />
      </ButtonGroup>
    </SelectionBar>

    {deleteTarget && <DeleteUsersDialog
      users={[deleteTarget]}
      open
      onOpenChange={(open) => { if (!open) setDeleteTarget(undefined); }}
    />}
  </>;
}
