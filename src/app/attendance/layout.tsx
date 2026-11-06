import { EmptyState, VStack } from "@chakra-ui/react";
import { getTranslations } from "next-intl/server";
import { LuShieldAlert } from "react-icons/lu";

import { auth } from "@/auth";

export default async function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    const t = await getTranslations("Attendance");

    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <LuShieldAlert />
          </EmptyState.Indicator>
          <VStack textAlign="center">
            <EmptyState.Title>{t("title")}</EmptyState.Title>
            <EmptyState.Description>{t("signInRequired")}</EmptyState.Description>
          </VStack>
        </EmptyState.Content>
      </EmptyState.Root>
    );
  }

  return children;
}
