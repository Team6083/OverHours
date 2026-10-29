import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import { apiError, withApiErrors } from "@/lib/api-error";
import { verifyAdminApiKey } from "@/lib/admin-api-auth";
import { adminDeleteUser, adminGetUser, adminUpdateUser } from "@/lib/data/user-dto";
import { objectIdSchema } from "@/lib/objectid";

const updateSchema = z.object({
  email: z.email().toLowerCase(),
  name: z.string().trim().nonempty(),
});

type RouteParams = { params: Promise<{ id: string }> };

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

  const user = await adminGetUser(id);

  if (!user) {
    return apiError("not_found", "User not found");
  }

  return NextResponse.json({ data: user });
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
    const user = await adminUpdateUser(id, parsed);

    return NextResponse.json({ data: user });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return apiError("invalid_request", "Validation failed", e.issues);
    }

    if (e instanceof Error && "code" in e) {
      const code = (e as { code: string }).code;
      if (code === "P2025") {
        return apiError("not_found", "User not found");
      }
      if (code === "P2002") {
        return apiError("conflict", "A user with this email already exists");
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
    const user = await adminDeleteUser(id);
    return NextResponse.json({ data: user });
  } catch (e) {
    if (e instanceof Error && "code" in e) {
      const code = (e as { code: string }).code;
      if (code === "P2025") {
        return apiError("not_found", "User not found");
      }
      if (code === "P2023") {
        return invalidIdResponse();
      }
    }

    throw e;
  }
});
