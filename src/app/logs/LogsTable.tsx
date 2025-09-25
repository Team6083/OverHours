"use client";
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon, Badge, ButtonGroup, IconButton, Text, Button, CloseButton, Dialog, HStack, Portal, Stack, ClientOnly, SkeletonText, Pagination, Switch } from "@chakra-ui/react";
import { LuArrowDown01, LuArrowUp10, LuLock, LuTimer, LuPen, LuTrash2, LuArrowDownAZ, LuArrowUpZA, LuClipboardPlus } from "react-icons/lu";

import { Tooltip } from "@/components/ui/tooltip";
import GenericTable, { Column } from "@/components/GenericTable";
import GenericClipboard from "@/components/Clipboard";
import TimeLogStatusBadge from "@/components/TimeLogStatusBadge";
import { TimeLogDTO } from "@/lib/data/timelog-dto";
import { handleDeleteLogs } from "./actions";

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
    renderHeader: (sort, t) => {
      return <>
        {t ? t("table.columns.user") : "User"}
        {sort && (
          sort === 1 ? <Icon ml={1}><LuArrowDownAZ /></Icon>
            : <Icon ml={1}><LuArrowUpZA /></Icon>
        )}
      </>;
    },
    renderCell: (row) => row.displayName,
  },
  {
    dataKey: "timeIn",
    sortable: true,
    renderHeader: (sort, t) => {
      return <>
        {t ? t("table.columns.inTime") : "In Time"}
        {sort && (
          sort === 1 ? <Icon ml={1}><LuArrowDown01 /></Icon>
            : <Icon ml={1}><LuArrowUp10 /></Icon>
        )}
      </>;
    },
    renderCell: (row) => <ClientOnly fallback={<SkeletonText noOfLines={1} />}>{row.inTimeStr}</ClientOnly>,
  },
  {
    dataKey: "timeOut",
    sortable: true,
    renderHeader: (sort, t) => {
      return <>
        {t ? t("table.columns.outTime") : "Out Time"}
        {sort && (
          sort === 1 ? <Icon ml={1}><LuArrowDown01 /></Icon>
            : <Icon ml={1}><LuArrowUp10 /></Icon>
        )}
      </>;
    },
    renderCell: (row, t) => {
      return <ClientOnly fallback={<SkeletonText noOfLines={1} />}>
        {row.outTime ? (
          row.status === "LOCKED"
            ? (
              <Tooltip content={`Clocked-out at ${row.outTimeStr}`}>
                <Badge colorPalette="red" mr={2}><Icon><LuLock /></Icon>{t ? t("status.locked") : "Locked"}</Badge>
              </Tooltip>
            ) : row.outTimeStr
        ) : (
          <Badge colorPalette="orange">
            <Icon><LuTimer /></Icon>
            {t ? t("status.currentlyIn") : "Currently In"}
          </Badge>
        )}
      </ClientOnly>;
    }
  },
  {
    dataKey: "duration",
    sortable: true,
    renderHeader: (sort, t) => {
      return <>
        {t ? t("table.columns.duration") : "Duration"}
        {sort && (
          sort === 1 ? <Icon ml={1}><LuArrowDown01 /></Icon>
            : <Icon ml={1}><LuArrowUp10 /></Icon>
        )}
      </>;
    },
    renderCell: (row) => row.outTime ? (
      <Text
        as="span"
        color={row.status === "LOCKED" ? "fg.muted" : undefined}
        textDecor={row.status === "LOCKED" ? "line-through" : undefined}
      >
        {row.durationStr}
      </Text>
    ) : null,
  }
]

const actionsColumn: Column<TableData> = {
  dataKey: "actions",
  renderHeader: (_, t) => {
    return t ? t("table.columns.actions") : "Actions";
  },
  renderCell: (row) => (
    <ButtonGroup size="xs" variant="ghost">
      <IconButton asChild><Link href={`/logs/${row.id}`}><Icon><LuPen /></Icon></Link></IconButton>
      <IconButton colorPalette="red" asChild><Link href={`/logs/${row.id}/delete`}><Icon><LuTrash2 /></Icon></Link></IconButton>
    </ButtonGroup>
  ),
};

const sortingFn = (a: TableData, b: TableData, sortBy: [string, 1 | -1] | null) => {
  if (!sortBy) return 0;
  const [key, order] = sortBy;

  let aValue: string | number = "";
  let bValue: string | number = "";

  if (key === "user") {
    aValue = a.displayName;
    bValue = b.displayName;
  } else if (key === "timeIn") {
    aValue = a.inTime.getTime();
    bValue = b.inTime.getTime();
  } else if (key === "timeOut") {
    aValue = a.outTime ? a.outTime.getTime() : Infinity;
    bValue = b.outTime ? b.outTime.getTime() : Infinity;
  } else if (key === "duration") {
    aValue = a.outTime ? a.outTime.getTime() - a.inTime.getTime() : 0;
    bValue = b.outTime ? b.outTime.getTime() - b.inTime.getTime() : 0;
  }

  return (aValue < bValue ? -1 : aValue > bValue ? 1 : 0) * order;
}

export default function LogsTable(props: {
  logs: Pick<TimeLogDTO, "id" | "userId" | "inTime" | "outTime" | "status" | "notes">[];
  userInfo: Record<string, { name: string, avatarUrl?: string }>;
  showAdminActions?: boolean;
}) {
  const { logs, userInfo, showAdminActions = false } = props;
  const t = useTranslations("LogsPage");

  const data = logs.map((log): TableData => {
    const user = userInfo[log.userId];

    let durationStr = "N/A";
    if (log.outTime) {
      const durationMs = log.outTime.getTime() - log.inTime.getTime();
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

      if (hours > 0) {
        durationStr = `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        durationStr = `${minutes}m ${seconds}s`;
      } else {
        durationStr = `${seconds}s`;
      }
    }

    return {
      ...log,
      displayName: user.name || log.userId,
      avatarUrl: user?.avatarUrl,
      inTimeStr: log.inTime.toLocaleString(),
      outTimeStr: log.outTime ? log.outTime.toLocaleString() : "N/A",
      durationStr,
    };
  });

  const [finishedOnly, setFinishedOnly] = useState(true);

  const topRightElement = showAdminActions && <HStack flexWrap="wrap" justifyContent="space-around" w="full">
    <Button size="sm" variant="ghost" asChild>
      <Link href="/logs/new">
        <Icon><LuClipboardPlus /></Icon>
        {t("buttons.createLog")}
      </Link>
    </Button>
    <Switch.Root size="sm" checked={finishedOnly} onCheckedChange={(e) => setFinishedOnly(e.checked)}>
      <Switch.HiddenInput />
      <Switch.Control />
      <Switch.Label>Finished Only</Switch.Label>
    </Switch.Root>
  </HStack>

  const filteredData = finishedOnly ? data.filter(log => log.outTime) : data;

  return <Pagination.Root count={filteredData.length} defaultPageSize={10} defaultPage={1}>
    <GenericTable<TableData>
      columns={showAdminActions ? [...columns, actionsColumn] : columns}
      items={filteredData}
      keyFn={(item) => item.id}
      defaultSortBy={["timeOut", -1]}
      sortingFn={sortingFn}
      checkboxOptions={{
        show: showAdminActions,
        showActionBar: showAdminActions,
        renderActionBarContent: (selection) => (
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
                    <Text mb={4}>Are you sure you want to delete following time logs?</Text>
                    <Stack mb={4} gap={2}>
                      {selection.map(id => {
                        const log = logs.find(u => u.id === id);
                        if (!log) return <GenericClipboard key={id} value={id} />;

                        const user = userInfo[log.userId];

                        return <HStack key={log.id}>
                          <Badge colorPalette="blue">{user.name ?? log.userId}</Badge>
                          <TimeLogStatusBadge status={log.status} />
                          <Badge fontFamily="mono">{log.inTime.toLocaleString()} - {log.outTime?.toLocaleString() ?? "N/A"}</Badge>
                        </HStack>;
                      })}
                    </Stack>
                    <Text color="fg.muted">Total {selection.length} logs selected</Text>
                  </Dialog.Body>
                  <Dialog.Footer>
                    <ButtonGroup size="sm">
                      <Dialog.ActionTrigger asChild>
                        <Button variant="outline">Cancel</Button>
                      </Dialog.ActionTrigger>
                      <Dialog.Context>
                        {(store) => (
                          <Button colorPalette="red" onClick={() => handleDeleteLogs(selection).then(() => store.setOpen(false))}>
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
        )
      }}
      topRightElement={topRightElement}
      t={t}
    />
  </Pagination.Root>;
}
