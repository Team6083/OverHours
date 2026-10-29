import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import { apiError, withApiErrors } from "@/lib/api-error";
import { verifyAdminApiKey } from "@/lib/admin-api-auth";
import { adminCreateTimeLog, adminGetAllTimeLogs } from "@/lib/data/timelog-dto";
import { objectIdSchema } from "@/lib/objectid";

const statusSchema = z.enum(["CURRENTLY_IN", "DONE", "LOCKED"]);

const createSchema = z.object({
  userId: objectIdSchema,
  status: statusSchema,
  inTime: z.iso.datetime().transform(v => new Date(v)),
  outTime: z.iso.datetime().transform(v => new Date(v)).optional(),
  notes: z.string().trim().nonempty().optional(),
});

export const GET = withApiErrors(async (req: NextRequest) => {
  const authError = verifyAdminApiKey(req);
  if (authError) return authError;

  const { searchParams } = req.nextUrl;

  const querySchema = z.object({
    userId: objectIdSchema.optional(),
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
      return apiError("invalid_request", "Validation failed", e.issues);
    }

    throw e;
  }
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const authError = verifyAdminApiKey(req);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("invalid_request", "Invalid JSON body");
  }

  try {
    const parsed = createSchema.parse(body);
    const timeLog = await adminCreateTimeLog(parsed);

    return NextResponse.json({ data: timeLog }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return apiError("invalid_request", "Validation failed", e.issues);
    }

    if (e instanceof Error && (
      e.message === "Out time is required for DONE or LOCKED status"
      || e.message === "Out time must be after in time"
    )) {
      return apiError("invalid_request", e.message);
    }

    throw e;
  }
});
