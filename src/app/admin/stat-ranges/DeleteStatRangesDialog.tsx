"use client";
import { Badge, HStack, Text } from "@chakra-ui/react";
import { FactList } from "@team6083/ui";

import GenericClipboard from "@/components/common/Clipboard";
import DeleteDialog, { type DeleteDialogControls } from "@/components/common/DeleteDialog";
import { StatRangeDTO } from "@/lib/data/statrange-dto";
import { handleDeleteStatRanges } from "./actions";

/** Asks before deleting stat ranges: the facts of one range, or a badge per range. */
export default function DeleteStatRangesDialog(props: DeleteDialogControls & {
  statRanges: StatRangeDTO[];
}) {
  const { statRanges, ...controls } = props;

  return <DeleteDialog
    {...controls}
    message={statRanges.length === 1
      ? "Are you sure you want to delete this stat range?"
      : "Are you sure you want to delete the following stat ranges?"}
    onDelete={() => handleDeleteStatRanges(statRanges.map(statRange => statRange.id))}
  >
    {statRanges.length === 1 ? (
      <FactList items={[
        { label: "ID", value: <GenericClipboard value={statRanges[0].id} /> },
        { label: "Name", value: statRanges[0].name },
        { label: "Start Date", value: statRanges[0].startDate.toLocaleDateString() },
        { label: "End Date", value: statRanges[0].endDate.toLocaleDateString() },
        {
          label: "Status",
          value: <Badge colorPalette={statRanges[0].status === "ACTIVE" ? "green" : "gray"}>{statRanges[0].status}</Badge>,
        },
        { label: "Created At", value: statRanges[0].createdAt.toLocaleString() },
      ]} />
    ) : <>
      <HStack flexWrap="wrap" gap={2}>
        {statRanges.map(statRange => <Badge key={statRange.id} colorPalette="brand">{statRange.name}</Badge>)}
      </HStack>
      <Text color="fg.muted">Total {statRanges.length} stat ranges selected</Text>
    </>}
  </DeleteDialog>;
}
