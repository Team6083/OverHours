import "server-only";
import { auth, Role } from "@/auth";
import { generateApiKey, hashApiKey } from "../admin-api-auth";
import { ApiScope, isApiScope } from "../api-scopes";
import prisma from "../prisma";

export type ApiKeyDTO = { id: string; name: string; scopes: ApiScope[]; createdAt: Date; lastUsedAt: Date | null };

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (session.user.role !== Role.ADMIN) throw new Error("Forbidden");
}

export async function getApiKeys(): Promise<ApiKeyDTO[]> {
  await requireAdmin();
  const keys = await prisma.apiKey.findMany({
    select: { id: true, name: true, scopes: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: "desc" },
  });
  return keys.map(key => ({ ...key, scopes: key.scopes.filter(isApiScope) }));
}

/** Returns the new key in plain text; this is the only time it is available. */
export async function createApiKey(name: string, scopes: ApiScope[]): Promise<string> {
  await requireAdmin();
  const key = generateApiKey();
  await prisma.apiKey.create({ data: { name, scopes, keyHash: hashApiKey(key) } });
  return key;
}

export async function revokeApiKey(id: string): Promise<void> {
  await requireAdmin();
  await prisma.apiKey.deleteMany({ where: { id } });
}
