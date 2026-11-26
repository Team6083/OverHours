"use client";
import { Badge, HStack, Text } from "@chakra-ui/react";
import { FactList } from "@team6083/ui";

import GenericClipboard from "@/components/common/Clipboard";
import DeleteDialog, { type DeleteDialogControls } from "@/components/common/DeleteDialog";
import { UserDTO } from "@/lib/data/user-dto";
import { handleDeleteUsers } from "./actions";

/** Asks before deleting users: the facts of one user, or a badge per user. */
export default function DeleteUsersDialog(props: DeleteDialogControls & {
  users: Pick<UserDTO, "id" | "name" | "email">[];
}) {
  const { users, ...controls } = props;

  return <DeleteDialog
    {...controls}
    message={users.length === 1
      ? "Are you sure you want to delete this user?"
      : "Are you sure you want to delete the following users?"}
    onDelete={() => handleDeleteUsers(users.map(user => user.id))}
  >
    {users.length === 1 ? (
      <FactList alignItems="start" items={[
        { label: "User ID", value: <GenericClipboard wordBreak="break-all" value={users[0].id} /> },
        { label: "Name", value: users[0].name },
        { label: "Email", value: users[0].email },
      ]} />
    ) : <>
      <HStack flexWrap="wrap" gap={2}>
        {users.map(user => <Badge key={user.id} colorPalette="brand">{user.name}</Badge>)}
      </HStack>
      <Text color="fg.muted">Total {users.length} users selected</Text>
    </>}
  </DeleteDialog>;
}
