import { Badge, EmptyState, Heading, HStack, Stat, Table, Text, VStack } from "@chakra-ui/react";
import { LuCalendarCheck } from "react-icons/lu";
import { getTranslations } from "next-intl/server";

import { addDays, datesInRange, isCalendarDate, MAX_RANGE_DAYS, shortDate } from "@/lib/attendance";
import { AccuracyRow, getTeamAccuracy, getToday } from "@/lib/data/attendance-dto";
import RangeForm from "./RangeForm";


/** Share of filled-in days that matched, or null when nothing was filled in. */
const accuracyOf = (row: AccuracyRow) => row.filled > 0 ? row.matched / row.filled : null;

function accuracyPalette(accuracy: number | null) {
  if (accuracy === null) return "gray";
  if (accuracy >= 0.9) return "green";
  if (accuracy >= 0.7) return "orange";
  return "red";
}

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
    .sort((a, b) => (accuracyOf(a) ?? 2) - (accuracyOf(b) ?? 2) || b.noShows.length - a.noShows.length);

  const filled = rows.reduce((sum, row) => sum + row.filled, 0);
  const matched = rows.reduce((sum, row) => sum + row.matched, 0);
  const noShows = rows.reduce((sum, row) => sum + row.noShows.length, 0);
  const unannounced = rows.reduce((sum, row) => sum + row.unannounced.length, 0);
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
      <HStack align="start" gap={4} mb={6}>
        <Stat.Root>
          <Stat.Label>{t("stats.accuracy")}</Stat.Label>
          <Stat.ValueText>{percent(filled > 0 ? matched / filled : null)}</Stat.ValueText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>{t("noShows")}</Stat.Label>
          <Stat.ValueText>{noShows}</Stat.ValueText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>{t("unannounced")}</Stat.Label>
          <Stat.ValueText>{unannounced}</Stat.ValueText>
        </Stat.Root>
      </HStack>

      <Table.ScrollArea borderWidth="1px" rounded="md">
        <Table.Root size="sm" stickyHeader>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>{t("columns.user")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("stats.accuracy")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("noShows")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("unannounced")}</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map(row => {
              const accuracy = accuracyOf(row);
              return (
                <Table.Row key={row.user.id}>
                  <Table.Cell>{row.user.name}</Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={accuracyPalette(accuracy)} title={t("matchedOf", { matched: row.matched, filled: row.filled })}>
                      {percent(accuracy)}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell><DateList dates={row.noShows} /></Table.Cell>
                  <Table.Cell><DateList dates={row.unannounced} /></Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>
    </>}
  </>);
}
