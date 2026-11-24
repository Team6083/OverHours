import { NextRequest } from "next/server";

import { signIn } from "@/auth";

// Pages that need a session redirect here: signing in sets cookies, which a page render can't do but a route can.
export async function GET(request: NextRequest) {
  await signIn("keycloak", { redirectTo: safeCallbackPath(request.nextUrl.searchParams.get("callbackUrl")) });
}

/** Only a path on this site, so the link can't send people elsewhere after signing in. */
function safeCallbackPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
