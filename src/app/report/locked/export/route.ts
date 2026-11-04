import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import { auth, Role } from "@/auth";
import { getTimeZone } from "@/lib/config";
import { lockedCsvFilename, lockedTimeLogRowsToCsv, queryLockedTimeLogRows } from "@/lib/data/locked-export";

const querySchema = z.object({
  startTime: z.iso.datetime().transform(v => new Date(v)).optional(),
  endTime: z.iso.datetime().transform(v => new Date(v)).optional(),
});

// CSV download for the Locked Logs report. The report layout only guards pages, so check here too.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: session ? 403 : 401 });
  }

  const parsed = querySchema.safeParse({
    startTime: req.nextUrl.searchParams.get("startTime") || undefined,
    endTime: req.nextUrl.searchParams.get("endTime") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid startTime or endTime" }, { status: 400 });
  }

  const timeZone = getTimeZone();
  const rows = await queryLockedTimeLogRows(parsed.data);

  return new NextResponse(lockedTimeLogRowsToCsv(rows, timeZone), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${lockedCsvFilename(parsed.data, timeZone)}"`,
      "Cache-Control": "no-store",
    },
  });
}
