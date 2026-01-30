import { Suspense } from "react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  Button, Card, ClientOnly, CloseButton, Dialog, GridItem, Heading, HStack, Icon, Portal, Separator, SimpleGrid,
  Spinner, Tabs, Text, VStack
} from "@chakra-ui/react";
import { LuChevronsRight, LuHouse, LuTrophy } from "react-icons/lu";

import { auth, Role } from "@/auth";
import LastUpdatedText from "@/components/LastUpdatedText";
import LeaderboardTable from "@/components/LeaderboardTable";
import { getTeamsForUser } from "@/lib/data/team-dto";
import {
  adminClockOut, adminLockLog, getAllCurrentlyInTimelogDTOs, getAllUsersTotalTimeSec, getUserLastLogDTO, TimeLogDTO,
} from "@/lib/data/timelog-dto";
import { getAllUserAvatars, getAllUserDTOs, getAllUserNames, getUserDTO, UserDTO } from "@/lib/data/user-dto";
import ClockUserInPopover from "./_components/ClockUserInPopover";
import PageUpdateButton from "./_components/PageUpdateButton";
import UserStatus from "./_components/UserStatus";
import UserDisplay from "./_components/UserDisplay";
import UserStat from "./_components/UserStat";
import UserClockToggleButton from "./_components/UserClockToggleButton";
import {
  CurrentlyClockedInContent, CurrentlyClockedInCountBadge, CurrentlyClockedInNoData,
  CurrentlyClockedInPaginationControls, CurrentlyClockedInProvider, CurrentlyClockedInSearchInput,
  CurrentlyClockedInTable
} from "./_components/CurrentlyClockedIn";
import HomePageSkeleton from "./home-skeleton";

type UserInfo = {
  id: string;
  name: string;
  image?: string;
  teams: { id: string; name: string }[];

  lastLog?: TimeLogDTO;
  totalTimeSec: number;
  ranking?: number;
}

export default async function Home() {
  const t = await getTranslations("HomePage");

  const session = await auth();
  const isAdmin = session?.user.role === Role.ADMIN;

  // Get All User Names
  const allUserNames = await getAllUserNames();
  const userNameMap = Object.fromEntries(allUserNames.map(user => [user.id, user.name]));

  // Get All User Avatars
  const allUserAvatars = await getAllUserAvatars();
  const userAvatarMap = Object.fromEntries(allUserAvatars.map(user => [user.id, user.image]));

  // Get All Users Total Time
  const allUsersTotalTimeSec = await getAllUsersTotalTimeSec();
  const rankings = Object.entries(allUsersTotalTimeSec)
    .sort((a, b) => b[1] - a[1])
    .map(([id, duration]) => ({ id, name: userNameMap[id], duration }));

  // Get Current User Info
  let userInfo: UserInfo | undefined = undefined;
  if (session?.user.id) {
    const userId = session.user.id;
    const user = await getUserDTO(userId);

    if (user) {
      const userTeams = await getTeamsForUser(userId);
      const userLastLog = await getUserLastLogDTO(userId);
      const rankingIndex = rankings.findIndex(r => r.id === userId);

      userInfo = {
        id: user.id,
        name: user.name,
        image: user.image || undefined,
        teams: userTeams ? userTeams.map(team => ({ id: team.id, name: team.name })) : [],
        // teams: [{ id: "1", name: "Example Team" }, {id: "2", name: "FRC - 6083"}], // --- IGNORE ---

        lastLog: userLastLog || undefined,
        totalTimeSec: allUsersTotalTimeSec[user.id] || 0,
        ranking: rankingIndex >= 0 ? rankingIndex + 1 : undefined,
      };
    }
  }

  // Get Currently In Logs
  const currentlyInLogs = (await getAllCurrentlyInTimelogDTOs()).map(log => ({
    id: log.id,
    user: {
      id: log.userId,
      name: userNameMap[log.userId],
      image: userAvatarMap[log.userId],
    },
    inTime: log.inTime,
  }));

  // Get all users for admin clock-in
  const allUsers = isAdmin ? await getAllUserDTOs() : undefined;
  const canClockInUsers = allUsers ? allUsers.filter(user => !currentlyInLogs.find(log => log.user.id === user.id)) : [];

  return (<Suspense fallback={<HomePageSkeleton />}>
    <CurrentlyClockedInProvider
      logs={currentlyInLogs}
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
        redirect(`/logs/${id}/delete?returnTo=/`);
      }}
    >

      {/* For large screens */}
      <SimpleGrid columns={{ base: 1, md: 5 }} gapX={8} gapY={4} hideBelow="md">

        {/* Left column */}
        <GridItem colSpan={{ base: 1, md: 2 }}>
          <VStack gap={4}>

            {/* User Info Card */}
            {userInfo && (
              <Card.Root w="full" size="sm">
                <Card.Body>

                  <HStack w="full" justify="flex-end" mb={2}>
                    <UserStatus lastLog={userInfo.lastLog} />
                  </HStack>

                  <VStack textAlign="center" gap={4}>
                    <UserDisplay user={userInfo} />

                    <UserStat
                      totalTimeSec={userInfo.totalTimeSec}
                      ranking={userInfo.ranking}
                      orientation="horizontal"
                      gap={2}
                    />
                  </VStack>

                </Card.Body>
                <Card.Footer>
                  <UserClockToggleButton userId={userInfo.id} isClockedIn={userInfo.lastLog?.status === "CURRENTLY_IN"} />
                </Card.Footer>
              </Card.Root>
            )}

            {/* Leaderboard Card */}
            <Dialog.Root>
              <Card.Root w="full" size="sm">
                <Card.Header>
                  <Card.Title>{t("leaderboardCard.title")}</Card.Title>
                </Card.Header>
                <Card.Body>
                  <LeaderboardTable rankings={rankings} limits={5} />
                </Card.Body>
                <Card.Footer>
                  <Text fontSize="sm" color="gray.500">{t("leaderboardCard.footerText")}</Text>
                  <Dialog.Trigger asChild>
                    <Button size="xs" mt={2}>
                      {t("leaderboardCard.viewMore")}
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
                      <Dialog.Title>{t("leaderboardCard.viewMoreDialog.title")}</Dialog.Title>
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

          </VStack>
        </GridItem>

        {/* Right column */}
        <GridItem colSpan={{ base: 1, md: 3 }}>
          {/* Currently Clocked In Users */}
          <CurrentlyClockedIn hasUser={!!userInfo} isAdmin={isAdmin} canClockInUsers={canClockInUsers} />
        </GridItem>
      </SimpleGrid>

      {/* For small screens */}
      <Tabs.Root defaultValue="main" hideFrom="md">

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
          {userInfo && (<>
            <VStack align="flex-start" gap={4} mb={4}>
              <HStack justifyContent="space-between" w="full" gapX={4}>
                <UserDisplay user={userInfo} />
                <UserStatus lastLog={userInfo.lastLog || undefined} />
              </HStack>

              <UserStat
                totalTimeSec={userInfo.totalTimeSec}
                ranking={userInfo.ranking}
                flexDir="row"
                justifyContent="space-around"
                w="full"
              />

              <UserClockToggleButton userId={userInfo.id} isClockedIn={userInfo.lastLog?.status === "CURRENTLY_IN"} />
            </VStack>
            <Separator mb={4} />
          </>)}

          <CurrentlyClockedIn hasUser={!!userInfo} isAdmin={isAdmin} canClockInUsers={canClockInUsers} />
        </Tabs.Content>

        <Tabs.Content value="leaderboard">
          <LeaderboardTable rankings={rankings} />
        </Tabs.Content>

      </Tabs.Root>

    </CurrentlyClockedInProvider>
  </Suspense>);
}

async function CurrentlyClockedIn(props: {
  hasUser?: boolean;
  isAdmin?: boolean;
  canClockInUsers?: UserDTO[];
}) {
  const { hasUser, isAdmin, canClockInUsers } = props;
  const t = await getTranslations("HomePage");

  return (<>
    <HStack mb={4} justify="space-between">
      <HStack>
        <Heading as="h2" size="xl">{t("headings.currentlyIn")}</Heading>
        <CurrentlyClockedInCountBadge />
        <PageUpdateButton />
      </HStack>

      {isAdmin && canClockInUsers && <ClockUserInPopover
        buttonProps={{ size: "xs", variant: "ghost" }}
        users={canClockInUsers}
      />}
    </HStack>

    <HStack mb={2} w="full" justifyContent="end">
      <LastUpdatedText fontSize="xs" color="fg.muted" date={(() => new Date())()} />
    </HStack>


    <CurrentlyClockedInContent>
      <ClientOnly fallback={<Spinner size="lg" />}>
        <CurrentlyClockedInSearchInput mb={2} placeholder={"Search..."} />

        <CurrentlyClockedInTable showAdminActions={isAdmin} showUserAvatar={hasUser} />

        <CurrentlyClockedInPaginationControls hideWhenZeroCount />
      </ClientOnly>
    </CurrentlyClockedInContent>

    <CurrentlyClockedInNoData hasUser={hasUser} />
  </>);
}
