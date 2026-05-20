"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button, Card, CloseButton, Dialog, HStack, Icon, Portal, Text, VStack, Spinner, Center
} from "@chakra-ui/react";
import { LuChevronsRight } from "react-icons/lu";

import LeaderboardTable from "@/components/LeaderboardTable";
import StatRangeSelector from "@/components/StatRangeSelector";
import { getLeaderboardRankings } from "../actions";

export default function LeaderboardCard(props: {
  initialRankings: { id: string; name: string; duration: number }[];
}) {
  const { initialRankings } = props;
  const t = useTranslations("HomePage.leaderboardCard");

  const [rankings, setRankings] = useState(initialRankings);
  const [loading, setLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{ startDate: Date; endDate: Date } | null>(null);
  const [selectorKey, setSelectorKey] = useState(0);

  const handleStatRangeSelect = async (startDate: Date, endDate: Date) => {
    setSelectedRange({ startDate, endDate });
    setLoading(true);
    try {
      const newRankings = await getLeaderboardRankings({ startDate, endDate });
      setRankings(newRankings);
    } finally {
      setLoading(false);
    }
  };

  const handleClearRange = async () => {
    setSelectedRange(null);
    setSelectorKey(k => k + 1);
    setLoading(true);
    try {
      const newRankings = await getLeaderboardRankings();
      setRankings(newRankings);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root>
      <Card.Root w="full" size="sm">
        <Card.Header>
          <HStack justify="space-between" w="full">
            <Card.Title>{t("title")}</Card.Title>
            <HStack gap={2}>
              <StatRangeSelector key={selectorKey} onSelectAction={handleStatRangeSelect} />
              {selectedRange && (
                <Button size="xs" variant="ghost" onClick={handleClearRange}>
                  {t("clearFilter")}
                </Button>
              )}
            </HStack>
          </HStack>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <Center py={4}>
              <Spinner size="md" />
            </Center>
          ) : (
            <LeaderboardTable rankings={rankings} limits={5} />
          )}
        </Card.Body>
        <Card.Footer>
          <Text fontSize="sm" color="gray.500">{t("footerText")}</Text>
          <Dialog.Trigger asChild>
            <Button size="xs" mt={2}>
              {t("viewMore")}
              <Icon><LuChevronsRight /></Icon>
            </Button>
          </Dialog.Trigger>
        </Card.Footer>
      </Card.Root>

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{t("viewMoreDialog.title")}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {selectedRange && (
                <HStack mb={4} gap={2}>
                  <Text fontSize="sm" color="gray.500">
                    {t("showingRange", {
                      start: selectedRange.startDate.toLocaleDateString(),
                      end: selectedRange.endDate.toLocaleDateString(),
                    })}
                  </Text>
                </HStack>
              )}
              {loading ? (
                <Center py={8}>
                  <Spinner size="lg" />
                </Center>
              ) : (
                <LeaderboardTable rankings={rankings} />
              )}
            </Dialog.Body>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
