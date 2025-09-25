import { redirect } from "next/navigation";
import { Container } from "@chakra-ui/react";

import { deleteTimeLog, getTimelogDTO } from "@/lib/data/timelog-dto";
import { getUserDTO } from "@/lib/data/user-dto";
import DeleteTimeLogConfirm from "./DeleteTimeLogConfirm";

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
    <DeleteTimeLogConfirm
      timeLog={timeLogDTO}
      userName={user?.name}
      handleCancel={handleCancel}
      handleDelete={handleDelete}
    />
  </>;
}
