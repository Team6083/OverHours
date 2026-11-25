import { auth } from "@/auth";
import { redirectToSignIn } from "@/lib/require-sign-in";

export default async function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) return redirectToSignIn();

  return children;
}
