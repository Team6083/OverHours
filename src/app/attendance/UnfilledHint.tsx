import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { HStack, Text } from "@chakra-ui/react";
import { LuCalendarClock, LuChevronRight } from "react-icons/lu";

/** Nudges the signed-in member to answer the coming days; renders nothing once they're all answered. */
export default async function UnfilledHint(props: { count?: number }) {
  const { count } = props;
  const t = await getTranslations("Attendance");
  if (!count) return null;

  return (
    <Link href="/attendance">
      <HStack
        gap={2}
        px={3}
        py={2}
        mb={3}
        rounded="md"
        bg="orange.subtle"
        color="orange.fg"
        fontSize="sm"
        fontWeight="medium"
        _hover={{ bg: "orange.muted" }}
      >
        <LuCalendarClock />
        <Text flex="1">{t("unfilledHint", { count })}</Text>
        <LuChevronRight />
      </HStack>
    </Link>
  );
}
