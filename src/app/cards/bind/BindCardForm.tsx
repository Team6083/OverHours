"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button, Card, NativeSelect, Stack, Text } from "@chakra-ui/react";
import { LuCircleCheck, LuCreditCard } from "react-icons/lu";

import { bindCardAction, BindResult } from "./actions";

export default function BindCardForm(props: {
  code: string;
  card: string;
  /** Everyone an admin can bind the card to; absent for other members. */
  users?: { id: string; name: string }[];
}) {
  const { code, card, users } = props;
  const t = useTranslations("CardBind");
  const [result, setResult] = useState<BindResult | null>(null);
  const [target, setTarget] = useState("");
  const [pending, startTransition] = useTransition();

  const bind = (userId?: string) => startTransition(async () => {
    try {
      setResult(await bindCardAction(code, userId));
    } catch {
      setResult({ ok: false, error: "failed" });
    }
  });

  if (result?.ok) {
    return (
      <Stack align="center" textAlign="center" gap={3} py={6}>
        <LuCircleCheck size={40} color="var(--chakra-colors-green-fg)" />
        <Text fontWeight="semibold">{t("done", { card: result.card })}</Text>
        <Text fontSize="sm" color="fg.muted">{t("doneHint")}</Text>
      </Stack>
    );
  }

  return (
    <Card.Root size="sm">
      <Card.Header>
        <Card.Title display="flex" alignItems="center" gap={2}><LuCreditCard />{t("card", { card })}</Card.Title>
        <Card.Description>{t("description")}</Card.Description>
      </Card.Header>
      <Card.Body>
        <Stack gap={4}>
          {result && <Text fontSize="sm" color="red.fg">{t(`errors.${result.error}`)}</Text>}
          <Button colorPalette="blue" loading={pending} onClick={() => bind()}>{t("bindToMe")}</Button>

          {users && (
            <Stack gap={2} pt={2} borderTopWidth="1px">
              <Text fontSize="sm" color="fg.muted">{t("adminHint")}</Text>
              <NativeSelect.Root size="sm">
                <NativeSelect.Field value={target} onChange={event => setTarget(event.target.value)} aria-label={t("chooseMember")}>
                  <option value="">{t("chooseMember")}</option>
                  {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
              <Button variant="outline" size="sm" disabled={!target} loading={pending} onClick={() => bind(target)}>
                {t("bindToMember")}
              </Button>
            </Stack>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
