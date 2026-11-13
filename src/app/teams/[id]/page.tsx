import Link from "next/link";
import { Button, Heading, Stack, Text } from "@chakra-ui/react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { LuChevronLeft } from "react-icons/lu";

import { getTeamReminder } from "@/lib/data/team-reminder-dto";
import { TeamError } from "@/lib/data/team-dto";
import ReminderForm from "./ReminderForm";

export default async function TeamReminderPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const t = await getTranslations("TeamReminders");

  let reminder;
  try {
    reminder = await getTeamReminder(id);
  } catch (error) {
    if (error instanceof TeamError || (error instanceof Error && error.message === "Forbidden")) notFound();
    throw error;
  }
  if (!reminder) notFound();

  return (
    <Stack gap={4}>
      <Button asChild variant="ghost" size="sm" alignSelf="start">
        <Link href="/teams"><LuChevronLeft />{t("back")}</Link>
      </Button>
      <Heading as="h2" size="2xl">{reminder.team.name}</Heading>
      <Text fontSize="sm" color="fg.muted">{t("intro")}</Text>
      <ReminderForm key={JSON.stringify(reminder.settings)} reminder={reminder} />
    </Stack>
  );
}
