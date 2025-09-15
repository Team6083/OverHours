import { Avatar, Badge, Button, ButtonGroup, Card, Center, DataList, GridItem, Heading, HStack, Icon, IconButton, Pagination, SimpleGrid, Stack, Table, Tag, Text, VStack } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight, LuChevronsRight, LuUserCheck } from "react-icons/lu";

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

  // const imageProps = getImageProps({
  //   src: "/image.png",
  //   alt: "John Doe's Avatar",
  //   width: 128,
  //   height: 128,
  // });

  return (
    <SimpleGrid columns={{ base: 1, md: 5 }} gapX={8} gapY={4}>
      <GridItem colSpan={{ base: 1, md: 2 }}>
        <VStack gap={4}>
          <UserInfoCard />
          <StatsCard />
        </VStack>
      </GridItem>
      <GridItem colSpan={{ base: 1, md: 3 }}>
        <Pagination.Root count={items.length} pageSize={8} defaultPage={1}>
          <Stack width="full">
            <Heading size="xl">Currently Clocked-in Users</Heading>
            <CurrentlyInTable items={items} />
            <Center mt={4}>
              <ButtonGroup variant="ghost" size="xs" wrap="wrap">
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

function UserInfoCard() {
  return <Card.Root w="full" size="sm">
    <Card.Body>
      <VStack textAlign="center" gap={4}>
        <HStack gap={4} >
          <Avatar.Root size="lg">
            <Avatar.Fallback name="John Doe" />
          </Avatar.Root>
          <Stack gap={1}>
            <Text fontWeight="medium" fontSize="lg">John Doe</Text>
            <HStack gap={1} justify="center" align="center" flexWrap="wrap">
              <Tag.Root colorPalette="blue" variant="surface">
                <Tag.Label>FRC - 6083</Tag.Label>
              </Tag.Root>
              <Tag.Root colorPalette="orange" variant="surface">
                <Tag.Label>FTC - Arctic</Tag.Label>
              </Tag.Root>
              <Tag.Root colorPalette="green" variant="surface">
                <Tag.Label>FLL</Tag.Label>
              </Tag.Root>
            </HStack>
          </Stack>
        </HStack>
        {/* <HStack>
          <Badge colorPalette="blue" size="md">1d 23h 12m 31s</Badge>
          <Badge colorPalette="pink" size="md"><Text>1<sup>st</sup></Text></Badge>
        </HStack> */}
        <DataList.Root orientation="horizontal">
          <DataList.Item>
            <DataList.ItemLabel>Total Time</DataList.ItemLabel>
            <DataList.ItemValue>1d 23h 12m 31s</DataList.ItemValue>
          </DataList.Item>
          <DataList.Item>
            <DataList.ItemLabel>Ranking</DataList.ItemLabel>
            <DataList.ItemValue><Badge colorPalette="pink"><Text>1<sup>st</sup></Text></Badge></DataList.ItemValue>
          </DataList.Item>
        </DataList.Root>
        <Button width="full" colorPalette="green" size="xs">
          Clock-in
          <Icon><LuUserCheck /></Icon>
        </Button>
      </VStack>
    </Card.Body>
  </Card.Root>;
}

function StatsCard() {
  return <Card.Root w="full" size="sm">
    <Card.Header>
      <Card.Title>Leaderboard</Card.Title>
    </Card.Header>
    <Card.Body>
      <Table.Root size="sm" interactive>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Ranking</Table.ColumnHeader>
            <Table.ColumnHeader>User</Table.ColumnHeader>
            <Table.ColumnHeader>Hours</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>
              <Badge size="md" colorPalette="pink">
                <Text>1<sup>st</sup></Text>
              </Badge>
            </Table.Cell>
            <Table.Cell>John Doe</Table.Cell>
            <Table.Cell>
              2d 5h 30m 11s
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>
              <Badge size="md" colorPalette="yellow">
                <Text>2<sup>nd</sup></Text>
              </Badge>
            </Table.Cell>
            <Table.Cell>Jane Smith</Table.Cell>
            <Table.Cell>
              5h 30m 11s
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>
              <Badge size="md" colorPalette="orange">
                <Text>3<sup>rd</sup></Text>
              </Badge>
            </Table.Cell>
            <Table.Cell>Alice Johnson</Table.Cell>
            <Table.Cell>
              30m 11s
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>
              <Badge size="md">
                <Text>4<sup>th</sup></Text>
              </Badge>
            </Table.Cell>
            <Table.Cell>Bob Brown</Table.Cell>
            <Table.Cell>
              10m 5s
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>
              <Badge size="md">
                <Text>5<sup>th</sup></Text>
              </Badge>
            </Table.Cell>
            <Table.Cell>Charlie Davis</Table.Cell>
            <Table.Cell>
              5m 30s
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>
    </Card.Body>
    <Card.Footer>
      <Text fontSize="sm" color="gray.500">Top 5 users by total hours clocked-in</Text>
      <Button size="xs" mt={2}>
        View Full Leaderboard
        <Icon><LuChevronsRight /></Icon>
      </Button>
    </Card.Footer>
  </Card.Root>;
}
