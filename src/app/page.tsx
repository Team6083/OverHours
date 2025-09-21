import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { EmptyState, GridItem, Heading, Pagination, SimpleGrid, VStack } from "@chakra-ui/react";
import { LuBuilding } from "react-icons/lu";

import { auth, Role } from "@/auth";
import LeaderboardCard from "@/components/LeaderboardCard";
import { adminClockOut, adminLockLog, deleteTimeLog, getAllCurrentlyInTimelogDTOs, getAllUsersTotalTimeSec, getUserCurrentLogDTO } from "@/lib/data/timelog-dto";
import { getAllUserNames, getUserDTO } from "@/lib/data/user-dto";
import CurrentlyInTable from "./CurrentlyInTable";
import UserCard from "./UserCard";

export default async function Home() {
  const t = await getTranslations('HomePage');

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
  const user = userDTO ? {
    id: userDTO.id,
    name: userDTO.name,
    image: session?.user.image || undefined,
  } : undefined;

  const userCurrentLog = userId && await getUserCurrentLogDTO(userId);
  const userRank = rankings.findIndex(r => r.id === userId) + 1;

  // Get Currently In Logs
  const currentlyInLogs = (await getAllCurrentlyInTimelogDTOs()).map(log => ({
    id: log.id,
    user: userNameMap[log.userId] || log.userId,
    inTime: log.inTime,
  }));

  // const imageProps = getImageProps({
  //   src: "/image.png",
  //   alt: "John Doe's Avatar",
  //   width: 128,
  //   height: 128,
  // });

  return (
    <SimpleGrid columns={{ base: 1, md: 5 }} gapX={8} gapY={4}>
      {/* Left column */}
      <GridItem colSpan={{ base: 1, md: 2 }}>
        <VStack gap={4}>
          {/* User card */}
          {user && (
            <UserCard
              user={user}
              isClockedin={!!userCurrentLog}
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
        <Pagination.Root count={currentlyInLogs.length} pageSize={8} defaultPage={1}>
          <Heading as="h2" size="xl" mb={4}>{t("headings.currentlyIn")}</Heading>

          {currentlyInLogs.length > 0
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
            </>}
        </Pagination.Root>
      </GridItem>
    </SimpleGrid>
  );
}
