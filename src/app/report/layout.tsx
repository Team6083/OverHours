import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button, Container, GridItem, SimpleGrid } from "@chakra-ui/react";
import { NoAccessPage } from "@team6083/ui";

import { auth, Role } from "@/auth";
import { redirectToSignIn } from "@/lib/require-sign-in";
import ReportMenu from "./ReportMenu";

export default async function ReportLayout({ children }: { children: React.ReactNode }) {
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
