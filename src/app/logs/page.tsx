'use client';

import { CardContent, Container, useTheme } from '@mui/material';

import CardWithShadow from '@/components/CardWithShadow';
import LogsTable from '@/components/LogsTable';
import { TimeLog } from '@/types';
import { mapTimeLogToLogsTableRow } from '@/mappers';

const data: TimeLog[] = [
  {
    id: '66e92e53cef77100011f60be',
    userId: '66e92e53cef77100011f60be',
    status: 'done',
    inTime: new Date('2023-10-01T08:00:00'),
    outTime: new Date('2023-10-01T12:00:00'),
    season: '2023 Season',
  },
  {
    id: '66e92e53cef77100011f60bf',
    userId: '66e92e53cef77100011f60bf',
    status: 'locked',
    inTime: new Date('2023-10-01T09:00:00'),
    outTime: new Date('2023-10-01T17:00:00'),
    season: '2023 Season',
  },
  {
    id: '66e92e53cef77100311f60be',
    userId: '66e92e53cef77100311f60be',
    status: 'locked',
    inTime: new Date('2023-10-01T10:00:00'),
    outTime: new Date('2023-10-01T17:00:00'),
    season: '2023 Season',
  },
  {
    id: '66e92e53cef77120011f60be',
    userId: '66e92e53cef77100311f60be',
    status: 'locked',
    inTime: new Date('2023-10-03T11:00:00'),
    outTime: new Date('2023-10-03T14:00:00'),
    season: '2023 Season',
    notes: 'Exceed clock-out time limit',
  },
  {
    id: '66e92e52cef77100011f60be',
    userId: '66e92',
    status: 'currently-in',
    inTime: new Date('2023-10-01T10:00:00'),
    season: '2023 Season',
  },
];

export default function LogsPage() {
  const theme = useTheme();

  const tableData = data.map(mapTimeLogToLogsTableRow);

  return (
    <Container maxWidth="xl" sx={{ marginTop: theme.spacing(3), marginBottom: theme.spacing(3) }}>
      <CardWithShadow>
        <CardContent>
          <LogsTable title="Sign-In Logs" mode="history" data={tableData} />
        </CardContent>
      </CardWithShadow>
    </Container>
  );
}
