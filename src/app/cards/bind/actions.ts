"use server";
import * as z from "zod";

import { maskUid } from "@/lib/cards";
import { bindCard, CardBindError } from "@/lib/data/card-dto";
import { objectIdSchema } from "@/lib/objectid";

const schema = z.object({ code: z.string().min(1).max(64), userId: objectIdSchema.optional() });

export type BindResult = { ok: true; card: string } | { ok: false; error: "replaced" | "taken" | "failed" };

export async function bindCardAction(code: string, userId?: string): Promise<BindResult> {
  const parsed = schema.safeParse({ code, userId });
  if (!parsed.success) return { ok: false, error: "failed" };

  try {
    const { uid } = await bindCard(parsed.data.code, parsed.data.userId);
    return { ok: true, card: maskUid(uid) };
  } catch (error) {
    if (error instanceof CardBindError) return { ok: false, error: error.reason };
    console.error("Failed to bind a card", error);
    return { ok: false, error: "failed" };
  }
}
