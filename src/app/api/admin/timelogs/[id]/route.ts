import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import { verifyAdminApiKey } from "@/lib/admin-api-auth";
import { adminDeleteTimeLog, adminGetTimeLog, adminUpdateTimeLog } from "@/lib/data/timelog-dto";

const updateSchema = z.object({
  userId: z.string().trim().nonempty(),
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

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authError = verifyAdminApiKey(req);
  if (authError) return authError;

  const { id } = await params;
  const timeLog = await adminGetTimeLog(id);

  if (!timeLog) {
    return NextResponse.json({ error: "Time log not found" }, { status: 404 });
  }

  return NextResponse.json({ data: timeLog });
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const authError = verifyAdminApiKey(req);
  if (authError) return authError;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const parsed = updateSchema.parse(body);
    const timeLog = await adminUpdateTimeLog(id, parsed);

    return NextResponse.json({ data: timeLog });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: e.issues }, { status: 400 });
    }

    if (isKnownValidationError(e)) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    if (e instanceof Error && "code" in e && (e as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "Time log not found" }, { status: 404 });
    }

    throw e;
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authError = verifyAdminApiKey(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const timeLog = await adminDeleteTimeLog(id);
    return NextResponse.json({ data: timeLog });
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "Time log not found" }, { status: 404 });
    }

    throw e;
  }
}
