"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import {
  Badge, Button, Card, Dialog, GridItem, Heading, HStack, Portal, SimpleGrid, Stack, Table, Text,
} from "@chakra-ui/react";

import { IconType } from "react-icons";
import { LuCheck, LuCheckCheck, LuUsers, LuX } from "react-icons/lu";

import { toaster } from "@/components/ui/toaster";
import { addDays, ATTENDANCE_STATUSES, AttendanceStatus, DayStatus, STATUS_PALETTE, weekStartOf } from "@/lib/attendance";
import { BoardDay } from "@/lib/data/attendance-dto";
import { saveWeek } from "./actions";
import { boardGroups, NameGroup, shortDate, UserListDialog } from "./AttendanceParts";

const STATUS_ICONS: Record<AttendanceStatus, IconType> = { WILL_COME: LuCheckCheck, AVAILABLE: LuCheck, UNAVAILABLE: LuX };

function StatusButtons(props: {
  label: string;
  current?: DayStatus;
  disabled: boolean;
  onSelect: (status: DayStatus) => void;
}) {
  const { label, current, disabled, onSelect } = props;
  const t = useTranslations("Attendance");

  // Tapping the active option again clears it back to "not filled".
  return (
    <HStack gap={2} justify="flex-end">
      {ATTENDANCE_STATUSES.map(value => {
        const active = current === value;
        const Icon = STATUS_ICONS[value];
        return (
          <Button
            key={value}
            size="xs"
            rounded="full"
            px={{ base: 2.5, md: 3 }}
            variant={active ? "solid" : "outline"}
            colorPalette={active ? STATUS_PALETTE[value] : "gray"}
            color={active ? undefined : "fg.muted"}
            disabled={disabled}
            aria-pressed={active}
            aria-label={`${label} ${t(`status.${value}`)}`}
            title={t(`status.${value}`)}
            onClick={() => onSelect(active ? "NOT_FILLED" : value)}
          >
            <Icon />
            <Text as="span" hideBelow="md">{t(`status.${value}`)}</Text>
          </Button>
        );
      })}
    </HStack>
  );
}

export default function AttendanceView(props: {
  weekStart: string;
  today: string;
  board: BoardDay[];
  mine: Record<string, AttendanceStatus>;
}) {
  const { weekStart, today, board, mine } = props;
  const t = useTranslations("Attendance");
  const format = useFormatter();

  const [selected, setSelected] = useState(() => board.some(day => day.date === today) ? today : weekStart);
  const [entries, setEntries] = useState(mine);
  const [isPending, startTransition] = useTransition();
  const saving = useRef(false);
  const router = useRouter();
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [details, setDetails] = useState<"day" | "week" | null>(null);

  const dayLabel = (date: string) => {
    const weekday = format.dateTime(new Date(`${date}T00:00:00Z`), { timeZone: "UTC", weekday: "short" });
    return `${shortDate(date)} ${weekday}`;
  };

  const setStatus = (date: string, status: DayStatus) => setEntries(prev => {
    const next = { ...prev };
    if (status === "NOT_FILLED") delete next[date];
    else next[date] = status;
    return next;
  });

  const handleSave = () => {
    if (saving.current) return;
    saving.current = true;

    startTransition(async () => {
      try {
        const result = await saveWeek(weekStart, entries);
        if (result.ok) toaster.success({ title: t("week.saved") });
        else toaster.error({ title: t("week.saveFailed") });
      } catch {
        toaster.error({ title: t("week.saveFailed") });
      } finally {
        saving.current = false;
      }
    });
  };

  const selectedDay = board.find(day => day.date === selected) ?? board[0];
  const weekUsers = [...new Map(board.flatMap(day => ATTENDANCE_STATUSES.flatMap(status => day[status])).map(user => [user.id, user])).values()]
    .sort((a, b) => a.name.localeCompare(b.name));
  const dirty = board.some(({ date }) => entries[date] !== mine[date]);
  const editableDates = board.map(day => day.date).filter(date => date >= today);
  const statusOf = (date: string): DayStatus => entries[date] ?? "NOT_FILLED";
  const sameStatus = editableDates.every(date => statusOf(date) === statusOf(editableDates[0]));
  const allStatus = editableDates.length > 0 && sameStatus ? statusOf(editableDates[0]) : undefined;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const weekLink = (href: string, week: string, label: string) => (
    <Button size="xs" variant="ghost" asChild>
      <Link
        href={href}
        scroll={false}
        onClick={event => {
          if (!dirty || week === weekStart) return;
          event.preventDefault();
          setLeaveTo(href);
        }}
      >
        {label}
      </Link>
    </Button>
  );

  return (
    <SimpleGrid columns={{ base: 1, md: 5 }} gapX={8} gapY={{ base: 3, md: 6 }}>
      <GridItem colSpan={{ base: 1, md: 2 }} minW={0}>
        <Stack gap={3}>
          <SimpleGrid columns={7} gap={1.5}>
            {board.map(day => {
              const weekday = format.dateTime(new Date(`${day.date}T00:00:00Z`), { timeZone: "UTC", weekday: "short" });
              const active = day.date === selectedDay.date;

              return (
                <Button
                  key={day.date}
                  variant="outline"
                  colorPalette={active ? "blue" : "gray"}
                  bg={active ? "blue.subtle" : undefined}
                  borderColor={active ? "blue.solid" : undefined}
                  rounded="lg"
                  height="auto"
                  minW={0}
                  px={0}
                  py={1.5}
                  flexDirection="column"
                  gap={0}
                  aria-pressed={active}
                  aria-label={dayLabel(day.date)}
                  onClick={() => setSelected(day.date)}
                >
                  <Text fontSize="2xs" color="fg.muted">{weekday}</Text>
                  <Text fontSize="md" fontWeight={day.date === today ? "bold" : "medium"} color={day.date < today ? "fg.muted" : undefined}>
                    {Number(day.date.slice(8))}
                  </Text>
                  <Text fontSize="2xs" fontWeight="semibold" whiteSpace="nowrap">
                    {ATTENDANCE_STATUSES.map((status, index) => (
                      <Text as="span" key={status}>
                        {index > 0 && <Text as="span" color="fg.muted">·</Text>}
                        <Text as="span" color={`${STATUS_PALETTE[status]}.fg`}>{day[status].length}</Text>
                      </Text>
                    ))}
                  </Text>
                </Button>
              );
            })}
          </SimpleGrid>

          <Card.Root w="full" size="sm">
            <Card.Header>
              <HStack justify="space-between">
                <Card.Title>{dayLabel(selectedDay.date)}</Card.Title>
                <Button size="xs" variant="ghost" onClick={() => setDetails("week")}>
                  <LuUsers />{t("findPerson")}
                </Button>
              </HStack>
            </Card.Header>
            <Card.Body>
              <Stack gap={{ base: 3, md: 4 }}>
                {boardGroups(selectedDay).map(group => (
                  <NameGroup
                    key={group.key}
                    label={t(`board.${group.key}`, { count: group.users.length })}
                    palette={group.palette}
                    users={group.users}
                    onOpen={() => setDetails("day")}
                  />
                ))}
              </Stack>
            </Card.Body>
          </Card.Root>
        </Stack>

        <UserListDialog
          open={details !== null}
          title={details === "week" ? t("findPerson") : dayLabel(selectedDay.date)}
          resetKey={details === "week" ? "week" : selectedDay.date}
          month={selectedDay.date.slice(0, 7)}
          today={today}
          onClose={() => setDetails(null)}
          groups={details === "week"
            ? [{ key: "everyone", palette: "blue", users: weekUsers }]
            : boardGroups(selectedDay)}
        />
      </GridItem>

      <GridItem colSpan={{ base: 1, md: 3 }} minW={0}>
        <HStack mb={{ base: 1, md: 4 }} justify="space-between" wrap="wrap" gapY={0}>
          <HStack>
            <Heading as="h2" size={{ base: "lg", md: "xl" }}>{t("week.heading")}</Heading>
            <Badge colorPalette="blue" size="md">{shortDate(weekStart)} – {shortDate(addDays(weekStart, 6))}</Badge>
          </HStack>
          <HStack gap={1}>
            {weekLink(`/attendance?week=${addDays(weekStart, -7)}`, addDays(weekStart, -7), t("week.previous"))}
            {weekLink("/attendance", weekStartOf(today), t("week.thisWeek"))}
            {weekLink(`/attendance?week=${addDays(weekStart, 7)}`, addDays(weekStart, 7), t("week.next"))}
          </HStack>
        </HStack>

        <Stack gap={{ base: 2, md: 4 }}>
          <Text fontSize="sm" color="fg.muted" hideBelow="md">{t("week.help")}</Text>

          <Table.Root size={{ base: "sm", md: "md" }}>
            <Table.Body>
              <Table.Row>
                <Table.Cell py={{ base: 1, md: 2 }} fontWeight="semibold">{t("week.all")}</Table.Cell>
                <Table.Cell textAlign="end" py={{ base: 1, md: 2 }}>
                  <StatusButtons
                    label={t("week.all")}
                    current={allStatus}
                    disabled={editableDates.length === 0}
                    onSelect={status => editableDates.forEach(date => setStatus(date, status))}
                  />
                </Table.Cell>
              </Table.Row>

              {board.map(({ date }) => {
                const isPast = date < today;

                return (
                  <Table.Row key={date}>
                    <Table.Cell py={{ base: 1, md: 2 }}>
                      <HStack gap={2}>
                        <Button
                          size="sm"
                          variant="plain"
                          height="auto"
                          minW={0}
                          px={0}
                          fontWeight={date === selected ? "semibold" : "normal"}
                          color={date === selected ? "blue.fg" : isPast ? "fg.muted" : undefined}
                          aria-pressed={date === selected}
                          onClick={() => setSelected(date)}
                        >
                          {dayLabel(date)}
                        </Button>
                        {date === today && <Badge colorPalette="blue">{t("today")}</Badge>}
                      </HStack>
                    </Table.Cell>
                    <Table.Cell textAlign="end" py={{ base: 1, md: 2 }}>
                      <StatusButtons
                        label={date}
                        current={statusOf(date)}
                        disabled={isPast}
                        onSelect={status => setStatus(date, status)}
                      />
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
            disabled={editableDates.length === 0}
          >
            {t("week.save")}
          </Button>
        </Stack>

        <Dialog.Root
          role="alertdialog"
          size="xs"
          placement="center"
          open={leaveTo !== null}
          onOpenChange={details => { if (!details.open) setLeaveTo(null); }}
        >
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>{t("week.unsavedTitle")}</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <Text fontSize="sm">{t("week.unsavedBody")}</Text>
                </Dialog.Body>
                <Dialog.Footer>
                  <Dialog.ActionTrigger asChild>
                    <Button size="sm" variant="outline">{t("week.keepEditing")}</Button>
                  </Dialog.ActionTrigger>
                  <Button
                    size="sm"
                    colorPalette="red"
                    onClick={() => {
                      if (leaveTo) router.push(leaveTo, { scroll: false });
                      setLeaveTo(null);
                    }}
                  >
                    {t("week.discard")}
                  </Button>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      </GridItem>
    </SimpleGrid>
  );
}
