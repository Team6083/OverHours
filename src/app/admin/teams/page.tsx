import { EmptyState, VStack } from "@chakra-ui/react";
import { LuMousePointerClick } from "react-icons/lu";

export default function TeamsPage() {
  return (
    <EmptyState.Root>
      <EmptyState.Content>
        <EmptyState.Indicator>
          <LuMousePointerClick />
        </EmptyState.Indicator>
        <VStack textAlign="center">
          <EmptyState.Title>Select a team</EmptyState.Title>
          <EmptyState.Description>Pick a team from the tree to edit it and manage its members.</EmptyState.Description>
        </VStack>
      </EmptyState.Content>
    </EmptyState.Root>
  );
}
