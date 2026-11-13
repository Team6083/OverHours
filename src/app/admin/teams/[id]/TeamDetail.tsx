"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Avatar, Badge, Button, ButtonGroup, Card, CloseButton, DataList, Dialog, Editable, HStack, Heading, IconButton,
  Input, NativeSelect, Portal, Stack, Table, Text,
} from "@chakra-ui/react";
import { LuBellRing, LuCheck, LuPencilLine, LuTrash2, LuUserMinus, LuUserPlus, LuX } from "react-icons/lu";

import UserCombobox from "@/components/UserCombobox";
import { InfoTip } from "@/components/ui/toggle-tip";
import { toaster } from "@/components/ui/toaster";
import type { TeamDTO, TeamMemberDTO } from "@/lib/data/team-dto";
import { parseAutoJoinRoles } from "@/lib/team-roles";
import { wouldCreateCycle } from "@/lib/team-tree";
import {
  type TeamActionResult, addTeamMembersAction, deleteTeamAction, moveTeamAction, removeTeamMemberAction, renameTeamAction,
  setAutoJoinRolesAction, setTeamLeadersAction, setTeamReminderWebhookAction,
} from "../actions";

function useTeamAction() {
  const [pending, startTransition] = useTransition();

  const run = (
    action: () => Promise<TeamActionResult>,
    onSuccess?: () => void,
    onError?: () => void,
  ) => startTransition(async () => {
    const result = await action();
    if (result.error) {
      toaster.error({ title: result.error });
      onError?.();
    } else {
      onSuccess?.();
    }
  });

  return { pending, run };
}

function TeamInfo(props: { team: TeamDTO; teams: TeamDTO[] }) {
  const { team, teams } = props;
  const { pending, run } = useTeamAction();

  // Controlled, so that a rejected rename shows the saved name again instead of the rejected text
  const [name, setName] = useState(team.name);
  const [savedName, setSavedName] = useState(team.name);
  if (savedName !== team.name) {
    setSavedName(team.name);
    setName(team.name);
  }

  // Controlled for the same reason: a rejected role list shows the saved list again
  const savedRolesText = team.autoJoinRoles.join(", ");
  const [roles, setRoles] = useState(savedRolesText);
  const [savedRoles, setSavedRoles] = useState(savedRolesText);
  if (savedRoles !== savedRolesText) {
    setSavedRoles(savedRolesText);
    setRoles(savedRolesText);
  }

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
            value={name}
            disabled={pending}
            onValueChange={(e) => setName(e.value)}
            onValueCommit={(e) => run(
              () => renameTeamAction(team.id, e.value),
              // The server trims the name
              () => setName(e.value.trim()),
              () => setName(team.name),
            )}
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
        <DataList.ItemLabel>
          Auto-join roles
          <InfoTip contentProps={{ maxW: "xs" }} buttonProps={{ "aria-label": "About auto-join roles" }}>
            {/* One element: the tip's content is a flex column, which would put each piece on its own line */}
            <Text>
              Comma-separated Keycloak roles, like ADMIN_ROLES: <code>role</code> for a realm role,{" "}
              <code>client:role</code> for a client role. Users with any of them join at sign-in and leave when they
              lose the role.
            </Text>
          </InfoTip>
        </DataList.ItemLabel>
        <DataList.ItemValue>
          <Editable.Root
            size="sm"
            value={roles}
            placeholder="None"
            disabled={pending}
            onValueChange={(e) => setRoles(e.value)}
            onValueCommit={(e) => run(
              () => setAutoJoinRolesAction(team.id, e.value),
              // Show the list as the server saved it: trimmed, without blanks or duplicates
              () => setRoles(parseAutoJoinRoles(e.value).join(", ")),
              () => setRoles(savedRolesText),
            )}
          >
            <Editable.Preview fontFamily="mono" />
            <Editable.Input fontFamily="mono" />
            <Editable.Control>
              <Editable.EditTrigger asChild>
                <IconButton variant="ghost" size="xs" aria-label="Edit auto-join roles"><LuPencilLine /></IconButton>
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

  // A member through a sub-team can still be added to this team directly
  const directMemberIds = useMemo(() => new Set(members.filter(m => m.direct).map(m => m.id)), [members]);
  const candidates = useMemo(
    () => users.filter(u => !directMemberIds.has(u.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [users, directMemberIds],
  );

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between" flexWrap="wrap">
          <Card.Title asChild><Heading as="h3" size="sm">Members ({members.length})</Heading></Card.Title>
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
      </Card.Header>
      <Card.Body>
        <Stack gap={3}>
          {members.some(member => member.viaTeams.length > 0) && (
            <Text textStyle="xs" color="fg.muted">
              Members of sub-teams are members of this team too: &quot;via&quot; shows those sub-teams, where that membership
              is managed. Removing someone here keeps them listed while they are in a sub-team.
            </Text>
          )}

          {members.some(member => member.direct && member.viaRole) && (
            <Text textStyle="xs" color="fg.muted">
              Members marked &quot;Role&quot; joined because of an auto-join role. Removing one ends that membership now;
              if they still have the role, they rejoin at their next sign-in.
            </Text>
          )}

          {members.length === 0 ? (
            <Text color="fg.muted">This team has no members yet.</Text>
          ) : (
            <Table.Root size="sm">
              <Table.Body>
                {members.map(member => (
                  <Table.Row key={member.id}>
                    <Table.Cell>
                      <HStack flexWrap="wrap">
                        <Avatar.Root size="xs">
                          <Avatar.Fallback name={member.name} />
                          {member.image && <Avatar.Image src={member.image} />}
                        </Avatar.Root>
                        <Text>{member.name}</Text>
                        {member.viaTeams.map(via => (
                          <Badge key={via.id} asChild size="sm" variant="outline">
                            <Link href={`/admin/teams/${via.id}`}>via {via.name}</Link>
                          </Badge>
                        ))}
                        {member.direct && member.viaRole && <Badge size="sm" colorPalette="purple">Role</Badge>}
                      </HStack>
                    </Table.Cell>
                    <Table.Cell color="fg.muted" hideBelow="sm">{member.email}</Table.Cell>
                    <Table.Cell textAlign="end">
                      {member.direct && (
                        <IconButton
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          aria-label={`Remove ${member.name}`}
                          title={member.viaRole
                            ? "Remove. They rejoin at their next sign-in if they still have the role."
                            : "Remove"}
                          disabled={pending}
                          onClick={() => run(
                            () => removeTeamMemberAction(team.id, member.id),
                            // They stay listed, so say why rather than look like the removal failed
                            () => member.viaTeams.length > 0 && toaster.info({
                              title: `${member.name} is still a member via ${member.viaTeams.map(via => via.name).join(", ")}.`,
                            }),
                          )}
                        >
                          <LuUserMinus />
                        </IconButton>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}

function TeamReminder(props: { team: TeamDTO; users: { id: string; name: string }[] }) {
  const { team, users } = props;
  const { pending, run } = useTeamAction();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [webhook, setWebhook] = useState("");

  const leaders = users.filter(u => team.leaderIds.includes(u.id));
  const candidates = users.filter(u => !team.leaderIds.includes(u.id)).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between" flexWrap="wrap">
          <Card.Title asChild><Heading as="h3" size="sm">Fill-in reminder</Heading></Card.Title>
          <Button asChild size="sm" variant="outline">
            <Link href={`/teams/${team.id}`}><LuBellRing />Reminder settings</Link>
          </Button>
        </HStack>
      </Card.Header>
      <Card.Body>
        <Stack gap={5}>
          <Stack gap={2}>
            <HStack justify="space-between" flexWrap="wrap">
              <Text fontWeight="medium">Leaders</Text>
              <HStack>
                <UserCombobox
                  users={candidates}
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                  placeholder="Add a leader"
                  size="sm"
                  minWidth="12rem"
                />
                <IconButton
                  size="sm"
                  variant="outline"
                  aria-label="Add leader"
                  disabled={!selectedUserId}
                  loading={pending}
                  onClick={() => run(() => setTeamLeadersAction(team.id, [...team.leaderIds, selectedUserId]), () => setSelectedUserId(""))}
                >
                  <LuUserPlus />
                </IconButton>
              </HStack>
            </HStack>
            <Text textStyle="xs" color="fg.muted">
              Leaders can change this team&apos;s reminder settings at /teams. They don&apos;t have to be members.
            </Text>
            {leaders.length === 0 ? <Text color="fg.muted" textStyle="sm">No leaders yet.</Text> : (
              <HStack gap={2} flexWrap="wrap">
                {leaders.map(leader => (
                  <Badge key={leader.id} size="lg" variant="outline">
                    {leader.name}
                    <CloseButton
                      size="2xs"
                      aria-label={`Remove ${leader.name} as leader`}
                      disabled={pending}
                      onClick={() => run(() => setTeamLeadersAction(team.id, team.leaderIds.filter(id => id !== leader.id)))}
                    />
                  </Badge>
                ))}
              </HStack>
            )}
          </Stack>

          <Stack gap={2}>
            <HStack gap={2}>
              <Text fontWeight="medium">Slack webhook</Text>
              {team.hasReminderWebhook ? <Badge colorPalette="green">Set</Badge> : <Badge>Not set</Badge>}
            </HStack>
            <Text textStyle="xs" color="fg.muted">
              The overlooking-bot webhook of the team&apos;s channel. It receives the emails of members who haven&apos;t
              filled in, so only admins can set it, and it is never shown again.
            </Text>
            <HStack>
              <Input
                size="sm"
                type="password"
                autoComplete="off"
                placeholder={team.hasReminderWebhook ? "Enter a new URL to replace it" : "https://…"}
                value={webhook}
                onChange={e => setWebhook(e.target.value)}
              />
              <Button size="sm" disabled={!webhook.trim()} loading={pending}
                onClick={() => run(() => setTeamReminderWebhookAction(team.id, webhook), () => setWebhook(""))}>
                Save
              </Button>
              {team.hasReminderWebhook && (
                <Button size="sm" variant="ghost" colorPalette="red" disabled={pending}
                  onClick={() => run(() => setTeamReminderWebhookAction(team.id, null))}>
                  Remove
                </Button>
              )}
            </HStack>
          </Stack>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}

function DeleteTeamButton(props: { team: TeamDTO; hasSubTeams: boolean; directMemberCount: number }) {
  const { team, hasSubTeams, directMemberCount } = props;
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
                  The team is deleted and its {directMemberCount} member(s) are removed from it.
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
  // Only a team without sub-teams can be deleted, so these are all its members
  const directMemberCount = members.filter(m => m.direct).length;

  return (
    <Stack gap={4}>
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between">
            <Card.Title asChild><Heading as="h2" size="md">{team.name}</Heading></Card.Title>
            <DeleteTeamButton team={team} hasSubTeams={hasSubTeams} directMemberCount={directMemberCount} />
          </HStack>
        </Card.Header>
        <Card.Body>
          <TeamInfo team={team} teams={teams} />
        </Card.Body>
      </Card.Root>

      <TeamMembers team={team} members={members} users={users} />

      <TeamReminder team={team} users={users} />
    </Stack>
  );
}
