"use client";
import { useTranslations } from "next-intl";
import { Button, Icon } from "@chakra-ui/react";
import { LuDoorOpen, LuTimer } from "react-icons/lu";

import { useAsync } from "@/lib/hooks";
import { handleUserClockToggleClick } from "../actions";

export default function UserClockToggleButton(props: { isClockedIn: boolean, userId: string }) {
  const { isClockedIn, userId } = props;
  const t = useTranslations("HomePage");

  const { pending, reload } = useAsync(() => handleUserClockToggleClick(userId, isClockedIn));

  return (
    <Button
      width="full" size="xs" variant="surface"
      colorPalette={isClockedIn ? "purple" : "blue"}
      onClick={reload}
      loading={pending}
    >
      {isClockedIn ? t("buttons.clockOut") : t("buttons.clockIn")}
      <Icon>{isClockedIn ? <LuDoorOpen /> : <LuTimer />}</Icon>
    </Button>
  );
}
