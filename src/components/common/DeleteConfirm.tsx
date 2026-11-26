import { Button, ButtonGroup, HStack, Icon, Text } from "@chakra-ui/react";
import { type Fact, FactList, TitleBar } from "@team6083/ui";
import { LuTrash2 } from "react-icons/lu";

import WriteButton from "@/components/common/WriteButton";

/** The page that asks before deleting a record: its facts, a warning and Cancel / Delete. */
export default function DeleteConfirm(props: {
  /** What is deleted, as in "Are you sure you want to delete this {subject}?" */
  subject: string;
  items: Fact[];
  handleCancel: () => Promise<void>;
  handleDelete: () => Promise<void>;
}) {
  const { subject, items, handleCancel, handleDelete } = props;

  return <>
    <TitleBar title="Confirm Deletion" size="md" mb={4} />

    <FactList mb={4} items={items} />

    <Text fontWeight="medium" color="fg.warning" mb={4}>Are you sure you want to delete this {subject}?</Text>

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
