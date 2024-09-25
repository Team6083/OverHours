'use client';

import { useMemo } from 'react';

import {
  Chip,
  Avatar,
  IconButton,
  Typography,
  Tooltip,
} from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import LockClockIcon from '@mui/icons-material/LockClock';
import LockPersonIcon from '@mui/icons-material/LockPerson';

import { secondToString } from '@/utils';
import { SignInLog } from '@/types';

import { ColumnInfo, EnhancedTable, TableRow } from './EnhancedTable';

type TableRowData = {
  id: string;
  name: string;
  signInTime: Date;
  signOutTime?: {
    time: Date;
    lockStatus?: 'auto' | 'manual';
    lockedBy?: string;
  };
  accumTime: {
    sec: number;
    originalSec?: number;
    notes?: string;
  } | 'sign-in' | 'no-data';
  season: string;
}

const headCells: ColumnInfo[] = [
  {
    key: 'id', label: 'ID', numeric: false, disablePadding: true, sortable: false,
  },
  {
    key: 'name',
    label: 'Name',
    numeric: false,
    disablePadding: false,
    mapToElement: (val: TableRowData['name']) => (
      <Chip
        avatar={<Avatar alt={val} src="https://2.gravatar.com/avatar/7d153db9ab817d315b65e64e0fc78ff51b05f32673e1ff90696d398bc28adc43?size=512" />}
        label={val}
        variant="outlined"
      />
    ),
  },
  {
    key: 'signInTime',
    label: 'Sign-In Time',
    numeric: false,
    disablePadding: false,
    mapToElement: (val: TableRowData['signInTime']) => val.toLocaleString(),
  },
  {
    key: 'signOutTime',
    label: 'Sign-Out Time',
    numeric: false,
    disablePadding: false,
    mapToElement: (val: TableRowData['signOutTime']) => {
      const { time, lockStatus, lockedBy } = val ?? {};

      if (!time) return '';

      const str = time.toLocaleString();
      if (lockStatus !== undefined) {
        const label = lockStatus === 'manual' ? `Locked by ${lockedBy ?? 'Moderator'}` : 'Auto Locked';
        const tooltipTitle = `Locked at ${time.toLocaleString()}`;

        return (
          <Tooltip title={tooltipTitle}>
            <Chip icon={lockedBy ? <LockPersonIcon /> : <LockClockIcon />} label={label} />
          </Tooltip>
        );
      }

      return str;
    },
    sortFunc: (a: TableRowData['signOutTime'], b: TableRowData['signOutTime']) => {
      const valA = a?.time.getTime() ?? 0;
      const valB = b?.time.getTime() ?? 0;

      // eslint-disable-next-line no-nested-ternary
      return valA === valB ? 0
        : (valA > valB ? 1 : -1);
    },
  },
  {
    key: 'accumTime',
    label: 'Accumulated Time',
    numeric: false,
    disablePadding: false,
    mapToElement: (val: TableRowData['accumTime']) => {
      if (typeof val === 'string') {
        return (
          <Tooltip title={val === 'no-data' ? 'Please contact Moderators' : undefined}>
            {
              val === 'no-data' ? <Chip color="error" label="No Data" />
                : <Chip color="success" label="Currently Sign-In" />
            }
          </Tooltip>
        );
      }

      const { sec, originalSec, notes } = val;

      return (
        <Tooltip title={notes}>
          <Typography component="span" color={originalSec !== undefined ? 'warning' : undefined}>
            {originalSec !== undefined ? (
              <>
                <Typography component="span" style={{ textDecoration: 'line-through' }}>{secondToString(originalSec)}</Typography>
                {' → '}
              </>
            ) : null}
            {secondToString(sec)}
          </Typography>
        </Tooltip>
      );
    },
    sortFunc: (a: TableRowData['accumTime'], b: TableRowData['accumTime']) => {
      const valA = typeof a === 'string' ? 0 : a.sec;
      const valB = typeof b === 'string' ? 0 : b.sec;

      // eslint-disable-next-line no-nested-ternary
      return valA === valB ? 0
        : (valA > valB ? 1 : -1);
    },
  },
  {
    key: 'season', label: 'Season', numeric: false, disablePadding: false,
  },
  {
    key: 'actions',
    label: 'Actions',
    numeric: false,
    disablePadding: true,
    sortable: false,
    mapToElement: () => (
      <>
        <IconButton>
          <DeleteIcon />
        </IconButton>
        <IconButton>
          <LogoutIcon />
        </IconButton>
      </>
    ),
  },
];

export interface LogsTableProps {
  title?: string;
  mode: 'current-in' | 'history';
  data?: SignInLog[];
}

export default function LogsTable(props: LogsTableProps) {
  const { mode, data, title } = props;

  const columns = useMemo(() => {
    if (mode === 'current-in') {
      return headCells.filter((v) => v.key !== 'id' && v.key !== 'signOutTime' && v.key !== 'accumTime');
    } if (mode === 'history') {
      return headCells.filter((v) => v.key !== 'actions');
    }
    return headCells;
  }, [mode]);

  const rows: TableRow<TableRowData>[] = useMemo(() => (data ?? []).map((v) => {
    const {
      id, name, signInTime, signOutTime, season, lockStatus, lockedBy, accumSec, accumNotes,
    } = v;

    const realAccumSec = signOutTime
      ? (signOutTime.getTime() - signInTime.getTime()) / 1000
      : undefined;

    const accumTime: TableRowData['accumTime'] = realAccumSec === undefined ? 'sign-in'
      : lockStatus !== undefined && accumSec === undefined ? 'no-data'
        : {
          sec: accumSec ?? realAccumSec,
          originalSec: accumSec ? realAccumSec : undefined,
          notes: accumNotes,
        };

    return {
      key: id,
      data: {
        id,
        name,
        signInTime,
        signOutTime: signOutTime ? {
          time: signOutTime,
          lockStatus,
          lockedBy,
        } : undefined,
        season,
        accumTime,
      },
    };
  }), [data]);

  return (
    <EnhancedTable
      title={title}
      showCheckbox={mode !== 'current-in'}
      showMoreVert={mode !== 'current-in'}
      usePagination={mode !== 'current-in'}
      headCells={columns}
      rows={rows}
    />
  );
}
