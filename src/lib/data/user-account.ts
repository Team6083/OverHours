import "server-only";
import prisma from "../prisma";

export type ProviderIdentity = {
  /** Auth.js provider id, e.g. "keycloak". */
  provider: string;
  /** OIDC `sub`: stable for the account, unlike the email. */
  subject: string;
  /** OIDC `iss`, recorded for reference only. */
  issuer: string;
  email: string;
  name: string;
  image: string | null;
};

export type LinkResult =
  | { ok: true; userId: string }
  // The email belongs to a user already linked to another account: an admin has to unlink or merge.
  | { ok: false; error: "AccountConflict" };

// Unique constraint violation, or a transaction write conflict: both mean a concurrent sign-in won.
const RETRYABLE_CODES = new Set(["P2002", "P2034"]);
const MAX_ATTEMPTS = 2;

function prismaErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
}

/**
 * Finds or creates the user for a provider sign-in and keeps their profile in sync.
 *
 * 1. The user linked to the account is that user, whatever their email now is. If it is their only
 *    account, their email follows the provider unless another user has it (then it is kept, and admins
 *    see the user as out of sync). With several accounts (after a merge) the email is left alone, or it
 *    would switch with every sign-in.
 * 2. Otherwise a user with the same email and no linked account (created before accounts existed, or by
 *    an admin) is linked to the account.
 * 3. A user with the same email that is already linked to another account is refused (AccountConflict).
 * 4. Otherwise a new user is created with the account.
 *
 * A concurrent sign-in for the same account or email makes the losing write fail; it is retried once,
 * which then matches what the winner wrote.
 */
export async function linkProviderAccount(identity: ProviderIdentity): Promise<LinkResult> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await linkOnce(identity);
    } catch (error) {
      const code = prismaErrorCode(error);
      if (attempt >= MAX_ATTEMPTS || !code || !RETRYABLE_CODES.has(code)) throw error;
    }
  }
}

async function linkOnce({ provider, subject, issuer, email, name, image }: ProviderIdentity): Promise<LinkResult> {
  const account = await prisma.account.findUnique({
    where: { provider_subject: { provider, subject } },
    include: { user: { select: { email: true } } },
  });

  if (account) {
    if (account.email !== email || account.issuer !== issuer) {
      await prisma.account.update({ where: { id: account.id }, data: { email, issuer } });
    }
    const followsEmail = account.user.email !== email
      && await prisma.account.count({ where: { userId: account.userId } }) === 1;
    await syncProfile(account.userId, followsEmail ? { name, image, email } : { name, image });
    return { ok: true, userId: account.userId };
  }

  return prisma.$transaction(async (tx): Promise<LinkResult> => {
    const existing = await tx.user.findUnique({ where: { email }, select: { id: true } });

    if (!existing) {
      const created = await tx.user.create({
        data: { email, name, image, accounts: { create: { provider, subject, issuer, email } } },
      });
      return { ok: true, userId: created.id };
    }

    if (await tx.account.count({ where: { userId: existing.id } }) > 0) {
      return { ok: false, error: "AccountConflict" };
    }
    // Both concurrent links to the same user write it, so one fails with a write conflict (P2034) and
    // its retry sees the other's account: at most one account gets linked to a user that had none.
    await tx.user.update({ where: { id: existing.id }, data: { name, image } });
    await tx.account.create({ data: { userId: existing.id, provider, subject, issuer, email } });
    return { ok: true, userId: existing.id };
  });
}

async function syncProfile(userId: string, data: { name: string; image: string | null; email?: string }) {
  try {
    await prisma.user.update({ where: { id: userId }, data });
  } catch (error) {
    if (!data.email || prismaErrorCode(error) !== "P2002") throw error;
    // Another user has the new email: keep the old one. The account records the provider's email, so
    // admins see the mismatch and can merge the users.
    await prisma.user.update({ where: { id: userId }, data: { name: data.name, image: data.image } });
  }
}
