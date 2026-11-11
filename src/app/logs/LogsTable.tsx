"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon, Badge, ButtonGroup, IconButton, Text, Button, CloseButton, Dialog, HStack, Portal, Stack, ClientOnly, SkeletonText, Pagination, Switch } from "@chakra-ui/react";
import { LuArrowDown01, LuArrowUp10, LuLock, LuTimer, LuPen, LuTrash2, LuArrowDownAZ, LuArrowUpZA, LuClipboardPlus } from "react-icons/lu";

import { Tooltip } from "@/components/ui/tooltip";
import UserCombobox from "@/components/UserCombobox";
import GenericTable, { Column } from "@/components/GenericTable";
import GenericClipboard from "@/components/Clipboard";
import TimeLogStatusBadge from "@/components/TimeLogStatusBadge";
import { TimeLogDTO } from "@/lib/data/timelog-dto";
import { formatDuration } from "@/lib/util";
import { handleDeleteLogs } from "./actions";

type TableData = Omit<TimeLogDTO, "createdAt" | "updatedAt"> & {
  displayName: string;
  avatarUrl?: string;
  timeRangeStr: string;
  outTimeStr: string;
  durationStr: string;
}

const dayTimeOptions: Intl.DateTimeFormatOptions = {
  month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
};
const dayTimeFormat = new Intl.DateTimeFormat(undefined, dayTimeOptions);
const yearDayTimeFormat = new Intl.DateTimeFormat(undefined, { ...dayTimeOptions, year: "numeric" });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

const formatDayTime = (date: Date, currentYear: number) =>
  (date.getFullYear() === currentYear ? dayTimeFormat : yearDayTimeFormat).format(date);

function formatTimeRange(inTime: Date, outTime: Date | undefined, status: TimeLogDTO["status"], currentYear: number): string {
  if (!outTime || status === "LOCKED") return formatDayTime(inTime, currentYear);

  const sameDay = inTime.toDateString() === outTime.toDateString();
  return `${formatDayTime(inTime, currentYear)} – ${sameDay ? timeFormat.format(outTime) : formatDayTime(outTime, currentYear)}`;
}

function formatLogDuration(inTime: Date, outTime: Date): string {
  const durationMs = outTime.getTime() - inTime.getTime();
  return durationMs < 0 ? "—" : formatDuration(durationMs / 1000, { hideSecondsFromMinute: true });
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
        {t ? t("table.columns.time") : "Time"}
        {sort && (
          sort === 1 ? <Icon ml={1}><LuArrowDown01 /></Icon>
            : <Icon ml={1}><LuArrowUp10 /></Icon>
        )}
      </>;
    },
    renderCell: (row, t) => {
      return <ClientOnly fallback={<SkeletonText noOfLines={1} />}>
        <HStack gap={2} rowGap={1} flexWrap="wrap">
          <Text as="span" whiteSpace="nowrap">{row.timeRangeStr}</Text>
          {!row.outTime && (
            <Badge colorPalette="orange">
              <Icon><LuTimer /></Icon>
              {t ? t("status.currentlyIn") : "Currently In"}
            </Badge>
          )}
          {row.outTime && row.status === "LOCKED" && (
            <Tooltip content={t ? t("tooltips.clockedOutAt", { time: row.outTimeStr }) : `Clocked out at ${row.outTimeStr}`}>
              <Badge colorPalette="red"><Icon><LuLock /></Icon>{t ? t("status.locked") : "Locked"}</Badge>
            </Tooltip>
          )}
        </HStack>
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

const adminColumns = [...columns, actionsColumn];
const memberColumns = columns.filter(column => column.dataKey !== "user");

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

  const data = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return logs.map((log): TableData => {
      const user = userInfo[log.userId];

      return {
        ...log,
        displayName: user?.name || log.userId,
        avatarUrl: user?.avatarUrl,
        timeRangeStr: formatTimeRange(log.inTime, log.outTime, log.status, currentYear),
        outTimeStr: log.outTime ? formatDayTime(log.outTime, currentYear) : "N/A",
        durationStr: log.outTime ? formatLogDuration(log.inTime, log.outTime) : "N/A",
      };
    });
  }, [logs, userInfo]);

  const [finishedOnly, setFinishedOnly] = useState(true);
  const [userFilterSelected, setUserFilterSelected] = useState<string | null>(null);

  const userComboboxUsers = useMemo(
    () => Object.entries(userInfo).map(([id, user]) => ({ id, name: user.name })),
    [userInfo]
  );

  const topRightElement = showAdminActions && <HStack flexWrap="wrap" w="full">
    <UserCombobox
      users={userComboboxUsers}
      value={userFilterSelected ?? ""}
      onValueChange={(v) => setUserFilterSelected(v || null)}
      placeholder={t("placeholders.filterUsers")}
      emptyText={t("placeholders.noUsersFound")}
      size="xs"
      width={{ base: "full", md: "200px" }}
    />

    <HStack justifyContent="space-around">
      <Button size="sm" variant="ghost" asChild>
        <Link href="/logs/new">
          <Icon><LuClipboardPlus /></Icon>
          {t("buttons.createLog")}
        </Link>
      </Button>

      <Switch.Root size="sm" checked={finishedOnly} onCheckedChange={(e) => setFinishedOnly(e.checked)}>
        <Switch.HiddenInput />
        <Switch.Control />
        <Switch.Label>{t("filters.finishedOnly")}</Switch.Label>
      </Switch.Root>
    </HStack>
  </HStack>;

  const filteredData = (finishedOnly || userFilterSelected) ? data.filter(log => {
    if (finishedOnly && !log.outTime) return false;
    if (userFilterSelected && log.userId !== userFilterSelected) return false;
    return true;
  }) : data;

  return <Pagination.Root count={filteredData.length} defaultPageSize={10} defaultPage={1}>
    <GenericTable<TableData>
      columns={showAdminActions ? adminColumns : memberColumns}
      items={filteredData}
      keyFn={(item) => item.id}
      defaultSortBy={["timeIn", -1]}
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
                          <Badge colorPalette="blue">{user?.name ?? log.userId}</Badge>
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
