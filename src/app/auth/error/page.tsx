import Link from "next/link";
import { Button } from "@chakra-ui/react";
import { NoAccessPage, StatusPage } from "@team6083/ui";
import { LuShieldAlert } from "react-icons/lu";

import { signOutAndEndKeycloakSession } from "@/auth";

// MissingRole isn't here: it gets the team's NoAccessPage, the same page every team app shows for it.
const ERRORS: Record<string, { title: string; description: string }> = {
  EmailNotVerified: {
    title: "Email not verified",
    description: "Your email address must be verified before you can sign in.",
  },
  AccountConflict: {
    title: "Account conflict",
    description: "Another user in this application already uses your email address. Please ask an administrator to resolve it.",
  },
  VerificationUnavailable: {
    title: "Sign-in unavailable",
    description: "Your sign-in could not be verified right now. Please try again in a moment.",
  },
};

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  const actions = <>
    {/* Ends the Keycloak SSO session too; otherwise signing in again silently returns here. */}
    <form action={async () => {
      "use server";
      await signOutAndEndKeycloakSession();
    }}>
      <Button type="submit">Sign out</Button>
    </form>
    <Button variant="outline" asChild><Link href="/">Back to Home</Link></Button>
  </>;

  if (error === "MissingRole") {
    return <NoAccessPage actions={actions} />;
  }

  const { title, description } = (error && Object.hasOwn(ERRORS, error) && ERRORS[error]) || {
    title: "Sign-in failed",
    description: "Something went wrong while signing you in.",
  };

  return <StatusPage icon={<LuShieldAlert />} title={title} description={description} actions={actions} />;
}
