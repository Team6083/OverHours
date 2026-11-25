"use client";
import { IconButton } from "@chakra-ui/react";
import { LuRefreshCcw } from "react-icons/lu";

import { useAsync } from "@/lib/hooks";
import { updatePage } from "../actions";

export default function RefreshButton() {
  const { pending, reload } = useAsync(updatePage);

  return <>
    <IconButton size="xs" variant="ghost" loading={pending} onClick={reload}><LuRefreshCcw /></IconButton>
  </>;
}
