'use server';

import { revalidatePath } from 'next/cache';

import { TimeLog } from '@/types';
import prisma, { timeLogStatusToApp, timeLogStatusToDb } from '@/db';

export async function punchIn(userName: string) {
  const last = await prisma.timeLog.findFirst({
    where: {
      user: {
        userName,
      },
    },
    orderBy: {
      inTime: 'desc',
    },
  });

  if (last?.status === 'CurrentlyIn') {
    throw new Error('User is already punched in');
  }

  if (last?.outTime && last.outTime > new Date()) {
    throw new Error('Invalid time');
  }

  await prisma.timeLog.create({
    data: {
      user: {
        connect: {
          userName,
        },
      },
      status: 'CurrentlyIn',
      inTime: new Date(),
    },
  });

  revalidatePath('/');
}

export async function punchOut(userName: string, time?: Date) {
  const last = await prisma.timeLog.findFirst({
    where: {
      user: {
        userName,
      },
      status: 'CurrentlyIn',
    },
    orderBy: {
      inTime: 'desc',
    },
  });

  if (!last) {
    throw new Error('The user has not punched in yet.');
  }

  last.outTime = time ?? new Date();

  await prisma.timeLog.create({
    data: {
      user: {
        connect: {
          userName,
        },
      },
      status: 'CurrentlyIn',
      inTime: new Date(),
    },
  });

  revalidatePath('/');
}

export type GetTimeLogsOptions = {
  userId: TimeLog['userId'];
  status: TimeLog['status'];
};

export async function getTimeLogs(opts?: Partial<GetTimeLogsOptions>): Promise<TimeLog[]> {
  const findManyOpts: Parameters<typeof prisma.timeLog.findMany>[0] = {};
  if (opts?.userId) {
    findManyOpts.where = {
      userId: opts.userId,
    };
  }

  if (opts?.status) {
    findManyOpts.where = {
      ...findManyOpts.where,
      status: timeLogStatusToDb(opts.status),
    };
  }

  const timeLogs = await prisma.timeLog.findMany(findManyOpts);

  return timeLogs.map((v): TimeLog => {
    const base = {
      id: v.id,
      userId: v.userId,
      inTime: v.inTime,
      notes: v.notes ?? undefined,
      season: 'n/a',
    };

    if (v.status === 'CurrentlyIn') {
      return {
        ...base,
        status: 'currently-in',
      };
    }

    if (!v.outTime) {
      throw new Error('Out time is missing');
    }

    return {
      ...base,
      status: timeLogStatusToApp(v.status),
      outTime: v.outTime,
    };
  });
}
