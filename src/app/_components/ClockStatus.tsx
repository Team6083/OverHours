"use client";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { ComponentProps } from "react";

import { Status, Text } from "@chakra-ui/react";
import { Tooltip } from "@team6083/ui";

import { TimeLogDTO } from "@/lib/data/timelog-dto";
import { ComponentPropsWithoutChildren } from "@/lib/util";

export default function ClockStatus(props: {
  lastLog?: TimeLogDTO;
  textColor?: ComponentProps<typeof Text>["color"];
} & ComponentPropsWithoutChildren<typeof Status.Root>) {
  const { lastLog, textColor, ...statusRootProps } = props;

  const t = useTranslations("HomePage.userCard");
  const format = useFormatter();
  const now = useNow({ updateInterval: 10000 }); // Update every 10 seconds
  // `now` can lag up to 10s behind; never let a fresh log read as "in N seconds".
  const relativeTime = (date: Date) => format.relativeTime(date, Math.max(now.getTime(), date.getTime()));

  let statusText: string;
  let statusColor: ComponentProps<typeof Status.Root>["colorPalette"];
  let time: Date | undefined;

  if (lastLog) {
    if (lastLog.status === "CURRENTLY_IN") {
      statusColor = "green";
      time = lastLog.inTime;
      statusText = t("status.lastIn", { time: relativeTime(time) });
    } else {
      time = lastLog.outTime;
      const timeStr = lastLog.outTime ? relativeTime(lastLog.outTime) : "N/A";

      if (lastLog.status === "LOCKED") {
        statusColor = "orange";
        statusText = t("status.lastLock", { time: timeStr });
      } else {
        statusColor = "blue";
        statusText = t("status.lastOut", { time: timeStr });
      }
    }
  } else {
    statusColor = "pink";
    statusText = t("status.noLogsYet");
  }

  return (
    <Tooltip content={time?.toLocaleString()} contentProps={{ hidden: !time }}>
      <Status.Root
        fontSize="xs" gap={2}
        {...statusRootProps}
        colorPalette={statusColor}
      >
        <Text color={textColor || "fg.muted"} suppressHydrationWarning>{statusText}</Text>
        <Status.Indicator />
      </Status.Root>
    </Tooltip>
  );
}
