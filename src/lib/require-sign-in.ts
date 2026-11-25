import { headers } from "next/headers";
import { redirect } from "next/navigation";

/** Sends someone who isn't signed in to sign in, coming back to the page they asked for. */
export async function redirectToSignIn(): Promise<never> {
  // Set by src/proxy.ts; layouts aren't told which page they wrap.
  const path = (await headers()).get("x-pathname") ?? "/";
  redirect(`/auth/signin?callbackUrl=${encodeURIComponent(path)}`);
}
