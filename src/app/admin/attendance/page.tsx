import Link from "next/link";
import { Button, Heading, HStack, Stack, Table, Text } from "@chakra-ui/react";
import { getTranslations } from "next-intl/server";

import { addDays, isCalendarDate, weekDates, weekStartOf } from "@/lib/attendance";
import {
  getAttendanceSeason, getDutyGrid, getSeasonEvents, getToday, getWantedList,
} from "@/lib/data/attendance-dto";
import { DutyTable, EventsPanel, SeasonForm } from "./forms";

export default async function AttendanceAdminPage(props: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await props.searchParams;
  const t = await getTranslations("Attendance");

  const weekStart = weekStartOf(week && isCalendarDate(week) ? week : getToday());

  const [season, events, grid, wanted] = await Promise.all([
    getAttendanceSeason(),
    getSeasonEvents(),
    getDutyGrid(weekStart),
    getWantedList(),
  ]);

  return (
    <Stack gap={8}>
      <Heading as="h2" size="lg">{t("admin.title")}</Heading>

      <Stack gap={3}>
        <Heading as="h3" size="md">{t("admin.season")}</Heading>
        <SeasonForm key={season?.id ?? "new"} season={season} />
      </Stack>

      <Stack gap={3}>
        <Heading as="h3" size="md">{t("admin.events")}</Heading>
        <EventsPanel events={events} />
      </Stack>

      <Stack gap={3}>
        <HStack justify="space-between" wrap="wrap">
          <Heading as="h3" size="md">{t("admin.duty")}</Heading>
          <HStack>
            <Button size="xs" variant="outline" asChild>
              <Link href={`/admin/attendance?week=${addDays(weekStart, -7)}`}>{t("week.previous")}</Link>
            </Button>
            <Button size="xs" variant="outline" asChild>
              <Link href="/admin/attendance">{t("week.thisWeek")}</Link>
            </Button>
            <Button size="xs" variant="outline" asChild>
              <Link href={`/admin/attendance?week=${addDays(weekStart, 7)}`}>{t("week.next")}</Link>
            </Button>
          </HStack>
        </HStack>
        <Text fontSize="sm" color="fg.muted">{t("admin.dutyHelp")}</Text>
        <DutyTable grid={grid} dates={weekDates(weekStart)} />
      </Stack>

      <Stack gap={3}>
        <Heading as="h3" size="md">{t("admin.wanted")}</Heading>
        <Text fontSize="sm" color="fg.muted">{t("admin.wantedHelp")}</Text>
        {wanted.length === 0
          ? <Text color="fg.muted" fontSize="sm">{t("admin.noneMissing")}</Text>
          : <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>{t("admin.name")}</Table.ColumnHeader>
                <Table.ColumnHeader>{t("admin.missedCount")}</Table.ColumnHeader>
                <Table.ColumnHeader>{t("admin.missedWeeks")}</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {wanted.map(row => (
                <Table.Row key={row.userId}>
                  <Table.Cell>{row.name}</Table.Cell>
                  <Table.Cell>{row.weeks.length}</Table.Cell>
                  <Table.Cell>{row.weeks.join("、")}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>}
      </Stack>
    </Stack>
  );
}
