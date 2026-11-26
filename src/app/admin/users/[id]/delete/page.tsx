import { redirect } from "next/navigation";

import { Container } from "@chakra-ui/react";

import DeleteConfirm from "@/components/common/DeleteConfirm";
import { deleteUser, getUserDTO } from "@/lib/data/user-dto";

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
    <DeleteConfirm
      subject="user"
      items={[
        { label: "User ID", value: userDTO.id },
        { label: "Name", value: userDTO.name },
        { label: "Email", value: userDTO.email },
      ]}
      handleCancel={handleCancel}
      handleDelete={handleDelete}
    />
  </>;
}
