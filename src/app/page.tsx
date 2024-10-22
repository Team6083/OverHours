import {
  Typography,
  Grid2 as Grid,
  CardContent,
} from '@mui/material';

import CardWithShadow from '@/components/CardWithShadow';
import LogsTable, { LogsTableData } from '@/components/LogsTable';
import { UserInfo } from '@/types';
import { mapAPITimeLogToTimeLog, getTimeLogToLogsTableRowMapper } from '@/mappers';
import HomeContainer from './HomeContainer';
import UserStatusCard from './UserStatusCard';
import { getTimeLogs } from './actions';

export default async function Home() {
  const userInfo: UserInfo = {
    id: 'kenn',
    name: 'Kenn Huang',
    email: '',
    avatar: '',
  };

  const timeLogs = (await getTimeLogs({ status: 'currently-in' })).map(mapAPITimeLogToTimeLog);

  const mapTimeLogToLogsTableRow = getTimeLogToLogsTableRowMapper([userInfo]);
  const tableRows: LogsTableData[] = timeLogs.map(mapTimeLogToLogsTableRow);

  const isCurrentIn = timeLogs.some((v) => v.userId === userInfo.id && v.status === 'currently-in');

  return (
    <HomeContainer>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Typography variant="h4">FRC Team 6083</Typography>
        </Grid>
      </Grid>
      <Grid container spacing={2} marginTop={2}>
        <Grid size={{ md: 4, xs: 12 }}>
          <UserStatusCard
            userInfo={userInfo}
            currentSeason="2024 Season"
            isCurrentIn={isCurrentIn}
          />
        </Grid>
        <Grid size={{ md: 8, xs: 12 }}>
          <CardWithShadow>
            <CardContent>
              <Typography gutterBottom variant="h5">
                Current Sign-In Members
              </Typography>

              <LogsTable
                mode="current-in"
                data={tableRows}
              />
            </CardContent>
          </CardWithShadow>
        </Grid>
      </Grid>
    </HomeContainer>
  );
}
