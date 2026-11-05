"use client";

import { useActionState } from "react";
import { Checkbox, Fieldset, Stack, Field, Input, Button, DataList, NativeSelect } from "@chakra-ui/react";
import { useTranslations } from "next-intl";

import { UserDTO } from "@/lib/data/user-dto";
import { formSubmit } from "./actions";

export default function UserForm(props: {
  isNew?: boolean;
  user?: UserDTO;
}) {
  const { isNew, user } = props;
  const t = useTranslations("Attendance");

  const [state, action, pending] = useActionState(formSubmit, { prevValues: user });

  const nameFieldError = state.issues?.filter(issue => issue.path[0] === "name");
  const emailFieldError = state.issues?.filter(issue => issue.path[0] === "email");

  return <form action={action}>
    <Fieldset.Root size="lg" invalid={!!state.issues?.length}>
      <Stack>
        <Fieldset.Legend>{isNew ? "Create" : "Edit"} User</Fieldset.Legend>
        <Fieldset.HelperText>
          {isNew
            ? "Fill out the form below to create a new user."
            : "Update the information below to edit the user."}
        </Fieldset.HelperText>
      </Stack>

      {user && <input type="hidden" name="id" value={user.id} />}

      <Fieldset.Content>
        <Field.Root required invalid={nameFieldError && nameFieldError.length > 0}>
          <Field.Label>
            Name
            <Field.RequiredIndicator />
          </Field.Label>
          <Input name="name" defaultValue={state.prevValues?.name} />
          <Field.ErrorText>{nameFieldError?.map((v) => v.message).join(", ")}</Field.ErrorText>
        </Field.Root>

        <Field.Root required invalid={emailFieldError && emailFieldError?.length > 0}>
          <Field.Label>
            Email Address
            <Field.RequiredIndicator />
          </Field.Label>
          <Input name="email" type="email" defaultValue={state.prevValues?.email} />
          <Field.ErrorText>{emailFieldError?.map((v) => v.message).join(", ")}</Field.ErrorText>
        </Field.Root>

        <Field.Root>
          <Field.Label>{t("userForm.dutyRole")}</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field name="dutyRole" defaultValue={state.prevValues?.dutyRole ?? ""}>
              <option value="">{t("userForm.noDutyRole")}</option>
              <option value="CE">{t("duty.CE")}</option>
              <option value="PM">{t("duty.PM")}</option>
              <option value="MACHINING">{t("duty.MACHINING")}</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>

        <Checkbox.Root name="attendanceExempt" defaultChecked={!!state.prevValues?.attendanceExempt}>
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label>{t("userForm.attendanceExempt")}</Checkbox.Label>
        </Checkbox.Root>
      </Fieldset.Content>

      {user && (
        <DataList.Root orientation="horizontal">
          <DataList.Item>
            <DataList.ItemLabel>Created At</DataList.ItemLabel>
            <DataList.ItemValue>{user.createdAt.toLocaleString()}</DataList.ItemValue>
          </DataList.Item>
          <DataList.Item>
            <DataList.ItemLabel>Last Updated At</DataList.ItemLabel>
            <DataList.ItemValue>{user.updatedAt.toLocaleString()}</DataList.ItemValue>
          </DataList.Item>
        </DataList.Root>
      )}

      <Button type="submit" loading={pending}>
        {isNew ? "Create User" : "Save Changes"}
      </Button>

      <Fieldset.ErrorText>
        Some fields are invalid. Please check them.
      </Fieldset.ErrorText>
    </Fieldset.Root>
  </form>;
}
