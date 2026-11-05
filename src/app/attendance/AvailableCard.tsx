"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, HStack, Text } from "@chakra-ui/react";

const PREVIEW_COUNT = 4;

export default function AvailableCard(props: { title: string; names: string[] }) {
  const { title, names } = props;
  const t = useTranslations("Attendance");
  const [expanded, setExpanded] = useState(false);

  const hiddenCount = names.length - PREVIEW_COUNT;
  const shown = (expanded ? names : names.slice(0, PREVIEW_COUNT)).join("、") || t("nobody");

  const toggle = hiddenCount > 0 && (
    <Button
      size="2xs"
      variant="plain"
      height="auto"
      minW={0}
      px={0}
      flexShrink={0}
      colorPalette="blue"
      aria-expanded={expanded}
      onClick={() => setExpanded(!expanded)}
    >
      {expanded ? t("showLess") : t("showMore", { count: hiddenCount })}
    </Button>
  );

  return (
    <>
      <Card.Root w="full" size="sm" hideBelow="md">
        <Card.Header>
          <Card.Title>{title}</Card.Title>
        </Card.Header>
        <Card.Body>
          <Text fontSize="sm" color="fg.muted">{shown} {toggle}</Text>
        </Card.Body>
      </Card.Root>

      <HStack hideFrom="md" gap={1} align="baseline" fontSize="xs" minW={0}>
        <Text fontWeight="medium" flexShrink={0}>{title}</Text>
        <Text color="fg.muted" flex={1} minW={0} truncate={!expanded}>{shown}</Text>
        {toggle}
      </HStack>
    </>
  );
}
