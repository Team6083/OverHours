"use client";
import { useRef, useState, useTransition } from "react";
import { Global } from "@emotion/react";
import { useFormatter, useTranslations } from "next-intl";
import { Badge, Button, HStack, Stack, Table, Text } from "@chakra-ui/react";

import { toaster } from "@/components/ui/toaster";
import { saveWeek } from "./actions";

export default function WeekForm(props: {
  weekStart: string;
  days: { date: string; inSeason: boolean; events: string[]; isToday: boolean }[];
  unavailable: string[];
}) {
  const { weekStart, days } = props;
  const t = useTranslations("Attendance");
  const format = useFormatter();

  const [unavailable, setUnavailable] = useState(() => new Set(props.unavailable));
  const [isPending, startTransition] = useTransition();
  const saving = useRef(false);

  const toggle = (date: string) => setUnavailable(prev => {
    const next = new Set(prev);
    if (!next.delete(date)) next.add(date);
    return next;
  });

  const handleSave = () => {
    if (saving.current) return;
    saving.current = true;

    startTransition(async () => {
      try {
        const result = await saveWeek(weekStart, Array.from(unavailable));
        if (result.ok) toaster.success({ title: t("week.saved") });
        else toaster.error({ title: t("week.saveFailed") });
      } catch {
        toaster.error({ title: t("week.saveFailed") });
      } finally {
        saving.current = false;
      }
    });
  };

  const dirty = unavailable.size !== props.unavailable.length || props.unavailable.some(date => !unavailable.has(date));

  return (
    <Stack gap={{ base: 2, md: 4 }}>
      <Global styles={{ "@media (max-width: 47.99em)": { footer: { display: "none" } } }} />
      <Text fontSize="sm" color="fg.muted" hideBelow="md">{t("week.help")}</Text>

      <Table.Root size={{ base: "sm", md: "md" }}>
        <Table.Header hideBelow="md">
          <Table.Row>
            <Table.ColumnHeader>{t("week.date")}</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="end">{t("week.status")}</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {days.map(({ date, inSeason, events, isToday }) => {
            const isUnavailable = unavailable.has(date);
            const day = new Date(`${date}T00:00:00Z`);

            return (
              <Table.Row key={date}>
                <Table.Cell py={{ base: 1, md: 3 }}>
                  <HStack wrap="wrap" gap={2}>
                    <Text as="span" whiteSpace="nowrap">
                      {format.dateTime(day, { timeZone: "UTC", month: "2-digit", day: "2-digit" })}
                      {" "}
                      {format.dateTime(day, { timeZone: "UTC", weekday: "short" })}
                    </Text>
                    {isToday && <Badge colorPalette="blue">{t("today")}</Badge>}
                    {events.map(event => <Badge key={event}>{event}</Badge>)}
                  </HStack>
                </Table.Cell>
                <Table.Cell textAlign="end" py={{ base: 1, md: 3 }}>
                  {inSeason
                    ? <Button
                      size="xs"
                      minW={16}
                      variant={isUnavailable ? "subtle" : "outline"}
                      colorPalette={isUnavailable ? "red" : "gray"}
                      aria-pressed={isUnavailable}
                      onClick={() => toggle(date)}
                    >
                      {isUnavailable ? t("week.cannotCome") : t("week.canCome")}
                    </Button>
                    : <Text as="span" fontSize="sm" color="fg.muted">{t("week.outOfSeason")}</Text>}
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>

      <Button
        width="full"
        size="xs"
        variant={dirty ? "solid" : "surface"}
        colorPalette="blue"
        onClick={handleSave}
        loading={isPending}
        disabled={!days.some(day => day.inSeason)}
      >
        {t("week.save")}
      </Button>
    </Stack>
  );
}
