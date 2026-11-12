import { NextRequest, NextResponse } from "next/server";

import { withApiErrors } from "@/lib/api-error";
import { verifyApiKey } from "@/lib/admin-api-auth";
import { getAutoLockConfig } from "@/lib/config";
import { lockOverdueTimeLogs } from "@/lib/data/auto-lock";

// For an external scheduler (e.g. a Kubernetes CronJob): lock every session that has passed the daily
// cut-off. Safe to call as often as wanted; a call with nothing overdue changes nothing.
export const POST = withApiErrors(async (req: NextRequest) => {
  const authError = await verifyApiKey(req, "jobs:run");
  if (authError) return authError;

  const enabled = getAutoLockConfig() !== null;
  const lockedIds = await lockOverdueTimeLogs();

  return NextResponse.json({ data: { enabled, lockedCount: lockedIds.length, lockedIds } });
});
