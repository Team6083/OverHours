import Link from "next/link";

import { Button, Container, HStack, Icon, IconButton } from "@chakra-ui/react";
import { LuArrowLeft, LuTrash2 } from "react-icons/lu";

import { getUserAccounts } from "@/lib/data/account-dto";
import { getUserDTO } from "@/lib/data/user-dto";
import DeleteUsersDialog from "../DeleteUsersDialog";
import UserForm from "./form";
import LinkedAccounts from "./LinkedAccounts";

export default async function SingleUserPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { params } = props;
  const { id } = await params;

  const isNew = id === "new";

  const userDTO = isNew ? null : await getUserDTO(id);
  if (!isNew && !userDTO) {
    return <Container maxWidth="lg">User not found</Container>;
  }
  const accounts = userDTO ? await getUserAccounts(userDTO.id) : [];

  return (<>
    <HStack mb={4} justifyContent="space-between">
      <Button size="xs" variant="ghost" asChild>
        <Link href="/admin/users">
          <Icon><LuArrowLeft /></Icon>
          Back to Users
        </Link>
      </Button>

      {userDTO && <DeleteUsersDialog
        users={[{ id: userDTO.id, name: userDTO.name, email: userDTO.email }]}
        redirectTo="/admin/users"
        trigger={<IconButton size="xs" variant="ghost" colorPalette="red" aria-label="Delete">
          <Icon><LuTrash2 /></Icon>
        </IconButton>}
      />}
    </HStack>

    <Container>
      <UserForm isNew={isNew} user={userDTO ?? undefined} emailManaged={accounts.length === 1} />
      {userDTO && <LinkedAccounts userId={userDTO.id} accounts={accounts} />}
    </Container>
  </>);
}
