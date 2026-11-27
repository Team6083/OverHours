"use client";
import { ComponentProps } from "react";

import { Pagination } from "@chakra-ui/react";

import { useNewTables } from "@/components/common/TablePreference";
import UsersDataTable from "./UsersDataTable";
import UsersLegacyTable from "./UsersLegacyTable";

/** The legacy table by default; the DataTable one for users who turned on the Beta tables. */
export default function UsersTable(props: ComponentProps<typeof UsersDataTable>) {
  return useNewTables()
    ? <UsersDataTable {...props} />
    : <Pagination.Root count={props.users.length} defaultPageSize={10} defaultPage={1}>
      <UsersLegacyTable {...props} />
    </Pagination.Root>;
}
