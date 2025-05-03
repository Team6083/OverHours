import {
  Card, CardContent, Container, Typography,
} from '@mui/material';
import prisma from '@/db';
import { auth } from '@/auth';
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
    return <Container maxWidth="md"><NoPermission /></Container>;
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
    <Container maxWidth="lg">
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
    </Container>
  );
}
