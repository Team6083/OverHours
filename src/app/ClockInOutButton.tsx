"use client";
import { useState } from "react";
import { Button, Icon } from "@chakra-ui/react";
import { LuDoorOpen, LuTimer } from "react-icons/lu";

export default function UserClockInOutButton(props: {
  isClockedin?: boolean,
  handleClick: () => Promise<void>,
}) {
  const { isClockedin, handleClick } = props;

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
      Clock-{isClockedin ? "out" : "in"}
      <Icon>{isClockedin ? <LuDoorOpen /> : <LuTimer />}</Icon>
    </Button>
  );
}
