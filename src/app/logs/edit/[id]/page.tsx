import {
  Card, CardContent, Typography,
} from '@mui/material';
import prisma from '@/db';
import { auth } from '@/auth';
import LogsEditContainer from './LogsEditContainer';
import TimeLogForm from './TimeLogForm';
import NoPermission from './NoPermission';

export default async function LogsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: timeLogId } = await params;

  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return <NoPermission />;
  }

  const timeLog = await prisma.timeLog.findUnique({
    where: {
      id: timeLogId,
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

  return (
    <LogsEditContainer>
      <Card>
        <CardContent>
          <Typography variant="h4" marginBottom={2}>
            Edit TimeLog -
            {' '}
            {`${timeLogId}`}
          </Typography>

          {timeLog ? <TimeLogForm timeLog={timeLog} /> : null}

        </CardContent>
      </Card>
    </LogsEditContainer>
  );
}
