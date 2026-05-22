import { Pagination } from "@chakra-ui/react";

import { getAllStatRangeDTOs } from "@/lib/data/statrange-dto";
import StatRangesTable from "./StatRangesTable";

export default async function StatRangesPage() {
  const statRanges = await getAllStatRangeDTOs();

  return <>
    <Pagination.Root count={statRanges.length} defaultPageSize={10} defaultPage={1}>
      <StatRangesTable statRanges={statRanges} />
    </Pagination.Root>
  </>;
}
