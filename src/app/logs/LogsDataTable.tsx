"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Badge, Button, ClientOnly, HStack, Icon, SkeletonText, Switch, Text } from "@chakra-ui/react";
import { type DataColumn, type DataSort, DataTable, FilterBar, SelectionBar, Tooltip } from "@team6083/ui";
import { LuClipboardPlus, LuLock, LuPen, LuTimer, LuTrash2 } from "react-icons/lu";

import DeleteTimeLogsDialog from "@/components/timelog/DeleteTimeLogsDialog";
import UserCombobox from "@/components/user/UserCombobox";
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

export default function LogsDataTable(props: {
  logs: Pick<TimeLogDTO, "id" | "userId" | "inTime" | "outTime" | "status" | "notes">[];
  userInfo: Record<string, { name: string, avatarUrl?: string }>;
  showAdminActions?: boolean;
}) {
  const router = useRouter();
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

  const columns = useMemo((): DataColumn<TableData>[] => [
    ...(showAdminActions ? [{
      key: "user",
      header: t("table.columns.user"),
      priority: "primary" as const,
      cell: (row: TableData) => row.displayName,
      sortValue: (row: TableData) => row.displayName.toLowerCase(),
    }] : []),
    {
      key: "timeIn",
      header: t("table.columns.time"),
      priority: showAdminActions ? undefined : "primary",
      sortValue: (row) => row.inTime,
      cell: (row) => <ClientOnly fallback={<SkeletonText noOfLines={1} />}>
        <HStack gap={2} rowGap={1} flexWrap="wrap">
          <Text as="span" whiteSpace="nowrap">{row.timeRangeStr}</Text>
          {!row.outTime && (
            <Badge colorPalette="orange">
              <Icon><LuTimer /></Icon>
              {t("status.currentlyIn")}
            </Badge>
          )}
          {row.outTime && row.status === "LOCKED" && (
            <Tooltip content={t("tooltips.clockedOutAt", { time: row.outTimeStr })}>
              <Badge colorPalette="red"><Icon><LuLock /></Icon>{t("status.locked")}</Badge>
            </Tooltip>
          )}
        </HStack>
      </ClientOnly>,
    },
    {
      key: "duration",
      header: t("table.columns.duration"),
      sortValue: (row) => row.outTime ? row.outTime.getTime() - row.inTime.getTime() : 0,
      cell: (row) => row.outTime ? (
        <Text
          as="span"
          color={row.status === "LOCKED" ? "fg.muted" : undefined}
          textDecor={row.status === "LOCKED" ? "line-through" : undefined}
        >
          {row.durationStr}
        </Text>
      ) : null,
    },
  ], [showAdminActions, t]);

  const [finishedOnly, setFinishedOnly] = useState(true);
  const [userFilterSelected, setUserFilterSelected] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<DataSort["by"]>({ key: "timeIn", direction: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selection, setSelection] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<TableData>();

  const userNames = useMemo(
    () => Object.fromEntries(Object.entries(userInfo).map(([id, user]) => [id, user.name])),
    [userInfo]
  );

  const userComboboxUsers = useMemo(
    () => Object.entries(userInfo).map(([id, user]) => ({ id, name: user.name })),
    [userInfo]
  );

  const filteredData = (finishedOnly || userFilterSelected) ? data.filter(log => {
    if (finishedOnly && !log.outTime) return false;
    if (userFilterSelected && log.userId !== userFilterSelected) return false;
    return true;
  }) : data;

  // A filter change can leave fewer pages than the one being shown.
  const filterBy = (apply: () => void) => {
    apply();
    setPage(1);
  };

  return <>
    {showAdminActions && <FilterBar
      activeCount={(finishedOnly ? 1 : 0) + (userFilterSelected ? 1 : 0)}
      onClear={() => filterBy(() => {
        setFinishedOnly(false);
        setUserFilterSelected(null);
      })}
      actions={
        <Button size="sm" variant="ghost" asChild>
          <Link href="/logs/new">
            <Icon><LuClipboardPlus /></Icon>
            {t("buttons.createLog")}
          </Link>
        </Button>
      }
    >
      <UserCombobox
        users={userComboboxUsers}
        value={userFilterSelected ?? ""}
        onValueChange={(v) => filterBy(() => setUserFilterSelected(v || null))}
        placeholder={t("placeholders.filterUsers")}
        emptyText={t("placeholders.noUsersFound")}
        size="sm"
        width="full"
      />
      <Switch.Root size="sm" checked={finishedOnly} onCheckedChange={(e) => filterBy(() => setFinishedOnly(e.checked))}>
        <Switch.HiddenInput />
        <Switch.Control />
        <Switch.Label>{t("filters.finishedOnly")}</Switch.Label>
      </Switch.Root>
    </FilterBar>}

    <DataTable<TableData>
      aria-label={t("table.label")}
      rows={filteredData}
      columns={columns}
      getRowId={(item) => item.id}
      sort={{ by: sortBy, onChange: setSortBy }}
      pagination={{ page, pageSize, onPageChange: setPage, onPageSizeChange: setPageSize, pageSizes: [10, 25, 50, 100] }}
      selection={showAdminActions ? { selected: selection, onChange: setSelection } : undefined}
      rowActions={showAdminActions ? (row) => [
        { value: "edit", label: t("buttons.edit"), icon: <LuPen />, onSelect: () => router.push(`/logs/${row.id}`) },
        { value: "delete", label: t("buttons.delete"), icon: <LuTrash2 />, danger: true, onSelect: () => setDeleteTarget(row) },
      ] : undefined}
    />

    {showAdminActions && <SelectionBar count={selection.length} onClear={() => setSelection([])}>
      <DeleteTimeLogsDialog
        logs={logs.filter(log => selection.includes(log.id))}
        userNames={userNames}
        onDelete={handleDeleteLogs}
        onDeleted={() => setSelection([])}
        trigger={<Button size="xs" variant="outline" colorPalette="red">
          <Icon><LuTrash2 /></Icon> Delete selected
        </Button>}
      />
    </SelectionBar>}

    {deleteTarget && <DeleteTimeLogsDialog
      logs={[deleteTarget]}
      userNames={userNames}
      onDelete={handleDeleteLogs}
      open
      onOpenChange={(open) => { if (!open) setDeleteTarget(undefined); }}
    />}
  </>;
}
