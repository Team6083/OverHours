"use client";

import { useActionState } from "react";
import { Fieldset, Stack, Field, Input, Button, DataList } from "@chakra-ui/react";

import { TeamDTO } from "@/lib/data/team-dto";
import { formSubmit } from "./actions";

export default function TeamForm(props: {
  isNew?: boolean;
  team?: TeamDTO;
}) {
  const { isNew, team } = props;

  const [state, action, pending] = useActionState(formSubmit, { prevValues: team });

  const nameFieldError = state.issues?.filter(issue => issue.path[0] === "name");

  return <form action={action}>
    <Fieldset.Root size="lg" invalid={!!state.issues?.length}>
      <Stack>
        <Fieldset.Legend>{isNew ? "Create" : "Edit"} Team</Fieldset.Legend>
        <Fieldset.HelperText>
          {isNew
            ? "Fill out the form below to create a new team."
            : "Update the information below to edit the team."}
        </Fieldset.HelperText>
      </Stack>

      {team && <input type="hidden" name="id" value={team.id} />}
      <Fieldset.Content>
        <Field.Root required invalid={nameFieldError && nameFieldError.length > 0}>
          <Field.Label>
            Name
            <Field.RequiredIndicator />
          </Field.Label>
          <Input name="name" defaultValue={state.prevValues?.name} />
          <Field.ErrorText>{nameFieldError?.map((v) => v.message).join(", ")}</Field.ErrorText>
        </Field.Root>
      </Fieldset.Content>

      {team && (
        <DataList.Root orientation="horizontal">
          <DataList.Item>
            <DataList.ItemLabel>Created At</DataList.ItemLabel>
            <DataList.ItemValue>{team.createdAt.toLocaleString()}</DataList.ItemValue>
          </DataList.Item>
        </DataList.Root>
      )}

      {team && (
        <DataList.Root orientation="horizontal">
          <DataList.Item>
            <DataList.ItemLabel>Created At</DataList.ItemLabel>
            <DataList.ItemValue>{team.createdAt.toLocaleString()}</DataList.ItemValue>
          </DataList.Item>
          <DataList.Item>
            <DataList.ItemLabel>Last Updated At</DataList.ItemLabel>
            <DataList.ItemValue>{team.updatedAt.toLocaleString()}</DataList.ItemValue>
          </DataList.Item>
        </DataList.Root>
      )}

      <Button type="submit" loading={pending}>
        {isNew ? "Create Team" : "Save Changes"}
      </Button>

      <Fieldset.ErrorText>
        Some fields are invalid. Please check them.
      </Fieldset.ErrorText>
    </Fieldset.Root>
  </form>;
}
