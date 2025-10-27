import {
  SimpleGrid, GridItem, VStack, Card, HStack, Skeleton, SkeletonCircle, SkeletonText, Tabs, Separator,
} from "@chakra-ui/react";

export default function HomePageSkeleton() {
  return (<>
    <SimpleGrid columns={{ base: 1, md: 5 }} gapX={8} gapY={4} hideBelow="md">

      {/* Left column */}
      <GridItem colSpan={{ base: 1, md: 2 }}>
        <VStack gap={4}>
          <Card.Root w="full" size="sm">
            <Card.Body>
              <HStack w="full" justify="flex-end" mb={2}>
                <Skeleton height="14px" width="60px" />
              </HStack>

              <VStack textAlign="center" gap={4}>
                <HStack gap={4}>
                  <SkeletonCircle size="30px" />
                  <Skeleton height="28px" width="100px" />
                </HStack>
                <SkeletonText noOfLines={4} />
              </VStack>
            </Card.Body>
            <Card.Footer>
              <Skeleton height="36px" width="100%" />
            </Card.Footer>
          </Card.Root>

          <Card.Root w="full" size="sm">
            <Card.Header>
              <Card.Title>
                <SkeletonText noOfLines={1} width="40%" />
              </Card.Title>
            </Card.Header>
            <Card.Body>
              <Skeleton height="200px" />
            </Card.Body>
            <Card.Footer>
              <SkeletonText noOfLines={2} />
              <Skeleton height="36px" width="100px" />
            </Card.Footer>
          </Card.Root>
        </VStack>
      </GridItem>

      <GridItem colSpan={{ base: 1, md: 3 }}>
        <CurrentlyClockedInLoading />
      </GridItem>
    </SimpleGrid>

    <Tabs.Root value="main" hideFrom="md">

      <Tabs.List>
        <Tabs.Trigger value="main">
          <SkeletonText noOfLines={1} w="40px" />
        </Tabs.Trigger>
        <Tabs.Trigger value="leaderboard">
          <SkeletonText noOfLines={1} w="55px" />
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="main">
        <VStack align="flex-start" gap={4} mb={4}>
          <HStack justifyContent="space-between" w="full" gapX={4}>
            <HStack gap={4}>
              <SkeletonCircle size="30px" />
              <Skeleton height="28px" width="100px" />
            </HStack>
            <Skeleton height="14px" width="60px" />
          </HStack>

          <SkeletonText noOfLines={4} />

          <Skeleton height="36px" width="100%" />
        </VStack>

        <Separator mb={4} />

        <CurrentlyClockedInLoading />
      </Tabs.Content>

    </Tabs.Root>
  </>);
}

function CurrentlyClockedInLoading() {
  return (<>
    <SkeletonText noOfLines={1} width="60%" height="28px" />
    <Skeleton height="300px" mt={4} />
  </>);
}
