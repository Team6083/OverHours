"use client";
import { useActionState, useEffect, useState } from "react";
import { Fieldset, Stack, Field, DataList, Button, Combobox, Portal, useFilter, useListCollection, SegmentGroup, SimpleGrid, HStack, Input, GridItem, Textarea } from "@chakra-ui/react";
import { LuCircleCheckBig, LuLock, LuTimer } from "react-icons/lu";

import { TimeLogDTO } from "@/lib/data/timelog-dto";
import { formSubmit } from "./actions";

const statusOptions = [
  {
    value: "CURRENTLY_IN",
    label: <HStack color="fg.info"><LuTimer />Currently In</HStack>
  },
  {
    value: "DONE",
    label: <HStack color="fg.success"><LuCircleCheckBig />Done</HStack>
  },
  {
    value: "LOCKED",
    label: <HStack color="fg.error"><LuLock />Locked</HStack>
  },
];

export default function LogForm(props: {
  isNew?: boolean;
  timeLog?: TimeLogDTO;
  userOptions: { label: string; value: string }[];
}) {
  const { isNew, timeLog, userOptions } = props;

  const { contains } = useFilter({ sensitivity: "base" });

  const { collection, filter } = useListCollection({
    initialItems: userOptions,
    filter: contains,
  });

  const [state, action, pending] = useActionState(formSubmit, {
    prevValues: timeLog ? {
      id: timeLog.id,
      user: timeLog.userId,
      status: timeLog.status,
      clockInTime: timeLog.inTime.toISOString().slice(0, 19),
      clockOutTime: timeLog.outTime ? timeLog.outTime.toISOString().slice(0, 19) : undefined,
      notes: timeLog.notes || undefined,
    } : undefined
  });

  const [selectedStatus, setSelectedStatus] = useState<string | null>(state.prevValues?.status || "CURRENTLY_IN");
  useEffect(() => {
    if (state.prevValues?.status) {
      setSelectedStatus(state.prevValues.status);
    }
  }, [state.prevValues?.status]);

  const userFieldError = state.issues?.filter(issue => issue.path[0] === "user").map(issue => issue.message).join(", ");
  const statusFieldError = state.issues?.filter(issue => issue.path[0] === "status").map(issue => issue.message).join(", ");
  const clockInFieldError = state.issues?.filter(issue => issue.path[0] === "clockInTime").map(issue => issue.message).join(", ");
  const clockOutFieldError = state.issues?.filter(issue => issue.path[0] === "clockOutTime").map(issue => issue.message).join(", ");
  const notesFieldError = state.issues?.filter(issue => issue.path[0] === "notes").map(issue => issue.message).join(", ");
  const hasFieldErrors = !!(userFieldError || statusFieldError || clockInFieldError || clockOutFieldError || notesFieldError);

  return <form action={action}>
    <Fieldset.Root size="lg" invalid={hasFieldErrors} disabled={pending}>
      <Stack>
        <Fieldset.Legend>{isNew ? "Create" : "Edit"} Log</Fieldset.Legend>
        <Fieldset.HelperText>
          {isNew
            ? "Fill out the form below to create a new log."
            : "Update the information below to edit the log."}
        </Fieldset.HelperText>
      </Stack>

      {timeLog && <input type="hidden" name="id" value={timeLog.id} />}

      <Fieldset.Content>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {/* User Select */}
          <Field.Root required invalid={!!userFieldError}>
            <Field.Label>
              User
              <Field.RequiredIndicator />
            </Field.Label>

            <Combobox.Root
              collection={collection}
              onInputValueChange={(e) => filter(e.inputValue)}
              defaultValue={state.prevValues ? [state.prevValues.user] : undefined}
              required
            >
              <Combobox.Context>
                {(ctx) => <input type="hidden" name="user" value={ctx.value} />}
              </Combobox.Context>
              <Combobox.Control>
                <Combobox.Input placeholder="Type to search" />
                <Combobox.IndicatorGroup>
                  <Combobox.ClearTrigger />
                  <Combobox.Trigger />
                </Combobox.IndicatorGroup>
              </Combobox.Control>
              <Portal>
                <Combobox.Positioner>
                  <Combobox.Content>
                    <Combobox.Empty>No items found</Combobox.Empty>
                    {collection.items.map((item) => (
                      <Combobox.Item item={item} key={item.value}>
                        {item.label}
                        <Combobox.ItemIndicator />
                      </Combobox.Item>
                    ))}
                  </Combobox.Content>
                </Combobox.Positioner>
              </Portal>
            </Combobox.Root>

            <Field.ErrorText>{userFieldError}</Field.ErrorText>
          </Field.Root>

          {/* Status */}
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

            <Field.ErrorText>{statusFieldError}</Field.ErrorText>
          </Field.Root>

          {/* Clock-in Time */}
          <Field.Root required invalid={!!clockInFieldError}>
            <Field.Label>
              Clock-in Time
              <Field.RequiredIndicator />
            </Field.Label>
            <Input type="datetime-local" step="1" name="clockInTime" defaultValue={state.prevValues?.clockInTime} />
            <Field.ErrorText>{clockInFieldError}</Field.ErrorText>
          </Field.Root>

          {/* Clock-out Time */}
          <Field.Root disabled={selectedStatus === "CURRENTLY_IN"} invalid={!!clockOutFieldError}>
            <Field.Label>
              Clock-out Time
              <Field.RequiredIndicator />
            </Field.Label>
            <Input type="datetime-local" step="1" name="clockOutTime" defaultValue={state.prevValues?.clockOutTime} />
            <Field.ErrorText>{clockOutFieldError}</Field.ErrorText>
          </Field.Root>

          {/* Notes */}
          <GridItem colSpan={{ base: 1, md: 2 }}>
            <Field.Root invalid={!!notesFieldError}>
              <Field.Label>
                Notes
                <Field.RequiredIndicator />
              </Field.Label>
              <Textarea name="notes" defaultValue={state.prevValues?.notes} />
              <Field.ErrorText>{notesFieldError}</Field.ErrorText>
            </Field.Root>
          </GridItem>
        </SimpleGrid>
      </Fieldset.Content>

      {timeLog && (
        <DataList.Root orientation="horizontal">
          <DataList.Item>
            <DataList.ItemLabel>Created At</DataList.ItemLabel>
            <DataList.ItemValue>{timeLog.createdAt.toLocaleString()}</DataList.ItemValue>
          </DataList.Item>
          <DataList.Item>
            <DataList.ItemLabel>Last Updated At</DataList.ItemLabel>
            <DataList.ItemValue>{timeLog.updatedAt.toLocaleString()}</DataList.ItemValue>
          </DataList.Item>
        </DataList.Root>
      )}

      <Button type="submit" loading={pending}>
        {isNew ? "Create Log" : "Save Changes"}
      </Button>

      <Fieldset.ErrorText>
        Some fields are invalid. Please check them.
      </Fieldset.ErrorText>
    </Fieldset.Root>
  </form>;
}
