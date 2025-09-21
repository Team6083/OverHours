import { ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { Card, Table, Button, Icon, Text } from "@chakra-ui/react";
import { LuChevronsRight } from "react-icons/lu";

import RankingBadge from "@/components/RankingBadge";
import { formatDuration } from "@/lib/util";

export default function LeaderboardCard(props: {
  rankings: { id: string, name: string, duration: number }[]
} & ComponentProps<typeof Card.Root>) {
  const { rankings, ...cardRootProps } = props;

  return <Card.Root {...cardRootProps}>
    <Card.Header>
      <Card.Title><LeaderboardTitle /></Card.Title>
    </Card.Header>
    <Card.Body>
      <LeaderboardTable rankings={rankings} limits={5} />
    </Card.Body>
    <Card.Footer>
      <Footer />
    </Card.Footer>
  </Card.Root>;
}

export function LeaderboardTitle() {
  const t = useTranslations("LeaderboardCard");

  return <>{t("title")}</>;
}

export function LeaderboardTable(props: {
  rankings: { id: string, name: string, duration: number }[];
  limits?: number;
}) {
  const { rankings, limits } = props;
  const t = useTranslations("LeaderboardCard");

  return (
    <Table.Root size="sm">
      <Table.Header>
        <Table.Row bg="transparent">
          <Table.ColumnHeader>{t("columns.ranking")}</Table.ColumnHeader>
          <Table.ColumnHeader>{t("columns.user")}</Table.ColumnHeader>
          <Table.ColumnHeader>{t("columns.totalTime")}</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rankings.slice(0, limits).map(({ id, name, duration }, index) => (
          <Table.Row key={id} bg="transparent">
            <Table.Cell><RankingBadge ranking={index + 1} size="md" /></Table.Cell>
            <Table.Cell>{name}</Table.Cell>
            <Table.Cell>
              {formatDuration(duration)}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}

export function Footer() {
  const t = useTranslations("LeaderboardCard");

  return (<>
    <Text fontSize="sm" color="gray.500">{t("footerText")}</Text>
    <Button size="xs" mt={2}>
      {t("viewMore")}
      <Icon><LuChevronsRight /></Icon>
    </Button>
  </>);
}
