import { getImageProps } from "next/image";
import { Avatar, Badge, Box, Button, ButtonGroup, Card, Center, GridItem, Heading, IconButton, Pagination, SimpleGrid, Stack, VStack } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

import PaginationItems from "./PaginationItems";
import CurrentlyInTable from "./CurrentlyInTable";

export default function Home() {

  const items = [
    { id: 1, user: 'John Doe', inTime: new Date() },
    { id: 2, user: 'Jane Smith', inTime: new Date() },
    { id: 3, user: 'Alice Johnson', inTime: new Date() },
    { id: 4, user: 'Bob Brown', inTime: new Date() },
    { id: 5, user: 'Charlie Davis', inTime: new Date() },
    { id: 6, user: 'Diana Evans', inTime: new Date() },
    { id: 7, user: 'Frank Green', inTime: new Date() },
    { id: 8, user: 'Grace Harris', inTime: new Date() },
    { id: 9, user: 'Hank Irving', inTime: new Date() },
    { id: 10, user: 'Ivy Jackson', inTime: new Date() },
    { id: 11, user: 'Jack King', inTime: new Date() },
    { id: 12, user: 'Kathy Lee', inTime: new Date() },
    { id: 13, user: 'Larry Moore', inTime: new Date() },
    { id: 14, user: 'Mona Nelson', inTime: new Date() },
  ];

  const imageProps = getImageProps({
    src: "/image.png",
    alt: "John Doe's Avatar",
    width: 128,
    height: 128,
  });

  return (
    <SimpleGrid columns={{ base: 1, lg: 3 }} gap={8} p={4}>
      <GridItem>
        <Card.Root>
          <Card.Body>
            <VStack textAlign="center" gap={4}>
              <Box>
                <Avatar.Root>
                  <Avatar.Fallback name="John Doe" />
                  <Avatar.Image {...imageProps.props} />
                </Avatar.Root>
                <Card.Title>John Doe</Card.Title>
              </Box>
              <Badge size="md" colorPalette="blue">
                1 d 23 h 12 m 31 s
              </Badge>
              <Button width="full" colorPalette="green" size="sm">
                Clock-in
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>
      </GridItem>
      <GridItem colSpan={2}>
        <Pagination.Root count={items.length} pageSize={8} defaultPage={1}>
          <Stack width="full" gap="5">
            <Heading size="xl">Currently Clocked-in Users</Heading>
            <CurrentlyInTable items={items} />
            <Center>
              <ButtonGroup variant="ghost" size="sm" wrap="wrap">
                <Pagination.PrevTrigger asChild>
                  <IconButton>
                    <LuChevronLeft />
                  </IconButton>
                </Pagination.PrevTrigger>

                <PaginationItems />

                <Pagination.NextTrigger asChild>
                  <IconButton>
                    <LuChevronRight />
                  </IconButton>
                </Pagination.NextTrigger>
              </ButtonGroup>
            </Center>
          </Stack>
        </Pagination.Root>
      </GridItem>
    </SimpleGrid >
  );
}
