import { Heading, DataList, HStack, ButtonGroup, Button, Icon, Text } from "@chakra-ui/react";
import { LuTrash2 } from "react-icons/lu";

import { UserDTO } from "@/lib/data/user-dto";

export default function DeleteUserConfirm(props: {
  user: UserDTO;
  handleCancel: () => Promise<void>;
  handleDelete: () => Promise<void>;
}) {
  const { user, handleCancel, handleDelete } = props;

  return <>
    <Heading as="h2" size="md" mb={4}>Confirm Deletion</Heading>

    <DataList.Root orientation="horizontal" mb={4}>
      <DataList.Item>
        <DataList.ItemLabel>User ID</DataList.ItemLabel>
        <DataList.ItemValue>{user.id}</DataList.ItemValue>
      </DataList.Item>
      <DataList.Item>
        <DataList.ItemLabel>Name</DataList.ItemLabel>
        <DataList.ItemValue>{user.name}</DataList.ItemValue>
      </DataList.Item>
      <DataList.Item>
        <DataList.ItemLabel>Email</DataList.ItemLabel>
        <DataList.ItemValue>{user.email}</DataList.ItemValue>
      </DataList.Item>
    </DataList.Root>

    <Text fontWeight="medium" color="fg.warning" mb={4}>Are you sure you want to delete this user?</Text>

    <HStack justify="flex-end">
      <ButtonGroup size="sm" variant="subtle">
        <Button onClick={handleCancel}>
          Cancel
        </Button>
        <Button colorPalette="red" onClick={handleDelete}>
          <Icon><LuTrash2 /></Icon>
          Delete
        </Button>
      </ButtonGroup>
    </HStack>
  </>
}
