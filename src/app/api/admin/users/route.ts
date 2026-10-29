import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import { apiError, withApiErrors } from "@/lib/api-error";
import { verifyAdminApiKey } from "@/lib/admin-api-auth";
import { adminCreateUser, adminGetAllUsers } from "@/lib/data/user-dto";

const createSchema = z.object({
  email: z.email().toLowerCase(),
  name: z.string().trim().nonempty(),
});

export const GET = withApiErrors(async (req: NextRequest) => {
  const authError = verifyAdminApiKey(req);
  if (authError) return authError;

  const email = req.nextUrl.searchParams.get("email") || undefined;

  const users = await adminGetAllUsers({ email });

  return NextResponse.json({ data: users });
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
    const user = await adminCreateUser(parsed);

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return apiError("invalid_request", "Validation failed", e.issues);
    }

    if (e instanceof Error && "code" in e && (e as { code: string }).code === "P2002") {
      return apiError("conflict", "A user with this email already exists");
    }

    throw e;
  }
});
