import { NextRequest, NextResponse } from "next/server";

import { apiError, withApiErrors } from "@/lib/api-error";
import { verifyApiKey } from "@/lib/admin-api-auth";
import { datesInRange, isCalendarDate, MAX_RANGE_DAYS } from "@/lib/attendance";
import { adminGetAttendance } from "@/lib/data/attendance-dto";

export const GET = withApiErrors(async (req: NextRequest) => {
  const authError = await verifyApiKey(req, "attendance:read");
  if (authError) return authError;

  const start = req.nextUrl.searchParams.get("start") ?? "";
  const end = req.nextUrl.searchParams.get("end") ?? "";
  if (!isCalendarDate(start) || !isCalendarDate(end)) {
    return apiError("invalid_request", "start and end must be YYYY-MM-DD");
  }

  const dates = datesInRange(start, end);
  if (!dates) {
    return apiError("invalid_request", `end must be on or after start, at most ${MAX_RANGE_DAYS} days`);
  }

  return NextResponse.json({ data: { start, end, users: await adminGetAttendance(dates) } });
});
