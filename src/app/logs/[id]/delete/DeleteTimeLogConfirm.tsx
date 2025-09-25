import { Heading, DataList, HStack, ButtonGroup, Button, Icon, Text, Badge } from "@chakra-ui/react";
import { LuTrash2 } from "react-icons/lu";

import GenericClipboard from "@/components/Clipboard";
import TimeLogStatusBadge from "@/components/TimeLogStatusBadge";
import { TimeLogDTO } from "@/lib/data/timelog-dto";
import { formatDuration } from "@/lib/util";

export default function DeleteTimeLogConfirm(props: {
  timeLog: TimeLogDTO;
  userName?: string;
  handleCancel: () => Promise<void>;
  handleDelete: () => Promise<void>;
}) {
  const { timeLog, userName, handleCancel, handleDelete } = props;

  return <>
    <Heading as="h2" size="md" mb={4}>Confirm Deletion</Heading>

    <DataList.Root orientation="horizontal" mb={4}>

      <DataList.Item>
        <DataList.ItemLabel>TimeLog ID</DataList.ItemLabel>
        <GenericClipboard value={timeLog.id} />
      </DataList.Item>

      <DataList.Item>
        <DataList.ItemLabel>User</DataList.ItemLabel>
        <DataList.ItemValue>
          {userName && <Badge mr={2} colorPalette="blue">{userName}</Badge>}
          <GenericClipboard color="fg.muted" value={timeLog.userId} />
        </DataList.ItemValue>
      </DataList.Item>

      <DataList.Item>
        <DataList.ItemLabel>Status</DataList.ItemLabel>
        <DataList.ItemValue>
          <TimeLogStatusBadge status={timeLog.status} />
        </DataList.ItemValue>
      </DataList.Item>

      <DataList.Item>
        <DataList.ItemLabel>Clock-in Time</DataList.ItemLabel>
        <DataList.ItemValue>{timeLog.inTime.toLocaleString()}</DataList.ItemValue>
      </DataList.Item>

      {timeLog.outTime && (<>
        <DataList.Item>
          <DataList.ItemLabel>Clock-out Time</DataList.ItemLabel>
          <DataList.ItemValue>{timeLog.outTime.toLocaleString()}</DataList.ItemValue>
        </DataList.Item>
        <DataList.Item>
          <DataList.ItemLabel>Duration</DataList.ItemLabel>
          <DataList.ItemValue>{formatDuration(Math.round((timeLog.outTime.getTime() - timeLog.inTime.getTime()) / 1000))}</DataList.ItemValue>
        </DataList.Item>
      </>)}

      {timeLog.notes &&
        <DataList.Item>
          <DataList.ItemLabel>Notes</DataList.ItemLabel>
          <DataList.ItemValue>{timeLog.notes}</DataList.ItemValue>
        </DataList.Item>
      }

    </DataList.Root>

    <Text fontWeight="medium" color="fg.warning" mb={4}>Are you sure you want to delete this time log?</Text>

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
