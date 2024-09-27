// TODO: move to a better place

import { LogsTableData } from './components/LogsTable';
import { TimeLog } from './types';

// eslint-disable-next-line import/prefer-default-export
export function mapTimeLogToLogsTableRow(v: TimeLog): LogsTableData {
  const {
    id, userId, inTime, status,
  } = v;

  return {
    id,
    user: {
      id: userId,
      name: 'Alice Johnson',
    },
    inTime,
    outTime: status === 'currently-in' ? 'in' : {
      time: v.outTime,
      lockStatus: status === 'locked' ? 'auto' : undefined,
    },
    accumTime: status === 'currently-in' ? undefined : {
      sec: (v.outTime.getTime() - inTime.getTime()) / 1000,
      notCounted: status === 'locked',
      notes: v.notes,
    },
  };
}
