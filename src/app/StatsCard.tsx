import { Card, Table, Button, Icon, Text } from "@chakra-ui/react";
import { LuChevronsRight } from "react-icons/lu";

import RankingBadge from "@/components/RankingBadge";
import { formatDuration } from "@/lib/util";

export default function StatsCard(props: { rankings: { id: string, name: string, duration: number }[] }) {
  const { rankings } = props;

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
          {rankings.map(({ id, name, duration }, index) => (
            <Table.Row key={id}>
              <Table.Cell><RankingBadge ranking={index + 1} size="md" /></Table.Cell>
              <Table.Cell>{name}</Table.Cell>
              <Table.Cell>
                {formatDuration(duration)}
              </Table.Cell>
            </Table.Row>
          ))}
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
