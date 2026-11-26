"use client";
import { Badge, HStack, Stack, Text } from "@chakra-ui/react";
import { FactList } from "@team6083/ui";

import GenericClipboard from "@/components/common/Clipboard";
import DeleteDialog, { type DeleteDialogControls } from "@/components/common/DeleteDialog";
import TimeLogStatusBadge from "@/components/timelog/TimeLogStatusBadge";
import { TimeLogDTO } from "@/lib/data/timelog-dto";
import { formatDuration } from "@/lib/util";

type DeletedTimeLog = Pick<TimeLogDTO, "id" | "userId" | "status" | "inTime"> & Partial<Pick<TimeLogDTO, "outTime" | "notes">>;

/**
 * Asks before deleting time logs: the facts of one log, or a line per log.
 *
 * The dialog is narrow, so its FactLists use alignItems="start" (FactList stretches each fact to its row, which made
 * badges tall) and IDs may break anywhere (otherwise they run into the next column).
 */
export default function DeleteTimeLogsDialog(props: DeleteDialogControls & {
  logs: DeletedTimeLog[];
  userNames: Record<string, string | undefined>;
  /** Deletes the logs. The caller passes it so each page revalidates its own path. */
  onDelete: (ids: string[]) => Promise<unknown>;
}) {
  const { logs, userNames, onDelete, ...controls } = props;

  return <DeleteDialog
    {...controls}
    message={logs.length === 1
      ? "Are you sure you want to delete this time log?"
      : "Are you sure you want to delete the following time logs?"}
    onDelete={() => onDelete(logs.map(log => log.id))}
  >
    {logs.length === 1 ? <TimeLogFacts log={logs[0]} userName={userNames[logs[0].userId]} /> : <>
      <Stack gap={2}>
        {logs.map(log => (
          <HStack key={log.id} flexWrap="wrap">
            <Badge colorPalette="brand">{userNames[log.userId] ?? log.userId}</Badge>
            <TimeLogStatusBadge status={log.status} />
            <Badge fontFamily="mono">{log.inTime.toLocaleString()} - {log.outTime?.toLocaleString() ?? "N/A"}</Badge>
          </HStack>
        ))}
      </Stack>
      <Text color="fg.muted">Total {logs.length} logs selected</Text>
    </>}
  </DeleteDialog>;
}

function TimeLogFacts(props: { log: DeletedTimeLog; userName?: string }) {
  const { log, userName } = props;

  return <FactList alignItems="start" items={[
    { label: "TimeLog ID", value: <GenericClipboard wordBreak="break-all" value={log.id} /> },
    {
      label: "User",
      value: <HStack flexWrap="wrap" gap={2}>
        {userName && <Badge colorPalette="brand">{userName}</Badge>}
        <GenericClipboard color="fg.muted" wordBreak="break-all" value={log.userId} />
      </HStack>,
    },
    { label: "Status", value: <TimeLogStatusBadge status={log.status} /> },
    { label: "Clock-in Time", value: log.inTime.toLocaleString() },
    ...(log.outTime ? [
      { label: "Clock-out Time", value: log.outTime.toLocaleString() },
      {
        label: "Duration",
        value: formatDuration(Math.round((log.outTime.getTime() - log.inTime.getTime()) / 1000)),
      },
    ] : []),
    ...(log.notes ? [{ label: "Notes", value: log.notes }] : []),
  ]} />;
}
