import { EmptyState, GridItem, Heading, Pagination, SimpleGrid, VStack } from "@chakra-ui/react";
import { LuBuilding } from "react-icons/lu";

import { getAllCurrentlyInTimelogDTOs, getUserClockStatus } from "@/lib/data/timelog-dto";
import { getUserDTO } from "@/lib/data/user-dto";
import CurrentlyInTable from "./CurrentlyInTable";
import UserCard from "./UserCard";
import StatsCard from "./StatsCard";

export default async function Home() {

  const userId: string | undefined = "68c91fd788fab1b583243a12";

  const user = userId && await getUserDTO(userId);
  if (userId && !user) {
    throw new Error("User not found");
    // TODO: implement proper error handling
  }

  const { isClockedin, totalTimeSec, rank } = (userId && await getUserClockStatus(userId)) || {};

  const currentlyInLogs = (await getAllCurrentlyInTimelogDTOs()).map(log => ({
    id: log.id,
    user: log.userDisplayName,
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
              isClockedin={isClockedin}
              totalTimeSec={totalTimeSec}
              ranking={rank}
            />
          }

          {/* Stats card */}
          <StatsCard />
        </VStack>
      </GridItem>

      {/* Right column */}
      <GridItem colSpan={{ base: 1, md: 3 }}>
        <Pagination.Root count={currentlyInLogs.length} pageSize={8} defaultPage={1}>
          <Heading as="h2" size="xl" mb={4}>Currently Clocked-in Users</Heading>
          {currentlyInLogs.length > 0 ? <CurrentlyInTable items={currentlyInLogs} /> : <NoCurrentlyInEmptyState />}
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
