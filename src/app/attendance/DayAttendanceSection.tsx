"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Badge, Button, Heading, HStack, IconButton, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

import { addDays } from "@/lib/attendance";
import { BoardDay } from "@/lib/data/attendance-dto";
import { getBoardDay } from "./actions";
import { NameGroup, shortDate, UserListDialog } from "./AttendanceParts";

/** Who is coming on one day, with arrows to move to the neighbouring days. */
export default function DayAttendanceSection(props: { initialDay: BoardDay; today: string }) {
  const { initialDay, today } = props;
  const t = useTranslations("Attendance");
  const format = useFormatter();

  const [date, setDate] = useState(initialDay.date);
  // undefined while loading, null when loading failed
  const [days, setDays] = useState<Record<string, BoardDay | null>>({ [initialDay.date]: initialDay });
  const [open, setOpen] = useState(false);
  const day = days[date];

  useEffect(() => {
    if (day !== undefined) return;
    let cancelled = false;

    getBoardDay(date)
      .then(result => result.ok ? result.day : null)
      .catch(() => null)
      .then(result => { if (!cancelled) setDays(prev => ({ ...prev, [date]: result })); });

    return () => { cancelled = true; };
  }, [date, day]);

  const dayLabel = (value: string) => {
    const weekday = format.dateTime(new Date(`${value}T00:00:00Z`), { timeZone: "UTC", weekday: "short" });
    return `${shortDate(value)} ${weekday}`;
  };

  return (
    <Stack gap={3}>
      <HStack justify="space-between" wrap="wrap" gapY={1}>
        <Heading as="h2" size="xl">
          <Link href="/attendance">{t("title")}</Link>
        </Heading>

        <HStack gap={1}>
          {date !== today && (
            <Button size="xs" variant="ghost" onClick={() => setDate(today)}>{t("today")}</Button>
          )}
          <IconButton size="xs" variant="ghost" aria-label={t("day.previous")} onClick={() => setDate(addDays(date, -1))}>
            <LuChevronLeft />
          </IconButton>
          <HStack gap={2} minW={28} justify="center">
            <Text fontWeight="medium">{dayLabel(date)}</Text>
            {date === today && <Badge colorPalette="blue">{t("today")}</Badge>}
          </HStack>
          <IconButton size="xs" variant="ghost" aria-label={t("day.next")} onClick={() => setDate(addDays(date, 1))}>
            <LuChevronRight />
          </IconButton>
        </HStack>
      </HStack>

      {day === null && <Text fontSize="sm" color="red.fg">{t("day.loadFailed")}</Text>}
      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4} opacity={day ? 1 : 0.5} minH={16}>
        <NameGroup
          label={t("board.available", { count: day?.available.length ?? 0 })}
          palette="green"
          users={day?.available ?? []}
          onOpen={() => setOpen(true)}
        />
        <NameGroup
          label={t("board.unavailable", { count: day?.unavailable.length ?? 0 })}
          palette="red"
          users={day?.unavailable ?? []}
          onOpen={() => setOpen(true)}
        />
      </SimpleGrid>

      {day && (
        <UserListDialog
          open={open}
          title={dayLabel(date)}
          resetKey={date}
          month={date.slice(0, 7)}
          today={today}
          onClose={() => setOpen(false)}
          groups={[
            { key: "available", palette: "green", users: day.available },
            { key: "unavailable", palette: "red", users: day.unavailable },
          ]}
        />
      )}
    </Stack>
  );
}
