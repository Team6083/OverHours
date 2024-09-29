// TODO: move to a better place

import { LogsTableData } from './components/LogsTable';
import { APITimeLog, TimeLog, UserInfo } from './types';

export function mapAPITimeLogToTimeLog(v: APITimeLog): TimeLog {
  const partial = {
    id: v.id,
    userId: v.userId,
    inTime: new Date(v.inTime),
    status: v.status,
    season: '2024 Season',
  };

  if (v.status === 'currently-in') {
    return {
      ...partial,
      status: 'currently-in',
    };
  }

  if (!v.outTime) {
    throw new Error('Out time is missing');
  }

  return {
    ...partial,
    status: v.status,
    outTime: new Date(v.outTime),
    notes: v.notes ? v.notes : undefined,
  };
}

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
        name: user?.name ?? user?.email ?? user?.id ?? userId,
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
