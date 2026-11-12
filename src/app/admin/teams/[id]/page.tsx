import Link from "next/link";
import { Breadcrumb, EmptyState, VStack } from "@chakra-ui/react";
import { LuSearchX } from "react-icons/lu";

import { getAllTeamDTOs, getTeamMembers } from "@/lib/data/team-dto";
import { getAllUserNames } from "@/lib/data/user-dto";
import { getTeamAncestors } from "@/lib/team-tree";
import TeamDetail from "./TeamDetail";

export default async function TeamPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const teams = await getAllTeamDTOs();
  const team = teams.find(t => t.id === id);

  if (!team) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <LuSearchX />
          </EmptyState.Indicator>
          <VStack textAlign="center">
            <EmptyState.Title>Team not found</EmptyState.Title>
            <EmptyState.Description>No team has the ID &quot;{id}&quot;.</EmptyState.Description>
          </VStack>
        </EmptyState.Content>
      </EmptyState.Root>
    );
  }

  const [members, users] = await Promise.all([getTeamMembers(id), getAllUserNames()]);
  const ancestors = getTeamAncestors(teams, id).reverse();

  return <>
    <Breadcrumb.Root mb={4}>
      <Breadcrumb.List>
        {ancestors.map(ancestor => [
          <Breadcrumb.Item key={ancestor.id}>
            <Breadcrumb.Link asChild>
              <Link href={`/admin/teams/${ancestor.id}`}>{ancestor.name}</Link>
            </Breadcrumb.Link>
          </Breadcrumb.Item>,
          <Breadcrumb.Separator key={`${ancestor.id}-sep`} />,
        ])}
        <Breadcrumb.Item>
          <Breadcrumb.CurrentLink>{team.name}</Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>

    <TeamDetail key={team.id} team={team} teams={teams} members={members} users={users} />
  </>;
}
