import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@chakra-ui/react";
import { StatusPage } from "@team6083/ui";
import { LuSearchX } from "react-icons/lu";

export default async function NotFound() {
  const t = await getTranslations("NotFoundPage");

  return (
    <StatusPage
      icon={<LuSearchX />}
      title={t("title")}
      description={t("description")}
      actions={<Button variant="outline" asChild><Link href="/">{t("backHome")}</Link></Button>}
    />
  );
}
