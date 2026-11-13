import { EmptyState, Heading, HStack, SimpleGrid, Stat, Table, Text, VStack } from "@chakra-ui/react";
import { LuCalendarCheck } from "react-icons/lu";
import { getTranslations } from "next-intl/server";

import { addDays, datesInRange, isCalendarDate, MAX_RANGE_DAYS, shortDate } from "@/lib/attendance";
import { getTeamReliability, getToday } from "@/lib/data/attendance-dto";
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

export default async function ReliabilityReport(props: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const params = await props.searchParams;
  const t = await getTranslations("ReliabilityReport");

  const yesterday = addDays(getToday(), -1);
  const end = params.end && isCalendarDate(params.end) && params.end <= yesterday ? params.end : yesterday;
  const earliest = addDays(end, 1 - MAX_RANGE_DAYS);
  const asked = params.start && isCalendarDate(params.start) && params.start <= end ? params.start : addDays(end, -29);
  const start = asked < earliest ? earliest : asked;
  const dates = datesInRange(start, end) ?? [];

  const rows = (await getTeamReliability(dates))
    .sort((a, b) => (a.reliability ?? 2) - (b.reliability ?? 2) || b.answered - a.answered);

  const sum = (pick: (row: (typeof rows)[number]) => number) => rows.reduce((total, row) => total + pick(row), 0);
  const answered = sum(row => row.answered);
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
      <SimpleGrid columns={{ base: 3 }} gap={4} mb={6}>
        <Stat.Root>
          <Stat.Label>{t("reliability")}</Stat.Label>
          <Stat.ValueText>{percent(answered > 0 ? sum(row => row.matched) / answered : null)}</Stat.ValueText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>{t("brokenPromises")}</Stat.Label>
          <Stat.ValueText>{sum(row => row.brokenPromises.length)}</Stat.ValueText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>{t("unexpected")}</Stat.Label>
          <Stat.ValueText>{sum(row => row.unexpected.length)}</Stat.ValueText>
        </Stat.Root>
      </SimpleGrid>

      <Table.ScrollArea borderWidth="1px" rounded="md">
        <Table.Root size="sm" stickyHeader>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>{t("columns.user")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("reliability")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("columns.matched")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("brokenPromises")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("unexpected")}</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map(row => (
              <Table.Row key={row.user.id}>
                <Table.Cell>{row.user.name}</Table.Cell>
                <Table.Cell>{percent(row.reliability)}</Table.Cell>
                <Table.Cell>{row.matched} / {row.answered}</Table.Cell>
                <Table.Cell><DateList dates={row.brokenPromises} /></Table.Cell>
                <Table.Cell><DateList dates={row.unexpected} /></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>
    </>}
  </>);
}
