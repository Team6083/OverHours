import Link from "next/link";
import { Button, Container, HStack, Icon, IconButton } from "@chakra-ui/react";
import { LuArrowLeft, LuTrash2 } from "react-icons/lu";

import { getUserDTO } from "@/lib/data/user-dto";
import UserForm from "./form";

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

  return (<>
    <HStack mb={4} justifyContent="space-between">
      <Button size="xs" variant="ghost" asChild>
        <Link href="/admin/users">
          <Icon><LuArrowLeft /></Icon>
          Back to Users
        </Link>
      </Button>

      {userDTO && <IconButton size="xs" variant="ghost" colorPalette="red" asChild><Link href={`/admin/users/${userDTO.id}/delete`}>
        <Icon><LuTrash2 /></Icon>
      </Link></IconButton>}
    </HStack>

    <UserForm isNew={isNew} user={userDTO ?? undefined} />
  </>);
}
