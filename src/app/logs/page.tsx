import { CardContent } from '@mui/material';

import CardWithShadow from '@/components/CardWithShadow';
import LogsTable from '@/components/LogsTable';
import { getTimeLogToLogsTableRowMapper } from '@/mappers';
import { getTimeLogs, getUsers } from '../actions';
import LogsContainer from './LogsContainer';

export default async function LogsPage() {
  const timeLogs = await getTimeLogs();
  const users = await getUsers();

  // TODO: add user info
  const tableData = timeLogs.map(getTimeLogToLogsTableRowMapper(users));

  return (
    <LogsContainer>
      <CardWithShadow>
        <CardContent>
          <LogsTable
            title="Clock-In Logs"
            mode="history"
            data={tableData}
          />
        </CardContent>
      </CardWithShadow>
    </LogsContainer>
  );
}
