import { Badge, Card, HStack, Stack, Text } from "@chakra-ui/react";
import { getTranslations } from "next-intl/server";

import { AccuracyRow } from "@/lib/data/attendance-dto";
import { shortDate } from "@/lib/attendance";

function Line(props: { label: string; dates: string[]; palette: string }) {
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
  const accuracy = row && row.filled > 0 ? Math.round(row.matched / row.filled * 100) : null;

  return (
    <Card.Root size="sm" mt={6}>
      <Card.Header>
        <HStack justify="space-between">
          <Card.Title>{t("title", { days })}</Card.Title>
          {accuracy !== null && <Badge size="lg" colorPalette={accuracy >= 90 ? "green" : accuracy >= 70 ? "orange" : "red"}>{accuracy}%</Badge>}
        </HStack>
      </Card.Header>
      <Card.Body>
        {row && (row.filled > 0 || row.unannounced.length > 0) ? (
          <Stack gap={2}>
            <Text fontSize="sm" color="fg.muted">{t("summary", { matched: row.matched, filled: row.filled })}</Text>
            <Line label={t("noShows")} dates={row.noShows} palette="red" />
            <Line label={t("unannounced")} dates={row.unannounced} palette="orange" />
          </Stack>
        ) : <Text fontSize="sm" color="fg.muted">{t("empty")}</Text>}
      </Card.Body>
    </Card.Root>
  );
}
