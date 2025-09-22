import { useTranslations } from "next-intl";
import { Table } from "@chakra-ui/react";

import RankingBadge from "@/components/RankingBadge";
import { formatDuration } from "@/lib/util";

export default function LeaderboardTable(props: {
  rankings: { id: string, name: string, duration: number }[];
  limits?: number;
}) {
  const { rankings, limits } = props;
  const t = useTranslations("LeaderboardTable");

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
