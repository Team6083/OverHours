import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

export function verifyAdminApiKey(req: NextRequest): NextResponse | null {
  const adminApiKey = process.env.ADMIN_API_KEY;
  if (!adminApiKey) {
    return NextResponse.json({ error: "Admin API is not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;

  if (!token || !safeCompare(token, adminApiKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
