import { Pagination } from "@chakra-ui/react";

import { getAllUserDTOs } from "@/lib/data/user-dto";
import UsersTable from "./UsersTable";

export default async function UsersPage() {
  const users = await getAllUserDTOs();

  return <>
    <Pagination.Root count={users.length} defaultPageSize={10} defaultPage={1}>
      <UsersTable users={users} />
    </Pagination.Root>
  </>;
}
