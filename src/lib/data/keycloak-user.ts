import prisma from "../prisma";

export type KeycloakIdentity = {
  /** Keycloak `sub`: stable for the account, unlike the email. */
  keycloakId: string;
  email: string;
  name: string;
  image: string | null;
};

export type LinkResult =
  | { ok: true; userId: string }
  // The email belongs to a user linked to another Keycloak account: an admin has to resolve it.
  | { ok: false; error: "AccountConflict" };

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/**
 * Finds or creates the user for a Keycloak sign-in and keeps their profile in sync.
 *
 * 1. A user already linked to the Keycloak account is that user, whatever their email now is. Their
 *    email follows Keycloak unless another user has it (then it is kept and an admin can merge them).
 * 2. Otherwise a not-yet-linked user with the same email (created before linking existed, or by an
 *    admin) is linked to the account.
 * 3. Otherwise a new user is created.
 */
export async function linkKeycloakUser(identity: KeycloakIdentity): Promise<LinkResult> {
  const { keycloakId, email, name, image } = identity;

  const linked = await prisma.user.findFirst({ where: { keycloakId } });
  if (linked) {
    const profile = { name, image };
    if (linked.email !== email) {
      try {
        await prisma.user.update({ where: { id: linked.id }, data: { ...profile, email } });
        return { ok: true, userId: linked.id };
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        console.warn(`User ${linked.id} changed email in Keycloak but another user already has it; keeping the old email`);
      }
    }
    await prisma.user.update({ where: { id: linked.id }, data: profile });
    return { ok: true, userId: linked.id };
  }

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    if (byEmail.keycloakId && byEmail.keycloakId !== keycloakId) {
      console.warn(`User ${byEmail.id} is linked to another Keycloak account; refusing sign-in with the same email`);
      return { ok: false, error: "AccountConflict" };
    }
    await prisma.user.update({ where: { id: byEmail.id }, data: { keycloakId, name, image } });
    return { ok: true, userId: byEmail.id };
  }

  try {
    const created = await prisma.user.create({ data: { keycloakId, email, name, image } });
    return { ok: true, userId: created.id };
  } catch (error) {
    // A concurrent first sign-in created the user in between; retry so it is matched instead.
    if (isUniqueViolation(error)) return linkKeycloakUser(identity);
    throw error;
  }
}

/** The user linked to a Keycloak account, if any. */
export async function findKeycloakUserId(keycloakId: string): Promise<string | null> {
  const user = await prisma.user.findFirst({ where: { keycloakId }, select: { id: true } });
  return user?.id ?? null;
}
