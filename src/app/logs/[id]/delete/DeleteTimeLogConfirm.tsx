import { Badge, Button, ButtonGroup, HStack, Icon, Text } from "@chakra-ui/react";
import { FactList, TitleBar } from "@team6083/ui";
import { LuTrash2 } from "react-icons/lu";

import GenericClipboard from "@/components/common/Clipboard";
import WriteButton from "@/components/common/WriteButton";
import TimeLogStatusBadge from "@/components/timelog/TimeLogStatusBadge";
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
    <TitleBar title="Confirm Deletion" size="md" mb={4} />

    <FactList mb={4} items={[
      { label: "TimeLog ID", value: <GenericClipboard value={timeLog.id} /> },
      {
        label: "User",
        value: <HStack flexWrap="wrap" gap={2}>
          {userName && <Badge colorPalette="brand">{userName}</Badge>}
          <GenericClipboard color="fg.muted" value={timeLog.userId} />
        </HStack>,
      },
      { label: "Status", value: <TimeLogStatusBadge status={timeLog.status} /> },
      { label: "Clock-in Time", value: timeLog.inTime.toLocaleString() },
      ...(timeLog.outTime ? [
        { label: "Clock-out Time", value: timeLog.outTime.toLocaleString() },
        {
          label: "Duration",
          value: formatDuration(Math.round((timeLog.outTime.getTime() - timeLog.inTime.getTime()) / 1000)),
        },
      ] : []),
      ...(timeLog.notes ? [{ label: "Notes", value: timeLog.notes }] : []),
    ]} />

    <Text fontWeight="medium" color="fg.warning" mb={4}>Are you sure you want to delete this time log?</Text>

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
