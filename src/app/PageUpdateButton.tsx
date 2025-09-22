"use client";

import { useState } from "react";
import { IconButton } from "@chakra-ui/react";
import { LuRefreshCcw } from "react-icons/lu";
import { refreshPage } from "./actions";

export default function PageUpdateButton() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);
      await refreshPage();
    } finally {
      setLoading(false);
    }
  }

  return <>
    <IconButton size="xs" variant="ghost" loading={loading} onClick={handleClick}><LuRefreshCcw /></IconButton>
  </>;
}
