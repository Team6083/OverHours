import Link from "next/link";
import { Badge, Card, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import { getTranslations } from "next-intl/server";

import { getMyReminderTeams } from "@/lib/data/team-reminder-dto";

export default async function TeamRemindersPage() {
  const t = await getTranslations("TeamReminders");
  const teams = await getMyReminderTeams();

  return (
    <Stack gap={4}>
      <Heading as="h2" size="2xl">{t("title")}</Heading>
      <Text fontSize="sm" color="fg.muted">{t("intro")}</Text>
      {teams.length === 0 ? <Text>{t("empty")}</Text> : (
        <Stack gap={2}>
          {teams.map(team => (
            <Card.Root key={team.id} size="sm" asChild>
              <Link href={`/teams/${team.id}`}>
                <Card.Body>
                  <HStack justify="space-between">
                    <Text fontWeight="semibold">{team.name}</Text>
                    <Badge colorPalette={team.enabled ? "green" : "gray"}>{team.enabled ? t("on") : t("off")}</Badge>
                  </HStack>
                </Card.Body>
              </Link>
            </Card.Root>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
