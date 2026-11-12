"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  Alert, Badge, Button, ButtonGroup, Card, Checkbox, HStack, Heading, Icon, List, RadioGroup, Stack, Text,
} from "@chakra-ui/react";
import { LuMerge } from "react-icons/lu";

import type { MergeConflictLog, MergePreview } from "@/lib/data/user-merge";
import { handleMergeUsers } from "./actions";

function formatLog(log: MergeConflictLog, nameById: Map<string, string>) {
  const range = `${log.inTime.toLocaleString()} – ${log.outTime ? log.outTime.toLocaleString() : "now"}`;
  return `${nameById.get(log.userId) ?? log.userId} (${range})`;
}

type MergeTeamOption = {
  id: string;
  name: string;
  members: { userId: string; viaRole: boolean }[];
};

/** Every team of the merged users, with who is in it and how they joined. */
function teamOptions(users: MergePreview["users"]): MergeTeamOption[] {
  const byId = new Map<string, MergeTeamOption>();
  for (const user of users) {
    for (const team of user.teams) {
      const option = byId.get(team.id) ?? { id: team.id, name: team.name, members: [] };
      option.members.push({ userId: user.id, viaRole: team.viaRole });
      byId.set(team.id, option);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function MergeTeamsPicker(props: {
  teams: MergeTeamOption[];
  nameById: Map<string, string>;
  dropTeamIds: string[];
  onChange: (dropTeamIds: string[]) => void;
}) {
  const { teams, nameById, dropTeamIds, onChange } = props;

  return <Stack gap={2}>
    <Heading as="h3" size="sm">Teams</Heading>
    <Text as="p" fontSize="sm" color="fg.muted">
      Choose the teams the kept user stays in. Each keeps how it was joined: by hand, or by role when every user
      in it joined by role. A role team that is not kept is joined again at the next sign-in if the user still
      has the role. A team the users join after this page loaded is kept too.
    </Text>
    {teams.map(team => (
      <Checkbox.Root
        key={team.id}
        checked={!dropTeamIds.includes(team.id)}
        onCheckedChange={(e) => onChange(e.checked
          ? dropTeamIds.filter(id => id !== team.id)
          : [...dropTeamIds, team.id])}
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control />
        <Checkbox.Label>
          <HStack flexWrap="wrap">
            <Text fontWeight="medium">{team.name}</Text>
            {team.members.map(member => (
              <Badge key={member.userId} colorPalette={member.viaRole ? "purple" : "gray"}>
                {nameById.get(member.userId) ?? member.userId}{member.viaRole ? " · Role" : ""}
              </Badge>
            ))}
          </HStack>
        </Checkbox.Label>
      </Checkbox.Root>
    ))}
  </Stack>;
}

export default function MergeUsersConfirm(props: {
  preview: MergePreview;
  currentUserId?: string;
}) {
  const { preview, currentUserId } = props;
  const { users, conflicts, conflictCount } = preview;

  // Users are sorted by createdAt, so the oldest one is the default target.
  const [targetId, setTargetId] = useState(users[0].id);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const teams = useMemo(() => teamOptions(users), [users]);
  // Every team is kept unless the admin unticks it. Only the unticked teams are sent, so a team the users join
  // after this page loaded is kept too.
  const [dropTeamIds, setDropTeamIds] = useState<string[]>([]);

  const nameById = new Map(users.map(u => [u.id, u.name]));
  const sources = users.filter(u => u.id !== targetId);
  const mergesSelfAway = !!currentUserId && sources.some(u => u.id === currentUserId);
  const hasConflicts = conflictCount > 0;
  const totalLogs = users.reduce((sum, u) => sum + u.timeLogCount, 0);

  const submit = () => startTransition(async () => {
    const state = await handleMergeUsers(targetId, users.map(u => u.id), dropTeamIds);
    setError(state?.error);
  });

  return <Card.Root variant="elevated">
    <Card.Header>
      <Card.Title asChild><Heading as="h2" size="md">Merge Users</Heading></Card.Title>
      <Card.Description>
        Choose the user to keep. The time logs of the other users are moved to it, then the other users are deleted.
      </Card.Description>
    </Card.Header>

    <Card.Body>
      <Stack gap={4}>
        <RadioGroup.Root value={targetId} onValueChange={(e) => setTargetId(e.value ?? targetId)}>
          <Stack gap={2}>
            {users.map(user => (
              <RadioGroup.Item key={user.id} value={user.id}>
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemIndicator />
                <RadioGroup.ItemText>
                  <HStack flexWrap="wrap">
                    <Text fontWeight="medium">{user.name}</Text>
                    <Text color="fg.muted">{user.email}</Text>
                    <Badge>{user.timeLogCount} time logs</Badge>
                    {user.id === currentUserId && <Badge colorPalette="blue">You</Badge>}
                    {user.id === targetId
                      ? <Badge colorPalette="green">Keep</Badge>
                      : <Badge colorPalette="red">Delete</Badge>}
                  </HStack>
                </RadioGroup.ItemText>
              </RadioGroup.Item>
            ))}
          </Stack>
        </RadioGroup.Root>

        {teams.length > 0 && (
          <MergeTeamsPicker teams={teams} nameById={nameById} dropTeamIds={dropTeamIds} onChange={setDropTeamIds} />
        )}

        <Text as="p" fontSize="sm" color="fg.muted">Linked sign-in accounts of the deleted users move to the kept user, so signing in with any of them reaches the kept user.</Text>

        <Text as="p" fontSize="sm" color="fg.muted">{totalLogs} time logs will belong to the kept user. Its name and email stay unchanged. With several linked accounts its email no longer follows a provider; edit it on the user&apos;s page.</Text>

        {hasConflicts && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Overlapping time logs ({conflictCount})</Alert.Title>
              <Alert.Description>
                <Text mb={2}>Time logs of different users overlap, so these users cannot be merged. Fix or remove them first. A log that is still clocked in counts as lasting until now.</Text>
                <List.Root>
                  {conflicts.map(c => (
                    <List.Item key={`${c.a.id}-${c.b.id}`}>
                      {formatLog(c.a, nameById)} ↔ {formatLog(c.b, nameById)}
                    </List.Item>
                  ))}
                </List.Root>
                {conflictCount > conflicts.length && <Text mt={2}>… and {conflictCount - conflicts.length} more.</Text>}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {mergesSelfAway && (
          <Alert.Root status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>
                You cannot merge your own account into another user. Choose your account as the one to keep.
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {error && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content>
          </Alert.Root>
        )}

      </Stack>
    </Card.Body>

    <Card.Footer justifyContent="flex-end">
      <ButtonGroup size="sm" variant="subtle">
        <Button asChild><Link href="/admin/users">Cancel</Link></Button>
        <Button colorPalette="red" onClick={submit} loading={pending} disabled={hasConflicts || mergesSelfAway}>
          <Icon><LuMerge /></Icon>
          Merge
        </Button>
      </ButtonGroup>
    </Card.Footer>
  </Card.Root>;
}
