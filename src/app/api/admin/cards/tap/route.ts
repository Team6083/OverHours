import { NextRequest, NextResponse } from "next/server";

import { apiError, withApiErrors } from "@/lib/api-error";
import { verifyApiKey } from "@/lib/admin-api-auth";
import { normalizeUid } from "@/lib/cards";
import { tapCard } from "@/lib/data/card-dto";

/** A card reader reports a tap. A bound card clocks its user in or out; an unbound one gets a link to bind it, replacing the last one. */
export const POST = withApiErrors(async (req: NextRequest) => {
  const authError = await verifyApiKey(req, "cards:tap");
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("invalid_request", "Invalid JSON body");
  }

  const raw = (body as { uid?: unknown } | null)?.uid;
  const uid = typeof raw === "string" ? normalizeUid(raw) : null;
  if (!uid) {
    return apiError("invalid_request", "uid must be the card UID in hex (4–10 bytes) or decimal (8–20 digits)");
  }

  const tap = await tapCard(uid);
  if (tap.result === "unbound") {
    const origin = process.env.AUTH_URL?.replace(/\/+$/, "") || req.nextUrl.origin;
    return NextResponse.json({
      data: { result: tap.result, bindUrl: `${origin}/cards/bind?code=${tap.code}` },
    });
  }

  return NextResponse.json({ data: { result: tap.result, user: tap.user } });
});
