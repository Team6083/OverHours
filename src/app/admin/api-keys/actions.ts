"use server";
import { revalidatePath } from "next/cache";
import * as z from "zod";

import { API_SCOPES } from "@/lib/api-scopes";
import { createApiKey, revokeApiKey } from "@/lib/data/api-key-dto";
import { objectIdSchema } from "@/lib/objectid";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  scopes: z.array(z.enum(API_SCOPES)).min(1),
});

export async function createKey(name: string, scopes: string[]): Promise<{ ok: true; key: string } | { ok: false }> {
  const parsed = createSchema.safeParse({ name, scopes });
  if (!parsed.success) return { ok: false };

  try {
    const key = await createApiKey(parsed.data.name, [...new Set(parsed.data.scopes)]);
    revalidatePath("/admin/api-keys");
    return { ok: true, key };
  } catch {
    return { ok: false };
  }
}

export async function revokeKey(id: string): Promise<{ ok: boolean }> {
  if (!objectIdSchema.safeParse(id).success) return { ok: false };

  try {
    await revokeApiKey(id);
    revalidatePath("/admin/api-keys");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
