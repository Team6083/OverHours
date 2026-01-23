import { Pagination } from "@chakra-ui/react";

import { getAllTeamDTOs } from "@/lib/data/team-dto";
import TeamsTable from "./TeamsTable";

export default async function TeamsPage() {
  const teams = await getAllTeamDTOs();

  return <>
    <Pagination.Root count={teams.length} defaultPageSize={10} defaultPage={1}>
      <TeamsTable teams={teams} />
    </Pagination.Root>
  </>;
}
