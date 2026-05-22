import { redirect } from "next/navigation";
import { Container } from "@chakra-ui/react";

import { deleteStatRange, getStatRangeDTO } from "@/lib/data/statrange-dto";
import DeleteStatRangeConfirm from "./DeleteStatRangeConfirm";

export default async function DeleteStatRangePage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { params } = props;
  const { id } = await params;
  const searchParams = await props.searchParams;

  const returnTo = typeof searchParams.returnTo === "string" ? searchParams.returnTo : "/admin/stat-ranges";

  const statRangeDTO = await getStatRangeDTO(id);
  if (!statRangeDTO) {
    return <Container maxW="md">Stat range not found</Container>;
  }

  const handleCancel = async () => {
    "use server";
    redirect(returnTo);
  };

  const handleDelete = async () => {
    "use server";
    await deleteStatRange(id);
    redirect(returnTo);
  };

  return <>
    <DeleteStatRangeConfirm
      statRange={statRangeDTO}
      handleCancel={handleCancel}
      handleDelete={handleDelete}
    />
  </>;
}
