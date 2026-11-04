"use server";
import { auth, Role } from "@/auth";
import { getTimeZone } from "@/lib/config";
import { dayRangeInZone, LockedTimeLogRow, queryLockedTimeLogRows } from "@/lib/data/locked-export";

/** Locked logs clocked in on days `startDate`..`endDate` (`YYYY-MM-DD`, inclusive) in OVERHOURS_TIMEZONE. */
export async function getLockedReportRows(startDate?: string, endDate?: string): Promise<LockedTimeLogRow[] | null> {
  const session = await auth();
  if (!session || session.user.role !== Role.ADMIN) return null;

  return queryLockedTimeLogRows(dayRangeInZone(startDate, endDate, getTimeZone()));
}
