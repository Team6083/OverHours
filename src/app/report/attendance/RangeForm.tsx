"use client";
import { HStack, Input, Text } from "@chakra-ui/react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function RangeForm(props: { start: string; end: string; max: string }) {
  const { start, end, max } = props;
  const t = useTranslations("AccuracyReport");
  const router = useRouter();
  const pathname = usePathname();

  const go = (next: { start: string; end: string }) => {
    if (next.start && next.end) router.push(`${pathname}?${new URLSearchParams(next)}`);
  };

  return (
    <HStack gap={2}>
      <Input type="date" size="xs" w="auto" value={start} max={end} aria-label={t("startDate")}
        onChange={e => go({ start: e.target.value, end })} />
      <Text fontSize="sm">–</Text>
      <Input type="date" size="xs" w="auto" value={end} min={start} max={max} aria-label={t("endDate")}
        onChange={e => go({ start, end: e.target.value })} />
    </HStack>
  );
}
