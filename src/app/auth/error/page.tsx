import Link from "next/link";
import { Button, ButtonGroup, EmptyState, VStack } from "@chakra-ui/react";
import { LuShieldAlert } from "react-icons/lu";

const ERRORS: Record<string, { title: string; description: string }> = {
  MissingRole: {
    title: "No access",
    description: "Your account is signed in but does not have a role that grants access to this application.",
  },
  EmailNotVerified: {
    title: "Email not verified",
    description: "Your email address must be verified before you can sign in.",
  },
  VerificationUnavailable: {
    title: "Sign-in unavailable",
    description: "Your sign-in could not be verified right now. Please try again in a moment.",
  },
};

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { title, description } = (error && Object.hasOwn(ERRORS, error) && ERRORS[error]) || {
    title: "Sign-in failed",
    description: "Something went wrong while signing you in.",
  };

  return (
    <EmptyState.Root>
      <EmptyState.Content>
        <EmptyState.Indicator>
          <LuShieldAlert />
        </EmptyState.Indicator>
        <VStack textAlign="center">
          <EmptyState.Title>{title}</EmptyState.Title>
          <EmptyState.Description>{description}</EmptyState.Description>
        </VStack>
        <ButtonGroup>
          <Button variant="outline" asChild><Link href="/">Back to Home</Link></Button>
        </ButtonGroup>
      </EmptyState.Content>
    </EmptyState.Root>
  );
}
