import { Heading, DataList, HStack, ButtonGroup, Button, Icon, Text, Badge } from "@chakra-ui/react";
import { LuTrash2 } from "react-icons/lu";

import GenericClipboard from "@/components/Clipboard";
import { StatRangeDTO } from "@/lib/data/statrange-dto";

export default function DeleteStatRangeConfirm(props: {
  statRange: StatRangeDTO;
  handleCancel: () => Promise<void>;
  handleDelete: () => Promise<void>;
}) {
  const { statRange, handleCancel, handleDelete } = props;

  return <>
    <Heading as="h2" size="md" mb={4}>Confirm Deletion</Heading>

    <DataList.Root mb={4}>

      <DataList.Item>
        <DataList.ItemLabel>ID</DataList.ItemLabel>
        <GenericClipboard value={statRange.id} />
      </DataList.Item>

      <DataList.Item>
        <DataList.ItemLabel>Name</DataList.ItemLabel>
        <DataList.ItemValue>{statRange.name}</DataList.ItemValue>
      </DataList.Item>

      <DataList.Item>
        <DataList.ItemLabel>Start Date</DataList.ItemLabel>
        <DataList.ItemValue>{statRange.startDate.toLocaleDateString()}</DataList.ItemValue>
      </DataList.Item>

      <DataList.Item>
        <DataList.ItemLabel>End Date</DataList.ItemLabel>
        <DataList.ItemValue>{statRange.endDate.toLocaleDateString()}</DataList.ItemValue>
      </DataList.Item>

      <DataList.Item>
        <DataList.ItemLabel>Status</DataList.ItemLabel>
        <DataList.ItemValue>
          <Badge colorPalette={statRange.status === "ACTIVE" ? "green" : "gray"}>
            {statRange.status}
          </Badge>
        </DataList.ItemValue>
      </DataList.Item>

      <DataList.Item>
        <DataList.ItemLabel>Created At</DataList.ItemLabel>
        <DataList.ItemValue>{statRange.createdAt.toLocaleString()}</DataList.ItemValue>
      </DataList.Item>

    </DataList.Root>

    <Text fontWeight="medium" color="fg.warning" mb={4}>Are you sure you want to delete this stat range?</Text>

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
