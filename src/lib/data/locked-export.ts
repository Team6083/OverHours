import "server-only";

import { Prisma } from "@/generated/prisma";
import prisma from "../prisma";
import { formatWallTime, fromWallTime } from "../zoned-time";

export type LockedTimeLogRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  inTime: Date;
  /** Cut-off for automatic locks, the moment of locking for manual ones. */
  outTime?: Date;
  /** UNKNOWN for logs locked before the reason was recorded. */
  lockReason: "AUTO_TIMEOUT" | "ADMIN" | "UNKNOWN";
  lockedAt?: Date;
  lockedById?: string;
  lockedByName?: string;
  notes?: string;
};

export type LockedTimeLogRange = {
  /** Inclusive lower bound on inTime. */
  startTime?: Date;
  /** Exclusive upper bound on inTime. */
  endTime?: Date;
};

/** API form of a stored lock reason; undefined for logs locked before reasons were recorded. */
export function toApiLockReason(reason: "AutoTimeout" | "Admin" | null): "AUTO_TIMEOUT" | "ADMIN" | undefined {
  if (reason === "AutoTimeout") return "AUTO_TIMEOUT";
  if (reason === "Admin") return "ADMIN";
  return undefined;
}

/**
 * [start, end) bounds for whole days `YYYY-MM-DD` (both inclusive) in `timeZone`, so a report range means
 * the same days as the cut-off and the CSV times regardless of the viewer's browser zone.
 */
export function dayRangeInZone(startDate: string | undefined, endDate: string | undefined, timeZone: string): LockedTimeLogRange {
  const day = (v: string, offset: number) => {
    const [y, m, d] = v.split("-").map(Number);
    return fromWallTime(y, m, d + offset, 0, 0, timeZone);
  };

  return {
    startTime: startDate ? day(startDate, 0) : undefined,
    endTime: endDate ? day(endDate, 1) : undefined,
  };
}

/** CSV download response for locked logs, shared by the report route and the Admin API. */
export function lockedCsvResponse(rows: LockedTimeLogRow[], range: LockedTimeLogRange, timeZone: string): Response {
  return new Response(lockedTimeLogRowsToCsv(rows, timeZone), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${lockedCsvFilename(range, timeZone)}"`,
      "Cache-Control": "no-store",
      // The file holds user-entered text (names, notes); never let a browser run it as a page
      "Content-Security-Policy": "sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Locked time logs whose clock-in falls in the range, oldest first, joined with user and locker names.
 * No authorization check: callers
 * (admin-only report route, API-key Admin API) must gate access.
 */
export async function queryLockedTimeLogRows(range: LockedTimeLogRange = {}): Promise<LockedTimeLogRow[]> {
  const where: Prisma.TimeLogWhereInput = { status: "Locked" };
  if (range.startTime || range.endTime) {
    where.inTime = { gte: range.startTime, lt: range.endTime };
  }

  const logs = await prisma.timeLog.findMany({
    where,
    orderBy: { inTime: "asc" },
    include: { user: { select: { name: true, email: true } } },
  });

  const lockerIds = [...new Set(logs.map(l => l.lockedById).filter((id): id is string => !!id))];
  const lockers = lockerIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: lockerIds } }, select: { id: true, name: true } })
    : [];
  const lockerNames = new Map(lockers.map(u => [u.id, u.name]));

  return logs.map(log => ({
    id: log.id,
    userId: log.userId,
    userName: log.user.name,
    userEmail: log.user.email,
    inTime: log.inTime,
    outTime: log.outTime ?? undefined,
    lockReason: toApiLockReason(log.lockReason) ?? "UNKNOWN",
    lockedAt: log.lockedAt ?? undefined,
    lockedById: log.lockedById ?? undefined,
    lockedByName: log.lockedById ? lockerNames.get(log.lockedById) : undefined,
    notes: log.notes || undefined,
  }));
}

function csvCell(value: string | undefined): string {
  let v = value ?? "";
  // Neutralise spreadsheet formula injection from user-controlled text (names, notes).
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * CSV (with a UTF-8 BOM so Excel reads non-ASCII names correctly). Times are written as wall-clock
 * times in `timeZone`, which is named in the headers.
 */
export function lockedTimeLogRowsToCsv(rows: LockedTimeLogRow[], timeZone: string): string {
  const fmt = (d?: Date) => (d ? formatWallTime(d, timeZone) : undefined);

  const header = [
    "Log ID", "User", "Email",
    `In Time (${timeZone})`, `Out / Cut-off Time (${timeZone})`, `Locked At (${timeZone})`,
    "Lock Reason", "Locked By", "Notes",
  ];

  const lines = rows.map(r => [
    r.id, r.userName, r.userEmail,
    fmt(r.inTime), fmt(r.outTime), fmt(r.lockedAt),
    r.lockReason, r.lockedByName ?? r.lockedById, r.notes,
  ]);

  return "﻿" + [header, ...lines].map(cols => cols.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function lockedCsvFilename(range: LockedTimeLogRange, timeZone: string): string {
  const day = (d: Date) => formatWallTime(d, timeZone).slice(0, 10);
  const parts = ["locked-logs"];
  if (range.startTime) parts.push(day(range.startTime));
  if (range.endTime) parts.push(day(new Date(range.endTime.getTime() - 1)));
  return `${parts.join("_")}.csv`;
}
