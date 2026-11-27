"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Center, Icon, IconButton, Popover, Portal, Spinner, VStack } from "@chakra-ui/react";
import { TitleBar } from "@team6083/ui";
import { LuCalendarRange } from "react-icons/lu";

import LeaderboardTable from "@/components/ranking/LeaderboardTable";
import StatRangeSelector from "@/components/stats/StatRangeSelector";
import { StatRangeDTO } from "@/lib/data/statrange-dto";
import { getLeaderboardRankings } from "../actions";

export default function LeaderboardTabPanel(props: {
  initialRankings: { id: string; name: string; duration: number }[];
  statRanges: StatRangeDTO[];
}) {
  const { initialRankings, statRanges } = props;
  const t = useTranslations("HomePage.leaderboardWithFilter");

  const [rankings, setRankings] = useState(initialRankings);
  const [loading, setLoading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleStatRangeSelect = async (startDate: Date, endDate: Date) => {
    setPopoverOpen(false);
    setLoading(true);
    try {
      const newRankings = await getLeaderboardRankings({ startDate, endDate });
      setRankings(newRankings);
    } finally {
      setLoading(false);
    }
  };

  const handleClearRange = async () => {
    setPopoverOpen(false);
    setLoading(true);
    try {
      const newRankings = await getLeaderboardRankings();
      setRankings(newRankings);
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack align="stretch" gap={3}>
      <TitleBar
        title={t("title")}
        level={3}
        size="lg"
        end={statRanges.length > 0 ?
          <Popover.Root open={popoverOpen} onOpenChange={(e) => setPopoverOpen(e.open)}>
            <Popover.Trigger asChild>
              <IconButton size="sm" variant="ghost" aria-label="Select date range">
                <Icon><LuCalendarRange /></Icon>
              </IconButton>
            </Popover.Trigger>
            <Portal>
              <Popover.Positioner>
                <Popover.Content>
                  <Popover.Arrow />
                  <Popover.Body>
                    <StatRangeSelector
                      statRanges={statRanges}
                      onSelectAction={handleStatRangeSelect}
                      onClearAction={handleClearRange}
                    />
                  </Popover.Body>
                </Popover.Content>
              </Popover.Positioner>
            </Portal>
          </Popover.Root> : null
        }
      />
      {loading ? (
        <Center py={8}>
          <Spinner size="lg" />
        </Center>
      ) : (
        <LeaderboardTable rankings={rankings} />
      )}
    </VStack>
  );
}
