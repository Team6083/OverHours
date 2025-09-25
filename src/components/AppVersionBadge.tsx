import { Badge, ClientOnly, Text } from "@chakra-ui/react";

export default function AppVersionBadge() {
  if (process.env.NEXT_PUBLIC_VERSION) {
    return <Badge size="xs" colorPalette="green">{process.env.NEXT_PUBLIC_VERSION}</Badge>;
  }

  if (process.env.NEXT_PUBLIC_COMMIT_SHA) {
    const buildDate = process.env.NEXT_PUBLIC_BUILD_DATE ? new Date(process.env.NEXT_PUBLIC_BUILD_DATE) : null;

    return <Badge size="xs" colorPalette="orange">
      Commit: {process.env.NEXT_PUBLIC_COMMIT_SHA.substring(0, 7)}
      {buildDate ? <Text as="span">{" "}(Build at <ClientOnly>{buildDate.toLocaleString()}</ClientOnly>)</Text> : null}
    </Badge>;
  }

  return <Badge size="xs" colorPalette="red">Development Build</Badge>;
}
