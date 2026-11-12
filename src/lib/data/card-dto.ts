import "server-only";
import { randomBytes } from "crypto";

import { auth, Role } from "@/auth";
import { TAP_COOLDOWN_MS } from "../cards";
import prisma from "../prisma";
import { AutoLockedError, clockInUser, clockOutUser, TimeLogTooShortError } from "./timelog-dto";

export type TapResult =
  | { result: "clockedIn" | "clockedOut" | "locked" | "tooShort" | "tooSoon"; user: { id: string; name: string } }
  | { result: "unbound"; code: string };

/**
 * What a card reader does when a card is tapped: a bound card clocks its user in, or out if they are clocked in;
 * an unbound card gets a bind code that replaces any earlier one. The caller must have checked the reader's `cards:tap` permission.
 */
export async function tapCard(uid: string, now = new Date()): Promise<TapResult> {
  const card = await prisma.card.findUnique({ where: { uid }, include: { user: { select: { id: true, name: true } } } });

  if (!card) {
    // Only the code the reader shows now can be used, so a QR code left on someone's phone stops working.
    const code = randomBytes(16).toString("base64url");
    await prisma.$transaction([
      prisma.cardBindRequest.deleteMany({}),
      prisma.cardBindRequest.create({ data: { uid, code } }),
    ]);
    return { result: "unbound", code };
  }

  const user = card.user;
  if (card.lastUsedAt && now.getTime() - card.lastUsedAt.getTime() < TAP_COOLDOWN_MS) {
    return { result: "tooSoon", user };
  }
  await prisma.card.update({ where: { id: card.id }, data: { lastUsedAt: now } });

  const clockedIn = await prisma.timeLog.findFirst({ where: { userId: user.id, status: "CurrentlyIn" }, select: { id: true } });
  if (!clockedIn) {
    await clockInUser(user.id);
    return { result: "clockedIn", user };
  }

  try {
    await clockOutUser(user.id);
    return { result: "clockedOut", user };
  } catch (error) {
    if (error instanceof AutoLockedError) return { result: "locked", user };
    if (error instanceof TimeLogTooShortError) return { result: "tooShort", user };
    throw error;
  }
}

export type BindRequestDTO = { uid: string };

/** The bind request behind a reader's link, if it is still the current one. Needs a signed-in user. */
export async function getBindRequest(code: string): Promise<BindRequestDTO | null> {
  const session = await auth();
  if (!session?.user.id) throw new Error("Unauthorized");

  return prisma.cardBindRequest.findUnique({ where: { code }, select: { uid: true } });
}

export class CardBindError extends Error {
  constructor(public reason: "replaced" | "taken") {
    super(reason === "replaced" ? "The bind link was replaced or already used" : "The card is already bound");
    this.name = "CardBindError";
  }
}

/** Binds the card behind `code` to the signed-in user, or to `userId` when an admin chooses someone else. */
export async function bindCard(code: string, userId?: string): Promise<{ uid: string; userId: string }> {
  const session = await auth();
  if (!session?.user.id) throw new Error("Unauthorized");
  const targetId = userId ?? session.user.id;
  if (targetId !== session.user.id && session.user.role !== Role.ADMIN) throw new Error("Forbidden");

  return prisma.$transaction(async tx => {
    const request = await tx.cardBindRequest.findUnique({ where: { code } });
    if (!request) throw new CardBindError("replaced");
    if (await tx.card.findUnique({ where: { uid: request.uid }, select: { id: true } })) throw new CardBindError("taken");

    await tx.card.create({ data: { uid: request.uid, userId: targetId } });
    await tx.cardBindRequest.delete({ where: { id: request.id } });
    return { uid: request.uid, userId: targetId };
  });
}

export type CardDTO = { id: string; uid: string; createdAt: Date; lastUsedAt: Date | null };

/** A user's cards: their own, or anyone's for an admin. */
export async function getUserCards(userId: string): Promise<CardDTO[]> {
  const session = await auth();
  if (session?.user.id !== userId && session?.user.role !== Role.ADMIN) throw new Error("Unauthorized");

  return prisma.card.findMany({
    where: { userId },
    select: { id: true, uid: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Removes a card from its user: the owner or an admin. */
export async function removeCard(cardId: string): Promise<void> {
  const session = await auth();
  if (!session?.user.id) throw new Error("Unauthorized");

  const card = await prisma.card.findUnique({ where: { id: cardId }, select: { userId: true } });
  if (!card) return;
  if (card.userId !== session.user.id && session.user.role !== Role.ADMIN) throw new Error("Forbidden");

  await prisma.card.delete({ where: { id: cardId } });
}
