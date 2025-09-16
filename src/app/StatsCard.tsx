import { Card, Table, Badge, Button, Icon, Text } from "@chakra-ui/react";
import { LuChevronsRight } from "react-icons/lu";

import RankingBadge from "@/components/RankingBadge";

export default function StatsCard() {
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
            <Table.Cell><RankingBadge ranking={1} size="md" /></Table.Cell>
            <Table.Cell>John Doe</Table.Cell>
            <Table.Cell>
              2d 5h 30m 11s
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell><RankingBadge ranking={2} size="md" /></Table.Cell>
            <Table.Cell>Jane Smith</Table.Cell>
            <Table.Cell>
              5h 30m 11s
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell><RankingBadge ranking={3} size="md" /></Table.Cell>
            <Table.Cell>Alice Johnson</Table.Cell>
            <Table.Cell>
              30m 11s
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell><RankingBadge ranking={4} size="md" /></Table.Cell>
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
