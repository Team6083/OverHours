"use client";
import { ComponentProps } from "react";

import { Pagination } from "@chakra-ui/react";

import { useNewTables } from "@/components/common/TablePreference";
import StatRangesDataTable from "./StatRangesDataTable";
import StatRangesLegacyTable from "./StatRangesLegacyTable";

/** The legacy table by default; the DataTable one for users who turned on the Beta tables. */
export default function StatRangesTable(props: ComponentProps<typeof StatRangesDataTable>) {
  return useNewTables()
    ? <StatRangesDataTable {...props} />
    : <Pagination.Root count={props.statRanges.length} defaultPageSize={10} defaultPage={1}>
      <StatRangesLegacyTable {...props} />
    </Pagination.Root>;
}
