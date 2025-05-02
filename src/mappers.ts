/* eslint-disable import/prefer-default-export */
// TODO: move to a better place

import { LogsTableData } from './components/LogsTable';
import { TimeLog, UserInfo } from './types';

export function getTimeLogToLogsTableRowMapper(users: UserInfo[]) {
  return (v: TimeLog): LogsTableData => {
    const {
      id, userId, inTime, status,
    } = v;

    const user = users.find((u) => u.id === userId);

    return {
      id,
      user: {
        id: userId,
        name: user?.name ?? user?.id ?? userId,
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
  };
}
