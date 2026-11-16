import { NextRequest, NextResponse } from "next/server";

import { withApiErrors } from "@/lib/api-error";
import { verifyCronSecret } from "@/lib/admin-api-auth";
import { sendDueReminders } from "@/lib/data/team-reminder-dto";

// For an external scheduler, e.g. every 5–15 minutes: sends each team's daily fill-in reminder once its time has
// passed. Calling it again the same day sends nothing more. Authenticated with CRON_SECRET only.
export const POST = withApiErrors(async (req: NextRequest) => {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const appUrl = process.env.AUTH_URL ? new URL(process.env.AUTH_URL).origin : req.nextUrl.origin;
  const runs = await sendDueReminders(new Date(), appUrl);

  return NextResponse.json({ data: { runs } });
});
