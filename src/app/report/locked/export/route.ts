import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import { auth, Role } from "@/auth";
import { getTimeZone } from "@/lib/config";
import { dayRangeInZone, lockedCsvResponse, queryLockedTimeLogRows } from "@/lib/data/locked-export";

const dateSchema = z.iso.date().optional();

// CSV download for the Locked Logs report. The report layout only guards pages, so check here too.
// startDate/endDate are whole days (inclusive) in OVERHOURS_TIMEZONE, matching the report page.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: session ? 403 : 401 });
  }

  const startDate = dateSchema.safeParse(req.nextUrl.searchParams.get("startDate") || undefined);
  const endDate = dateSchema.safeParse(req.nextUrl.searchParams.get("endDate") || undefined);
  if (!startDate.success || !endDate.success) {
    return NextResponse.json({ error: "Invalid startDate or endDate (expected YYYY-MM-DD)" }, { status: 400 });
  }

  const timeZone = getTimeZone();
  const range = dayRangeInZone(startDate.data, endDate.data, timeZone);
  return lockedCsvResponse(await queryLockedTimeLogRows(range), range, timeZone);
}
