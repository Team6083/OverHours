import "server-only";
import { auth, Role } from "@/auth";
import prisma from "../prisma";

export type AccountDTO = {
  id: string;
  provider: string;
  subject: string;
  /** Last seen issuer, for reference. */
  issuer: string;
  /** Email the provider reported at the last sign-in. */
  email: string;
  /** Another user has `email`, so this user could not take it (they likely need merging). */
  emailTakenByOtherUser: boolean;
  createdAt: Date;
};

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (session.user.role !== Role.ADMIN) throw new Error("Forbidden");
}

/** Of these accounts, the ids of those whose email another user (not the account's own) has. */
async function accountsWithTakenEmail(accounts: { id: string; userId: string; email: string }[]): Promise<Set<string>> {
  const holders = await prisma.user.findMany({
    where: { email: { in: [...new Set(accounts.map(account => account.email))] } },
    select: { id: true, email: true },
  });
  const holderByEmail = new Map(holders.map(user => [user.email, user.id]));

  return new Set(accounts
    .filter(account => {
      const holder = holderByEmail.get(account.email);
      return holder !== undefined && holder !== account.userId;
    })
    .map(account => account.id));
}

export async function getUserAccounts(userId: string): Promise<AccountDTO[]> {
  await requireAdmin();

  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  const taken = await accountsWithTakenEmail(accounts);

  return accounts.map(account => ({
    id: account.id,
    provider: account.provider,
    subject: account.subject,
    issuer: account.issuer,
    email: account.email,
    emailTakenByOtherUser: taken.has(account.id),
    createdAt: account.createdAt,
  }));
}

/**
 * Users who sign in with an email that another user has, mapped to those emails. Such users usually
 * need merging. A user with several accounts whose other emails are free is not listed.
 */
export async function getOutOfSyncEmails(): Promise<Record<string, string[]>> {
  await requireAdmin();

  const accounts = await prisma.account.findMany({
    select: { id: true, userId: true, email: true, user: { select: { email: true } } },
  });
  const differing = accounts.filter(account => account.email !== account.user.email);
  const taken = await accountsWithTakenEmail(differing);

  const result: Record<string, string[]> = {};
  for (const account of differing) {
    if (taken.has(account.id)) {
      (result[account.userId] ??= []).push(account.email);
    }
  }
  return result;
}

/**
 * Removes the link between a user and a provider account. The user keeps their data; the account's next
 * sign-in links to the user with its email again (if that user has no other account) or creates one.
 */
export async function unlinkAccount(userId: string, accountId: string): Promise<void> {
  await requireAdmin();

  await prisma.account.deleteMany({ where: { id: accountId, userId } });
}
