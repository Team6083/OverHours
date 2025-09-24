"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Badge, HStack, Stat, Heading, Center, Text, IconButton, Spinner } from "@chakra-ui/react";
import { LuRefreshCcw } from "react-icons/lu";

import Heatmap from "@/components/HeatMap";
import StatValueTextDuration from "@/components/StatValueTextDuration";
import { DailyReportData, getDailyReportData } from "@/lib/data/report";

export default function DailyReportContent(props: {
  userNameDict: Record<string, string>;
}) {
  const { userNameDict } = props;

  const [reportData, setReportData] = useState<DailyReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const start = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);
  const end = useMemo(() => new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1), [start]);

  const handleRefresh = useCallback(() => {
    setLoading(true);

    getDailyReportData([start, end])
      .then(data => {
        setReportData(data);
      })
      .finally(() => setLoading(false));
  }, [start, end]);

  // Fetch report data on component mount
  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);


  const gridData = reportData && reportData.headcountHeatMap
    .map(row => row.map(value => ({
      value: value / Math.max(reportData.maxHeadcount, 25),
      label: value.toString(),
    })));

  const avgDuration = reportData && reportData.users.length > 0
    && reportData.durationStat.total / Math.max(reportData.users.length, 1);

  return (<>
    <HStack justify="space-between" mb={2}>
      <Heading as="h2" size="2xl">Daily Report</Heading>
      <HStack>
        <IconButton size="sm" variant="ghost" onClick={handleRefresh}><LuRefreshCcw /></IconButton>
      </HStack>
    </HStack>

    <Text fontSize="sm" color="fg.muted" mb={4}>
      Showing report from{" "}
      <Badge colorPalette="blue">{start.toLocaleString()}</Badge>
      {" to "}
      <Badge colorPalette="blue">{end.toLocaleString()}</Badge>
    </Text>

    {loading ? <Center><Spinner /></Center> : (
      reportData ? <>
        <HStack align="start" gap={4} mb={8}>
          <Stat.Root>
            <Stat.Label>Users</Stat.Label>
            <Stat.ValueText>{reportData.users.length}</Stat.ValueText>
            {/* <Stat.HelpText>+5% from last day</Stat.HelpText> */}
          </Stat.Root>

          <Stat.Root>
            <Stat.Label>Average Duration</Stat.Label>
            {avgDuration ? <StatValueTextDuration durationMs={avgDuration} /> : <Stat.ValueText>N/A</Stat.ValueText>}
          </Stat.Root>

          <Stat.Root>
            <Stat.Label>Shortest Duration</Stat.Label>
            {reportData.durationStat.min ? <>
              <StatValueTextDuration durationMs={reportData.durationStat.min.value} />
              <Stat.HelpText>
                By <Badge colorPalette="cyan">
                  {userNameDict[reportData.durationStat.min.userId] || reportData.durationStat.min.userId}
                </Badge>
              </Stat.HelpText>
            </> : <Stat.ValueText>N/A</Stat.ValueText>}
          </Stat.Root>

          <Stat.Root>
            <Stat.Label>Longest Duration</Stat.Label>
            {reportData.durationStat.max ? <>
              <StatValueTextDuration durationMs={reportData.durationStat.max.value} />
              <Stat.HelpText>
                By <Badge colorPalette="cyan">
                  {userNameDict[reportData.durationStat.max.userId] || reportData.durationStat.max.userId}
                </Badge>
              </Stat.HelpText>
            </> : <Stat.ValueText>N/A</Stat.ValueText>}
          </Stat.Root>
        </HStack>

        <Heading as="h3">Headcount Heat Map</Heading>

        {gridData ? <Heatmap
          rows={6}
          columns={24}
          gridData={gridData}
          headerProps={{ fontSize: "2xs", color: "fg.muted", fontWeight: "medium" }}
          rowHeaders={Array.from({ length: 6 }, (_, i) => `${i * 10}`)}
          columnHeaders={Array.from({ length: 24 }, (_, i) => `${i}`)}
          cellProps={{ rounded: "xs" }}
        /> : <Center>No data</Center>
        }
      </> : <Center>No data</Center>
    )}
  </>);
}
