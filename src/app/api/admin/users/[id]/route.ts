import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import { verifyAdminApiKey } from "@/lib/admin-api-auth";
import { adminDeleteUser, adminGetUser, adminUpdateUser } from "@/lib/data/user-dto";
import { objectIdSchema } from "@/lib/objectid";

const updateSchema = z.object({
  email: z.email().toLowerCase(),
  name: z.string().trim().nonempty(),
});

type RouteParams = { params: Promise<{ id: string }> };

function invalidIdResponse() {
  return NextResponse.json({ error: "Invalid id format" }, { status: 400 });
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authError = verifyAdminApiKey(req);
  if (authError) return authError;

  const { id } = await params;
  if (!objectIdSchema.safeParse(id).success) {
    return invalidIdResponse();
  }

  const user = await adminGetUser(id);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ data: user });
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const parsed = updateSchema.parse(body);
    const user = await adminUpdateUser(id, parsed);

    return NextResponse.json({ data: user });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: e.issues }, { status: 400 });
    }

    if (e instanceof Error && "code" in e) {
      const code = (e as { code: string }).code;
      if (code === "P2025") {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      if (code === "P2002") {
        return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
      }
      if (code === "P2023") {
        return invalidIdResponse();
      }
    }

    throw e;
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authError = verifyAdminApiKey(req);
  if (authError) return authError;

  const { id } = await params;
  if (!objectIdSchema.safeParse(id).success) {
    return invalidIdResponse();
  }

  try {
    const user = await adminDeleteUser(id);
    return NextResponse.json({ data: user });
  } catch (e) {
    if (e instanceof Error && "code" in e) {
      const code = (e as { code: string }).code;
      if (code === "P2025") {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      if (code === "P2023") {
        return invalidIdResponse();
      }
    }

    throw e;
  }
}
