import { NextRequest, NextResponse } from "next/server";

import { apiError, withApiErrors } from "@/lib/api-error";
import { verifyAdminApiKey } from "@/lib/admin-api-auth";
import { buildAttendanceMessage, getToday, recordWanted } from "@/lib/data/attendance-dto";

function attendanceUrl(): string | undefined {
  const base = process.env.AUTH_URL?.trim();
  return base ? new URL("/attendance", base).href : undefined;
}

// For an external scheduler, once a day at 18:00: each call posts to Slack. `?dryRun=true` only returns the text.
export const POST = withApiErrors(async (req: NextRequest) => {
  const authError = verifyAdminApiKey(req);
  if (authError) return authError;

  const today = getToday();
  const url = attendanceUrl();

  if (req.nextUrl.searchParams.get("dryRun") === "true") {
    return NextResponse.json({ data: { sent: false, wantedRecorded: 0, text: await buildAttendanceMessage(today, url) } });
  }

  const webhookUrl = process.env.SLACK_ATTENDANCE_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return apiError("service_unavailable", "SLACK_ATTENDANCE_WEBHOOK_URL is not configured");
  }

  const wantedRecorded = await recordWanted(today);
  const text = await buildAttendanceMessage(today, url);
  if (!text) {
    return NextResponse.json({ data: { sent: false, wantedRecorded, text } });
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    console.error("Slack webhook rejected the attendance message", { status: response.status });
    return apiError("service_unavailable", "Slack did not accept the message");
  }

  return NextResponse.json({ data: { sent: true, wantedRecorded, text } });
});
