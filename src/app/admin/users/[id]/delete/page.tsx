import { redirect } from "next/navigation";
import { Container } from "@chakra-ui/react";

import { deleteUser, getUserDTO } from "@/lib/data/user-dto";
import DeleteUserConfirm from "./DeleteUserConfirm";

export default async function DeleteUserPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { params } = props;
  const { id } = await params;

  const userDTO = await getUserDTO(id);
  if (!userDTO) {
    return <Container maxW="md">User not found</Container>;
  }

  const handleCancel = async () => {
    "use server";
    redirect("/admin/users");
  };

  const handleDelete = async () => {
    "use server";
    await deleteUser(id);
    redirect("/admin/users");
  };

  return <>
    <DeleteUserConfirm
      user={userDTO}
      handleCancel={handleCancel}
      handleDelete={handleDelete}
    />
  </>;
}
