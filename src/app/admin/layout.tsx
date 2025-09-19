import Link from "next/link";
import { Button, ButtonGroup, EmptyState, VStack } from "@chakra-ui/react";
import { LuShieldAlert } from "react-icons/lu";

import { auth, Role, signIn } from "@/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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

  return children;
}