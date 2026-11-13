import { Badge, Card, HStack, Stack, Text } from "@chakra-ui/react";
import { getTranslations } from "next-intl/server";

import { shortDate } from "@/lib/attendance";
import { ReliabilityRow } from "@/lib/data/attendance-dto";

function DateLine(props: { label: string; dates: string[] }) {
  const { label, dates } = props;
  return (
    <HStack gap={2} align="baseline" wrap="wrap">
      <Badge colorPalette={dates.length > 0 ? "red" : "gray"} variant="subtle">{label} {dates.length}</Badge>
      {dates.length > 0 && <Text fontSize="xs" color="fg.muted">{dates.map(shortDate).join("、")}</Text>}
    </HStack>
  );
}

export default async function MyReliability(props: { row: ReliabilityRow | null; days: number }) {
  const { row, days } = props;
  const t = await getTranslations("Attendance.reliability");

  return (
    <Card.Root size="sm" mt={6}>
      <Card.Header>
        <HStack justify="space-between">
          <Card.Title>{t("title", { days })}</Card.Title>
          {row?.reliability != null && <Badge size="lg">{Math.round(row.reliability * 100)}%</Badge>}
        </HStack>
        <Card.Description>{t("description")}</Card.Description>
      </Card.Header>
      <Card.Body>
        {row ? (
          <Stack gap={2}>
            <Text fontSize="sm" color="fg.muted">{t("summary", { answered: row.answered, matched: row.matched })}</Text>
            <DateLine label={t("brokenPromises")} dates={row.brokenPromises} />
            <DateLine label={t("unexpected")} dates={row.unexpected} />
          </Stack>
        ) : <Text fontSize="sm" color="fg.muted">{t("empty")}</Text>}
      </Card.Body>
    </Card.Root>
  );
}
