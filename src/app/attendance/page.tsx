import Link from "next/link";
import { Badge, Button, Card, Flex, GridItem, Heading, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { getTranslations } from "next-intl/server";

import { addDays, DutyRoleName, eventsOn, isCalendarDate, isInSeason, weekDates, weekStartOf } from "@/lib/attendance";
import {
  getAttendanceSeason, getDailyBoard, getMyUnavailableDates, getSeasonEvents, getToday,
} from "@/lib/data/attendance-dto";
import AvailableCard from "./AvailableCard";
import WeekForm from "./WeekForm";

const DUTY_ROLES: DutyRoleName[] = ["PM", "CE", "MACHINING"];

const shortDate = (date: string) => date.slice(5).replace("-", "/");

export default async function AttendancePage(props: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await props.searchParams;
  const t = await getTranslations("Attendance");

  const today = getToday();
  const weekStart = weekStartOf(week && isCalendarDate(week) ? week : today);

  const [season, events, todayBoard, tomorrowBoard, unavailable] = await Promise.all([
    getAttendanceSeason(),
    getSeasonEvents(),
    getDailyBoard(today),
    getDailyBoard(addDays(today, 1)),
    getMyUnavailableDates(weekStart),
  ]);

  const days = weekDates(weekStart).map(date => ({
    date,
    inSeason: !!season && isInSeason(date, season),
    events: eventsOn(date, events),
    isToday: date === today,
  }));
  const names = (people: { name: string }[]) => people.map(person => person.name).join("、");

  return (
    <SimpleGrid columns={{ base: 1, md: 5 }} gapX={8} gapY={{ base: 3, md: 6 }}>
      <GridItem colSpan={{ base: 1, md: 2 }}>
        <VStack gap={{ base: 2, md: 4 }}>
          <Card.Root w="full" size="sm">
            <Card.Header>
              <Card.Title>
                {t("today")} {shortDate(today)}
                {todayBoard.events.length > 0 && ` · ${todayBoard.events.join("/")}`}
              </Card.Title>
            </Card.Header>
            <Card.Body>
              <SimpleGrid columns={{ base: 3, md: 1 }} gap={2}>
                {DUTY_ROLES.map(role => (
                  <Flex
                    key={role}
                    direction={{ base: "column", md: "row" }}
                    align="start"
                    justify="space-between"
                    gap={1}
                  >
                    <Badge flexShrink={0}>{t(`duty.${role}`)}</Badge>
                    <Text fontSize="sm">{names(todayBoard.duty[role]) || t("notScheduled")}</Text>
                  </Flex>
                ))}
              </SimpleGrid>
            </Card.Body>
          </Card.Root>

          <SimpleGrid columns={1} gap={{ base: 1, md: 4 }} w="full">
            <AvailableCard
              title={t("availableToday", { count: todayBoard.available.length })}
              names={todayBoard.available.map(person => person.name)}
            />
            <AvailableCard
              title={t("availableTomorrow", { count: tomorrowBoard.available.length })}
              names={tomorrowBoard.available.map(person => person.name)}
            />
          </SimpleGrid>
        </VStack>
      </GridItem>

      <GridItem colSpan={{ base: 1, md: 3 }}>
        <HStack mb={{ base: 1, md: 4 }} justify="space-between" wrap="wrap" gapY={0}>
          <HStack>
            <Heading as="h2" size={{ base: "lg", md: "xl" }}>{t("week.heading")}</Heading>
            <Badge colorPalette="blue" size="md">{shortDate(weekStart)} – {shortDate(addDays(weekStart, 6))}</Badge>
            {season && (
              <Badge colorPalette={unavailable.length > 0 ? "green" : "orange"}>
                {unavailable.length > 0 ? t("week.filled") : t("week.notFilled")}
              </Badge>
            )}
          </HStack>
          <HStack gap={1}>
            <Button size="xs" variant="ghost" asChild>
              <Link href={`/attendance?week=${addDays(weekStart, -7)}`} scroll={false}>{t("week.previous")}</Link>
            </Button>
            <Button size="xs" variant="ghost" asChild>
              <Link href="/attendance" scroll={false}>{t("week.thisWeek")}</Link>
            </Button>
            <Button size="xs" variant="ghost" asChild>
              <Link href={`/attendance?week=${addDays(weekStart, 7)}`} scroll={false}>{t("week.next")}</Link>
            </Button>
          </HStack>
        </HStack>

        {season
          ? <WeekForm key={weekStart} weekStart={weekStart} days={days} unavailable={unavailable} />
          : <Text color="fg.muted">{t("noSeason")}</Text>}
      </GridItem>
    </SimpleGrid>
  );
}
