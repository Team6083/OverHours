'use server';

import { revalidatePath } from 'next/cache';

import { TimeLog, UserInfo } from '@/types';
import prisma, { timeLogStatusToApp, timeLogStatusToDb } from '@/db';

export async function punchIn(id: string) {
  const last = await prisma.timeLog.findFirst({
    where: {
      user: {
        id,
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
          id,
        },
      },
      status: 'CurrentlyIn',
      inTime: new Date(),
    },
  });

  revalidatePath('/');
}

export async function punchOut(id: string, time?: Date) {
  const last = await prisma.timeLog.findFirst({
    where: {
      user: {
        id,
      },
      status: 'CurrentlyIn',
    },
    orderBy: {
      inTime: 'desc',
    },
  });

  if (!last || last.status !== 'CurrentlyIn') {
    throw new Error('The user has not punched in yet.');
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

export async function deleteTimeLog(id: string) {
  const result = await prisma.timeLog.delete({
    where: {
      id,
    },
  });

  revalidatePath('/logs');

  return result;
}

export async function getUserAccumulatedTime(userId: string): Promise<number> {
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

export async function getUsers(): Promise<UserInfo[]> {
  const users = await prisma.user.findMany({});

  return users.map((v) => ({
    id: v.id,
    name: v.name,
    email: v.email ?? undefined,
  }));
}
