import { Pagination } from "@chakra-ui/react";

import { getOutOfSyncEmails } from "@/lib/data/account-dto";
import { getAllUserDTOs } from "@/lib/data/user-dto";
import UsersTable from "./UsersTable";

export default async function UsersPage() {
  const [users, providerEmails] = await Promise.all([getAllUserDTOs(), getOutOfSyncEmails()]);

  return <>
    <Pagination.Root count={users.length} defaultPageSize={10} defaultPage={1}>
      <UsersTable users={users} outOfSyncEmails={providerEmails} />
    </Pagination.Root>
  </>;
}
