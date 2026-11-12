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

/** Lets a request through when its Bearer token equals `secret`; otherwise returns the error to send. */
function verifyBearerSecret(req: NextRequest, secret: string | undefined, notConfigured: string): NextResponse | null {
  if (!secret) {
    return apiError("service_unavailable", notConfigured);
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;

  if (!token || !safeCompare(token, secret)) {
    return apiError("unauthenticated", "Unauthorized");
  }

  return null;
}

export function verifyAdminApiKey(req: NextRequest): NextResponse | null {
  return verifyBearerSecret(req, process.env.ADMIN_API_KEY, "Admin API is not configured");
}

/** For the scheduler that calls the jobs endpoint. Deliberately separate from `ADMIN_API_KEY`, which can do far more. */
export function verifyCronSecret(req: NextRequest): NextResponse | null {
  return verifyBearerSecret(req, process.env.CRON_SECRET, "Cron secret is not configured");
}
