"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar, Button, ButtonGroup, Card, CloseButton, DataList, Dialog, Editable, HStack, Heading, IconButton,
  NativeSelect, Portal, Stack, Table, Text,
} from "@chakra-ui/react";
import { LuCheck, LuPencilLine, LuTrash2, LuUserMinus, LuUserPlus, LuX } from "react-icons/lu";

import UserCombobox from "@/components/UserCombobox";
import { toaster } from "@/components/ui/toaster";
import type { TeamDTO, TeamMemberDTO } from "@/lib/data/team-dto";
import { wouldCreateCycle } from "@/lib/team-tree";
import {
  type TeamActionResult, addTeamMembersAction, deleteTeamAction, moveTeamAction, removeTeamMemberAction, renameTeamAction,
} from "../actions";

function useTeamAction() {
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<TeamActionResult>, onSuccess?: () => void) => startTransition(async () => {
    const result = await action();
    if (result.error) {
      toaster.error({ title: result.error });
    } else {
      onSuccess?.();
    }
  });

  return { pending, run };
}

function TeamInfo(props: { team: TeamDTO; teams: TeamDTO[] }) {
  const { team, teams } = props;
  const { pending, run } = useTeamAction();

  // A team cannot move under itself or its own sub-teams
  const parentOptions = useMemo(
    () => teams.filter(t => !wouldCreateCycle(teams, team.id, t.id)),
    [teams, team.id],
  );

  return (
    <DataList.Root orientation="horizontal">
      <DataList.Item>
        <DataList.ItemLabel>Name</DataList.ItemLabel>
        <DataList.ItemValue>
          <Editable.Root
            size="sm"
            defaultValue={team.name}
            disabled={pending}
            onValueCommit={(e) => run(() => renameTeamAction(team.id, e.value))}
          >
            <Editable.Preview />
            <Editable.Input />
            <Editable.Control>
              <Editable.EditTrigger asChild>
                <IconButton variant="ghost" size="xs" aria-label="Rename team"><LuPencilLine /></IconButton>
              </Editable.EditTrigger>
              <Editable.CancelTrigger asChild>
                <IconButton variant="outline" size="xs" aria-label="Cancel"><LuX /></IconButton>
              </Editable.CancelTrigger>
              <Editable.SubmitTrigger asChild>
                <IconButton variant="outline" size="xs" aria-label="Save"><LuCheck /></IconButton>
              </Editable.SubmitTrigger>
            </Editable.Control>
          </Editable.Root>
        </DataList.ItemValue>
      </DataList.Item>

      <DataList.Item>
        <DataList.ItemLabel>Parent team</DataList.ItemLabel>
        <DataList.ItemValue>
          <NativeSelect.Root size="sm" maxW="xs" disabled={pending}>
            <NativeSelect.Field
              value={team.parentTeamId ?? ""}
              onChange={(e) => run(() => moveTeamAction(team.id, e.currentTarget.value || null))}
            >
              <option value="">(None, top level)</option>
              {parentOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </DataList.ItemValue>
      </DataList.Item>

      <DataList.Item>
        <DataList.ItemLabel>ID</DataList.ItemLabel>
        <DataList.ItemValue><code>{team.id}</code></DataList.ItemValue>
      </DataList.Item>
      <DataList.Item>
        <DataList.ItemLabel>Created At</DataList.ItemLabel>
        <DataList.ItemValue>{team.createdAt.toLocaleString()}</DataList.ItemValue>
      </DataList.Item>
      <DataList.Item>
        <DataList.ItemLabel>Updated At</DataList.ItemLabel>
        <DataList.ItemValue>{team.updatedAt.toLocaleString()}</DataList.ItemValue>
      </DataList.Item>
    </DataList.Root>
  );
}

function TeamMembers(props: { team: TeamDTO; members: TeamMemberDTO[]; users: { id: string; name: string }[] }) {
  const { team, members, users } = props;
  const { pending, run } = useTeamAction();
  const [selectedUserId, setSelectedUserId] = useState("");

  const memberIds = useMemo(() => new Set(members.map(m => m.id)), [members]);
  const candidates = useMemo(
    () => users.filter(u => !memberIds.has(u.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [users, memberIds],
  );

  return (
    <Stack gap={3}>
      <HStack justify="space-between" flexWrap="wrap">
        <Heading as="h3" size="sm">Members ({members.length})</Heading>
        <HStack>
          <UserCombobox
            users={candidates}
            value={selectedUserId}
            onValueChange={setSelectedUserId}
            placeholder="Add a member"
            size="sm"
            minWidth="12rem"
          />
          <IconButton
            size="sm"
            variant="outline"
            aria-label="Add member"
            disabled={!selectedUserId}
            loading={pending}
            onClick={() => run(() => addTeamMembersAction(team.id, [selectedUserId]), () => setSelectedUserId(""))}
          >
            <LuUserPlus />
          </IconButton>
        </HStack>
      </HStack>

      {members.length === 0 ? (
        <Text color="fg.muted">This team has no members yet.</Text>
      ) : (
        <Table.Root size="sm">
          <Table.Body>
            {members.map(member => (
              <Table.Row key={member.id}>
                <Table.Cell>
                  <HStack>
                    <Avatar.Root size="xs">
                      <Avatar.Fallback name={member.name} />
                      {member.image && <Avatar.Image src={member.image} />}
                    </Avatar.Root>
                    <Text>{member.name}</Text>
                  </HStack>
                </Table.Cell>
                <Table.Cell color="fg.muted" hideBelow="sm">{member.email}</Table.Cell>
                <Table.Cell textAlign="end">
                  <IconButton
                    size="xs"
                    variant="ghost"
                    colorPalette="red"
                    aria-label={`Remove ${member.name}`}
                    disabled={pending}
                    onClick={() => run(() => removeTeamMemberAction(team.id, member.id))}
                  >
                    <LuUserMinus />
                  </IconButton>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </Stack>
  );
}

function DeleteTeamButton(props: { team: TeamDTO; hasSubTeams: boolean }) {
  const { team, hasSubTeams } = props;
  const router = useRouter();
  const { pending, run } = useTeamAction();

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button size="xs" variant="ghost" colorPalette="red">
          <LuTrash2 /> Delete team
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete &quot;{team.name}&quot;?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {hasSubTeams ? (
                <Text>This team has sub-teams. Delete or move them first.</Text>
              ) : (
                <Text>
                  The team is deleted and its {team.memberCount} member(s) are removed from it.
                  Their time logs are not affected.
                </Text>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <ButtonGroup size="sm">
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.ActionTrigger>
                <Button
                  colorPalette="red"
                  disabled={hasSubTeams}
                  loading={pending}
                  onClick={() => run(() => deleteTeamAction(team.id), () => router.push("/admin/teams"))}
                >
                  <LuTrash2 /> Delete
                </Button>
              </ButtonGroup>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export default function TeamDetail(props: {
  team: TeamDTO;
  teams: TeamDTO[];
  members: TeamMemberDTO[];
  users: { id: string; name: string }[];
}) {
  const { team, teams, members, users } = props;
  const hasSubTeams = teams.some(t => t.parentTeamId === team.id);

  return (
    <Stack gap={4}>
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between">
            <Heading as="h2" size="md">{team.name}</Heading>
            <DeleteTeamButton team={team} hasSubTeams={hasSubTeams} />
          </HStack>
        </Card.Header>
        <Card.Body>
          <TeamInfo team={team} teams={teams} />
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Body>
          <TeamMembers team={team} members={members} users={users} />
        </Card.Body>
      </Card.Root>
    </Stack>
  );
}
