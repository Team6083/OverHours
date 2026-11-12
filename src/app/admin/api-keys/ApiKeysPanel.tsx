"use client";
import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Badge, Box, Button, Card, Checkbox, Field, Heading, HStack, Input, Stack, Text } from "@chakra-ui/react";

import Clipboard from "@/components/Clipboard";
import { toaster } from "@/components/ui/toaster";
import { API_SCOPES, ApiScope } from "@/lib/api-scopes";
import type { ApiKeyDTO } from "@/lib/data/api-key-dto";
import { createKey, revokeKey } from "./actions";

export default function ApiKeysPanel(props: { keys: ApiKeyDTO[] }) {
  const { keys } = props;
  const t = useTranslations("ApiKeys");
  const format = useFormatter();

  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiScope[]>(["attendance:read"]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = (scope: ApiScope, on: boolean) =>
    setScopes(prev => on ? [...prev, scope] : prev.filter(item => item !== scope));

  const create = () => startTransition(async () => {
    const result = await createKey(name, scopes);
    if (!result.ok) {
      toaster.error({ title: t("failed") });
      return;
    }
    setNewKey(result.key);
    setName("");
  });

  const revoke = (key: ApiKeyDTO) => {
    if (!window.confirm(t("confirmRevoke", { name: key.name }))) return;
    startTransition(async () => {
      const result = await revokeKey(key.id);
      if (!result.ok) toaster.error({ title: t("failed") });
    });
  };

  const formatTime = (date: Date) => format.dateTime(date, { dateStyle: "medium", timeStyle: "short" });

  return (
    <Stack gap={4} maxW="3xl" mx="auto">
      <Stack gap={1}>
        <Heading as="h1" size="lg">{t("title")}</Heading>
        <Text fontSize="sm" color="fg.muted">{t("description")}</Text>
      </Stack>

      {newKey && (
        <Card.Root size="sm" borderColor="orange.muted">
          <Card.Body gap={2}>
            <Text fontSize="sm" fontWeight="medium" color="orange.fg">{t("shownOnce")}</Text>
            <Box fontFamily="mono" fontSize="sm" wordBreak="break-all">
              <Clipboard value={newKey} />
            </Box>
          </Card.Body>
        </Card.Root>
      )}

      <Card.Root size="sm">
        <Card.Body gap={3}>
          <Text fontWeight="medium">{t("newKey")}</Text>
          <Field.Root>
            <Field.Label>{t("name")}</Field.Label>
            <Input size="sm" value={name} placeholder={t("namePlaceholder")} maxLength={100} onChange={event => setName(event.target.value)} />
          </Field.Root>
          <Stack gap={2}>
            <Text fontSize="sm" fontWeight="medium">{t("scopes")}</Text>
            {API_SCOPES.map(scope => (
              <Checkbox.Root
                key={scope}
                size="sm"
                checked={scopes.includes(scope)}
                onCheckedChange={details => toggle(scope, details.checked === true)}
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>
                  {t(`scope.${scope}`)} <Text as="span" color="fg.muted" fontFamily="mono" fontSize="xs">{scope}</Text>
                </Checkbox.Label>
              </Checkbox.Root>
            ))}
          </Stack>
          <Box>
            <Button size="sm" colorPalette="blue" onClick={create} loading={isPending} disabled={!name.trim() || scopes.length === 0}>
              {t("create")}
            </Button>
          </Box>
        </Card.Body>
      </Card.Root>

      <Stack gap={2}>
        {keys.length === 0 && <Text fontSize="sm" color="fg.muted">{t("empty")}</Text>}
        {keys.map(key => (
          <Card.Root key={key.id} size="sm">
            <Card.Body gap={2}>
              <HStack justify="space-between" align="flex-start" gap={3}>
                <Stack gap={1} minW={0}>
                  <Text fontWeight="medium" truncate>{key.name}</Text>
                  <HStack gap={1} wrap="wrap">
                    {key.scopes.map(scope => <Badge key={scope} size="sm">{t(`scope.${scope}`)}</Badge>)}
                  </HStack>
                  <Text fontSize="xs" color="fg.muted">
                    {t("status", {
                      created: formatTime(key.createdAt),
                      lastUsed: key.lastUsedAt ? formatTime(key.lastUsedAt) : t("neverUsed"),
                    })}
                  </Text>
                </Stack>
                <Button size="xs" variant="outline" colorPalette="red" onClick={() => revoke(key)} disabled={isPending}>
                  {t("revoke")}
                </Button>
              </HStack>
            </Card.Body>
          </Card.Root>
        ))}
      </Stack>
    </Stack>
  );
}
