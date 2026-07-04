import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import { verifyAdminApiKey } from "@/lib/admin-api-auth";
import { adminCreateUser, adminGetAllUsers } from "@/lib/data/user-dto";

const createSchema = z.object({
  email: z.email().toLowerCase(),
  name: z.string().trim().nonempty(),
});

export async function GET(req: NextRequest) {
  const authError = verifyAdminApiKey(req);
  if (authError) return authError;

  const email = req.nextUrl.searchParams.get("email") || undefined;

  const users = await adminGetAllUsers({ email });

  return NextResponse.json({ data: users });
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
    const user = await adminCreateUser(parsed);

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: e.issues }, { status: 400 });
    }

    if (e instanceof Error && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    throw e;
  }
}
