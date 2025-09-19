import { Pagination } from "@chakra-ui/react";

import { auth, Role } from "@/auth";
import { getAllTimelogDTOs } from "@/lib/data/timelog-dto";
import { getAllUserNames } from "@/lib/data/user-dto";
import LogsTable from "./LogsTable";

export default async function LogsPage() {
  const session = await auth();
  const isAdmin = session?.user.role === Role.ADMIN;

  const logs = await getAllTimelogDTOs(isAdmin ? undefined : session?.user.id);
  const userInfo = Object.fromEntries((await getAllUserNames()).map((user) => [user.id, { name: user.name }]));

  return <>
    <Pagination.Root count={logs.length} defaultPageSize={10} defaultPage={1}>
      <LogsTable logs={logs} userInfo={userInfo} showAdminActions={isAdmin} />
    </Pagination.Root>
  </>
}
