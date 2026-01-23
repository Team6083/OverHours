import { Box, Breadcrumb, Heading, HStack, Separator } from "@chakra-ui/react";
import Link from "next/link";
import { Fragment } from "react";

import { getAllTeamDTOs } from "@/lib/data/team-dto";

export default async function TeamLayout(props: { children: React.ReactNode, params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const teams = await getAllTeamDTOs();

  const findParents = (teamId: string): string[] => {
    const parents: string[] = [];
    let currentId: string | null = teamId;

    while (currentId) {
      const team = teams.find(t => t.id === currentId);
      if (!team || !team.parentTeamId) break;
      parents.push(team.parentTeamId);
      currentId = team.parentTeamId;
    }

    return parents;
  };

  const parentIds = findParents(id);

  const team = teams.find(t => t.id === id);
  const parentTeams = parentIds.map(pid => teams.find(t => t.id === pid)).filter(Boolean) as typeof teams;

  return <Box px={4}>
    <Heading as="h3" size="md">Current Team</Heading>

    <Breadcrumb.Root variant="underline" mb={4}>
      <Breadcrumb.List>
        {parentTeams.reverse().map((team) => (<Fragment key={team.id}>
          <Breadcrumb.Item>
            <Breadcrumb.Link asChild>
              <Link href={`/admin/teams-new/${team.id}`}>{team.name}</Link>
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
        </Fragment>))}

        <Breadcrumb.Item>
          <Breadcrumb.CurrentLink>{team?.name}</Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>

    {props.children}
  </Box>
}
