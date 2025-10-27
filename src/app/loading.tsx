import { Spinner, Text, VStack } from "@chakra-ui/react";

export default function RootLoading() {
  return <VStack>
    <Spinner color="fg.muted" size="xl" />
    <Text color="fg">Loading...</Text>
  </VStack>;
}
