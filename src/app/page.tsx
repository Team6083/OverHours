import { Typography, CardContent, Grid } from '@mui/material';

import CardWithShadow from '@/components/CardWithShadow';
import LogsTable, { LogsTableData } from '@/components/LogsTable';
import { authUser } from '@/auth';
import HomeContainer from './HomeContainer';
import UserStatusCard from './UserStatusCard';
import { getCurrentInTimeLogs, getUserAccumulatedTime } from './actions';

export default async function Home() {
  const userInfo = await authUser();

  const currentInTimeLogs = await getCurrentInTimeLogs();

  const tableRows = currentInTimeLogs
    .map((log): LogsTableData => ({
      id: log.id,
      user: {
        id: log.userId,
        name: log.user.name ?? log.userId,
      },
      inTime: log.inTime,
      outTime: 'in',
    }));

  const userAccumulatedTime = userInfo?.id ? await getUserAccumulatedTime(userInfo.id) : undefined;
  const lastInLog = currentInTimeLogs.find((v) => v.userId === userInfo?.id);

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
