import { ButtonGroup, Card, EmptyState, GridItem, SimpleGrid, VStack } from "@chakra-ui/react";
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
              <EmptyState.Root>
                <EmptyState.Content>
                  <EmptyState.Indicator>
                    <LuUsers />
                  </EmptyState.Indicator>
                  <VStack textAlign="center">
                    <EmptyState.Title>No teams yet</EmptyState.Title>
                    <EmptyState.Description>Create a team to get started.</EmptyState.Description>
                  </VStack>
                  <ButtonGroup>
                    <CreateTeamButton />
                  </ButtonGroup>
                </EmptyState.Content>
              </EmptyState.Root>
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
