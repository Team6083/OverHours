'use server';

import { revalidatePath } from 'next/cache';

import prisma from '@/db';
import { auth } from '@/auth';
import { unauthorized } from 'next/navigation';

// Clock-In a user
export async function clockIn(userId: string) {
  const session = await auth();
  if (!session) {
    unauthorized();
  }

  // Only admin or the user can clock in
  if (session.user?.id !== userId && session?.user?.role !== 'admin') {
    throw new Error('You are not authorized to clock in this user');
  }

  const last = await prisma.timeLog.findFirst({
    where: {
      user: {
        id: userId,
      },
    },
    orderBy: {
      inTime: 'desc',
    },
  });

  if (last?.status === 'CurrentlyIn') {
    throw new Error('User is already clocked in');
  }

  if (last?.outTime && last.outTime > new Date()) {
    throw new Error('Invalid time');
  }

  await prisma.timeLog.create({
    data: {
      user: {
        connect: {
          id: userId,
        },
      },
      status: 'CurrentlyIn',
      inTime: new Date(),
    },
  });

  revalidatePath('/');
}

// Clock-Out a user
export async function clockOut(userId: string, time?: Date) {
  const session = await auth();
  if (!session) {
    unauthorized();
  }

  // Only admin or the user can clock out
  if (session.user?.id !== userId && session?.user?.role !== 'admin') {
    throw new Error('You are not authorized to clock out this user');
  }

  const last = await prisma.timeLog.findFirst({
    where: {
      user: {
        id: userId,
      },
      status: 'CurrentlyIn',
    },
    orderBy: {
      inTime: 'desc',
    },
  });

  if (!last || last.status !== 'CurrentlyIn') {
    throw new Error('The user has not clocked in yet.');
  }

  last.outTime = time ?? new Date();

  if (last.inTime > last.outTime) {
    throw new Error('Invalid time');
  }

  await prisma.timeLog.update({
    where: {
      id: last.id,
    },
    data: {
      status: 'Done',
      outTime: last.outTime,
    },
  });

  revalidatePath('/');
}

// Get Clocked-in Time Logs
export async function getCurrentInTimeLogs() {
  return prisma.timeLog.findMany({
    where: {
      status: 'CurrentlyIn',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      inTime: 'desc',
    },
  });
}

// Get Accumulated Time for a user
export async function getUserAccumulatedTime(userId: string): Promise<number> {
  const session = await auth();
  if (!session) {
    unauthorized();
  }

  // Only admin or the user can get the accumulated time
  if (session.user?.id !== userId && session?.user?.role !== 'admin') {
    throw new Error('You are not authorized to get the accumulated time of this user');
  }

  const timeLogs = await prisma.timeLog.findMany({
    where: {
      userId,
      status: {
        in: ['Done'],
      },
    },
    select: {
      inTime: true,
      outTime: true,
    },
  });

  const totalTime = timeLogs.reduce((acc, log) => {
    if (!log.outTime) {
      throw new Error('Out time is missing');
    }
    const inTime = log.inTime.getTime();
    const outTime = log.outTime.getTime();
    return acc + (outTime - inTime) / 1000;
  }, 0);

  return totalTime;
}
