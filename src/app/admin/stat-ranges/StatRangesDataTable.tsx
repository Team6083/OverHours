"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Button, ButtonGroup, CloseButton, Dialog, HStack, Icon, Portal, Text } from "@chakra-ui/react";
import { type DataColumn, type DataSort, DataTable, FilterBar, SelectionBar, useAppOutdated } from "@team6083/ui";
import { LuPen, LuPlus, LuTrash2 } from "react-icons/lu";

import { StatRangeDTO } from "@/lib/data/statrange-dto";
import { handleDeleteStatRanges } from "./actions";

type TableData = StatRangeDTO;

const columns: DataColumn<TableData>[] = [
  { key: "name", header: "Name", priority: "primary", cell: (row) => row.name, sortValue: (row) => row.name.toLowerCase() },
  { key: "startDate", header: "Start Date", cell: (row) => row.startDate.toLocaleDateString(), sortValue: (row) => row.startDate },
  { key: "endDate", header: "End Date", cell: (row) => row.endDate.toLocaleDateString(), sortValue: (row) => row.endDate },
  {
    key: "status",
    header: "Status",
    sortValue: (row) => row.status,
    cell: (row) => (
      <Badge colorPalette={row.status === "ACTIVE" ? "green" : "gray"}>
        {row.status}
      </Badge>
    ),
  },
  { key: "createdAt", header: "Created At", cell: (row) => row.createdAt.toLocaleString(), sortValue: (row) => row.createdAt },
];

export default function StatRangesDataTable(props: {
  statRanges: StatRangeDTO[];
}) {
  const outdated = useAppOutdated();
  const router = useRouter();
  const { statRanges } = props;

  const [sortBy, setSortBy] = useState<DataSort["by"]>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selection, setSelection] = useState<string[]>([]);

  return <>
    <FilterBar actions={
      <Button size="sm" variant="ghost" asChild>
        <Link href="/admin/stat-ranges/new">
          <Icon><LuPlus /></Icon>
          Create Stat Range
        </Link>
      </Button>
    } />

    <DataTable<TableData>
      aria-label="Stat ranges"
      rows={statRanges}
      columns={columns}
      getRowId={(item) => item.id}
      sort={{ by: sortBy, onChange: setSortBy }}
      pagination={{ page, pageSize, onPageChange: setPage, onPageSizeChange: setPageSize, pageSizes: [10, 25, 50, 100] }}
      selection={{ selected: selection, onChange: setSelection }}
      rowActions={(row) => [
        { value: "edit", label: "Edit", icon: <LuPen />, onSelect: () => router.push(`/admin/stat-ranges/${row.id}`) },
        { value: "delete", label: "Delete", icon: <LuTrash2 />, danger: true, onSelect: () => router.push(`/admin/stat-ranges/${row.id}/delete`) },
      ]}
    />

    <SelectionBar count={selection.length} onClear={() => setSelection([])}>
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
                <Text mb={2}>Are you sure you want to delete following stat ranges?</Text>
                <HStack mb={4} flexWrap="wrap" gap={2}>
                  {selection.map(id => {
                    const statRange = statRanges.find(s => s.id === id);
                    if (!statRange) return null;
                    return <Badge key={id} colorPalette="brand">{statRange.name}</Badge>
                  })}
                </HStack>
                <Text color="fg.muted">Total {selection.length} stat ranges selected</Text>
              </Dialog.Body>
              <Dialog.Footer>
                <ButtonGroup size="sm">
                  <Dialog.ActionTrigger asChild>
                    <Button variant="outline">Cancel</Button>
                  </Dialog.ActionTrigger>
                  <Dialog.Context>
                    {(store) => (
                      <Button colorPalette="red" disabled={outdated} onClick={() => handleDeleteStatRanges(selection).then(() => { store.setOpen(false); setSelection([]); })}>
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
    </SelectionBar>
  </>;
}
