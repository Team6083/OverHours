import { Pagination } from "@chakra-ui/react";

import { getAllTimelogDTOs } from "@/lib/data/timelog-dto";
import { getAllUserNames } from "@/lib/data/user-dto";
import LogsTable from "./LogsTable";

export default async function LogsPage() {
  const logs = await getAllTimelogDTOs();
  const userInfo = Object.fromEntries((await getAllUserNames()).map((user) => [user.id, { name: user.name }]));

  return <>
    <Pagination.Root count={logs.length} defaultPageSize={10} defaultPage={1}>
      <LogsTable logs={logs} userInfo={userInfo} />
    </Pagination.Root>
  </>
}
