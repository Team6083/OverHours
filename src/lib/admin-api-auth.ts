import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

import { apiError } from "@/lib/api-error";

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
    return apiError("service_unavailable", "Admin API is not configured");
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;

  if (!token || !safeCompare(token, adminApiKey)) {
    return apiError("unauthenticated", "Unauthorized");
  }

  return null;
}
