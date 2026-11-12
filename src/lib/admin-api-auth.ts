import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes, timingSafeEqual } from "crypto";

import { apiError } from "@/lib/api-error";
import { ApiScope } from "@/lib/api-scopes";
import prisma from "@/lib/prisma";

const SCOPED_KEY_PREFIX = "ohk_";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

export function generateApiKey(): string {
  return SCOPED_KEY_PREFIX + randomBytes(32).toString("base64url");
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Lets a request through when its Bearer key is `ADMIN_API_KEY` (every scope) or a stored `ApiKey` that has `scope`.
 * Returns the error response to send otherwise.
 */
export async function verifyApiKey(req: NextRequest, scope: ApiScope): Promise<NextResponse | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;

  if (token?.startsWith(SCOPED_KEY_PREFIX)) {
    const key = await prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(token) }, select: { id: true, scopes: true } });
    if (!key) {
      return apiError("unauthenticated", "Unauthorized");
    }
    if (!key.scopes.includes(scope)) {
      return apiError("forbidden", `This key does not have the ${scope} scope`);
    }

    await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
    return null;
  }

  const adminApiKey = process.env.ADMIN_API_KEY;
  if (!adminApiKey) {
    return apiError("service_unavailable", "Admin API is not configured");
  }

  if (!token || !safeCompare(token, adminApiKey)) {
    return apiError("unauthenticated", "Unauthorized");
  }

  return null;
}
