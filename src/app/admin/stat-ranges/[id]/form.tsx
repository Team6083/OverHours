"use client";
import { useActionState, useEffect, useState } from "react";
import { Fieldset, Stack, Field, DataList, Button, SegmentGroup, SimpleGrid, HStack, Input, GridItem } from "@chakra-ui/react";
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

  const [selectedStatus, setSelectedStatus] = useState<string | null>(state.prevValues?.status || "ACTIVE");
  useEffect(() => {
    if (state.prevValues?.status) {
      setSelectedStatus(state.prevValues.status);
    }
  }, [state.prevValues?.status]);

  const nameFieldError = state.issues?.filter((issue: any) => issue.path[0] === "name").map((issue: any) => issue.message).join(", ");
  const startDateFieldError = state.issues?.filter((issue: any) => issue.path[0] === "startDate").map((issue: any) => issue.message).join(", ");
  const endDateFieldError = state.issues?.filter((issue: any) => issue.path[0] === "endDate").map((issue: any) => issue.message).join(", ");
  const statusFieldError = state.issues?.filter((issue: any) => issue.path[0] === "status").map((issue: any) => issue.message).join(", ");
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

      <Button type="submit" loading={pending}>
        {isNew ? "Create" : "Save Changes"}
      </Button>

      <Fieldset.ErrorText>
        Some fields are invalid. Please check the errors above.
      </Fieldset.ErrorText>
    </Fieldset.Root>
  </form>;
}
