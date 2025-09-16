import { EmptyState, GridItem, Heading, Pagination, SimpleGrid, VStack } from "@chakra-ui/react";
import { LuBuilding } from "react-icons/lu";

import { adminClockOut, adminLockLog, deleteTimelog, getAllCurrentlyInTimelogDTOs, getAllUsersTotalTimeSec, getUserCurrentLogDTO } from "@/lib/data/timelog-dto";
import { getAllUserNames, getUserDTO } from "@/lib/data/user-dto";
import CurrentlyInTable from "./CurrentlyInTable";
import UserCard from "./UserCard";
import StatsCard from "./StatsCard";
import { revalidatePath } from "next/cache";

export default async function Home() {

  const userId: string | undefined = "68c91fd788fab1b583243a12";

  // Get All User Names
  const allUserNames = await getAllUserNames();
  const userNameMap = Object.fromEntries(allUserNames.map(user => [user.id, user.name]));

  // Get All Users Total Time
  const allUsersTotalTimeSec = await getAllUsersTotalTimeSec();
  const rankings = Object.entries(allUsersTotalTimeSec)
    .sort((a, b) => b[1] - a[1])
    .map(([id, duration]) => ({ id, name: userNameMap[id], duration }));

  // Get Current User Info
  const user = userId && await getUserDTO(userId);
  if (userId && !user) {
    throw new Error("User not found");
    // TODO: implement proper error handling
  }
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
          {user &&
            <UserCard
              user={user}
              isClockedin={!!userCurrentLog}
              totalTimeSec={allUsersTotalTimeSec[userId] || 0}
              ranking={userRank}
            />
          }

          {/* Stats card */}
          <StatsCard rankings={rankings} />
        </VStack>
      </GridItem>

      {/* Right column */}
      <GridItem colSpan={{ base: 1, md: 3 }}>
        <Pagination.Root count={currentlyInLogs.length} pageSize={8} defaultPage={1}>
          <Heading as="h2" size="xl" mb={4}>Currently Clocked-in Users</Heading>

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
                await deleteTimelog(id);
                revalidatePath("/");
              }}
            />
            : <NoCurrentlyInEmptyState />}
        </Pagination.Root>
      </GridItem>
    </SimpleGrid >
  );
}

function NoCurrentlyInEmptyState() {
  return (
    <EmptyState.Root>
      <EmptyState.Content>
        <EmptyState.Indicator>
          <LuBuilding />
        </EmptyState.Indicator>
        <VStack textAlign="center">
          <EmptyState.Title>No Users</EmptyState.Title>
          <EmptyState.Description>
            There are currently no users clocked-in. <br />
            You can clock-in yourself by clicking the &quot;Clock-in&quot; button on the left.
          </EmptyState.Description>
        </VStack>
      </EmptyState.Content>
    </EmptyState.Root>
  );
}
