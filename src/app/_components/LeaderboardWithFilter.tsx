"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { HStack, VStack, Spinner, Center, Heading, Popover, IconButton, Icon, Portal } from "@chakra-ui/react";
import { LuCalendarRange } from "react-icons/lu";

import LeaderboardTable from "@/components/LeaderboardTable";
import StatRangeSelector from "@/components/StatRangeSelector";
import { getLeaderboardRankings } from "../actions";

export default function LeaderboardWithFilter(props: {
  initialRankings: { id: string; name: string; duration: number }[];
}) {
  const { initialRankings } = props;
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
      <HStack justify="space-between" align="center">
        <Heading as="h3" size="lg">{t("title")}</Heading>
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
                    onSelectAction={handleStatRangeSelect}
                    onClearAction={handleClearRange}
                  />
                </Popover.Body>
              </Popover.Content>
            </Popover.Positioner>
          </Portal>
        </Popover.Root>
      </HStack>
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
