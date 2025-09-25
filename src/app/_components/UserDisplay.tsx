import { HStack, Avatar, Stack, Tag, Text } from "@chakra-ui/react";

export default function UserDisplay(props: {
  user: {
    id: string,
    name?: string,
    image?: string,
    teams: { id: string, name: string }[],
  }
}) {
  const { user } = props;
  const hasTeams = user.teams && user.teams.length > 0;

  return (
    <HStack gap={4}>

      <Avatar.Root size={hasTeams ? { base: "sm", md: "xl" } : "xs"}>
        <Avatar.Fallback name={user.name} />
        <Avatar.Image src={user.image} />
      </Avatar.Root>

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
