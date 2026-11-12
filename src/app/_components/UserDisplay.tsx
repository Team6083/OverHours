import { HStack, Stack, Tag, Text } from "@chakra-ui/react";

import UserAvatar from "@/components/UserAvatar";

export default function UserDisplay(props: {
  user: {
    id: string,
    name?: string,
    image?: string,
    ranking?: number,
    teams: { id: string, name: string }[],
  }
}) {
  const { user } = props;
  const hasTeams = user.teams && user.teams.length > 0;

  return (
    <HStack gap={4}>

      <UserAvatar
        name={user.name ?? ""}
        image={user.image}
        size={hasTeams ? { base: "sm", md: "xl" } : "xs"}
        rank={user.ranking}
      />

      <Stack gap={1}>
        <Text fontWeight="medium" fontSize="lg">{user.name}</Text>
        {hasTeams && (
          <HStack gap={1} justifyContent="center" alignContent="center" flexWrap="wrap">
            {user.teams.map((team) => (
              <Tag.Root key={team.id} variant="surface">
                <Tag.Label>{team.name}</Tag.Label>
              </Tag.Root>
            ))}
          </HStack>
        )}
      </Stack>

    </HStack>
  );
}
