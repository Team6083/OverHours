import { ComponentProps } from "react";
import { getTranslations } from "next-intl/server";
import { DataList, Badge } from "@chakra-ui/react";

import RankingBadge from "@/components/RankingBadge";
import { formatDuration } from "@/lib/util";

export default async function UserStat(props: {
  totalTimeSec: number,
  ranking?: number,
} & ComponentProps<typeof DataList.Root>) {
  const { totalTimeSec, ranking, ...datalistRootProps } = props;

  const t = await getTranslations("HomePage.userCard");

  return (
    <DataList.Root {...datalistRootProps}>
      <DataList.Item>
        <DataList.ItemLabel>{t("totalTime")}</DataList.ItemLabel>
        <DataList.ItemValue>{formatDuration(totalTimeSec)}</DataList.ItemValue>
      </DataList.Item>
      <DataList.Item>
        <DataList.ItemLabel>{t("ranking")}</DataList.ItemLabel>
        <DataList.ItemValue>{ranking ? <RankingBadge ranking={ranking} /> : <Badge colorPalette="red">N/A</Badge>}</DataList.ItemValue>
      </DataList.Item>
    </DataList.Root>
  );
}
