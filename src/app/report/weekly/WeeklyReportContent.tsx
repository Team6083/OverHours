"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Badge, HStack, Stat, Heading, Center, IconButton, Spinner, ButtonGroup, Table,
} from "@chakra-ui/react";
import { LuArrowLeft, LuArrowRight, LuRefreshCcw } from "react-icons/lu";

import HeatMap from "@/components/HeatMap";
import StatValueTextDuration from "@/components/StatValueTextDuration";
import { WeeklyReportData, getWeeklyReportData } from "@/lib/data/report";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LABELS_SHORT = ["M", "T", "W", "T", "F", "S", "S"];

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return "< 1m";
}

export default function WeeklyReportContent({
  userNameDict: _userNameDict,
}: {
  userNameDict: Record<string, string>;
}) {
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const weekEnd = useMemo(() => new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1), [weekStart]);

  const [reportData, setReportData] = useState<WeeklyReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    getWeeklyReportData(weekStart, weekEnd)
      .then(setReportData)
      .finally(() => setLoading(false));
  }, [weekStart, weekEnd]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const weekLabel = useMemo(() => {
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
  }, [weekStart, weekEnd]);

  const heatmapData = useMemo(() => {
    if (!reportData) return [];
    const maxHc = Math.max(reportData.headcountHeatMap.maxHeadcount, 15);
    return reportData.headcountHeatMap.data.map((row, rowIdx) =>
      row.map((value, colIdx) => {
        const timeStr = `${DAY_LABELS[rowIdx]} ${colIdx}:00`;
        return { value: value / maxHc, label: value > 0 ? `${timeStr} — ${value} people` : timeStr };
      })
    );
  }, [reportData]);

  return (
    <>
      <HStack justify="space-between" mb={4}>
        <Heading as="h2" size="2xl">Weekly Report</Heading>
        <HStack gap={3}>
          <ButtonGroup size="sm" variant="ghost" gap={1}>
            <IconButton aria-label="Previous Week" onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))}>
              <LuArrowLeft />
            </IconButton>
            <Center px={2} fontSize="sm" whiteSpace="nowrap">{weekLabel}</Center>
            <IconButton aria-label="Next Week" onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))}>
              <LuArrowRight />
            </IconButton>
          </ButtonGroup>
          <IconButton size="sm" variant="ghost" onClick={handleRefresh} loading={loading}>
            <LuRefreshCcw />
          </IconButton>
        </HStack>
      </HStack>

      {loading ? (
        <Center><Spinner /></Center>
      ) : reportData ? (
        <>
          <HStack align="start" gap={6} mb={8} flexWrap="wrap">
            <Stat.Root>
              <Stat.Label>Active Users</Stat.Label>
              <Stat.ValueText>{reportData.summary.uniqueUsers}</Stat.ValueText>
            </Stat.Root>
            <Stat.Root>
              <Stat.Label>Avg Hours / Day</Stat.Label>
              <StatValueTextDuration durationMs={reportData.summary.avgDailyMs} />
            </Stat.Root>
            <Stat.Root>
              <Stat.Label>Total Hours</Stat.Label>
              <StatValueTextDuration durationMs={reportData.summary.totalMs} />
            </Stat.Root>
            <Stat.Root>
              <Stat.Label>Peak Day</Stat.Label>
              <Stat.ValueText>{DAY_LABELS[reportData.summary.peakDayIndex]}</Stat.ValueText>
            </Stat.Root>
          </HStack>

          <Heading as="h3" size="md" mb={3}>Daily Breakdown</Heading>
          <Table.Root size="sm" mb={8}>
            <Table.Header>
              <Table.Row bg="transparent">
                <Table.ColumnHeader>Day</Table.ColumnHeader>
                <Table.ColumnHeader>Users</Table.ColumnHeader>
                <Table.ColumnHeader>Sessions</Table.ColumnHeader>
                <Table.ColumnHeader>Total Hours</Table.ColumnHeader>
                <Table.ColumnHeader>Avg / User</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {reportData.days.map((day, i) => {
                const avgMs = day.userCount > 0 ? day.totalMs / day.userCount : 0;
                const isPeak = i === reportData.summary.peakDayIndex && day.totalMs > 0;
                return (
                  <Table.Row key={i} bg="transparent">
                    <Table.Cell>
                      <Badge colorPalette={isPeak ? "green" : "gray"}>{DAY_LABELS[i]}</Badge>
                    </Table.Cell>
                    <Table.Cell>{day.userCount}</Table.Cell>
                    <Table.Cell>{day.sessions}</Table.Cell>
                    <Table.Cell>{day.totalMs > 0 ? formatMs(day.totalMs) : "—"}</Table.Cell>
                    <Table.Cell>{avgMs > 0 ? formatMs(avgMs) : "—"}</Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>

          <Heading as="h3" size="md" mb={3}>Headcount Heatmap</Heading>
          <HeatMap
            rows={7}
            columns={24}
            gridData={heatmapData}
            rowHeaders={DAY_LABELS_SHORT}
            columnHeaders={Array.from({ length: 24 }, (_, i) => (i % 3 === 0 ? `${i}` : ""))}
            headerProps={{ fontSize: "2xs", color: "fg.muted", fontWeight: "medium" }}
            cellProps={{ rounded: "xs" }}
          />
        </>
      ) : (
        <Center>No data</Center>
      )}
    </>
  );
}
