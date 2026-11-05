"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge, Button, Center, EmptyState, Heading, HStack, IconButton, Input, Spinner, Stat, Table, Text, VStack,
} from "@chakra-ui/react";
import { LuDownload, LuLock, LuRefreshCcw } from "react-icons/lu";
import { useTranslations } from "next-intl";

import type { LockedTimeLogRow } from "@/lib/data/locked-export";
import { getLockedReportRows } from "./actions";

/** Today as `YYYY-MM-DD` in `timeZone` (en-CA formats dates that way). */
function todayInZone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date());
}

const REASON_COLOR: Record<LockedTimeLogRow["lockReason"], string> = {
  AUTO_TIMEOUT: "orange",
  ADMIN: "purple",
  UNKNOWN: "gray",
};

export default function LockedReportContent(props: { autoLockTime?: string; timeZone: string }) {
  const { autoLockTime, timeZone } = props;
  const t = useTranslations("LockedReportPage");

  // Dates are whole days in the server's time zone (TZ) (both inclusive), resolved on the server, so
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
      <Heading as="h2" size="2xl">{t("title")}</Heading>
      <HStack gap={2} wrap="wrap">
        <Input type="date" size="xs" w="auto" value={startStr} max={endStr}
          onChange={e => setStartStr(e.target.value)} aria-label={t("startDate")} />
        <Text fontSize="sm">–</Text>
        <Input type="date" size="xs" w="auto" value={endStr} min={startStr}
          onChange={e => setEndStr(e.target.value)} aria-label={t("endDate")} />
        <IconButton aria-label={t("refresh")} size="sm" variant="ghost" onClick={handleRefresh} loading={loading}>
          <LuRefreshCcw />
        </IconButton>
        <Button size="sm" variant="surface" asChild>
          <a href={exportHref} download><LuDownload /> {t("downloadCsv")}</a>
        </Button>
      </HStack>
    </HStack>

    <Text fontSize="sm" color="fg.muted" mb={6}>
      {t("description.filter")}{" "}
      {autoLockTime
        ? t("description.autoLockOn", { time: autoLockTime, timeZone })
        : t("description.autoLockOff")}
      {" "}{t("description.timeZone", { timeZone })}
    </Text>

    {loading && !rows ? <Center><Spinner /></Center> : (
      rows && rows.length > 0 ? <>
        <HStack align="start" gap={4} mb={6}>
          <Stat.Root>
            <Stat.Label>{t("stats.lockedLogs")}</Stat.Label>
            <Stat.ValueText>{rows.length}</Stat.ValueText>
          </Stat.Root>
          <Stat.Root>
            <Stat.Label>{t("stats.autoLocked")}</Stat.Label>
            <Stat.ValueText>{autoCount}</Stat.ValueText>
          </Stat.Root>
          <Stat.Root>
            <Stat.Label>{t("stats.users")}</Stat.Label>
            <Stat.ValueText>{userCount}</Stat.ValueText>
          </Stat.Root>
        </HStack>

        <Table.ScrollArea borderWidth="1px" rounded="md">
          <Table.Root size="sm" stickyHeader>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>{t("columns.user")}</Table.ColumnHeader>
                <Table.ColumnHeader>{t("columns.inTime")}</Table.ColumnHeader>
                <Table.ColumnHeader>{t("columns.outTime")}</Table.ColumnHeader>
                <Table.ColumnHeader>{t("columns.reason")}</Table.ColumnHeader>
                <Table.ColumnHeader>{t("columns.lockedAt")}</Table.ColumnHeader>
                <Table.ColumnHeader>{t("columns.lockedBy")}</Table.ColumnHeader>
                <Table.ColumnHeader>{t("columns.notes")}</Table.ColumnHeader>
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
                    <Badge colorPalette={REASON_COLOR[row.lockReason]}>
                      {t(`reasons.${row.lockReason}`)}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{formatTime(row.lockedAt)}</Table.Cell>
                  <Table.Cell>{row.lockedByName ?? (row.lockReason === "ADMIN" ? t("lockedByApi") : "-")}</Table.Cell>
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
            <EmptyState.Title>{rows ? t("empty") : t("loadFailed")}</EmptyState.Title>
          </EmptyState.Content>
        </EmptyState.Root>
      )
    )}
  </>);
}
