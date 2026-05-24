"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Box, HStack, Stat, Heading, Center, Spinner, IconButton,
  Table, Portal, Select, createListCollection, SegmentGroup, Text,
} from "@chakra-ui/react";
import { LuArrowLeft, LuArrowRight, LuRefreshCcw } from "react-icons/lu";

import StatRangeSelector from "@/components/StatRangeSelector";
import StatValueTextDuration from "@/components/StatValueTextDuration";
import Heatmap from "@/components/HeatMap";
import { getUserReportData, UserReportData } from "@/lib/data/report";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const DOW_LABELS_FULL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_HEADERS = Array.from({ length: 24 }, (_, i) => (i % 3 === 0 ? `${i}` : ""));

type GroupBy = "day" | "week" | "month" | "year";
const GROUP_HEADER: Record<GroupBy, string> = { day: "Date", week: "Week", month: "Month", year: "Year" };

function getMondayOf(d: Date): Date {
  const copy = new Date(d);
  const dow = copy.getUTCDay();
  copy.setUTCDate(copy.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatMs(ms: number): string {
  if (ms <= 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return "< 1m";
}

export default function UserReportContent({
  users,
  defaultUserId = "",
}: {
  users: { id: string; name: string }[];
  defaultUserId?: string;
}) {
  const [selectedUserId, setSelectedUserId] = useState<string>(defaultUserId);
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
  const [reportData, setReportData] = useState<UserReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [heatmapView, setHeatmapView] = useState<"day" | "session">("day");
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [groupBy, setGroupBy] = useState<GroupBy>("day");

  const userCollection = useMemo(() => createListCollection({
    items: users.map(u => ({ label: u.name, value: u.id })),
  }), [users]);

  const handleRefresh = useCallback(() => {
    if (!selectedUserId) return;
    setLoading(true);
    const opts = dateRange ? { startDate: dateRange[0], endDate: dateRange[1] } : undefined;
    getUserReportData(selectedUserId, opts)
      .then(setReportData)
      .finally(() => setLoading(false));
  }, [selectedUserId, dateRange]);

  useEffect(() => {
    if (selectedUserId) handleRefresh();
    else setReportData(null);
  }, [handleRefresh, selectedUserId]);

  // Grouped sessions table data
  const groupedSessions = useMemo(() => {
    if (!reportData) return [];

    if (groupBy === "day") {
      return reportData.dailyBreakdown.map(d => ({
        key: new Date(d.date).toISOString().slice(0, 10),
        label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
        totalMs: d.totalMs,
        sessions: d.sessions,
      }));
    }

    const map = new Map<string, { label: string; totalMs: number; sessions: number }>();
    for (const d of reportData.dailyBreakdown) {
      const date = new Date(d.date);
      let key: string, label: string;
      if (groupBy === "week") {
        const mon = getMondayOf(date);
        const sun = new Date(mon.getTime() + 6 * 86400000);
        key = mon.toISOString().slice(0, 10);
        label = `${mon.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} – ${sun.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
      } else if (groupBy === "month") {
        const y = date.getUTCFullYear(), m = date.getUTCMonth();
        key = `${y}-${String(m + 1).padStart(2, "0")}`;
        label = new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
      } else {
        key = String(date.getUTCFullYear());
        label = key;
      }
      const existing = map.get(key);
      if (existing) { existing.totalMs += d.totalMs; existing.sessions += d.sessions; }
      else map.set(key, { label, totalMs: d.totalMs, sessions: d.sessions });
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, data]) => ({ key, ...data }));
  }, [reportData, groupBy]);

  // Year range derived from data
  const { minYear, maxYear } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    if (!reportData?.dailyBreakdown.length) return { minYear: currentYear, maxYear: currentYear };
    const years = reportData.dailyBreakdown.map(d => new Date(d.date).getUTCFullYear());
    return { minYear: Math.min(...years), maxYear: Math.max(Math.max(...years), currentYear) };
  }, [reportData]);

  // GitHub-style year heatmap (Per Day view)
  const yearHeatmap = useMemo(() => {
    if (!reportData) return null;

    const dailyMap = new Map<string, number>();
    for (const d of reportData.dailyBreakdown) {
      dailyMap.set(new Date(d.date).toISOString().slice(0, 10), d.totalMs);
    }

    const jan1 = new Date(Date.UTC(selectedYear, 0, 1));
    const startMonday = new Date(jan1.getTime() - ((jan1.getUTCDay() + 6) % 7) * 86400000);
    const dec31 = new Date(Date.UTC(selectedYear, 11, 31));
    const endSunday = new Date(dec31.getTime() + ((7 - dec31.getUTCDay()) % 7) * 86400000);
    const weekCount = Math.round((endSunday.getTime() - startMonday.getTime() + 86400000) / (7 * 86400000));
    const maxMs = Math.max(...Array.from(dailyMap.values()), 4 * 3600000);

    const grid = Array.from({ length: 7 }, (_, dow) =>
      Array.from({ length: weekCount }, (_, weekIdx) => {
        const cellDate = new Date(startMonday.getTime() + (weekIdx * 7 + dow) * 86400000);
        const key = cellDate.toISOString().slice(0, 10);
        const ms = dailyMap.get(key) ?? 0;
        const isInYear = cellDate.getUTCFullYear() === selectedYear;
        const dateLabel = cellDate.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
        const label = ms > 0 ? `${dateLabel} — ${formatMs(ms)}` : dateLabel;
        return { value: isInYear ? ms / maxMs : 0, label };
      })
    );

    const monthHeaders = Array.from({ length: weekCount }, (_, i) => {
      const ws = new Date(startMonday.getTime() + i * 7 * 86400000);
      if (ws.getUTCFullYear() !== selectedYear) return "";
      const prev = new Date(startMonday.getTime() + (i - 1) * 7 * 86400000);
      if (i === 0 || ws.getUTCMonth() !== prev.getUTCMonth()) {
        return ws.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
      }
      return "";
    });

    return { grid, weekCount, monthHeaders };
  }, [reportData, selectedYear]);

  // Day-of-week × hour-of-day presence heatmap (Sessions view)
  const presenceGrid = useMemo(() => {
    if (!reportData) return null;

    const counts = Array.from({ length: 7 }, () => new Array(24).fill(0) as number[]);

    for (const s of reportData.sessions) {
      const inD = new Date(s.inTime);
      const outD = s.outTime
        ? new Date(s.outTime)
        : s.status === "CURRENTLY_IN" ? new Date() : null;

      if (!outD || s.status === "LOCKED") {
        // Point event: mark just the clock-in hour
        const dow = (inD.getDay() + 6) % 7;
        counts[dow][inD.getHours()]++;
        continue;
      }

      // Walk hour-by-hour through the session's duration
      const startHour = new Date(inD.getFullYear(), inD.getMonth(), inD.getDate(), inD.getHours()).getTime();
      for (let t = startHour; t < outD.getTime(); t += 3600000) {
        const d = new Date(t);
        counts[(d.getDay() + 6) % 7][d.getHours()]++;
      }
    }

    const maxCount = Math.max(...counts.flat(), 5);
    return counts.map((row, dow) =>
      row.map((count, hour) => ({
        value: count / maxCount,
        label: count > 0
          ? `${DOW_LABELS_FULL[dow]} ${hour.toString().padStart(2, "0")}:00 — ${count} session${count > 1 ? "s" : ""}`
          : `${DOW_LABELS_FULL[dow]} ${hour.toString().padStart(2, "0")}:00`,
      }))
    );
  }, [reportData]);

  return (
    <>
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Heading as="h2" size="2xl">User Report</Heading>
        <HStack gap={2} flexWrap="wrap">
          <Select.Root
            collection={userCollection}
            size="xs"
            w="auto"
            minW="44"
            value={selectedUserId ? [selectedUserId] : []}
            onValueChange={({ value }) => setSelectedUserId(value[0] ?? "")}
          >
            <Select.HiddenSelect />
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText placeholder="Select user" />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Portal>
              <Select.Positioner>
                <Select.Content>
                  {userCollection.items.map(item => (
                    <Select.Item item={item} key={item.value}>
                      {item.label}
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Portal>
          </Select.Root>

          <StatRangeSelector
            onSelectAction={(start, end) => setDateRange([start, end])}
            onClearAction={() => setDateRange(null)}
          />

          <IconButton size="sm" variant="ghost" onClick={handleRefresh} loading={loading} disabled={!selectedUserId}>
            <LuRefreshCcw />
          </IconButton>
        </HStack>
      </HStack>

      {!selectedUserId ? (
        <Center color="fg.muted">Select a user to view their report.</Center>
      ) : loading ? (
        <Center><Spinner /></Center>
      ) : reportData ? (
        <>
          <HStack align="start" gap={6} mb={8} flexWrap="wrap">
            <Stat.Root>
              <Stat.Label>Total Hours</Stat.Label>
              <StatValueTextDuration durationMs={reportData.stats.totalMs} />
            </Stat.Root>
            <Stat.Root>
              <Stat.Label>Sessions</Stat.Label>
              <Stat.ValueText>{reportData.stats.totalSessions}</Stat.ValueText>
              {reportData.stats.lockedCount > 0 && (
                <Stat.HelpText>
                  {reportData.stats.lockedCount} locked ({Math.round(reportData.stats.lockedCount / reportData.stats.totalSessions * 100)}%)
                </Stat.HelpText>
              )}
            </Stat.Root>
            <Stat.Root>
              <Stat.Label>Days Attended</Stat.Label>
              <Stat.ValueText>{reportData.stats.daysAttended}</Stat.ValueText>
            </Stat.Root>
            <Stat.Root>
              <Stat.Label>Avg / Day</Stat.Label>
              {reportData.stats.daysAttended > 0
                ? <StatValueTextDuration durationMs={reportData.stats.totalMs / reportData.stats.daysAttended} />
                : <Stat.ValueText>N/A</Stat.ValueText>}
            </Stat.Root>
            <Stat.Root>
              <Stat.Label>Avg / Session</Stat.Label>
              {reportData.stats.totalSessions - reportData.stats.lockedCount > 0
                ? <StatValueTextDuration durationMs={reportData.stats.totalMs / (reportData.stats.totalSessions - reportData.stats.lockedCount)} />
                : <Stat.ValueText>N/A</Stat.ValueText>}
            </Stat.Root>
          </HStack>

          <HStack justify="space-between" align="center" mb={3}>
            <Heading as="h3" size="md">Activity</Heading>
            <HStack gap={2}>
              {heatmapView === "day" && (
                <HStack gap={1} align="center">
                  <IconButton
                    size="xs" variant="ghost"
                    onClick={() => setSelectedYear(y => y - 1)}
                    disabled={selectedYear <= minYear}
                    aria-label="Previous year"
                  >
                    <LuArrowLeft />
                  </IconButton>
                  <Text fontSize="sm" minW="40px" textAlign="center">{selectedYear}</Text>
                  <IconButton
                    size="xs" variant="ghost"
                    onClick={() => setSelectedYear(y => y + 1)}
                    disabled={selectedYear >= maxYear}
                    aria-label="Next year"
                  >
                    <LuArrowRight />
                  </IconButton>
                </HStack>
              )}
              <SegmentGroup.Root
                size="xs"
                value={heatmapView}
                onValueChange={({ value }) => setHeatmapView(value as "day" | "session")}
              >
                <SegmentGroup.Indicator />
                <SegmentGroup.Items
                  items={[
                    { value: "day", label: "Calendar" },
                    { value: "session", label: "Time of Day" },
                  ]}
                />
              </SegmentGroup.Root>
            </HStack>
          </HStack>

          <Box overflowX="auto" pb={2}>
            {heatmapView === "day" ? (
              yearHeatmap ? (
                <Heatmap
                  rows={7}
                  columns={yearHeatmap.weekCount}
                  gridData={yearHeatmap.grid}
                  headerProps={{ fontSize: "2xs", color: "fg.muted", fontWeight: "medium" }}
                  rowHeaders={DAY_LABELS}
                  columnHeaders={yearHeatmap.monthHeaders}
                  cellProps={{ rounded: "xs" }}
                />
              ) : <Center color="fg.muted">No data</Center>
            ) : (
              presenceGrid ? (
                <Heatmap
                  rows={7}
                  columns={24}
                  gridData={presenceGrid}
                  headerProps={{ fontSize: "2xs", color: "fg.muted", fontWeight: "medium" }}
                  rowHeaders={DAY_LABELS}
                  columnHeaders={HOUR_HEADERS}
                  cellProps={{ rounded: "xs" }}
                />
              ) : <Center color="fg.muted">No data</Center>
            )}
          </Box>

          <HStack justify="space-between" align="center" mt={8} mb={3}>
            <Heading as="h3" size="md">Sessions</Heading>
            <SegmentGroup.Root
              size="xs"
              value={groupBy}
              onValueChange={({ value }) => setGroupBy(value as GroupBy)}
            >
              <SegmentGroup.Indicator />
              <SegmentGroup.Items
                items={[
                  { value: "day", label: "Daily" },
                  { value: "week", label: "Weekly" },
                  { value: "month", label: "Monthly" },
                  { value: "year", label: "Yearly" },
                ]}
              />
            </SegmentGroup.Root>
          </HStack>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row bg="transparent">
                <Table.ColumnHeader>{GROUP_HEADER[groupBy]}</Table.ColumnHeader>
                <Table.ColumnHeader>Total Hours</Table.ColumnHeader>
                <Table.ColumnHeader>Sessions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {groupedSessions.map(row => (
                <Table.Row key={row.key} bg="transparent">
                  <Table.Cell>{row.label}</Table.Cell>
                  <Table.Cell>{formatMs(row.totalMs)}</Table.Cell>
                  <Table.Cell>{row.sessions}</Table.Cell>
                </Table.Row>
              ))}
              {groupedSessions.length === 0 && (
                <Table.Row bg="transparent">
                  <Table.Cell colSpan={3} textAlign="center" color="fg.muted">No data</Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        </>
      ) : (
        <Center>No data for this user in the selected period.</Center>
      )}
    </>
  );
}
