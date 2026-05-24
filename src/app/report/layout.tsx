import Link from "next/link";
import { Button, ButtonGroup, Container, EmptyState, GridItem, SimpleGrid, VStack } from "@chakra-ui/react";
import { LuShieldAlert } from "react-icons/lu";

import { auth, Role, signIn } from "@/auth";
import ReportMenu from "./ReportMenu";

export default async function ReportLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session || session.user.role !== Role.ADMIN) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <LuShieldAlert />
          </EmptyState.Indicator>
          <VStack textAlign="center">
            <EmptyState.Title>{session ? "Forbidden" : "Unauthorized"}</EmptyState.Title>
            <EmptyState.Description>
              {session ? "You do not have access to this page." : "You must be signed in to view this page."}
            </EmptyState.Description>
          </VStack>
          <ButtonGroup>
            <Button variant="outline" asChild><Link href="/">Back to Home</Link></Button>
            {!session && <Button
              onClick={async () => {
                "use server";
                return signIn("keycloak");
              }}>Sign-in</Button>}
          </ButtonGroup>
        </EmptyState.Content>
      </EmptyState.Root>
    );
  }

  return (
    <SimpleGrid columns={12}>
      <GridItem colSpan={{ base: 4, lg: 3 }} hideBelow="md">
        <ReportMenu />
      </GridItem>
      <GridItem colSpan={{ base: 12, md: 8, lg: 9 }}>
        <Container>{children}</Container>
      </GridItem>
    </SimpleGrid>
  );
}
