import { NextRequest } from "next/server";

import { signIn } from "@/auth";

// Pages that need a session redirect here: signing in sets cookies, which a page render can't do but a route can.
export async function GET(request: NextRequest) {
  // A GET skips Auth.js's CSRF check, so only start a sign-in from this site or from the address bar; another site
  // could otherwise start one for a visitor and break a sign-in they have open in another tab.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return new Response("Sign in from OverHours itself.", { status: 403 });
  }

  await signIn("keycloak", { redirectTo: safeCallbackPath(request.nextUrl.searchParams.get("callbackUrl")) });
}

/** Only a path on this site, so the link can't send people elsewhere after signing in. */
function safeCallbackPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
