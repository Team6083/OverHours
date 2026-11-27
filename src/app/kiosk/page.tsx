import { getTranslations } from "next-intl/server";

import { Button, EmptyState, VStack } from "@chakra-ui/react";
import { LuNfc } from "react-icons/lu";

import { auth, signIn } from "@/auth";
import KioskScreen from "./KioskScreen";

/** Full-screen card reader page for a tablet at the door. Sign in once with an account that may tap cards. */
export default async function KioskPage() {
  const session = await auth();
  const t = await getTranslations("Kiosk");

  if (!session?.user.canTapCards) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator><LuNfc /></EmptyState.Indicator>
          <VStack textAlign="center">
            <EmptyState.Title>{t("title")}</EmptyState.Title>
            <EmptyState.Description>{session ? t("notAllowed") : t("signInRequired")}</EmptyState.Description>
          </VStack>
          {!session && (
            <Button onClick={async () => {
              "use server";
              return signIn("keycloak", { redirectTo: "/kiosk" });
            }}>{t("signIn")}</Button>
          )}
        </EmptyState.Content>
      </EmptyState.Root>
    );
  }

  return <KioskScreen />;
}
