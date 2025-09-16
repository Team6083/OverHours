import { Button, HStack, Icon, Pagination } from "@chakra-ui/react";

import { getAllUserDTOs } from "@/lib/data/user-dto";
import UsersTable from "./UsersTable";
import Link from "next/link";
import { LuUserPlus } from "react-icons/lu";

export default async function UsersPage() {
  const users = await getAllUserDTOs();

  return <>
    <HStack justifyContent="flex-end" mb={4}>
      <Button size="sm" variant="ghost" asChild>
        <Link href="/admin/users/new">
          <Icon><LuUserPlus /></Icon>
          Create User
        </Link>
      </Button>
    </HStack>
    <Pagination.Root count={users.length} defaultPageSize={10} defaultPage={1}>
      <UsersTable users={users} />
    </Pagination.Root>
  </>;
}
