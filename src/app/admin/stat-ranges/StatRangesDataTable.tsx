"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Button, Icon } from "@chakra-ui/react";
import { type DataColumn, type DataSort, DataTable, FilterBar, SelectionBar } from "@team6083/ui";
import { LuPen, LuPlus, LuTrash2 } from "react-icons/lu";

import { StatRangeDTO } from "@/lib/data/statrange-dto";
import DeleteStatRangesDialog from "./DeleteStatRangesDialog";

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
  const router = useRouter();
  const { statRanges } = props;

  const [sortBy, setSortBy] = useState<DataSort["by"]>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selection, setSelection] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<TableData>();

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
        { value: "delete", label: "Delete", icon: <LuTrash2 />, danger: true, onSelect: () => setDeleteTarget(row) },
      ]}
    />

    <SelectionBar count={selection.length} onClear={() => setSelection([])}>
      <DeleteStatRangesDialog
        statRanges={statRanges.filter(statRange => selection.includes(statRange.id))}
        onDeleted={() => setSelection([])}
        trigger={<Button size="xs" variant="outline" colorPalette="red">
          <Icon><LuTrash2 /></Icon> Delete selected
        </Button>}
      />
    </SelectionBar>

    {deleteTarget && <DeleteStatRangesDialog
      statRanges={[deleteTarget]}
      open
      onOpenChange={(open) => { if (!open) setDeleteTarget(undefined); }}
    />}
  </>;
}
