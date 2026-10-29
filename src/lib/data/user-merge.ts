import "server-only";
import { auth, Role } from "@/auth";
import { objectIdSchema } from "../objectid";
import prisma from "../prisma";

export type MergeUserSummary = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  timeLogCount: number;
};

export type MergeConflict = {
  a: MergeConflictLog;
  b: MergeConflictLog;
};

export type MergeConflictLog = {
  id: string;
  userId: string;
  inTime: Date;
  outTime?: Date;
};

export type MergePreview = {
  users: MergeUserSummary[];
  conflicts: MergeConflict[];
  conflictCount: number;
};

export class MergeUsersError extends Error { }

const MAX_REPORTED_CONFLICTS = 50;

type LogRange = { id: string; userId: string; inTime: Date; outTime: Date | null };

// A log without an outTime (CurrentlyIn) is treated as lasting until now.
// Touching ranges (one ends exactly when the other starts) do not overlap.
// A zero-length log is a single instant, which conflicts when it falls inside
// another range (start inclusive, end exclusive) or at the same instant.
type Range = { start: number; end: number };

function overlaps(a: Range, b: Range): boolean {
  const aIsInstant = a.start === a.end;
  const bIsInstant = b.start === b.end;
  if (aIsInstant && bIsInstant) return a.start === b.start;
  if (aIsInstant) return b.start <= a.start && a.start < b.end;
  if (bIsInstant) return a.start <= b.start && b.start < a.end;
  return a.start < b.end && b.start < a.end;
}

function findConflicts(logs: LogRange[]): { conflicts: MergeConflict[]; count: number } {
  const now = Date.now();
  const ranges = logs
    .map(log => ({ log, start: log.inTime.getTime(), end: log.outTime ? log.outTime.getTime() : now }))
    .sort((x, y) => x.start - y.start);

  const toReported = (log: LogRange): MergeConflictLog => ({
    id: log.id,
    userId: log.userId,
    inTime: log.inTime,
    outTime: log.outTime ?? undefined,
  });

  const conflicts: MergeConflict[] = [];
  let count = 0;
  let active: typeof ranges = [];

  for (const cur of ranges) {
    active = active.filter(r => r.end >= cur.start);

    for (const prev of active) {
      if (prev.log.userId === cur.log.userId) continue;
      if (!overlaps(prev, cur)) continue;

      count++;
      if (conflicts.length < MAX_REPORTED_CONFLICTS) {
        conflicts.push({ a: toReported(prev.log), b: toReported(cur.log) });
      }
    }

    active.push(cur);
  }

  return { conflicts, count };
}

async function requireAdmin() {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  if (session.user.role !== Role.ADMIN) {
    throw new Error("Forbidden");
  }

  return session;
}

function areValidIds(ids: string[]) {
  return ids.every(id => objectIdSchema.safeParse(id).success);
}

export async function getMergePreview(ids: string[]): Promise<MergePreview | null> {
  await requireAdmin();

  if (!areValidIds(ids)) {
    return null;
  }

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    orderBy: { createdAt: "asc" },
  });

  if (users.length !== new Set(ids).size) {
    return null;
  }

  const logs = await prisma.timeLog.findMany({
    where: { userId: { in: ids } },
    select: { id: true, userId: true, inTime: true, outTime: true },
  });

  const countByUser = new Map<string, number>();
  for (const log of logs) {
    countByUser.set(log.userId, (countByUser.get(log.userId) ?? 0) + 1);
  }

  const { conflicts, count } = findConflicts(logs);

  return {
    users: users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      timeLogCount: countByUser.get(user.id) ?? 0,
    })),
    conflicts,
    conflictCount: count,
  };
}

export async function mergeUsers(targetId: string, userIds: string[]) {
  const session = await requireAdmin();

  const ids = Array.from(new Set(userIds));
  if (ids.length < 2) {
    throw new MergeUsersError("Select at least two users to merge.");
  }

  if (!areValidIds(ids)) {
    throw new MergeUsersError("Some of the selected users no longer exist.");
  }

  if (!ids.includes(targetId)) {
    throw new MergeUsersError("The target user must be one of the selected users.");
  }

  const sourceIds = ids.filter(id => id !== targetId);
  if (session.user.id && sourceIds.includes(session.user.id)) {
    throw new MergeUsersError("You cannot merge your own account into another user. Choose your account as the target instead.");
  }

  await prisma.$transaction(async (tx) => {
    const userCount = await tx.user.count({ where: { id: { in: ids } } });
    if (userCount !== ids.length) {
      throw new MergeUsersError("Some of the selected users no longer exist.");
    }

    const logs = await tx.timeLog.findMany({
      where: { userId: { in: ids } },
      select: { id: true, userId: true, inTime: true, outTime: true },
    });

    const { count } = findConflicts(logs);
    if (count > 0) {
      throw new MergeUsersError(`Found ${count} overlapping time log(s) between the selected users. Resolve them before merging.`);
    }

    await tx.timeLog.updateMany({
      where: { userId: { in: sourceIds } },
      data: { userId: targetId },
    });

    await tx.user.deleteMany({
      where: { id: { in: sourceIds } },
    });
  });
}
