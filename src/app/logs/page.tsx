import { CardContent, Container } from '@mui/material';

import CardWithShadow from '@/components/CardWithShadow';
import LogsTable, { LogsTableData } from '@/components/LogsTable';
import { auth } from '@/auth';
import prisma from '@/db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export default async function LogsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === 'admin';

  const timeLogs = await prisma.timeLog.findMany({
    where: {
      userId: isAdmin ? undefined : session?.user?.id,
    },
    orderBy: {
      inTime: 'desc',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const tableData = timeLogs.map((log): LogsTableData => {
    if (log.status === 'CurrentlyIn') {
      return {
        id: log.id,
        user: {
          id: log.userId,
          name: log.user.name ?? log.userId,
        },
        inTime: log.inTime,
        outTime: 'in',
      };
    }

    if (log.outTime === null) {
      throw new Error('Out time is null');
    }

    return {
      id: log.id,
      user: {
        id: log.userId,
        name: log.user.name ?? log.userId,
      },
      inTime: log.inTime,
      outTime: {
        time: log.outTime,
        lockStatus: log.status === 'Locked' ? 'auto' : undefined,
      },
      accumTime: {
        sec: (log.outTime.getTime() - log.inTime.getTime()) / 1000,
        notCounted: log.status === 'Locked',
        notes: log.notes ?? undefined,
      },
    };
  });

  return (
    <Container maxWidth="lg">
      <CardWithShadow>
        <CardContent>
          <LogsTable
            title="Clock-In Logs"
            mode="history"
            data={tableData}
            showAdminActions={isAdmin}
            handleEdit={async (id: string) => {
              'use server';

              redirect(`/logs/edit/${id}`);
            }}
            handleDelete={async (id: string) => {
              'use server';

              if (!isAdmin) {
                throw new Error('You are not authorized to delete this log');
              }

              await prisma.timeLog.delete({
                where: {
                  id,
                },
              });

              revalidatePath('/logs');
            }}
          />
        </CardContent>
      </CardWithShadow>
    </Container>
  );
}
