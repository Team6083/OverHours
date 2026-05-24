"use client";
import { useState, useCallback, useEffect } from "react";
import { HStack, Stat, Heading, Center, Spinner, IconButton } from "@chakra-ui/react";

import { LuRefreshCcw } from "react-icons/lu";

import LeaderboardTable from "@/components/LeaderboardTable";
import StatRangeSelector from "@/components/StatRangeSelector";
import StatValueTextDuration from "@/components/StatValueTextDuration";
import { OverviewStats, getOverviewStats } from "@/lib/data/report";

export default function ReportOverviewContent({
  userNameDict,
}: {
  userNameDict: Record<string, string>;
}) {
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    const opts = dateRange ? { startDate: dateRange[0], endDate: dateRange[1] } : undefined;
    getOverviewStats(opts)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [dateRange]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const leaderboardData = stats?.leaderboard.slice(0, 10).map(({ userId, totalMs }) => ({
    id: userId,
    name: userNameDict[userId] || userId,
    duration: Math.floor(totalMs / 1000),
  })) ?? [];

  return (
    <>
      <HStack justify="space-between" mb={4}>
        <Heading as="h2" size="2xl">Overview</Heading>
        <HStack gap={2}>
          <StatRangeSelector
            onSelectAction={(start, end) => setDateRange([start, end])}
            onClearAction={() => setDateRange(null)}
          />
          <IconButton size="sm" variant="ghost" onClick={handleRefresh} loading={loading}>
            <LuRefreshCcw />
          </IconButton>
        </HStack>
      </HStack>

      {loading ? (
        <Center><Spinner /></Center>
      ) : stats ? (
        <>
          <HStack align="start" gap={6} mb={8} flexWrap="wrap">
            <Stat.Root>
              <Stat.Label>Total Hours</Stat.Label>
              <StatValueTextDuration durationMs={stats.totalMs} />
            </Stat.Root>
            <Stat.Root>
              <Stat.Label>Active Users</Stat.Label>
              <Stat.ValueText>{stats.uniqueUsers}</Stat.ValueText>
            </Stat.Root>
            <Stat.Root>
              <Stat.Label>Total Sessions</Stat.Label>
              <Stat.ValueText>{stats.totalSessions}</Stat.ValueText>
            </Stat.Root>
          </HStack>

          <Heading as="h3" size="md" mb={3}>Leaderboard</Heading>
          <LeaderboardTable rankings={leaderboardData} />
        </>
      ) : (
        <Center>No data</Center>
      )}
    </>
  );
}
