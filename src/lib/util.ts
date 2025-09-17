import { auth } from "@/auth";
import { UserDTO, prismaUserToDTO } from "./data/user-dto";
import prisma from "./prisma";

export function formatDuration(durationSec: number): string {
  const days = Math.floor(durationSec / 86400);
  const hours = Math.floor((durationSec % 86400) / 3600);
  const minutes = Math.floor((durationSec % 3600) / 60);
  const seconds = durationSec % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

export async function authUser(): Promise<UserDTO | null> {
  const session = await auth();

  const userId = session?.user.id;
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session?.user.id,
    }
  });

  if (!user) {
    throw new Error("User not found");
  }

  return prismaUserToDTO(user);
}
