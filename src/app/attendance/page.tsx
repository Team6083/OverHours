import Link from "next/link";
import { Badge, Button, Card, Heading, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { getTranslations } from "next-intl/server";

import { addDays, DutyRoleName, isCalendarDate, isInSeason, weekDates, weekStartOf } from "@/lib/attendance";
import { getAttendanceSeason, getDailyBoard, getMyUnavailableDates, getToday } from "@/lib/data/attendance-dto";
import WeekForm from "./WeekForm";

const DUTY_ROLES: DutyRoleName[] = ["PM", "CE", "MACHINING"];

export default async function AttendancePage(props: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await props.searchParams;
  const t = await getTranslations("Attendance");

  const today = getToday();
  const weekStart = weekStartOf(week && isCalendarDate(week) ? week : today);

  const [season, todayBoard, tomorrowBoard, unavailable] = await Promise.all([
    getAttendanceSeason(),
    getDailyBoard(today),
    getDailyBoard(addDays(today, 1)),
    getMyUnavailableDates(weekStart),
  ]);

  const days = weekDates(weekStart).map(date => ({ date, inSeason: !!season && isInSeason(date, season) }));
  const names = (people: { name: string }[]) => people.map(person => person.name).join("、");

  return (
    <Stack gap={6}>
      <Heading as="h2" size="lg">{t("title")}</Heading>

      <Card.Root>
        <Card.Body>
          <Stack gap={2}>
            <Text fontWeight="semibold">
              {t("today")} {today}{todayBoard.events.length > 0 && ` · ${todayBoard.events.join("/")}`}
            </Text>
            {DUTY_ROLES.map(role => (
              <HStack key={role} align="start">
                <Badge flexShrink={0}>{t(`duty.${role}`)}</Badge>
                <Text>{names(todayBoard.duty[role]) || t("notScheduled")}</Text>
              </HStack>
            ))}
          </Stack>
        </Card.Body>
      </Card.Root>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        <Card.Root>
          <Card.Body>
            <Text fontWeight="semibold" mb={2}>{t("availableToday", { count: todayBoard.available.length })}</Text>
            <Text fontSize="sm">{names(todayBoard.available) || t("nobody")}</Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body>
            <Text fontWeight="semibold" mb={2}>{t("availableTomorrow", { count: tomorrowBoard.available.length })}</Text>
            <Text fontSize="sm">{names(tomorrowBoard.available) || t("nobody")}</Text>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      <Stack gap={3}>
        <HStack justify="space-between" wrap="wrap">
          <Heading as="h3" size="md">{t("week.heading")}</Heading>
          <HStack>
            <Button size="xs" variant="outline" asChild>
              <Link href={`/attendance?week=${addDays(weekStart, -7)}`}>{t("week.previous")}</Link>
            </Button>
            <Button size="xs" variant="outline" asChild>
              <Link href="/attendance">{t("week.thisWeek")}</Link>
            </Button>
            <Button size="xs" variant="outline" asChild>
              <Link href={`/attendance?week=${addDays(weekStart, 7)}`}>{t("week.next")}</Link>
            </Button>
          </HStack>
        </HStack>

        {season
          ? <WeekForm key={weekStart} weekStart={weekStart} days={days} unavailable={unavailable} />
          : <Text color="fg.muted">{t("noSeason")}</Text>}
      </Stack>
    </Stack>
  );
}
