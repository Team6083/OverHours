import { NextRequest } from "next/server";
import * as z from "zod";

import { auth, Role } from "@/auth";
import { apiError } from "@/lib/api-error";
import { getTimeZone } from "@/lib/config";
import { dayRangeInZone, lockedCsvResponse, queryLockedTimeLogRows } from "@/lib/data/locked-export";

const dateSchema = z.iso.date().optional();

// CSV download for the Locked Logs report. The report layout only guards pages, so check here too.
// startDate/endDate are whole days (inclusive) in the server time zone (TZ), matching the report page.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("unauthenticated", "Sign in to export locked logs");
  if (session.user.role !== Role.ADMIN) return apiError("forbidden", "Only admins can export locked logs");

  const startDate = dateSchema.safeParse(req.nextUrl.searchParams.get("startDate") || undefined);
  const endDate = dateSchema.safeParse(req.nextUrl.searchParams.get("endDate") || undefined);
  if (!startDate.success || !endDate.success) {
    return apiError("invalid_request", "Invalid startDate or endDate (expected YYYY-MM-DD)", {
      fields: [...(startDate.error?.issues ?? []), ...(endDate.error?.issues ?? [])],
    });
  }

  const timeZone = getTimeZone();
  const range = dayRangeInZone(startDate.data, endDate.data, timeZone);
  return lockedCsvResponse(await queryLockedTimeLogRows(range), range, timeZone);
}
