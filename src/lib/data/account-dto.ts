import "server-only";
import { auth, Role } from "@/auth";
import prisma from "../prisma";

export type AccountDTO = {
  id: string;
  issuer: string;
  subject: string;
  /** Email the provider reported at the last sign-in. */
  email: string;
  createdAt: Date;
};

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (session.user.role !== Role.ADMIN) throw new Error("Forbidden");
}

export async function getUserAccounts(userId: string): Promise<AccountDTO[]> {
  await requireAdmin();

  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return accounts.map(account => ({
    id: account.id,
    issuer: account.issuer,
    subject: account.subject,
    email: account.email,
    createdAt: account.createdAt,
  }));
}

/**
 * Users whose email differs from the one their provider reported (because another user already has
 * it), mapped to the provider's email. Such users usually need merging.
 */
export async function getOutOfSyncEmails(): Promise<Record<string, string>> {
  await requireAdmin();

  const accounts = await prisma.account.findMany({
    select: { userId: true, email: true, user: { select: { email: true } } },
  });

  const result: Record<string, string> = {};
  for (const account of accounts) {
    if (account.email !== account.user.email) {
      result[account.userId] = account.email;
    }
  }
  return result;
}

/**
 * Removes the link between a user and a provider account. The user keeps their data; the account's next
 * sign-in links to the user with its email again (if that user has no other account) or creates one.
 */
export async function unlinkAccount(accountId: string): Promise<void> {
  await requireAdmin();

  await prisma.account.deleteMany({ where: { id: accountId } });
}
