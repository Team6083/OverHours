"use client";
import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Badge, Button, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";

import { toaster } from "@/components/ui/toaster";
import { saveWeek } from "./actions";

export default function WeekForm(props: {
  weekStart: string;
  days: { date: string; inSeason: boolean }[];
  unavailable: string[];
}) {
  const { weekStart, days } = props;
  const t = useTranslations("Attendance.week");
  const format = useFormatter();

  const [unavailable, setUnavailable] = useState(() => new Set(props.unavailable));
  const [isPending, startTransition] = useTransition();

  const toggle = (date: string) => setUnavailable(prev => {
    const next = new Set(prev);
    if (!next.delete(date)) next.add(date);
    return next;
  });

  const handleSave = () => startTransition(async () => {
    try {
      const result = await saveWeek(weekStart, Array.from(unavailable));
      if (result.ok) toaster.success({ title: t("saved") });
      else toaster.error({ title: t("saveFailed") });
    } catch {
      toaster.error({ title: t("saveFailed") });
    }
  });

  const filled = props.unavailable.length > 0;

  return (
    <Stack gap={3}>
      <Text fontSize="sm" color="fg.muted">{t("help")}</Text>

      <SimpleGrid columns={{ base: 2, sm: 4, md: 7 }} gap={2}>
        {days.map(({ date, inSeason }) => {
          const isUnavailable = unavailable.has(date);
          const day = new Date(`${date}T00:00:00Z`);

          return (
            <Button
              key={date}
              height="auto"
              py={3}
              flexDirection="column"
              variant={isUnavailable ? "solid" : "outline"}
              colorPalette={isUnavailable ? "red" : "gray"}
              disabled={!inSeason}
              aria-pressed={isUnavailable}
              onClick={() => toggle(date)}
            >
              <Text fontSize="xs">{format.dateTime(day, { timeZone: "UTC", weekday: "short" })}</Text>
              <Text>{format.dateTime(day, { timeZone: "UTC", month: "2-digit", day: "2-digit" })}</Text>
              <Text fontSize="xs">
                {!inSeason ? t("outOfSeason") : isUnavailable ? t("cannotCome") : t("canCome")}
              </Text>
            </Button>
          );
        })}
      </SimpleGrid>

      <HStack justify="space-between">
        <Badge colorPalette={filled ? "green" : "orange"}>{filled ? t("filled") : t("notFilled")}</Badge>
        <Button size="sm" onClick={handleSave} loading={isPending} disabled={!days.some(day => day.inSeason)}>
          {t("save")}
        </Button>
      </HStack>
    </Stack>
  );
}
