import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import { apiError, withApiErrors } from "@/lib/api-error";
import { verifyAdminApiKey } from "@/lib/admin-api-auth";
import { adminDeleteTimeLog, adminGetTimeLog, adminUpdateTimeLog } from "@/lib/data/timelog-dto";
import { objectIdSchema } from "@/lib/objectid";

const updateSchema = z.object({
  userId: objectIdSchema,
  status: z.enum(["CURRENTLY_IN", "DONE", "LOCKED"]),
  inTime: z.iso.datetime().transform(v => new Date(v)),
  outTime: z.iso.datetime().transform(v => new Date(v)).optional(),
  notes: z.string().trim().nonempty().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

function isKnownValidationError(e: unknown): e is Error {
  return e instanceof Error && (
    e.message === "Out time is required for DONE or LOCKED status"
    || e.message === "Out time must be after in time"
  );
}

function invalidIdResponse() {
  return apiError("invalid_request", "Invalid id format");
}

export const GET = withApiErrors(async (req: NextRequest, { params }: RouteParams) => {
  const authError = verifyAdminApiKey(req);
  if (authError) return authError;

  const { id } = await params;
  if (!objectIdSchema.safeParse(id).success) {
    return invalidIdResponse();
  }

  const timeLog = await adminGetTimeLog(id);

  if (!timeLog) {
    return apiError("not_found", "Time log not found");
  }

  return NextResponse.json({ data: timeLog });
});

export const PUT = withApiErrors(async (req: NextRequest, { params }: RouteParams) => {
  const authError = verifyAdminApiKey(req);
  if (authError) return authError;

  const { id } = await params;
  if (!objectIdSchema.safeParse(id).success) {
    return invalidIdResponse();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("invalid_request", "Invalid JSON body");
  }

  try {
    const parsed = updateSchema.parse(body);
    const timeLog = await adminUpdateTimeLog(id, parsed);

    return NextResponse.json({ data: timeLog });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return apiError("invalid_request", "Validation failed", e.issues);
    }

    if (isKnownValidationError(e)) {
      return apiError("invalid_request", e.message);
    }

    if (e instanceof Error && "code" in e) {
      const code = (e as { code: string }).code;
      if (code === "P2025") {
        return apiError("not_found", "Time log not found");
      }
      if (code === "P2023") {
        return invalidIdResponse();
      }
    }

    throw e;
  }
});

export const DELETE = withApiErrors(async (req: NextRequest, { params }: RouteParams) => {
  const authError = verifyAdminApiKey(req);
  if (authError) return authError;

  const { id } = await params;
  if (!objectIdSchema.safeParse(id).success) {
    return invalidIdResponse();
  }

  try {
    const timeLog = await adminDeleteTimeLog(id);
    return NextResponse.json({ data: timeLog });
  } catch (e) {
    if (e instanceof Error && "code" in e) {
      const code = (e as { code: string }).code;
      if (code === "P2025") {
        return apiError("not_found", "Time log not found");
      }
      if (code === "P2023") {
        return invalidIdResponse();
      }
    }

    throw e;
  }
});
