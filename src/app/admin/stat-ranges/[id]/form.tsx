"use client";
import { useActionState, useState } from "react";

import { Button, DataList, Field, Fieldset, GridItem, HStack, Input, SegmentGroup, SimpleGrid, Stack } from "@chakra-ui/react";
import { useAppOutdated } from "@team6083/ui";
import { LuArchive, LuCircleCheck } from "react-icons/lu";

import { StatRangeDTO } from "@/lib/data/statrange-dto";
import { formSubmit, StatRangeFormState } from "./actions";

const statusOptions = [
  {
    value: "ACTIVE",
    label: <HStack color="fg.success"><LuCircleCheck />Active</HStack>
  },
  {
    value: "ARCHIVED",
    label: <HStack color="fg.muted"><LuArchive />Archived</HStack>
  },
];

export default function StatRangeForm(props: {
  isNew?: boolean;
  statRange?: StatRangeDTO;
}) {
  const { isNew, statRange } = props;

  const tzOffset = new Date().getTimezoneOffset();

  const [state, action, pending] = useActionState(formSubmit, {
    prevValues: statRange ? {
      id: statRange.id,
      name: statRange.name,
      startDate: new Date(statRange.startDate.getTime() - tzOffset * 60 * 1000).toISOString().slice(0, 10),
      endDate: new Date(statRange.endDate.getTime() - tzOffset * 60 * 1000).toISOString().slice(0, 10),
      status: statRange.status,
    } : undefined
  } as StatRangeFormState);
  const outdated = useAppOutdated();

  const [selectedStatus, setSelectedStatus] = useState<string | null>(state.prevValues?.status || "ACTIVE");
  // Re-sync the segment control when a submit returns new values.
  const [syncedStatus, setSyncedStatus] = useState(state.prevValues?.status);
  if (state.prevValues?.status !== syncedStatus) {
    setSyncedStatus(state.prevValues?.status);
    if (state.prevValues?.status) setSelectedStatus(state.prevValues.status);
  }

  const fieldError = (field: string) =>
    state.issues?.filter((issue) => issue.path[0] === field).map((issue) => issue.message).join(", ");
  const nameFieldError = fieldError("name");
  const startDateFieldError = fieldError("startDate");
  const endDateFieldError = fieldError("endDate");
  const statusFieldError = fieldError("status");
  const hasFieldErrors = !!(nameFieldError || startDateFieldError || endDateFieldError || statusFieldError);

  return <form action={action}>
    <Fieldset.Root size="lg" invalid={hasFieldErrors} disabled={pending}>
      <Stack>
        <Fieldset.Legend>{isNew ? "Create Stat Range" : "Edit Stat Range"}</Fieldset.Legend>
        <Fieldset.HelperText>
          {isNew
            ? "Create a new named time period for reporting and statistics."
            : "Edit this stat range's details."}
        </Fieldset.HelperText>
      </Stack>

      {statRange && <input type="hidden" name="id" value={statRange.id} />}

      <input type="hidden" name="tzOffset" value={tzOffset} />

      <Fieldset.Content>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {/* Name */}
          <GridItem colSpan={{ base: 1, md: 2 }}>
            <Field.Root required invalid={!!nameFieldError}>
              <Field.Label>
                Name
                <Field.RequiredIndicator />
              </Field.Label>
              <Input type="text" name="name" placeholder="Q1 2026" defaultValue={state.prevValues?.name} />
              <Field.HelperText>A descriptive name for this time period</Field.HelperText>
              <Field.ErrorText>{nameFieldError}</Field.ErrorText>
            </Field.Root>
          </GridItem>

          {/* Start Date */}
          <Field.Root required invalid={!!startDateFieldError}>
            <Field.Label>
              Start Date
              <Field.RequiredIndicator />
            </Field.Label>
            <Input type="date" name="startDate" defaultValue={state.prevValues?.startDate} />
            <Field.ErrorText>{startDateFieldError}</Field.ErrorText>
          </Field.Root>

          {/* End Date */}
          <Field.Root required invalid={!!endDateFieldError}>
            <Field.Label>
              End Date
              <Field.RequiredIndicator />
            </Field.Label>
            <Input type="date" name="endDate" defaultValue={state.prevValues?.endDate} />
            <Field.ErrorText>{endDateFieldError}</Field.ErrorText>
          </Field.Root>

          {/* Status */}
          <GridItem colSpan={{ base: 1, md: 2 }}>
            <Field.Root required invalid={!!statusFieldError}>
              <Field.Label>
                Status
                <Field.RequiredIndicator />
              </Field.Label>

              <SegmentGroup.Root
                name="status"
                size={{ base: "xs", sm: "sm", md: "md" }}
                value={selectedStatus}
                onValueChange={({ value }) => setSelectedStatus(value)}
              >
                <SegmentGroup.Indicator />
                <SegmentGroup.Items h={10} items={statusOptions} />
              </SegmentGroup.Root>

              <Field.HelperText>Active ranges are available for selection in reports</Field.HelperText>
              <Field.ErrorText>{statusFieldError}</Field.ErrorText>
            </Field.Root>
          </GridItem>
        </SimpleGrid>
      </Fieldset.Content>

      {statRange && (
        <DataList.Root orientation="horizontal">
          <DataList.Item>
            <DataList.ItemLabel>Created At</DataList.ItemLabel>
            <DataList.ItemValue>{statRange.createdAt.toLocaleString()}</DataList.ItemValue>
          </DataList.Item>
          <DataList.Item>
            <DataList.ItemLabel>Last Updated At</DataList.ItemLabel>
            <DataList.ItemValue>{statRange.updatedAt.toLocaleString()}</DataList.ItemValue>
          </DataList.Item>
        </DataList.Root>
      )}

      <Button type="submit" loading={pending} disabled={outdated}>
        {isNew ? "Create" : "Save Changes"}
      </Button>

      <Fieldset.ErrorText>
        Some fields are invalid. Please check the errors above.
      </Fieldset.ErrorText>
    </Fieldset.Root>
  </form>;
}
