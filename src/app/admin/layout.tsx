import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@chakra-ui/react";
import { NoAccessPage } from "@team6083/ui";

import { auth, Role } from "@/auth";
import { redirectToSignIn } from "@/lib/require-sign-in";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) return redirectToSignIn();

  if (session.user.role !== Role.ADMIN) {
    const t = await getTranslations("AccessDenied");
    return (
      <NoAccessPage
        title={t("adminOnly.title")}
        description={t("adminOnly.description")}
        actions={<Button variant="outline" asChild><Link href="/">{t("backHome")}</Link></Button>}
      />
    );
  }

  return children;
}
