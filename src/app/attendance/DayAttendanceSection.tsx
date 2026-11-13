"use client";
import { createContext, useContext, useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Badge, Button, Heading, HStack, IconButton, SimpleGrid, Spinner, Stack, Text } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

import { addDays } from "@/lib/attendance";
import { BoardDay } from "@/lib/data/attendance-dto";
import { getBoardDay } from "./actions";
import { boardGroups, NameGroup, shortDate, UserListDialog, useKeyedLoad } from "./AttendanceParts";

type DayAttendance = {
  date: string;
  today: string;
  day: BoardDay | undefined;
  failed: boolean;
  retry: () => void;
  goTo: (date: string) => void;
  openDialog: () => void;
};

const DayAttendanceContext = createContext<DayAttendance | null>(null);

/**
 * Owns the selected day and the details dialog, so several sections (desktop and mobile layouts)
 * stay on the same day and only one dialog exists.
 */
export function DayAttendanceProvider(props: { initialDay: BoardDay; today: string; children: React.ReactNode }) {
  const { initialDay, today, children } = props;
  const dayLabel = useDayLabel();

  const [date, setDate] = useState(initialDay.date);
  const [open, setOpen] = useState(false);
  const { data: day, failed, retry } = useKeyedLoad(
    date,
    async key => {
      const result = await getBoardDay(key);
      return result.ok ? result.day : null;
    },
    { [initialDay.date]: initialDay },
  );

  return (
    <DayAttendanceContext.Provider value={{ date, today, day, failed, retry, goTo: setDate, openDialog: () => setOpen(true) }}>
      {children}
      {day && (
        <UserListDialog
          open={open}
          title={dayLabel(date)}
          resetKey={date}
          month={date.slice(0, 7)}
          today={today}
          onClose={() => setOpen(false)}
          groups={boardGroups(day)}
        />
      )}
    </DayAttendanceContext.Provider>
  );
}

function useDayLabel() {
  const format = useFormatter();

  return (value: string) => {
    const weekday = format.dateTime(new Date(`${value}T00:00:00Z`), { timeZone: "UTC", weekday: "short" });
    return `${shortDate(value)} ${weekday}`;
  };
}

/** Who is available on one day, with arrows to move to the neighbouring days. */
export default function DayAttendanceSection() {
  const context = useContext(DayAttendanceContext);
  const t = useTranslations("Attendance");
  const dayLabel = useDayLabel();

  if (!context) return null;
  const { date, today, day, failed, retry, goTo, openDialog } = context;

  return (
    <Stack gap={3}>
      <HStack justify="space-between" wrap="wrap" gapY={1}>
        <Heading as="h2" size="xl">
          <Link href="/attendance">{t("title")}</Link>
        </Heading>

        <HStack gap={1}>
          {date !== today && (
            <Button size="xs" variant="ghost" onClick={() => goTo(today)}>{t("today")}</Button>
          )}
          <IconButton size="xs" variant="ghost" aria-label={t("day.previous")} onClick={() => goTo(addDays(date, -1))}>
            <LuChevronLeft />
          </IconButton>
          <HStack gap={2} minW={28} justify="center">
            <Text fontWeight="medium">{dayLabel(date)}</Text>
            {date === today && <Badge colorPalette="blue">{t("today")}</Badge>}
          </HStack>
          <IconButton size="xs" variant="ghost" aria-label={t("day.next")} onClick={() => goTo(addDays(date, 1))}>
            <LuChevronRight />
          </IconButton>
        </HStack>
      </HStack>

      {day ? (
        <SimpleGrid columns={{ base: 1, sm: 3 }} gap={4} minH={16}>
          {boardGroups(day).map(group => (
            <NameGroup
              key={group.key}
              label={t(`board.${group.key}`, { count: group.users.length })}
              palette={group.palette}
              users={group.users}
              onOpen={openDialog}
            />
          ))}
        </SimpleGrid>
      ) : (
        <HStack minH={16} gap={2}>
          {failed ? (
            <>
              <Text fontSize="sm" color="red.fg">{t("day.loadFailed")}</Text>
              <Button size="xs" variant="outline" onClick={retry}>{t("retry")}</Button>
            </>
          ) : <Spinner size="sm" />}
        </HStack>
      )}
    </Stack>
  );
}
