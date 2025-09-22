"use client";

import { useNow } from "next-intl";
import { ClientOnly, Text } from "@chakra-ui/react";
import { useFormatter, useTranslations } from "use-intl";
import { Tooltip } from "./ui/tooltip";

export default function LastUpdatedText({ date }: { date: Date }) {
  const now = useNow({ updateInterval: 10000 });
  const t = useTranslations("LastUpdatedText");
  const formatter = useFormatter();

  return (
    <ClientOnly>
      <Tooltip content={date.toLocaleString()}>
        <Text mb={2} textAlign="right" fontSize="xs" color="fg.muted">
          {t("lastUpdated", { timeString: formatter.relativeTime(date, now) })}
        </Text>
      </Tooltip>
    </ClientOnly>
  );
}
