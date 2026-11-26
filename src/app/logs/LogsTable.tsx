"use client";
import { ComponentProps } from "react";

import { useNewTables } from "@/components/common/TablePreference";
import LogsDataTable from "./LogsDataTable";
import LogsLegacyTable from "./LogsLegacyTable";

/** The legacy table by default; the DataTable one for users who turned on the Beta tables. */
export default function LogsTable(props: ComponentProps<typeof LogsDataTable>) {
  return useNewTables()
    ? <LogsDataTable {...props} />
    : <LogsLegacyTable {...props} />;
}
