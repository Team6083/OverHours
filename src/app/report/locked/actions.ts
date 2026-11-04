"use server";
import { auth, Role } from "@/auth";
import { LockedTimeLogRow, queryLockedTimeLogRows } from "@/lib/data/locked-export";

export async function getLockedReportRows(startTime?: Date, endTime?: Date): Promise<LockedTimeLogRow[] | null> {
  const session = await auth();
  if (!session || session.user.role !== Role.ADMIN) return null;

  return queryLockedTimeLogRows({
    startTime: startTime ? new Date(startTime) : undefined,
    endTime: endTime ? new Date(endTime) : undefined,
  });
}
