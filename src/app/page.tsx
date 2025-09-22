import { ComponentProps } from "react";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { Badge, Button, Card, CloseButton, Dialog, EmptyState, GridItem, Heading, HStack, Icon, IconButton, Portal, SimpleGrid, Tabs, Text, VStack } from "@chakra-ui/react";
import { LuBuilding, LuChevronsRight, LuHouse, LuTrophy, LuUserPlus } from "react-icons/lu";

import { auth, Role } from "@/auth";
import LeaderboardTable from "@/components/LeaderboardTable";
import { adminClockOut, adminLockLog, clockIn, clockOut, deleteTimeLog, getAllCurrentlyInTimelogDTOs, getAllUsersTotalTimeSec, getUserLastLogDTO } from "@/lib/data/timelog-dto";
import { getAllUserDTOs, getAllUserNames, getUserDTO, UserDTO } from "@/lib/data/user-dto";
import CurrentlyInTable from "./CurrentlyInTable";
import UserCard, { UserCardStat, UserCardStatus, UserCardUserName } from "./UserCard";
import UserClockInOutButton from "./ClockInOutButton";
import { getTeamsForUser } from "@/lib/data/team-dto";
import ClockUserInCombobox from "./ClockUserInCombobox";
import PageUpdateButton from "./PageUpdateButton";

export default async function Home() {
  const t = await getTranslations("HomePage");

  const session = await auth();
  const isAdmin = session?.user.role === Role.ADMIN;
  const userId = session?.user.id;

  // Get All User Names
  const allUserNames = await getAllUserNames();
  const userNameMap = Object.fromEntries(allUserNames.map(user => [user.id, user.name]));

  // Get All Users Total Time
  const allUsersTotalTimeSec = await getAllUsersTotalTimeSec();
  const rankings = Object.entries(allUsersTotalTimeSec)
    .sort((a, b) => b[1] - a[1])
    .map(([id, duration]) => ({ id, name: userNameMap[id], duration }));

  // Get Current User Info
  const userDTO = session?.user && session.user.id ? await getUserDTO(session.user.id) : undefined;
  const userTeams = userId ? await getTeamsForUser(userId) : undefined;
  const user = userDTO ? {
    id: userDTO.id,
    name: userDTO.name,
    image: session?.user.image || undefined,
    teams: userTeams ? userTeams.map(team => ({ id: team.id, name: team.name })) : [],
    // teams: [{ id: "1", name: "Example Team" }, {id: "2", name: "FRC - 6083"}], // --- IGNORE ---
  } : undefined;

  const userLastLog = userId && await getUserLastLogDTO(userId);
  const userRank = rankings.findIndex(r => r.id === userId) + 1;

  // Get Currently In Logs
  const currentlyInLogs = (await getAllCurrentlyInTimelogDTOs()).map(log => ({
    id: log.id,
    user: userNameMap[log.userId] || log.userId,
    inTime: log.inTime,
  }));

  // Get all users for admin clock-in
  const allUsers = isAdmin ? await getAllUserDTOs() : undefined;
  const canClockInUsers = allUsers ? allUsers.filter(user => !currentlyInLogs.find(log => log.user === (user.name || user.id))) : [];

  const isClockedin = userLastLog ? userLastLog.status === "CURRENTLY_IN" : undefined;

  return (<>
    <SimpleGrid columns={{ base: 1, md: 5 }} gapX={8} gapY={4} hideBelow="sm">
      {/* Left column */}
      <GridItem colSpan={{ base: 1, md: 2 }}>
        <VStack gap={4}>
          {/* User card */}
          {user && (
            <UserCard
              user={user}
              lastLog={userLastLog || undefined}
              totalTimeSec={allUsersTotalTimeSec[user.id] || 0}
              ranking={userRank}
            />
          )}

          {/* Stats card */}
          <LeaderboardCard rankings={rankings} w="full" size="sm" />
        </VStack>
      </GridItem>

      {/* Right column */}
      <GridItem colSpan={{ base: 1, md: 3 }}>
        <CurrentlyInPane currentlyInLogs={currentlyInLogs} canClockInUsers={canClockInUsers} isAdmin={isAdmin} />
      </GridItem>
    </SimpleGrid>

    <Tabs.Root defaultValue="main" hideFrom="sm">
      <Tabs.List>
        <Tabs.Trigger value="main">
          <LuHouse />
          {t("tabs.home")}
        </Tabs.Trigger>
        <Tabs.Trigger value="leaderboard">
          <LuTrophy />
          {t("tabs.leaderboard")}
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="main">
        {user && (
          <VStack align="flex-start" gap={4} mb={4}>
            <HStack justifyContent="space-between" w="full" gap={4}>
              <UserCardUserName user={user} />
              <UserCardStatus lastLog={userLastLog || undefined} />
            </HStack>

            <UserCardStat
              totalTimeSec={allUsersTotalTimeSec[user.id] || 0}
              ranking={userRank}
              flexDir="row"
              justifyContent="space-around"
              w="full"
            />

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
          </VStack>
        )}

        <CurrentlyInPane currentlyInLogs={currentlyInLogs} canClockInUsers={canClockInUsers} isAdmin={isAdmin} />
      </Tabs.Content>
      <Tabs.Content value="leaderboard">
        <LeaderboardTable rankings={rankings} />
      </Tabs.Content>
    </Tabs.Root>
  </>);
}

async function CurrentlyInPane(props: {
  currentlyInLogs: { id: string, user: string, inTime: Date }[];
  canClockInUsers?: UserDTO[];
  isAdmin?: boolean;
}) {
  const { currentlyInLogs, canClockInUsers, isAdmin } = props;
  const t = await getTranslations('HomePage');

  return (<>
    <HStack mb={4} justify="space-between">
      <HStack>
        <Heading as="h2" size="xl">{t("headings.currentlyIn")}</Heading>
        <Badge colorPalette="blue" size="md">{currentlyInLogs.length}</Badge>
        <PageUpdateButton />
      </HStack>
      {isAdmin && canClockInUsers && <>
        <ClockUserInCombobox
          size="xs" maxW="3xs" w="full"
          hideBelow="md"
          users={canClockInUsers}
        />
        <IconButton size="xs" variant="ghost" hideFrom="md"><LuUserPlus /></IconButton>
      </>}
    </HStack>

    {
      currentlyInLogs.length > 0
        ? <CurrentlyInTable
          items={currentlyInLogs}
          handleClockout={async (id: string) => {
            "use server";
            await adminClockOut(id);
            revalidatePath("/");
          }}
          handleLock={async (id: string) => {
            "use server";
            await adminLockLog(id);
            revalidatePath("/");
          }}
          handleRemove={async (id: string) => {
            "use server";
            await deleteTimeLog(id);
            revalidatePath("/");
          }}
          showAdminActions={isAdmin}
        />
        : <>
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Indicator>
                <LuBuilding />
              </EmptyState.Indicator>
              <VStack textAlign="center">
                <EmptyState.Title>{t("emptyStates.noCurrentlyInUsers.title")}</EmptyState.Title>
                <EmptyState.Description>
                  {t("emptyStates.noCurrentlyInUsers.description")}
                </EmptyState.Description>
              </VStack>
            </EmptyState.Content>
          </EmptyState.Root>
        </>
    }
  </>);
}


async function LeaderboardCard(props: {
  rankings: { id: string, name: string, duration: number }[]
} & ComponentProps<typeof Card.Root>) {
  const { rankings, ...cardRootProps } = props;
  const t = await getTranslations("HomePage.leaderboardCard");

  return (
    <Dialog.Root>
      <Card.Root {...cardRootProps}>
        <Card.Header>
          <Card.Title>{t("title")}</Card.Title>
        </Card.Header>
        <Card.Body>
          <LeaderboardTable rankings={rankings} limits={5} />
        </Card.Body>
        <Card.Footer>
          <Text fontSize="sm" color="gray.500">{t("footerText")}</Text>
          <Dialog.Trigger asChild>
            <Button size="xs" mt={2}>
              {t("viewMore")}
              <Icon><LuChevronsRight /></Icon>
            </Button>
          </Dialog.Trigger>
        </Card.Footer>
      </Card.Root>

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{t("viewMoreDialog.title")}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <LeaderboardTable rankings={rankings} />
            </Dialog.Body>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
