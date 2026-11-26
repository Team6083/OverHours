"use client";
import Link from "next/link";

import { Badge, Button, ButtonGroup, HStack, Icon, IconButton } from "@chakra-ui/react";
import { LuArrowDown01, LuArrowDownAZ, LuArrowUp10, LuArrowUpZA, LuPen, LuPlus, LuTrash2 } from "react-icons/lu";

import GenericTable, { Column } from "@/components/common/GenericTable";
import { StatRangeDTO } from "@/lib/data/statrange-dto";
import DeleteStatRangesDialog from "./DeleteStatRangesDialog";

type TableData = StatRangeDTO & {};

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
    dataKey: "startDate",
    sortable: true,
    renderHeader: (sort) => <>
      Start Date
      {sort && (
        sort === 1 ? <Icon ml={1}><LuArrowDown01 /></Icon>
          : <Icon ml={1}><LuArrowUp10 /></Icon>
      )}
    </>,
    renderCell: (row) => row.startDate.toLocaleDateString(),
  },
  {
    dataKey: "endDate",
    sortable: true,
    renderHeader: (sort) => <>
      End Date
      {sort && (
        sort === 1 ? <Icon ml={1}><LuArrowDown01 /></Icon>
          : <Icon ml={1}><LuArrowUp10 /></Icon>
      )}
    </>,
    renderCell: (row) => row.endDate.toLocaleDateString(),
  },
  {
    dataKey: "status",
    sortable: true,
    renderHeader: (sort) => <>
      Status
      {sort && (
        sort === 1 ? <Icon ml={1}><LuArrowDownAZ /></Icon>
          : <Icon ml={1}><LuArrowUpZA /></Icon>
      )}
    </>,
    renderCell: (row) => (
      <Badge colorPalette={row.status === "ACTIVE" ? "green" : "gray"}>
        {row.status}
      </Badge>
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
    dataKey: "actions",
    renderHeader: () => "Actions",
    renderCell: (row) => (
      <ButtonGroup size="xs" variant="ghost">
        {/* Edit Button */}
        <IconButton asChild><Link href={`/admin/stat-ranges/${row.id}`}>
          <Icon><LuPen /></Icon>
        </Link></IconButton>

        {/* Delete Button */}
        <DeleteStatRangesDialog
          statRanges={[row]}
          trigger={<IconButton colorPalette="red" aria-label="Delete"><Icon><LuTrash2 /></Icon></IconButton>}
        />
      </ButtonGroup>
    ),
  }
];

const sortingFn = (a: TableData, b: TableData, sortBy: [string, 1 | -1]) => {
  if (!sortBy) return 0;
  const [key, order] = sortBy;

  if (key === "name" || key === "status") {
    return (a[key].localeCompare(b[key]) * order);
  }

  if (key === "startDate" || key === "endDate" || key === "createdAt" || key === "updatedAt") {
    return (a[key].getTime() - b[key].getTime()) * order;
  }

  return 0;
}

export default function StatRangesLegacyTable(props: {
  statRanges: StatRangeDTO[];
}) {
  const { statRanges } = props;

  const items: TableData[] = statRanges.map(statRange => ({
    ...statRange,
  }));

  const topRightElement = (<HStack justify="flex-end" w="full">
    <Button size="sm" variant="ghost" asChild>
      <Link href="/admin/stat-ranges/new">
        <Icon><LuPlus /></Icon>
        Create Stat Range
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
        <DeleteStatRangesDialog
          statRanges={statRanges.filter(statRange => selection.includes(statRange.id))}
          trigger={<Button size="xs" variant="outline" colorPalette="red">
            <Icon><LuTrash2 /></Icon> Delete selected
          </Button>}
        />
      </>
      )
    }}
    topRightElement={topRightElement}
  />;
}
