"use server";
import { headers } from "next/headers";

import { auth } from "@/auth";
import { maskUid, normalizeUid } from "@/lib/cards";
import { isCurrentBindCode, tapCard } from "@/lib/data/card-dto";

export type KioskTap =
  | { result: "clockedIn" | "clockedOut" | "locked" | "tooShort" | "tooSoon"; name: string }
  | { result: "unbound"; card: string; code: string; bindUrl: string }
  | { result: "invalid" | "forbidden" | "failed" };

async function publicOrigin(): Promise<string> {
  const configured = process.env.AUTH_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  return `${h.get("x-forwarded-proto") ?? "http"}://${host}`;
}

/** A card read on the /kiosk page. Only accounts that may tap cards can use it. */
export async function kioskTap(raw: string): Promise<KioskTap> {
  const session = await auth();
  if (!session?.user.canTapCards) return { result: "forbidden" };

  const uid = normalizeUid(raw);
  if (!uid) return { result: "invalid" };

  try {
    const tap = await tapCard(uid);
    if (tap.result === "unbound") {
      return { result: "unbound", card: maskUid(uid), code: tap.code, bindUrl: `${await publicOrigin()}/cards/bind?code=${tap.code}` };
    }
    return { result: tap.result, name: tap.user.name };
  } catch (error) {
    console.error("Kiosk tap failed", error);
    return { result: "failed" };
  }
}

/** Whether the QR code on the kiosk can still be used; it can't once someone linked the card with it. */
export async function kioskBindCodeActive(code: string): Promise<boolean> {
  try {
    return await isCurrentBindCode(code);
  } catch {
    return false;
  }
}
