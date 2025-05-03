import {
  Card, CardContent, Typography,
} from '@mui/material';
import prisma from '@/db';
import LogsEditContainer from './LogsEditContainer';
import TimeLogForm from './TimeLogForm';

export default async function LogsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;

  const timeLog = await prisma.timeLog.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      userId: true,
      inTime: true,
      outTime: true,
      status: true,
      notes: true,
      createdAt: true,
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
            {`${id}`}
          </Typography>

          {timeLog ? <TimeLogForm timeLog={timeLog} /> : null}

        </CardContent>
      </Card>
    </LogsEditContainer>
  );
}
