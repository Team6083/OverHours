import { revalidatePath } from "next/cache";
import { getFormatter, getTranslations } from "next-intl/server";
import { Card, VStack, HStack, Avatar, Stack, DataList, Badge, Text, Status } from "@chakra-ui/react";

import RankingBadge from "@/components/RankingBadge";
import { clockIn, clockOut, TimeLogDTO } from "@/lib/data/timelog-dto";
import { formatDuration } from "@/lib/util";
import UserClockInOutButton from "./ClockInOutButton";
import { ComponentProps } from "react";

export default async function UserCard(props: {
  user: { id: string, name?: string, image?: string },
  lastLog?: TimeLogDTO,
  totalTimeSec?: number,
  ranking?: number,
}) {
  const { user, lastLog, totalTimeSec, ranking } = props;

  const isClockedin = lastLog?.status === "CURRENTLY_IN";

  return (
    <Card.Root w="full" size="sm">
      <Card.Body>
        <HStack w="full" justify="flex-end">
          <UserCardStatus lastLog={lastLog} />
        </HStack>
        <VStack textAlign="center" gap={4}>
          <UserCardUserName user={user} />
          <UserCardStat totalTimeSec={totalTimeSec} ranking={ranking} orientation="horizontal" gap={2} />
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

export async function UserCardStatus(props: { lastLog?: TimeLogDTO, }) {
  const { lastLog } = props;
  const t = await getTranslations("HomePage.userCard");
  const format = await getFormatter();

  const isClockedin = lastLog?.status === "CURRENTLY_IN";

  const now = new Date();
  const lastLogTime = lastLog?.status === "CURRENTLY_IN" ? lastLog.inTime : lastLog?.outTime;
  const lastLogTimeStr = lastLogTime ? format.relativeTime(lastLogTime, now) : undefined;

  return (
    <Status.Root fontSize="xs" colorPalette={lastLog ? (isClockedin ? "green" : "orange") : "blue"} gap={2}>
      <Text color="fg.muted">
        {lastLog
          ? (lastLogTimeStr && (lastLog.status === "CURRENTLY_IN" ?
            t("status.lastIn", { time: lastLogTimeStr }) :
            t("status.lastOut", { time: lastLogTimeStr })))
          : t("status.noLogsYet")
        }
      </Text>
      <Status.Indicator />
    </Status.Root>
  );
}

export function UserCardUserName(props: {
  user: { id: string, name?: string, image?: string },
}) {
  const { user } = props;

  return (
    <HStack gap={4}>
      <Avatar.Root size={{ base: "sm", md: "lg" }}>
        <Avatar.Fallback name={user.name} />
        <Avatar.Image src={user.image} />
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
  );
}

export async function UserCardStat(props: {
  totalTimeSec?: number,
  ranking?: number,
} & ComponentProps<typeof DataList.Root>) {
  const { totalTimeSec, ranking, ...datalistRootProps } = props;

  const t = await getTranslations("HomePage.userCard");

  return (
    <DataList.Root {...datalistRootProps}>
      <DataList.Item>
        <DataList.ItemLabel>{t("totalTime")}</DataList.ItemLabel>
        <DataList.ItemValue>{typeof totalTimeSec === "number" ? formatDuration(totalTimeSec) : "None"}</DataList.ItemValue>
      </DataList.Item>
      <DataList.Item>
        <DataList.ItemLabel>{t("ranking")}</DataList.ItemLabel>
        <DataList.ItemValue>{ranking ? <RankingBadge ranking={ranking} /> : <Badge colorPalette="red">N/A</Badge>}</DataList.ItemValue>
      </DataList.Item>
    </DataList.Root>
  );
}
