import { getTranslations } from "next-intl/server";

import { Button, Container, EmptyState, Heading, Stack, VStack } from "@chakra-ui/react";
import { LuCreditCard, LuQrCode } from "react-icons/lu";

import { auth, Role, signIn } from "@/auth";
import { maskUid } from "@/lib/cards";
import { getBindRequest } from "@/lib/data/card-dto";
import { getAllUserNames } from "@/lib/data/user-dto";
import BindCardForm from "./BindCardForm";

/** Opened from the link a card reader shows for a card that isn't bound yet. */
export default async function BindCardPage(props: { searchParams: Promise<{ code?: string }> }) {
  const { code = "" } = await props.searchParams;
  const t = await getTranslations("CardBind");
  const session = await auth();

  const notice = (icon: React.ReactNode, title: string, description: string, action?: React.ReactNode) => (
    <EmptyState.Root>
      <EmptyState.Content>
        <EmptyState.Indicator>{icon}</EmptyState.Indicator>
        <VStack textAlign="center">
          <EmptyState.Title>{title}</EmptyState.Title>
          <EmptyState.Description>{description}</EmptyState.Description>
        </VStack>
        {action}
      </EmptyState.Content>
    </EmptyState.Root>
  );

  if (!session?.user.id) {
    return notice(<LuCreditCard />, t("title"), t("signInRequired"), (
      <Button onClick={async () => {
        "use server";
        return signIn("keycloak", { redirectTo: `/cards/bind?code=${encodeURIComponent(code)}` });
      }}>{t("signIn")}</Button>
    ));
  }

  const request = code ? await getBindRequest(code) : null;
  if (!request) {
    return notice(<LuQrCode />, t("title"), t("errors.replaced"));
  }

  const users = session.user.role === Role.ADMIN
    ? (await getAllUserNames()).sort((a, b) => a.name.localeCompare(b.name))
    : undefined;

  return (
    <Container maxW="sm" px={0}>
      <Stack gap={4}>
        <Heading as="h2" size="xl">{t("title")}</Heading>
        <BindCardForm code={code} card={maskUid(request.uid)} users={users} />
      </Stack>
    </Container>
  );
}
