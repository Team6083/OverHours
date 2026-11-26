"use client";
import { useCallback, useEffect, useState } from "react";

import { Center, Heading, HStack, IconButton, Spinner, Stat } from "@chakra-ui/react";
import { PageHeader } from "@team6083/ui";
import { LuRefreshCcw } from "react-icons/lu";

import LeaderboardTable from "@/components/ranking/LeaderboardTable";
import StatRangeSelector from "@/components/stats/StatRangeSelector";
import StatValueTextDuration from "@/components/stats/StatValueTextDuration";
import { getOverviewStats, OverviewStats } from "@/lib/data/report";
import { StatRangeDTO } from "@/lib/data/statrange-dto";

export default function ReportOverviewContent({
  userNameDict,
  statRanges,
}: {
  userNameDict: Record<string, string>;
  statRanges: StatRangeDTO[];
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: move fetching to the server component
    handleRefresh();
  }, [handleRefresh]);

  const leaderboardData = stats?.leaderboard.slice(0, 10).map(({ userId, totalMs }) => ({
    id: userId,
    name: userNameDict[userId] || userId,
    duration: Math.floor(totalMs / 1000),
  })) ?? [];

  return (
    <>
      <PageHeader
        title="Overview"
        actions={
          <HStack gap={2}>
            <StatRangeSelector
              statRanges={statRanges}
              onSelectAction={(start, end) => setDateRange([start, end])}
              onClearAction={() => setDateRange(null)}
            />
            <IconButton size="sm" variant="ghost" onClick={handleRefresh} loading={loading}>
              <LuRefreshCcw />
            </IconButton>
          </HStack>
        }
      />

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
