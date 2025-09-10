import { HStack, Heading } from "@chakra-ui/react";

import { ColorModeButton } from "@/components/ui/color-mode";

export default function AppNav() {
  return <HStack gap={2} justifyContent="space-between" mb={2}>
    <Heading as="h1" size="xl">
      OverHours - CMS Robotics
    </Heading>
    <HStack gap={4}>
      <ColorModeButton hideBelow="md" />
    </HStack>
  </HStack>;
}
