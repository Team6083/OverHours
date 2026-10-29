"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Alert, Badge, Button, ButtonGroup, HStack, Heading, Icon, List, RadioGroup, Stack, Text } from "@chakra-ui/react";
import { LuMerge } from "react-icons/lu";

import type { MergeConflictLog, MergePreview } from "@/lib/data/user-merge";
import { handleMergeUsers } from "./actions";

function formatLog(log: MergeConflictLog, nameById: Map<string, string>) {
  const range = `${log.inTime.toLocaleString()} – ${log.outTime ? log.outTime.toLocaleString() : "now"}`;
  return `${nameById.get(log.userId) ?? log.userId} (${range})`;
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

  const nameById = new Map(users.map(u => [u.id, u.name]));
  const sources = users.filter(u => u.id !== targetId);
  const mergesSelfAway = !!currentUserId && sources.some(u => u.id === currentUserId);
  const hasConflicts = conflictCount > 0;
  const totalLogs = users.reduce((sum, u) => sum + u.timeLogCount, 0);

  const submit = () => startTransition(async () => {
    const state = await handleMergeUsers(targetId, users.map(u => u.id));
    setError(state?.error);
  });

  return <Stack gap={4}>
    <Heading as="h2" size="md">Merge Users</Heading>

    <Text>Choose the user to keep. The time logs of the other users are moved to it, then the other users are deleted.</Text>

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

    <Text color="fg.muted">Deleted users' emails are not remembered: if someone signs in again with the email of a deleted user, a new user is created.</Text>

    <Text color="fg.muted">{totalLogs} time logs will belong to the kept user. Its name and email stay unchanged.</Text>

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

    <HStack justify="flex-end">
      <ButtonGroup size="sm" variant="subtle">
        <Button asChild><Link href="/admin/users">Cancel</Link></Button>
        <Button colorPalette="red" onClick={submit} loading={pending} disabled={hasConflicts || mergesSelfAway}>
          <Icon><LuMerge /></Icon>
          Merge
        </Button>
      </ButtonGroup>
    </HStack>
  </Stack>;
}
