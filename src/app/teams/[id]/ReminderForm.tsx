"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Field, HStack, Input, NativeSelect, SimpleGrid, Stack, Switch, Text } from "@chakra-ui/react";
import { useTranslations } from "next-intl";

import { toaster } from "@/components/ui/toaster";
import type { TeamReminderDTO } from "@/lib/data/team-reminder-dto";
import { MAX_DAYS_AHEAD, ReminderSettings } from "@/lib/team-reminders";
import { saveTeamReminderAction } from "../actions";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

export default function ReminderForm(props: { reminder: TeamReminderDTO }) {
  const { reminder } = props;
  const t = useTranslations("TeamReminders");
  const router = useRouter();
  const [settings, setSettings] = useState<ReminderSettings>(reminder.settings);
  const [saving, startSaving] = useTransition();

  const set = (patch: Partial<ReminderSettings>) => setSettings(current => ({ ...current, ...patch }));
  const toggleDay = (day: number) => set({
    weekdays: settings.weekdays.includes(day) ? settings.weekdays.filter(d => d !== day) : [...settings.weekdays, day].sort(),
  });
  const changed = JSON.stringify(settings) !== JSON.stringify(reminder.settings);

  const save = () => startSaving(async () => {
    const result = await saveTeamReminderAction(reminder.team.id, settings);
    if (result.ok) {
      toaster.success({ title: t("saved") });
      router.refresh();
    } else toaster.error({ title: t("saveFailed") });
  });

  return (
    <Stack gap={4}>
      <Card.Root size="sm">
        <Card.Body>
          <Stack gap={4}>
            <Switch.Root checked={settings.enabled} onCheckedChange={e => set({ enabled: e.checked })}>
              <Switch.HiddenInput />
              <Switch.Control />
              <Switch.Label>{t("enabled")}</Switch.Label>
            </Switch.Root>

            <Field.Root>
              <Field.Label>{t("weekdays")}</Field.Label>
              <HStack gap={1} w="full" maxW="md">
                {WEEKDAYS.map(day => {
                  const on = settings.weekdays.includes(day);
                  return (
                    <Button
                      key={day}
                      size="sm"
                      flex="1"
                      minW={0}
                      px={0}
                      variant={on ? "solid" : "outline"}
                      aria-pressed={on}
                      onClick={() => toggleDay(day)}
                    >
                      {t(`weekday.${day}` as "weekday.1")}
                    </Button>
                  );
                })}
              </HStack>
              <Field.HelperText>{t("weekdaysHelp")}</Field.HelperText>
            </Field.Root>

            <SimpleGrid columns={2} gap={4} maxW="md">
              <Field.Root>
                <Field.Label>{t("daysAhead")}</Field.Label>
                <NativeSelect.Root size="sm">
                  <NativeSelect.Field value={settings.daysAhead} onChange={e => set({ daysAhead: Number(e.target.value) })}>
                    {Array.from({ length: MAX_DAYS_AHEAD }, (_, i) => i + 1).map(count => (
                      <option key={count} value={count}>{t("days", { count })}</option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
                <Field.HelperText>{t("daysAheadHelp")}</Field.HelperText>
              </Field.Root>

              <Field.Root>
                <Field.Label>{t("time")}</Field.Label>
                <Input size="sm" type="time" step={60} value={settings.time}
                  onChange={e => e.target.value && set({ time: e.target.value.slice(0, 5) })} />
              </Field.Root>
            </SimpleGrid>

            <HStack gap={2}>
              <Text fontSize="sm" fontWeight="medium">{t("channel")}</Text>
              {reminder.hasWebhook
                ? <Badge colorPalette="green">{t("channelSet")}</Badge>
                : <Text fontSize="sm" color="fg.warning">{t("channelMissing")}</Text>}
            </HStack>

            <Button alignSelf="start" onClick={save} loading={saving} disabled={!changed}>{t("save")}</Button>
          </Stack>
        </Card.Body>
      </Card.Root>

      <Card.Root size="sm">
        <Card.Header>
          <Card.Title>{t("preview")}</Card.Title>
        </Card.Header>
        <Card.Body>
          {reminder.settings.weekdays.length === 0
            ? <Text fontSize="sm" color="fg.muted">{t("previewNoDays")}</Text>
            : reminder.missing.length === 0
              ? <Text fontSize="sm" color="fg.muted">{t("previewNone")}</Text>
              : (
                <Stack gap={1}>
                  {reminder.missing.map(member => (
                    <HStack key={member.name + member.dates.join()} gap={2} wrap="wrap">
                      <Text fontSize="sm" fontWeight="medium">{member.name}</Text>
                      <Text fontSize="xs" color="fg.muted">{member.dates.map(date => date.slice(5).replace("-", "/")).join("、")}</Text>
                    </HStack>
                  ))}
                </Stack>
              )}
        </Card.Body>
      </Card.Root>
    </Stack>
  );
}
