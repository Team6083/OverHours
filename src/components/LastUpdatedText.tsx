"use client";
import { useFormatter, useNow, useTranslations } from "use-intl";
import { ClientOnly, Text } from "@chakra-ui/react";

import { Tooltip } from "@/components/ui/tooltip";
import { ComponentPropsWithoutChildren } from "@/lib/util";

export default function LastUpdatedText(props: {
  date: Date
} & ComponentPropsWithoutChildren<typeof Text>) {
  const { date, ...textProps } = props;

  const nextIntlNow = useNow({ updateInterval: 10000 });
  const now = date > nextIntlNow ? date : nextIntlNow; // Because useNow might be slightly behind

  const t = useTranslations("LastUpdatedText");
  const formatter = useFormatter();

  return (
    <ClientOnly>
      <Tooltip content={date.toLocaleString()}>
        <Text {...textProps}>
          {t("lastUpdated", { timeString: formatter.relativeTime(date, now) })}
        </Text>
      </Tooltip>
    </ClientOnly>
  );
}
