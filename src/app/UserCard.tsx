import { revalidatePath } from "next/cache";
import { Card, VStack, HStack, Avatar, Stack, DataList, Badge, Text } from "@chakra-ui/react";

import RankingBadge from "@/components/RankingBadge";
import { clockIn, clockOut } from "@/lib/data/timelog-dto";
import { formatDuration } from "@/lib/util";
import UserClockInOutButton from "./ClockInOutButton";
import { getTranslations } from "next-intl/server";

export default async function UserCard(props: {
  user: { id: string, email: string, name: string },
  isClockedin?: boolean,
  totalTimeSec?: number,
  ranking?: number,
}) {
  const { user, totalTimeSec, ranking, isClockedin } = props;
  const t = await getTranslations("HomePage.userCard");

  return (
    <Card.Root w="full" size="sm">
      <Card.Body>
        <VStack textAlign="center" gap={4}>
          <HStack gap={4}>
            <Avatar.Root size="lg">
              <Avatar.Fallback name={user.name} />
            </Avatar.Root>
            <Stack gap={1}>
              <Text fontWeight="medium" fontSize="lg">{user.name}</Text>
              {/* <HStack gap={1} justify="center" align="center" flexWrap="wrap">
                  <Tag.Root colorPalette="blue" variant="surface">
                    <Tag.Label>FRC - 6083</Tag.Label>
                  </Tag.Root>
                  <Tag.Root colorPalette="orange" variant="surface">
                    <Tag.Label>FTC - Arctic</Tag.Label>
                  </Tag.Root>
                  <Tag.Root colorPalette="green" variant="surface">
                    <Tag.Label>FLL</Tag.Label>
                  </Tag.Root>
                </HStack> */}
            </Stack>
          </HStack>
          <DataList.Root orientation="horizontal" gap={2}>
            <DataList.Item>
              <DataList.ItemLabel>{t("totalTime")}</DataList.ItemLabel>
              <DataList.ItemValue>{typeof totalTimeSec === "number" ? formatDuration(totalTimeSec) : "None"}</DataList.ItemValue>
            </DataList.Item>
            <DataList.Item>
              <DataList.ItemLabel>{t("ranking")}</DataList.ItemLabel>
              <DataList.ItemValue>{ranking ? <RankingBadge ranking={ranking} /> : <Badge colorPalette="red">N/A</Badge>}</DataList.ItemValue>
            </DataList.Item>
          </DataList.Root>
        </VStack>
      </Card.Body>
      <Card.Footer>
        <UserClockInOutButton
          handleClick={async () => {
            "use server";
            if (isClockedin) {
              await clockOut(user.id);
            } else {
              await clockIn(user.id);
            }

            revalidatePath("/");
          }}
          isClockedin={isClockedin}
        />
      </Card.Footer>
    </Card.Root>
  );
}
