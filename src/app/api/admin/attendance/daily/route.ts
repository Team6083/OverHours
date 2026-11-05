import { NextRequest, NextResponse } from "next/server";

import { apiError, withApiErrors } from "@/lib/api-error";
import { verifyAdminApiKey } from "@/lib/admin-api-auth";
import { isCalendarDate } from "@/lib/attendance";
import { adminGetDailyBoard, getToday } from "@/lib/data/attendance-dto";

export const GET = withApiErrors(async (req: NextRequest) => {
  const authError = verifyAdminApiKey(req);
  if (authError) return authError;

  const date = req.nextUrl.searchParams.get("date") ?? getToday();
  if (!isCalendarDate(date)) {
    return apiError("invalid_request", "date must be YYYY-MM-DD");
  }

  return NextResponse.json({ data: await adminGetDailyBoard(date) });
});
