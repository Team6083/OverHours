import { PrismaClient, TimeLog as PrismaTimeLog } from '@prisma/client';

import { TimeLog } from './types';

const prismaClientSingleton = () => new PrismaClient();

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;

export function timeLogStatusToDb(status: TimeLog['status']): PrismaTimeLog['status'] {
  // eslint-disable-next-line no-nested-ternary
  return status === 'currently-in' ? 'CurrentlyIn' : status === 'done' ? 'Done' : 'Locked';
}

export function timeLogStatusToApp(status: PrismaTimeLog['status']): TimeLog['status'] {
  // eslint-disable-next-line no-nested-ternary
  return status === 'CurrentlyIn' ? 'currently-in' : status === 'Done' ? 'done' : 'locked';
}
