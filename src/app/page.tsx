import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Box, Card, ClientOnly, GridItem, HStack, Separator, SimpleGrid, Spinner, Stack, Tabs, Tag, Text, VStack } from "@chakra-ui/react";
import { TitleBar } from "@team6083/ui";
import { LuCalendarCheck, LuHouse, LuTrophy } from "react-icons/lu";

import { auth, Role } from "@/auth";
import LastUpdatedText from "@/components/common/LastUpdatedText";
import UserAvatar from "@/components/user/UserAvatar";
import { getDayBoard, getToday } from "@/lib/data/attendance-dto";
import { getActiveStatRangesForPicker } from "@/lib/data/statrange-dto";
import { getTeamsForUser } from "@/lib/data/team-dto";
import {
  adminClockOut, adminLockLog, getAllCurrentlyInTimelogDTOs, getAllUsersTotalTimeSec, getUserLastLogDTO, TimeLogDTO,
} from "@/lib/data/timelog-dto";
import { getAllUserAvatars, getAllUserDTOs, getAllUserNames, getUserDTO, UserDTO } from "@/lib/data/user-dto";
import ClockInOutButton from "./_components/ClockInOutButton";
import ClockStatus from "./_components/ClockStatus";
import ClockUserInPopover from "./_components/ClockUserInPopover";
import {
  CurrentlyClockedInContent, CurrentlyClockedInCountBadge, CurrentlyClockedInNoData,
  CurrentlyClockedInPaginationControls, CurrentlyClockedInProvider, CurrentlyClockedInSearchInput,
  CurrentlyClockedInTable
} from "./_components/CurrentlyClockedIn";
import LeaderboardCard from "./_components/LeaderboardCard";
import LeaderboardTabPanel from "./_components/LeaderboardTabPanel";
import RefreshButton from "./_components/RefreshButton";
import UserStats from "./_components/UserStats";
import DayAttendanceSection, { DayAttendanceProvider } from "./attendance/DayAttendanceSection";
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

  // Attendance for today, only for signed-in users. It is optional, so a failure leaves the section out
  // instead of breaking the home page, and it loads alongside the other queries.
  const today = getToday();
  const todayBoardPromise = session?.user.id
    ? getDayBoard(today).catch((error) => {
      console.error("Failed to load today's attendance", error);
      return undefined;
    })
    : Promise.resolve(undefined);
  // The leaderboard's range picker; loads alongside the other queries and is empty if it fails.
  const statRangesPromise = getActiveStatRangesForPicker();
  const isAdmin = session?.user.role === Role.ADMIN;

  // Get All User Names
  const allUserNames = await getAllUserNames();
  const userNameMap = Object.fromEntries(allUserNames.map(user => [user.id, user.name]));

  // Get All User Avatars
  const allUserAvatars = await getAllUserAvatars();
  const userAvatarMap = Object.fromEntries(allUserAvatars.map(user => [user.id, user.image]));

  // Get All Users Total Time
  const allUsersTotalTimeSec = await getAllUsersTotalTimeSec();
  const statRanges = await statRangesPromise;
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
        teams: userTeams ?? [],

        lastLog: userLastLog || undefined,
        totalTimeSec: allUsersTotalTimeSec[user.id] || 0,
        ranking: rankingIndex >= 0 ? rankingIndex + 1 : undefined,
      };
    }
  }

  const todayBoard = await todayBoardPromise;

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

  // One provider for both layouts, so they share the selected day and a single dialog.
  const withAttendance = (node: React.ReactNode) => todayBoard
    ? <DayAttendanceProvider initialDay={todayBoard} today={today}>{node}</DayAttendanceProvider>
    : node;

  return (<Suspense fallback={<HomePageSkeleton />}>
    {withAttendance(<CurrentlyClockedInProvider
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
                    <ClockStatus lastLog={userInfo.lastLog} />
                  </HStack>

                  <VStack textAlign="center" gap={4}>
                    <HStack gap={4}>
                      <UserAvatar
                        name={userInfo.name ?? ""}
                        image={userInfo.image}
                        size={userInfo.teams && userInfo.teams.length > 0 ? { base: "sm", md: "xl" } : "xs"}
                        rank={userInfo.ranking}
                      />

                      <Stack gap={1}>
                        <Text fontWeight="medium" fontSize="lg">{userInfo.name}</Text>
                        {userInfo.teams && userInfo.teams.length > 0 && (
                          <HStack gap={1} justifyContent="center" alignContent="center" flexWrap="wrap">
                            {userInfo.teams.map((team) => (
                              <Tag.Root key={team.id} variant="surface">
                                <Tag.Label>{team.name}</Tag.Label>
                              </Tag.Root>
                            ))}
                          </HStack>
                        )}
                      </Stack>
                    </HStack>

                    <UserStats
                      totalTimeSec={userInfo.totalTimeSec}
                      ranking={userInfo.ranking}
                      orientation="horizontal"
                      gap={2}
                    />
                  </VStack>
                </Card.Body>
                <Card.Footer>
                  <ClockInOutButton userId={userInfo.id} isClockedIn={userInfo.lastLog?.status === "CURRENTLY_IN"} />
                </Card.Footer>
              </Card.Root>
            )}

            {/* Leaderboard Card */}
            <LeaderboardCard initialRankings={rankings} statRanges={statRanges} />

          </VStack>
        </GridItem>

        {/* Right column */}
        <GridItem colSpan={{ base: 1, md: 3 }}>
          {/* Attendance of the day */}
          {todayBoard && (<>
            <DayAttendanceSection />
            <Separator my={4} />
          </>)}

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
          {todayBoard && (<Tabs.Trigger value="availability">
            <LuCalendarCheck />
            {t("tabs.availability")}
          </Tabs.Trigger>)}
          <Tabs.Trigger value="leaderboard">
            <LuTrophy />
            {t("tabs.leaderboard")}
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="main">
          {userInfo && (<>
            <VStack align="flex-start" gap={4} mb={4}>
              <HStack w="full" gapX={4}>
                <UserAvatar
                  name={userInfo.name ?? ""}
                  image={userInfo.image}
                  size={userInfo.teams && userInfo.teams.length > 0 ? { base: "sm", md: "xl" } : "xs"}
                  rank={userInfo.ranking}
                />

                <Stack w="full" gap={1}>
                  <HStack w="full" justifyContent="space-between">
                    <Text fontWeight="medium" fontSize="lg">{userInfo.name}</Text>
                    <ClockStatus lastLog={userInfo.lastLog || undefined} />
                  </HStack>

                  {userInfo.teams && userInfo.teams.length > 0 && (
                    <HStack gap={1} flexWrap="wrap">
                      {userInfo.teams.map((team) => (
                        <Tag.Root key={team.id} variant="surface">
                          <Tag.Label>{team.name}</Tag.Label>
                        </Tag.Root>
                      ))}
                    </HStack>
                  )}
                </Stack>
              </HStack>

              <UserStats
                totalTimeSec={userInfo.totalTimeSec}
                ranking={userInfo.ranking}
                flexDir="row"
                justifyContent="space-around"
                w="full"
              />

              <ClockInOutButton userId={userInfo.id} isClockedIn={userInfo.lastLog?.status === "CURRENTLY_IN"} />
            </VStack>
            <Separator mb={4} />
          </>)}

          <CurrentlyClockedIn hasUser={!!userInfo} isAdmin={isAdmin} canClockInUsers={canClockInUsers} />
        </Tabs.Content>

        {todayBoard && (<Tabs.Content value="availability">
          <DayAttendanceSection />
        </Tabs.Content>)}

        <Tabs.Content value="leaderboard">
          <LeaderboardTabPanel initialRankings={rankings} statRanges={statRanges} />
        </Tabs.Content>

      </Tabs.Root>

    </CurrentlyClockedInProvider>)}
  </Suspense>);
}

async function CurrentlyClockedIn(props: {
  hasUser?: boolean;
  isAdmin?: boolean;
  canClockInUsers?: UserDTO[];
}) {
  const { hasUser, isAdmin, canClockInUsers } = props;
  const t = await getTranslations("HomePage");

  return (<Stack gap={2}>
    <Stack gap={1}>
      <TitleBar
        title={t("headings.currentlyIn")}
        keepAfterInline={true}
        after={<>
          <CurrentlyClockedInCountBadge />
          <RefreshButton />
        </>}
        end={isAdmin && canClockInUsers ? <ClockUserInPopover
          buttonProps={{ size: "xs", variant: "ghost" }}
          users={canClockInUsers}
        /> : null}
      />

      <Box textAlign="right">
        <LastUpdatedText fontSize="xs" color="fg.muted" date={(() => new Date())()} />
      </Box>
    </Stack>

    <CurrentlyClockedInContent>
      <ClientOnly fallback={<Spinner size="lg" />}>
        <CurrentlyClockedInSearchInput mb={2} placeholder={"Search..."} />

        <CurrentlyClockedInTable showAdminActions={isAdmin} showUserAvatar={hasUser} />

        <CurrentlyClockedInPaginationControls hideWhenZeroCount />
      </ClientOnly>
    </CurrentlyClockedInContent>

    <CurrentlyClockedInNoData hasUser={hasUser} />
  </Stack>);
}
