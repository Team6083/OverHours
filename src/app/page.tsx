import {
  Typography,
  Grid2 as Grid,
  CardContent,
} from '@mui/material';

import CardWithShadow from '@/components/CardWithShadow';
import LogsTable, { LogsTableData } from '@/components/LogsTable';
import { getTimeLogToLogsTableRowMapper } from '@/mappers';
import { authUser } from '@/auth';
import HomeContainer from './HomeContainer';
import UserStatusCard from './UserStatusCard';
import { getTimeLogs, getUserAccumulatedTime, getUsers } from './actions';

export default async function Home() {
  const userInfo = await authUser();

  const timeLogs = await getTimeLogs({ status: 'currently-in' });
  const users = await getUsers();
  const userAccumulatedTime = userInfo
    ? await getUserAccumulatedTime(userInfo.id)
      .catch((error) => {
        console.error(`Failed to fetch user accumulated time: ${(error as Error).message}`);
        return undefined;
      })
    : undefined;

  const mapTimeLogToLogsTableRow = getTimeLogToLogsTableRowMapper(users);
  const tableRows: LogsTableData[] = timeLogs.map(mapTimeLogToLogsTableRow);

  const lastInLog = userInfo ? timeLogs.find((v) => v.userId === userInfo.id && v.status === 'currently-in') : undefined;

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
            userAccumulatedTime={userAccumulatedTime}
            inTime={lastInLog?.inTime}
          />
        </Grid>
        <Grid size={{ md: 8, xs: 12 }}>
          <CardWithShadow>
            <CardContent>
              <Typography gutterBottom variant="h5">
                Clocked-in Members
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
