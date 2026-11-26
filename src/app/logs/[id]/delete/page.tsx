import { redirect } from "next/navigation";

import { Badge, Container, HStack } from "@chakra-ui/react";

import GenericClipboard from "@/components/common/Clipboard";
import DeleteConfirm from "@/components/common/DeleteConfirm";
import TimeLogStatusBadge from "@/components/timelog/TimeLogStatusBadge";
import { deleteTimeLog, getTimelogDTO } from "@/lib/data/timelog-dto";
import { getUserDTO } from "@/lib/data/user-dto";
import { formatDuration } from "@/lib/util";

export default async function DeleteTimeLogPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { params } = props;
  const { id } = await params;
  const searchParams = await props.searchParams;

  const returnTo = typeof searchParams.returnTo === "string" ? searchParams.returnTo : "/logs";

  const timeLogDTO = await getTimelogDTO(id);
  if (!timeLogDTO) {
    return <Container maxW="md">Time log not found</Container>;
  }

  const user = await getUserDTO(timeLogDTO.userId);

  const handleCancel = async () => {
    "use server";
    redirect(returnTo);
  };

  const handleDelete = async () => {
    "use server";
    await deleteTimeLog(id);
    redirect(returnTo);
  };

  return <>
    <DeleteConfirm
      subject="time log"
      items={[
        { label: "TimeLog ID", value: <GenericClipboard value={timeLogDTO.id} /> },
        {
          label: "User",
          value: <HStack flexWrap="wrap" gap={2}>
            {user?.name && <Badge colorPalette="brand">{user.name}</Badge>}
            <GenericClipboard color="fg.muted" value={timeLogDTO.userId} />
          </HStack>,
        },
        { label: "Status", value: <TimeLogStatusBadge status={timeLogDTO.status} /> },
        { label: "Clock-in Time", value: timeLogDTO.inTime.toLocaleString() },
        ...(timeLogDTO.outTime ? [
          { label: "Clock-out Time", value: timeLogDTO.outTime.toLocaleString() },
          {
            label: "Duration",
            value: formatDuration(Math.round((timeLogDTO.outTime.getTime() - timeLogDTO.inTime.getTime()) / 1000)),
          },
        ] : []),
        ...(timeLogDTO.notes ? [{ label: "Notes", value: timeLogDTO.notes }] : []),
      ]}
      handleCancel={handleCancel}
      handleDelete={handleDelete}
    />
  </>;
}
