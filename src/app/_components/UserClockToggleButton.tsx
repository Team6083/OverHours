"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Icon } from "@chakra-ui/react";
import { LuDoorOpen, LuTimer } from "react-icons/lu";

import { toaster } from "@/components/ui/toaster";
import { formatDuration } from "@/lib/util";
import { userClockToggle } from "../actions";

export default function UserClockToggleButton(props: { isClockedIn: boolean, userId: string }) {
  const { isClockedIn, userId } = props;
  const t = useTranslations("HomePage");

  const [isPending, startTransition] = useTransition();

  const handleClick = () => startTransition(() => {
    return userClockToggle(userId, isClockedIn)
      .then((v) => {
        if (!v.ok && v.error) {
          if (v.error.name === "AlreadyClockedInError") {
            toaster.warning({
              title: t("userClockToggleButton.errors.alreadyClockedIn.title"),
              description: t("userClockToggleButton.errors.alreadyClockedIn.description")
            });
          } else if (v.error.name === "NotClockedInError") {
            toaster.warning({
              title: t("userClockToggleButton.errors.notClockedIn.title"),
              description: t("userClockToggleButton.errors.notClockedIn.description")
            });
          } else if (v.error.name === "TimeLogTooShortError") {
            const minDurationSec = "minDurationSec" in v.error ? v.error.minDurationSec : undefined;
            const minDurationStr = formatDuration(minDurationSec ?? 0);

            toaster.warning({
              title: t("userClockToggleButton.errors.timeLogTooShort.title"),
              description: t("userClockToggleButton.errors.timeLogTooShort.description", { minDuration: minDurationStr })
            });
          } else {
            toaster.error({
              title: t("userClockToggleButton.errors.genericError.title"),
              description: t("userClockToggleButton.errors.genericError.description")
            });
          }
        } else if (v.ok) {
          toaster.success({
            title: t(`userClockToggleButton.messages.${isClockedIn ? "clockedOut" : "clockedIn"}.title`),
            description: t(`userClockToggleButton.messages.${isClockedIn ? "clockedOut" : "clockedIn"}.description`)
          });
        }
      });
  });

  return (
    <Button
      width="full" size="xs" variant="surface"
      colorPalette={isClockedIn ? "purple" : "blue"}
      onClick={handleClick}
      loading={isPending}
    >
      {isClockedIn ? t("buttons.clockOut") : t("buttons.clockIn")}
      <Icon>{isClockedIn ? <LuDoorOpen /> : <LuTimer />}</Icon>
    </Button>
  );
}
