import { Heading, HStack, ButtonGroup, Button, Icon, Text, Badge } from "@chakra-ui/react";
import { FactList } from "@team6083/ui";
import { LuTrash2 } from "react-icons/lu";

import GenericClipboard from "@/components/common/Clipboard";
import { StatRangeDTO } from "@/lib/data/statrange-dto";
import WriteButton from "@/components/common/WriteButton";

export default function DeleteStatRangeConfirm(props: {
  statRange: StatRangeDTO;
  handleCancel: () => Promise<void>;
  handleDelete: () => Promise<void>;
}) {
  const { statRange, handleCancel, handleDelete } = props;

  return <>
    <Heading as="h2" size="md" mb={4}>Confirm Deletion</Heading>

    <FactList mb={4} items={[
      { label: "ID", value: <GenericClipboard value={statRange.id} /> },
      { label: "Name", value: statRange.name },
      { label: "Start Date", value: statRange.startDate.toLocaleDateString() },
      { label: "End Date", value: statRange.endDate.toLocaleDateString() },
      {
        label: "Status",
        value: <Badge colorPalette={statRange.status === "ACTIVE" ? "green" : "gray"}>{statRange.status}</Badge>,
      },
      { label: "Created At", value: statRange.createdAt.toLocaleString() },
    ]} />

    <Text fontWeight="medium" color="fg.warning" mb={4}>Are you sure you want to delete this stat range?</Text>

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
