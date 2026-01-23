import { ButtonGroup, Card, EmptyState, GridItem, SimpleGrid, VStack } from "@chakra-ui/react";

import TeamsTree from "./TeamsTree";
import { LuUsers } from "react-icons/lu";
import { getAllTeamDTOs } from "@/lib/data/team-dto";
import CreateTeamButton from "./CreateTeamButton";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const teams = await getAllTeamDTOs();

  return <>
    <SimpleGrid columns={{ base: 1, md: 3 }} gapX={2}>
      <GridItem>
        <Card.Root>
          <Card.Body>
            {teams.length === 0 ? (<EmptyState.Root>
              <EmptyState.Content>
                <EmptyState.Indicator>
                  <LuUsers />
                </EmptyState.Indicator>
                <VStack textAlign="center">
                  <EmptyState.Title>No teams available</EmptyState.Title>
                  <EmptyState.Description>
                    Please add some teams to get started.
                  </EmptyState.Description>
                </VStack>
                <ButtonGroup>
                  <CreateTeamButton />
                </ButtonGroup>
              </EmptyState.Content>
            </EmptyState.Root>) : (
              <TeamsTree teams={teams} />
            )}
          </Card.Body>
        </Card.Root>
      </GridItem>

      <GridItem colSpan={{ base: 1, md: 2 }}>
          {children}
      </GridItem>
    </SimpleGrid>
  </>;
}
