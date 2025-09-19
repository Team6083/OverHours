import { redirect } from "next/navigation";
import { Container } from "@chakra-ui/react";

import { deleteTimeLog, getTimelogDTO } from "@/lib/data/timelog-dto";
import { getUserDTO } from "@/lib/data/user-dto";
import DeleteTimeLogConfirm from "./DeleteTimeLogConfirm";

export default async function DeleteTimeLogPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { params } = props;
  const { id } = await params;

  const timeLogDTO = await getTimelogDTO(id);
  if (!timeLogDTO) {
    return <Container maxW="md">Time log not found</Container>;
  }

  const user = await getUserDTO(timeLogDTO.userId);

  const handleCancel = async () => {
    "use server";
    redirect("/logs");
  };

  const handleDelete = async () => {
    "use server";
    await deleteTimeLog(id);
    redirect("/logs");
  };

  return <>
    <DeleteTimeLogConfirm
      timeLog={timeLogDTO}
      userName={user?.name}
      handleCancel={handleCancel}
      handleDelete={handleDelete}
    />
  </>;
}
