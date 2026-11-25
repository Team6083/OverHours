import { Card, GridItem, SimpleGrid } from "@chakra-ui/react";
import { EmptyState } from "@team6083/ui";
import { LuUsers } from "react-icons/lu";

import { getAllTeamDTOs } from "@/lib/data/team-dto";
import TeamsTree, { CreateTeamButton } from "./TeamsTree";

export default async function TeamsLayout({ children }: { children: React.ReactNode }) {
  const teams = await getAllTeamDTOs();

  return (
    <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
      <GridItem>
        {teams.length === 0 ? (
          <Card.Root>
            <Card.Body>
              <EmptyState
                icon={<LuUsers />}
                title="No teams yet"
                description="Create a team to get started."
                actions={<CreateTeamButton />}
              />
            </Card.Body>
          </Card.Root>
        ) : (
          <TeamsTree teams={teams} />
        )}
      </GridItem>

      <GridItem colSpan={{ base: 1, md: 2 }}>
        {children}
      </GridItem>
    </SimpleGrid>
  );
}
