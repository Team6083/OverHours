import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import { verifyAdminApiKey } from "@/lib/admin-api-auth";
import { adminCreateTimeLog, adminGetAllTimeLogs } from "@/lib/data/timelog-dto";

const statusSchema = z.enum(["CURRENTLY_IN", "DONE", "LOCKED"]);

const createSchema = z.object({
  userId: z.string().trim().nonempty(),
  status: statusSchema,
  inTime: z.iso.datetime().transform(v => new Date(v)),
  outTime: z.iso.datetime().transform(v => new Date(v)).optional(),
  notes: z.string().trim().nonempty().optional(),
});

export async function GET(req: NextRequest) {
  const authError = verifyAdminApiKey(req);
  if (authError) return authError;

  const { searchParams } = req.nextUrl;

  const querySchema = z.object({
    userId: z.string().trim().nonempty().optional(),
    status: statusSchema.optional(),
    startTime: z.iso.datetime().transform(v => new Date(v)).optional(),
    endTime: z.iso.datetime().transform(v => new Date(v)).optional(),
  });

  try {
    const parsed = querySchema.parse({
      userId: searchParams.get("userId") || undefined,
      status: searchParams.get("status") || undefined,
      startTime: searchParams.get("startTime") || undefined,
      endTime: searchParams.get("endTime") || undefined,
    });

    const timeLogs = await adminGetAllTimeLogs(parsed);

    return NextResponse.json({ data: timeLogs });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: e.issues }, { status: 400 });
    }

    throw e;
  }
}

export async function POST(req: NextRequest) {
  const authError = verifyAdminApiKey(req);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const parsed = createSchema.parse(body);
    const timeLog = await adminCreateTimeLog(parsed);

    return NextResponse.json({ data: timeLog }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: e.issues }, { status: 400 });
    }

    if (e instanceof Error && (
      e.message === "Out time is required for DONE or LOCKED status"
      || e.message === "Out time must be after in time"
    )) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    throw e;
  }
}
