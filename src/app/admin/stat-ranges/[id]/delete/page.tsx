import { redirect } from "next/navigation";

import { Badge, Container } from "@chakra-ui/react";

import GenericClipboard from "@/components/common/Clipboard";
import DeleteConfirm from "@/components/common/DeleteConfirm";
import { deleteStatRange, getStatRangeDTO } from "@/lib/data/statrange-dto";

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
    <DeleteConfirm
      subject="stat range"
      items={[
        { label: "ID", value: <GenericClipboard value={statRangeDTO.id} /> },
        { label: "Name", value: statRangeDTO.name },
        { label: "Start Date", value: statRangeDTO.startDate.toLocaleDateString() },
        { label: "End Date", value: statRangeDTO.endDate.toLocaleDateString() },
        {
          label: "Status",
          value: <Badge colorPalette={statRangeDTO.status === "ACTIVE" ? "green" : "gray"}>{statRangeDTO.status}</Badge>,
        },
        { label: "Created At", value: statRangeDTO.createdAt.toLocaleString() },
      ]}
      handleCancel={handleCancel}
      handleDelete={handleDelete}
    />
  </>;
}
