import { Badge, EmptyState, Heading, HStack, SimpleGrid, Stat, Table, Text, VStack } from "@chakra-ui/react";
import { LuCalendarCheck } from "react-icons/lu";
import { getTranslations } from "next-intl/server";

import { addDays, datesInRange, isCalendarDate, MAX_RANGE_DAYS, shortDate } from "@/lib/attendance";
import { getTeamAccuracy, getToday } from "@/lib/data/attendance-dto";
import { scorePalette } from "../../attendance/MyAccuracy";
import RangeForm from "./RangeForm";

function DateList(props: { dates: string[] }) {
  const { dates } = props;
  return (
    <VStack align="start" gap={0}>
      <Text>{dates.length}</Text>
      {dates.length > 0 && <Text fontSize="xs" color="fg.muted" hideBelow="md">{dates.map(shortDate).join("、")}</Text>}
    </VStack>
  );
}

export default async function AttendanceAccuracyReport(props: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const params = await props.searchParams;
  const t = await getTranslations("AccuracyReport");

  const yesterday = addDays(getToday(), -1);
  const end = params.end && isCalendarDate(params.end) && params.end <= yesterday ? params.end : yesterday;
  const earliest = addDays(end, 1 - MAX_RANGE_DAYS);
  const asked = params.start && isCalendarDate(params.start) && params.start <= end ? params.start : addDays(end, -29);
  const start = asked < earliest ? earliest : asked;
  const dates = datesInRange(start, end) ?? [];

  const rows = (await getTeamAccuracy(dates))
    .sort((a, b) => (a.score ?? 2) - (b.score ?? 2) || b.brokenPromises.length - a.brokenPromises.length);

  const sum = (pick: (row: (typeof rows)[number]) => number) => rows.reduce((total, row) => total + pick(row), 0);
  const days = sum(row => row.days);
  const score = days > 0 ? sum(row => (row.score ?? 0) * row.days) / days : null;
  const fillRate = days > 0 ? sum(row => row.answered) / days : null;
  const percent = (value: number | null) => value === null ? "–" : `${Math.round(value * 100)}%`;

  return (<>
    <HStack justify="space-between" mb={2} wrap="wrap" gap={3}>
      <Heading as="h2" size="2xl">{t("title")}</Heading>
      <RangeForm start={start} end={end} max={yesterday} />
    </HStack>

    <Text fontSize="sm" color="fg.muted" mb={6}>{t("description")}</Text>

    {rows.length === 0 ? (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator><LuCalendarCheck /></EmptyState.Indicator>
          <EmptyState.Title>{t("empty")}</EmptyState.Title>
        </EmptyState.Content>
      </EmptyState.Root>
    ) : <>
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} mb={6}>
        <Stat.Root>
          <Stat.Label>{t("stats.score")}</Stat.Label>
          <Stat.ValueText>{percent(score)}</Stat.ValueText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>{t("stats.fillRate")}</Stat.Label>
          <Stat.ValueText>{percent(fillRate)}</Stat.ValueText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>{t("brokenPromises")}</Stat.Label>
          <Stat.ValueText>{sum(row => row.brokenPromises.length)}</Stat.ValueText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>{t("silentAbsences")}</Stat.Label>
          <Stat.ValueText>{sum(row => row.silentAbsences.length)}</Stat.ValueText>
        </Stat.Root>
      </SimpleGrid>

      <Table.ScrollArea borderWidth="1px" rounded="md">
        <Table.Root size="sm" stickyHeader>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>{t("columns.user")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("stats.score")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("stats.fillRate")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("brokenPromises")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("silentAbsences")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("unannounced")}</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map(row => (
              <Table.Row key={row.user.id}>
                <Table.Cell>{row.user.name}</Table.Cell>
                <Table.Cell><Badge colorPalette={scorePalette(row.score)}>{percent(row.score)}</Badge></Table.Cell>
                <Table.Cell title={t("answeredOf", { answered: row.answered, days: row.days })}>
                  {percent(row.days > 0 ? row.answered / row.days : null)}
                </Table.Cell>
                <Table.Cell><DateList dates={row.brokenPromises} /></Table.Cell>
                <Table.Cell><DateList dates={row.silentAbsences} /></Table.Cell>
                <Table.Cell><DateList dates={row.unannounced} /></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>
    </>}
  </>);
}
