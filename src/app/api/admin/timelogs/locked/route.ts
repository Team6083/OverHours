import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import { apiError, withApiErrors } from "@/lib/api-error";
import { verifyAdminApiKey } from "@/lib/admin-api-auth";
import { getTimeZone } from "@/lib/config";
import { lockedCsvFilename, lockedTimeLogRowsToCsv, queryLockedTimeLogRows } from "@/lib/data/locked-export";

const querySchema = z.object({
  startTime: z.iso.datetime().transform(v => new Date(v)).optional(),
  endTime: z.iso.datetime().transform(v => new Date(v)).optional(),
  format: z.enum(["json", "csv"]).default("json"),
});

// Locked (abnormal clock-out) time logs with user details, for violation records.
export const GET = withApiErrors(async (req: NextRequest) => {
  const authError = verifyAdminApiKey(req);
  if (authError) return authError;

  const { searchParams } = req.nextUrl;
  const parsed = querySchema.safeParse({
    startTime: searchParams.get("startTime") || undefined,
    endTime: searchParams.get("endTime") || undefined,
    format: searchParams.get("format") || undefined,
  });

  if (!parsed.success) {
    return apiError("invalid_request", "Validation failed", parsed.error.issues);
  }

  const { format, ...range } = parsed.data;
  const rows = await queryLockedTimeLogRows(range);

  if (format === "csv") {
    const timeZone = getTimeZone();
    return new NextResponse(lockedTimeLogRowsToCsv(rows, timeZone), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${lockedCsvFilename(range, timeZone)}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json({ data: rows });
});
