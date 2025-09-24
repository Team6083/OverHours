"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Badge, HStack, Stat, Heading, Center, IconButton, Spinner, ButtonGroup, Input } from "@chakra-ui/react";
import { LuArrowLeft, LuArrowRight, LuRefreshCcw } from "react-icons/lu";

import Heatmap from "@/components/HeatMap";
import StatValueTextDuration from "@/components/StatValueTextDuration";
import { DailyReportData, getDailyReportData } from "@/lib/data/report";

export default function DailyReportContent(props: {
  userNameDict: Record<string, string>;
}) {
  const { userNameDict } = props;

  // Date range state
  const [start, setStart] = useState((() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  })());
  const end = useMemo(() => new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1), [start]);

  const handlePreviousDay = () => {
    const newDate = new Date(start);
    newDate.setDate(newDate.getDate() - 1);
    setStart(newDate);
  }

  const handleNextDay = () => {
    const newDate = new Date(start);
    newDate.setDate(newDate.getDate() + 1);
    setStart(newDate);
  }

  const handleDateInputOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    newDate.setHours(0, 0, 0, 0);
    setStart(newDate);
  }

  const dateInputValue = useMemo(() => {
    const year = start.getFullYear();
    const month = (start.getMonth() + 1).toString().padStart(2, '0');
    const day = start.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [start]);

  // Fetching report data
  const [reportData, setReportData] = useState<DailyReportData | null>(null);
  const [loading, setLoading] = useState(false);

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

  // Prepare heatmap data
  const heatmapData = useMemo(() => {
    if (!reportData) return [];

    return reportData.headcountHeatMap.data
      .map(row => row.map(value => ({
        value: value / Math.max(reportData.headcountHeatMap.maxHeadcount, 15),
        label: value.toString(),
      })));
  }, [reportData]);

  // Prepare stats
  const avgDuration = reportData && reportData.userDuration.length > 0
    && reportData.durationStat.total / Math.max(reportData.userDuration.length, 1);

  return (<>
    <HStack justify="space-between" mb={4}>
      <Heading as="h2" size="2xl">Daily Report</Heading>
      <HStack>
        <ButtonGroup size="sm" variant="ghost" gap={1}>
          <IconButton aria-label="Previous Day" onClick={handlePreviousDay}><LuArrowLeft /></IconButton>
          <Input type="date" size="xs" value={dateInputValue} onChange={handleDateInputOnChange} />
          <IconButton aria-label="Next Day" onClick={handleNextDay}><LuArrowRight /></IconButton>
        </ButtonGroup>
        <IconButton size="sm" variant="ghost" onClick={handleRefresh} loading={loading}><LuRefreshCcw /></IconButton>
      </HStack>
    </HStack>

    {loading ? <Center><Spinner /></Center> : (
      reportData ? <>
        <HStack align="start" gap={4} mb={8}>
          <Stat.Root>
            <Stat.Label>User Count</Stat.Label>
            <Stat.ValueText>{reportData?.userDuration.length}</Stat.ValueText>
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
              {reportData.durationStat.min.userId && (
                <Stat.HelpText>
                  By <Badge colorPalette="cyan">
                    {userNameDict[reportData.durationStat.min.userId] || reportData.durationStat.min.userId}
                  </Badge>
                </Stat.HelpText>
              )}
            </> : <Stat.ValueText>N/A</Stat.ValueText>}
          </Stat.Root>

          <Stat.Root>
            <Stat.Label>Longest Duration</Stat.Label>
            {reportData.durationStat.max ? <>
              <StatValueTextDuration durationMs={reportData.durationStat.max.value} />
              {reportData.durationStat.max.userId && (
                <Stat.HelpText>
                  By <Badge colorPalette="cyan">
                    {userNameDict[reportData.durationStat.max.userId] || reportData.durationStat.max.userId}
                  </Badge>
                </Stat.HelpText>
              )}
            </> : <Stat.ValueText>N/A</Stat.ValueText>}
          </Stat.Root>
        </HStack>

        <Heading as="h3">Headcount Heat Map</Heading>

        {heatmapData ? <Heatmap
          rows={6}
          columns={24}
          gridData={heatmapData}
          headerProps={{ fontSize: "2xs", color: "fg.muted", fontWeight: "medium" }}
          rowHeaders={Array.from({ length: 6 }, (_, i) => `${i * 10}`)}
          columnHeaders={Array.from({ length: 24 }, (_, i) => `${i}`)}
          cellProps={{ rounded: "xs" }}
        /> : <Center>No data</Center>}

      </> : <Center>No data</Center>
    )}

  </>);
}
