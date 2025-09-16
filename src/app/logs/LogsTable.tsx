"use client";
import { Icon, Badge, ButtonGroup, IconButton, Text, Button } from "@chakra-ui/react";
import { LuArrowDown01, LuArrowUp10, LuLock, LuTimer, LuPen, LuTrash2, LuArrowDownAZ, LuArrowUpZA } from "react-icons/lu";

import { Tooltip } from "@/components/ui/tooltip";
import GenericTable, { Column } from "@/components/GenericTable";
import { TimeLogDTO } from "@/lib/data/timelog-dto";

type TableData = Omit<TimeLogDTO, "createdAt" | "updatedAt"> & {
  displayName: string;
  avatarUrl?: string;
  inTimeStr: string;
  outTimeStr: string;
  durationStr: string;
}

const columns: Column<TableData>[] = [
  {
    dataKey: "user",
    sortable: true,
    renderHeader: (sort) => (
      <>
        User
        {sort && (
          sort === 1 ? <Icon ml={1}><LuArrowDownAZ /></Icon>
            : <Icon ml={1}><LuArrowUpZA /></Icon>
        )}
      </>
    ),
    renderCell: (row) => row.displayName,
  },
  {
    dataKey: "time",
    sortable: true,
    headerColSpan: 2,
    renderHeader: (sort) => (
      <>
        Clock-in / out Time
        {sort && (
          sort === 1 ? <Icon ml={1}><LuArrowDown01 /></Icon>
            : <Icon ml={1}><LuArrowUp10 /></Icon>
        )}
      </>
    ),
    renderCell: (row) => row.inTimeStr,
  },
  {
    dataKey: "timeOut",
    renderCell: (row) => <>
      {row.outTime ? (
        row.status === "LOCKED"
          ? (
            <Tooltip content={`Clocked-out at ${row.outTimeStr}`}>
              <Badge colorPalette="red" mr={2}><Icon><LuLock /></Icon>Locked</Badge>
            </Tooltip>
          ) : row.outTimeStr
      ) : (
        <Badge colorPalette="orange">
          <Icon><LuTimer /></Icon>
          In Progress
        </Badge>
      )}
    </>
  },
  {
    dataKey: "duration",
    sortable: true,
    renderHeader: (sort) => (
      <>
        Duration
        {sort && (
          sort === 1 ? <Icon ml={1}><LuArrowDown01 /></Icon>
            : <Icon ml={1}><LuArrowUp10 /></Icon>
        )}
      </>
    ),
    renderCell: (row) => row.outTime ? (
      <Text
        as="span"
        color={row.status === "LOCKED" ? "fg.muted" : undefined}
        textDecor={row.status === "LOCKED" ? "line-through" : undefined}
      >
        {row.durationStr}
      </Text>
    ) : null,
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
]

const sortingFn = (a: TableData, b: TableData, sortBy: [string, 1 | -1] | null) => {
  if (!sortBy) return 0;
  const [key, order] = sortBy;

  if (key === "time") {
    // Sort by inTime first, then outTime
    if (a.inTime.getTime() !== b.inTime.getTime()) {
      return (a.inTime.getTime() < b.inTime.getTime() ? -1 : 1) * order;
    }

    if (a.outTime && b.outTime) {
      return (a.outTime.getTime() < b.outTime.getTime() ? -1 : 1) * order;
    }
    if (a.outTime && !b.outTime) return 1 * order; // a is "greater" if it has outTime
    if (!a.outTime && b.outTime) return -1 * order; // b is "greater" if it has outTime
    return 0;
  }

  let aValue: string | number = "";
  let bValue: string | number = "";

  if (key === "user") {
    aValue = a.displayName;
    bValue = b.displayName;
  } else if (key === "duration") {
    aValue = a.outTime ? a.outTime.getTime() - a.inTime.getTime() : 0;
    bValue = b.outTime ? b.outTime.getTime() - b.inTime.getTime() : 0;
  }

  return (aValue < bValue ? -1 : aValue > bValue ? 1 : 0) * order;
}

export default function LogsTable(props: {
  logs: Pick<TimeLogDTO, "id" | "userId" | "inTime" | "outTime" | "status" | "notes">[];
  userInfo: Map<string, { name: string; avatarUrl?: string }>;
}) {
  const { logs, userInfo } = props;

  const data = logs.map((log): TableData => {
    const user = userInfo.get(log.userId);

    let durationStr = "N/A";
    if (log.outTime) {
      const durationMs = log.outTime.getTime() - log.inTime.getTime();
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      durationStr = `${hours}h ${minutes}m`;
    }

    return {
      ...log,
      displayName: user?.name || log.userId,
      avatarUrl: user?.avatarUrl,
      inTimeStr: log.inTime.toLocaleString(),
      outTimeStr: log.outTime ? log.outTime.toLocaleString() : "N/A",
      durationStr,
    };
  });

  return <GenericTable<TableData>
    columns={columns}
    items={data}
    keyFn={(item) => item.id}
    defaultSortBy={["time", 1]}
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
