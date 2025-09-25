"use client";
import { ComponentProps } from "react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Status, Text } from "@chakra-ui/react";

import { Tooltip } from "@/components/ui/tooltip";
import { TimeLogDTO } from "@/lib/data/timelog-dto";
import { ComponentPropsWithoutChildren } from "@/lib/util";

export default function UserStatus(props: {
  lastLog?: TimeLogDTO;
  textColor?: ComponentProps<typeof Text>["color"];
} & ComponentPropsWithoutChildren<typeof Status.Root>) {
  const { lastLog, textColor, ...statusRootProps } = props;

  const t = useTranslations("HomePage.userCard");
  const format = useFormatter();
  const intlNow = useNow({ updateInterval: 10000 }); // Update every 10 seconds
  const now = intlNow.getTime() > Date.now() ? intlNow.getTime() : Date.now();

  let statusText: string;
  let statusColor: ComponentProps<typeof Status.Root>["colorPalette"];
  let time: Date | undefined;

  if (lastLog) {
    if (lastLog.status === "CURRENTLY_IN") {
      statusColor = "green";
      time = lastLog.inTime;
      statusText = t("status.lastIn", { time: format.relativeTime(time, now) });
    } else {
      time = lastLog.outTime;
      const timeStr = lastLog.outTime ? format.relativeTime(lastLog.outTime, now) : "N/A";

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
