import Link from "next/link";
import { Button, HStack, Icon, Pagination } from "@chakra-ui/react";
import { LuClipboardPlus } from "react-icons/lu";

import { getAllTimelogDTOs } from "@/lib/data/timelog-dto";
import { getAllUserNames } from "@/lib/data/user-dto";
import LogsTable from "./LogsTable";

export default async function LogsPage() {
  const logs = await getAllTimelogDTOs();
  const userInfo = Object.fromEntries((await getAllUserNames()).map((user) => [user.id, { name: user.name }]));

  return <>
    <HStack justifyContent="flex-end" mb={4}>
      <Button size="sm" variant="ghost" asChild>
        <Link href="/logs/new">
          <Icon><LuClipboardPlus /></Icon>
          Create Log
        </Link>
      </Button>
    </HStack>
    <Pagination.Root count={logs.length} defaultPageSize={10} defaultPage={1}>
      <LogsTable logs={logs} userInfo={userInfo} />
    </Pagination.Root>
  </>
}
