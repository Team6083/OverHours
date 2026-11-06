"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Global } from "@emotion/react";
import { useFormatter, useTranslations } from "next-intl";
import {
  Badge, Button, ButtonGroup, Card, CloseButton, Dialog, GridItem, Heading, HStack, Portal, SimpleGrid, Stack, Table, Text,
} from "@chakra-ui/react";

import { toaster } from "@/components/ui/toaster";
import { addDays, AttendanceStatus, DayStatus } from "@/lib/attendance";
import { BoardDay } from "@/lib/data/attendance-dto";
import { saveWeek } from "./actions";

const PREVIEW_COUNT = 4;

const STATUS_OPTIONS: { value: DayStatus; palette: string }[] = [
  { value: "AVAILABLE", palette: "green" },
  { value: "UNAVAILABLE", palette: "red" },
  { value: "NOT_FILLED", palette: "gray" },
];

const shortDate = (date: string) => date.slice(5).replace("-", "/");

function NameLine(props: { label: string; dialogTitle: string; names: string[] }) {
  const { label, dialogTitle, names } = props;
  const t = useTranslations("Attendance");

  const hiddenCount = names.length - PREVIEW_COUNT;

  return (
    <HStack gap={1} align="baseline" fontSize="sm" minW={0}>
      <Text fontWeight="medium" flexShrink={0}>{label}</Text>
      <Text color="fg.muted" flex={1} minW={0} truncate>
        {names.slice(0, PREVIEW_COUNT).join("、") || t("nobody")}
      </Text>
      {hiddenCount > 0 && (
        <Dialog.Root size="sm" placement="center">
          <Dialog.Trigger asChild>
            <Button size="2xs" variant="plain" height="auto" minW={0} px={0} flexShrink={0} colorPalette="blue">
              {t("showMore", { count: hiddenCount })}
            </Button>
          </Dialog.Trigger>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>{dialogTitle}</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body pb={6}>
                  <HStack wrap="wrap" gap={2}>
                    {names.map((name, index) => <Badge key={index} size="md">{name}</Badge>)}
                  </HStack>
                </Dialog.Body>
                <Dialog.CloseTrigger asChild>
                  <CloseButton size="sm" />
                </Dialog.CloseTrigger>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      )}
    </HStack>
  );
}

function StatusButtons(props: {
  label: string;
  current?: DayStatus;
  disabled: boolean;
  onSelect: (status: DayStatus) => void;
}) {
  const { label, current, disabled, onSelect } = props;
  const t = useTranslations("Attendance");

  return (
    <ButtonGroup size="xs" attached>
      {STATUS_OPTIONS.map(({ value, palette }) => (
        <Button
          key={value}
          minW={{ base: 10, md: 12 }}
          px={1}
          variant={current === value ? "subtle" : "outline"}
          colorPalette={current === value ? palette : "gray"}
          disabled={disabled}
          aria-pressed={current === value}
          aria-label={`${label} ${t(`status.${value}`)}`}
          onClick={() => onSelect(value)}
        >
          {t(`status.${value}`)}
        </Button>
      ))}
    </ButtonGroup>
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
  const dirty = board.some(({ date }) => entries[date] !== mine[date]);
  const editableDates = board.map(day => day.date).filter(date => date >= today);
  const statusOf = (date: string): DayStatus => entries[date] ?? "NOT_FILLED";
  const sameStatus = editableDates.every(date => statusOf(date) === statusOf(editableDates[0]));
  const allStatus = editableDates.length > 0 && sameStatus ? statusOf(editableDates[0]) : undefined;

  return (
    <SimpleGrid columns={{ base: 1, md: 5 }} gapX={8} gapY={{ base: 3, md: 6 }}>
      <Global styles={{ "@media (max-width: 47.99em)": { footer: { display: "none" } } }} />

      <GridItem colSpan={{ base: 1, md: 2 }} minW={0}>
        <Card.Root w="full" size="sm">
          <Card.Header>
            <HStack justify="space-between">
              <Card.Title>{dayLabel(selectedDay.date)}</Card.Title>
              <Badge colorPalette="blue">
                {t("filledCount", { count: selectedDay.available.length + selectedDay.unavailable.length })}
              </Badge>
            </HStack>
          </Card.Header>
          <Card.Body>
            <Stack gap={1}>
              <NameLine
                label={t("board.available", { count: selectedDay.available.length })}
                dialogTitle={`${dayLabel(selectedDay.date)} ${t("board.available", { count: selectedDay.available.length })}`}
                names={selectedDay.available}
              />
              <NameLine
                label={t("board.unavailable", { count: selectedDay.unavailable.length })}
                dialogTitle={`${dayLabel(selectedDay.date)} ${t("board.unavailable", { count: selectedDay.unavailable.length })}`}
                names={selectedDay.unavailable}
              />
            </Stack>
          </Card.Body>
        </Card.Root>
      </GridItem>

      <GridItem colSpan={{ base: 1, md: 3 }} minW={0}>
        <HStack mb={{ base: 1, md: 4 }} justify="space-between" wrap="wrap" gapY={0}>
          <HStack>
            <Heading as="h2" size={{ base: "lg", md: "xl" }}>{t("week.heading")}</Heading>
            <Badge colorPalette="blue" size="md">{shortDate(weekStart)} – {shortDate(addDays(weekStart, 6))}</Badge>
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
      </GridItem>
    </SimpleGrid>
  );
}
