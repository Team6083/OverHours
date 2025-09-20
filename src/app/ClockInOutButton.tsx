"use client";
import { useState } from "react";
import { Button, Icon } from "@chakra-ui/react";
import { LuDoorOpen, LuTimer } from "react-icons/lu";
import { useTranslations } from "next-intl";

export default function UserClockInOutButton(props: {
  isClockedin?: boolean,
  handleClick: () => Promise<void>,
}) {
  const { isClockedin, handleClick } = props;
  const t = useTranslations("HomePage");

  const [pending, setPending] = useState(false);

  return (
    <Button
      width="full" size="xs" variant="surface"
      colorPalette={isClockedin ? "purple" : "blue"}
      onClick={() => {
        setPending(true);
        handleClick().finally(() => setPending(false));
      }}
      loading={pending}
    >
      {isClockedin ? t("buttons.clockOut") : t("buttons.clockIn")}
      <Icon>{isClockedin ? <LuDoorOpen /> : <LuTimer />}</Icon>
    </Button>
  );
}
