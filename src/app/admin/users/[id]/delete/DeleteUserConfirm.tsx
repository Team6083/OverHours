import { Button, ButtonGroup, HStack, Icon, Text } from "@chakra-ui/react";
import { FactList, TitleBar } from "@team6083/ui";
import { LuTrash2 } from "react-icons/lu";

import WriteButton from "@/components/common/WriteButton";
import { UserDTO } from "@/lib/data/user-dto";

export default function DeleteUserConfirm(props: {
  user: UserDTO;
  handleCancel: () => Promise<void>;
  handleDelete: () => Promise<void>;
}) {
  const { user, handleCancel, handleDelete } = props;

  return <>
    <TitleBar title="Confirm Deletion" size="md" mb={4} />

    <FactList mb={4} items={[
      { label: "User ID", value: user.id },
      { label: "Name", value: user.name },
      { label: "Email", value: user.email },
    ]} />

    <Text fontWeight="medium" color="fg.warning" mb={4}>Are you sure you want to delete this user?</Text>

    <HStack justify="flex-end">
      <ButtonGroup size="sm" variant="subtle">
        <Button onClick={handleCancel}>
          Cancel
        </Button>
        <WriteButton colorPalette="red" onClick={handleDelete}>
          <Icon><LuTrash2 /></Icon>
          Delete
        </WriteButton>
      </ButtonGroup>
    </HStack>
  </>
}
