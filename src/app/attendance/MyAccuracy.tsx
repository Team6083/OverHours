import { Badge, Card, HStack, Stack, Text } from "@chakra-ui/react";
import { getTranslations } from "next-intl/server";

import { AccuracyRow } from "@/lib/data/attendance-dto";
import { shortDate } from "@/lib/attendance";

export const scorePalette = (score: number | null) =>
  score === null ? "gray" : score >= 0.9 ? "green" : score >= 0.7 ? "orange" : "red";

export function DateLine(props: { label: string; dates: string[]; palette: string }) {
  const { label, dates, palette } = props;
  return (
    <HStack gap={2} align="baseline" wrap="wrap">
      <Badge colorPalette={dates.length > 0 ? palette : "gray"} variant="subtle">{label} {dates.length}</Badge>
      {dates.length > 0 && <Text fontSize="xs" color="fg.muted">{dates.map(shortDate).join("、")}</Text>}
    </HStack>
  );
}

export default async function MyAccuracy(props: { row: AccuracyRow | null; days: number }) {
  const { row, days } = props;
  const t = await getTranslations("Attendance.accuracy");
  const score = row?.score ?? null;

  return (
    <Card.Root size="sm" mt={6}>
      <Card.Header>
        <HStack justify="space-between">
          <Card.Title>{t("title", { days })}</Card.Title>
          {score !== null && <Badge size="lg" colorPalette={scorePalette(score)}>{Math.round(score * 100)}%</Badge>}
        </HStack>
      </Card.Header>
      <Card.Body>
        {row && row.days > 0 ? (
          <Stack gap={2}>
            <Text fontSize="sm" color="fg.muted">{t("summary", { days: row.days, answered: row.answered })}</Text>
            <DateLine label={t("brokenPromises")} dates={row.brokenPromises} palette="red" />
            <DateLine label={t("silentAbsences")} dates={row.silentAbsences} palette="orange" />
            <DateLine label={t("unannounced")} dates={row.unannounced} palette="yellow" />
          </Stack>
        ) : <Text fontSize="sm" color="fg.muted">{t("empty")}</Text>}
      </Card.Body>
    </Card.Root>
  );
}
