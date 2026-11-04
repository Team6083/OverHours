"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge, Button, Center, EmptyState, Heading, HStack, IconButton, Input, Spinner, Stat, Table, Text, VStack,
} from "@chakra-ui/react";
import { LuDownload, LuLock, LuRefreshCcw } from "react-icons/lu";

import type { LockedTimeLogRow } from "@/lib/data/locked-export";
import { getLockedReportRows } from "./actions";

/** Today as `YYYY-MM-DD` in `timeZone` (en-CA formats dates that way). */
function todayInZone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date());
}

const REASON_BADGE: Record<LockedTimeLogRow["lockReason"], { label: string; color: string }> = {
  AUTO_TIMEOUT: { label: "Auto (cut-off)", color: "orange" },
  ADMIN: { label: "Admin", color: "purple" },
  UNKNOWN: { label: "Unknown", color: "gray" },
};

export default function LockedReportContent(props: { autoLockTime?: string; timeZone: string }) {
  const { autoLockTime, timeZone } = props;

  // Dates are whole days in the server's OVERHOURS_TIMEZONE (both inclusive), resolved on the server, so
  // the filter, the table and the CSV agree whatever the browser's zone. Default: this month up to today.
  const [startStr, setStartStr] = useState(() => `${todayInZone(timeZone).slice(0, 8)}01`);
  const [endStr, setEndStr] = useState(() => todayInZone(timeZone));

  const formatTime = useCallback((d?: Date) => (
    d ? new Date(d).toLocaleString(undefined, { timeZone, hour12: false }) : "-"
  ), [timeZone]);

  const [rows, setRows] = useState<LockedTimeLogRow[] | null>(null);
  // Bumped by the refresh button; loading while the last finished fetch is not for the current request
  const [refreshCount, setRefreshCount] = useState(0);
  const requestKey = `${startStr}-${endStr}-${refreshCount}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    let cancelled = false;
    getLockedReportRows(startStr || undefined, endStr || undefined)
      .then(result => { if (!cancelled) setRows(result); })
      .catch(() => { if (!cancelled) setRows(null); })
      .finally(() => { if (!cancelled) setLoadedKey(requestKey); });
    return () => { cancelled = true; };
  }, [startStr, endStr, requestKey]);

  const handleRefresh = useCallback(() => setRefreshCount(c => c + 1), []);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (startStr) params.set("startDate", startStr);
    if (endStr) params.set("endDate", endStr);
    return `/report/locked/export?${params}`;
  }, [startStr, endStr]);

  const autoCount = rows?.filter(r => r.lockReason === "AUTO_TIMEOUT").length ?? 0;
  const userCount = rows ? new Set(rows.map(r => r.userId)).size : 0;

  return (<>
    <HStack justify="space-between" mb={2} wrap="wrap" gap={3}>
      <Heading as="h2" size="2xl">Locked Logs</Heading>
      <HStack gap={2} wrap="wrap">
        <Input type="date" size="xs" w="auto" value={startStr} max={endStr}
          onChange={e => setStartStr(e.target.value)} aria-label="Start date" />
        <Text fontSize="sm">–</Text>
        <Input type="date" size="xs" w="auto" value={endStr} min={startStr}
          onChange={e => setEndStr(e.target.value)} aria-label="End date" />
        <IconButton aria-label="Refresh" size="sm" variant="ghost" onClick={handleRefresh} loading={loading}>
          <LuRefreshCcw />
        </IconButton>
        <Button size="sm" variant="surface" asChild>
          <a href={exportHref} download><LuDownload /> CSV</a>
        </Button>
      </HStack>
    </HStack>

    <Text fontSize="sm" color="fg.muted" mb={6}>
      Sessions not clocked out normally, filtered by clock-in date.{" "}
      {autoLockTime
        ? `Sessions still clocked in at ${autoLockTime} (${timeZone}) are locked automatically.`
        : "Automatic locking is disabled (OVERHOURS_AUTO_LOCK_TIME is not set)."}
      {" "}Dates and times are in {timeZone}.
    </Text>

    {loading && !rows ? <Center><Spinner /></Center> : (
      rows && rows.length > 0 ? <>
        <HStack align="start" gap={4} mb={6}>
          <Stat.Root>
            <Stat.Label>Locked Logs</Stat.Label>
            <Stat.ValueText>{rows.length}</Stat.ValueText>
          </Stat.Root>
          <Stat.Root>
            <Stat.Label>Auto-locked</Stat.Label>
            <Stat.ValueText>{autoCount}</Stat.ValueText>
          </Stat.Root>
          <Stat.Root>
            <Stat.Label>Users</Stat.Label>
            <Stat.ValueText>{userCount}</Stat.ValueText>
          </Stat.Root>
        </HStack>

        <Table.ScrollArea borderWidth="1px" rounded="md">
          <Table.Root size="sm" stickyHeader>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>User</Table.ColumnHeader>
                <Table.ColumnHeader>In Time</Table.ColumnHeader>
                <Table.ColumnHeader>Out / Cut-off</Table.ColumnHeader>
                <Table.ColumnHeader>Reason</Table.ColumnHeader>
                <Table.ColumnHeader>Locked At</Table.ColumnHeader>
                <Table.ColumnHeader>Locked By</Table.ColumnHeader>
                <Table.ColumnHeader>Notes</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map(row => (
                <Table.Row key={row.id}>
                  <Table.Cell>
                    <VStack align="start" gap={0}>
                      <Text>{row.userName}</Text>
                      <Text fontSize="xs" color="fg.muted">{row.userEmail}</Text>
                    </VStack>
                  </Table.Cell>
                  <Table.Cell>{formatTime(row.inTime)}</Table.Cell>
                  <Table.Cell>{formatTime(row.outTime)}</Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={REASON_BADGE[row.lockReason].color}>
                      {REASON_BADGE[row.lockReason].label}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{formatTime(row.lockedAt)}</Table.Cell>
                  <Table.Cell>{row.lockedByName ?? (row.lockReason === "ADMIN" ? "API" : "-")}</Table.Cell>
                  <Table.Cell>{row.notes ?? ""}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
      </> : (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Indicator><LuLock /></EmptyState.Indicator>
            <EmptyState.Title>{rows ? "No locked logs in this range" : "Failed to load"}</EmptyState.Title>
          </EmptyState.Content>
        </EmptyState.Root>
      )
    )}
  </>);
}
