"use client";
import { useActionState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input, SimpleGrid, Stack, Table, Text } from "@chakra-ui/react";

import { toaster } from "@/components/ui/toaster";
import { AttendanceSeasonDTO, DutyGrid, SeasonEventDTO } from "@/lib/data/attendance-dto";
import { removeEvent, submitEvent, submitSeason, toggleDuty } from "./actions";

export function SeasonForm(props: { season: AttendanceSeasonDTO | null }) {
  const { season } = props;
  const t = useTranslations("Attendance.admin");
  const [state, action, pending] = useActionState(submitSeason, {});

  return (
    <form action={action}>
      <Stack gap={3}>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
          <Field.Root required>
            <Field.Label>{t("startDate")}</Field.Label>
            <Input name="startDate" type="date" defaultValue={season?.startDate} />
          </Field.Root>
          <Field.Root required>
            <Field.Label>{t("endDate")}</Field.Label>
            <Input name="endDate" type="date" defaultValue={season?.endDate} />
          </Field.Root>
        </SimpleGrid>
        {state.error && <Text color="fg.error" fontSize="sm">{state.error}</Text>}
        <Button type="submit" size="sm" alignSelf="start" loading={pending}>{t("saveSeason")}</Button>
      </Stack>
    </form>
  );
}

export function EventsPanel(props: { events: SeasonEventDTO[] }) {
  const { events } = props;
  const t = useTranslations("Attendance.admin");
  const [state, action, pending] = useActionState(submitEvent, {});
  const [isRemoving, startTransition] = useTransition();

  const handleRemove = (id: string) => startTransition(async () => {
    try {
      await removeEvent(id);
    } catch {
      toaster.error({ title: t("failed") });
    }
  });

  return (
    <Stack gap={3}>
      {events.length === 0
        ? <Text color="fg.muted" fontSize="sm">{t("noEvents")}</Text>
        : <Table.ScrollArea>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>{t("eventName")}</Table.ColumnHeader>
                <Table.ColumnHeader>{t("startDate")}</Table.ColumnHeader>
                <Table.ColumnHeader>{t("endDate")}</Table.ColumnHeader>
                <Table.ColumnHeader>{t("notes")}</Table.ColumnHeader>
                <Table.ColumnHeader />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {events.map(event => (
                <Table.Row key={event.id}>
                  <Table.Cell>{event.name}</Table.Cell>
                  <Table.Cell>{event.startDate}</Table.Cell>
                  <Table.Cell>{event.endDate}</Table.Cell>
                  <Table.Cell>{event.notes}</Table.Cell>
                  <Table.Cell textAlign="end">
                    <Button size="xs" variant="ghost" colorPalette="red" disabled={isRemoving} onClick={() => handleRemove(event.id)}>
                      {t("deleteEvent")}
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>}

      <form action={action}>
        <Stack gap={3}>
          <SimpleGrid columns={{ base: 1, md: 4 }} gap={3}>
            <Field.Root required>
              <Field.Label>{t("eventName")}</Field.Label>
              <Input name="name" />
            </Field.Root>
            <Field.Root required>
              <Field.Label>{t("startDate")}</Field.Label>
              <Input name="startDate" type="date" />
            </Field.Root>
            <Field.Root>
              <Field.Label>{t("eventEndDate")}</Field.Label>
              <Input name="endDate" type="date" />
            </Field.Root>
            <Field.Root>
              <Field.Label>{t("notes")}</Field.Label>
              <Input name="notes" />
            </Field.Root>
          </SimpleGrid>
          {state.error && <Text color="fg.error" fontSize="sm">{state.error}</Text>}
          <Button type="submit" size="sm" variant="outline" alignSelf="start" loading={pending}>{t("addEvent")}</Button>
        </Stack>
      </form>
    </Stack>
  );
}

const DUTY_LETTER = { CE: "C", PM: "P", MACHINING: "M" } as const;

export function DutyTable(props: { grid: DutyGrid; dates: string[] }) {
  const { grid, dates } = props;
  const t = useTranslations("Attendance.admin");
  const [isPending, startTransition] = useTransition();

  const assigned = new Map(grid.assignments.map(a => [`${a.userId}|${a.date}`, a.role]));
  const unavailable = new Set(grid.unavailable.map(m => `${m.userId}|${m.date}`));

  const handleToggle = (userId: string, date: string) => startTransition(async () => {
    try {
      await toggleDuty(userId, date);
    } catch {
      toaster.error({ title: t("failed") });
    }
  });

  if (grid.users.length === 0) {
    return <Text color="fg.muted" fontSize="sm">{t("noDutyUsers")}</Text>;
  }

  return (
    <Table.ScrollArea>
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>{t("name")}</Table.ColumnHeader>
            {dates.map(date => <Table.ColumnHeader key={date} textAlign="center">{date.slice(5).replace("-", "/")}</Table.ColumnHeader>)}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {grid.users.map(user => (
            <Table.Row key={user.id}>
              <Table.Cell whiteSpace="nowrap">{user.name} ({DUTY_LETTER[user.dutyRole]})</Table.Cell>
              {dates.map(date => {
                const key = `${user.id}|${date}`;
                const role = assigned.get(key);

                return (
                  <Table.Cell key={date} textAlign="center" p={1}>
                    <Button
                      size="xs"
                      width="full"
                      disabled={isPending}
                      variant={role ? "solid" : "subtle"}
                      colorPalette={unavailable.has(key) ? "red" : role ? "blue" : "gray"}
                      aria-label={`${user.name} ${date}`}
                      onClick={() => handleToggle(user.id, date)}
                    >
                      {role ? DUTY_LETTER[role] : ""}
                    </Button>
                  </Table.Cell>
                );
              })}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  );
}
