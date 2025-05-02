'use client';

import { useActionState, useMemo, useState } from 'react';

import {
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
} from '@mui/material';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import LockClockIcon from '@mui/icons-material/LockClock';
import LockPersonIcon from '@mui/icons-material/LockPerson';

import { secondToString } from '@/utils';

import { ColumnInfo, EnhancedTable, TableRow } from './EnhancedTable';
import { useRouter } from 'next/navigation';
import prisma from '@/db';
import { deleteTimeLog } from '@/app/actions';
import { TimeLog } from '@/types';

export interface LogsTableData {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  inTime: Date;
  outTime: {
    time: Date;
    lockStatus?: 'auto' | 'manual';
    lockedBy?: string;
  } | 'in';
  accumTime?: {
    sec: number;
    notCounted?: boolean;
    notes?: string;
  };
}

const headCells: ColumnInfo[] = [
  {
    key: 'id', label: 'ID', numeric: false, disablePadding: true, sortable: false,
  },
  {
    key: 'user',
    label: 'Name',
    numeric: false,
    disablePadding: false,
    mapToElement: (val: LogsTableData['user']) => (
      <Chip
        avatar={<Avatar alt={val.name} src={val.avatar ?? 'https://2.gravatar.com/avatar/7d153db9ab817d315b65e64e0fc78ff51b05f32673e1ff90696d398bc28adc43?size=512'} />}
        label={val.name}
        variant="outlined"
      />
    ),
  },
  {
    key: 'inTime',
    label: 'Sign-In Time',
    numeric: false,
    disablePadding: false,
    mapToElement: (val: LogsTableData['inTime']) => val.toLocaleString(),
  },
  {
    key: 'outTime',
    label: 'Sign-Out Time',
    numeric: false,
    disablePadding: false,
    mapToElement: (val: LogsTableData['outTime']) => {
      if (val === 'in') return <Chip color="success" label="Currently Sign-In" />;

      const { time, lockStatus, lockedBy } = val;

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
    sortFunc: (a: LogsTableData['outTime'], b: LogsTableData['outTime']) => {
      const valA = a === 'in' ? Number.MAX_VALUE : a.time.getTime();
      const valB = b === 'in' ? Number.MAX_VALUE : b.time.getTime();

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
    mapToElement: (val: LogsTableData['accumTime']) => {
      if (!val) return '';

      if (val.notCounted) {
        return <Typography component="span" color="warning">{val.notes ?? ''}</Typography>;
      }

      return secondToString(val.sec);
    },
    sortFunc: (a: LogsTableData['accumTime'], b: LogsTableData['accumTime']) => {
      const valA = a && !a.notCounted ? a.sec : 0;
      const valB = b && !b.notCounted ? b.sec : 0;

      // eslint-disable-next-line no-nested-ternary
      return valA === valB ? 0
        : (valA > valB ? 1 : -1);
    },
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
  data?: LogsTableData[];
}

export default function LogsTable(props: LogsTableProps) {
  const { mode, data, title } = props;

  const router = useRouter();

  const columns = useMemo(() => {
    const fieldsToHide = {
      'current-in': ['id', 'outTime', 'accumTime', 'notes'],
      history: ['id', 'actions'],
    };

    return headCells.filter((v) => !fieldsToHide[mode].includes(v.key));
  }, [mode]);

  const rows: TableRow<LogsTableData>[] = useMemo(
    () => (data ?? []).map((v) => ({
      key: v.id,
      data: v,
    })),
    [data],
  );

  const [logToDelete, setLogToDelete] = useState<LogsTableData | undefined>(undefined);
  const handleDeleteConfirmClose = () => {
    setLogToDelete(undefined);
  };

  return <>
    <EnhancedTable
      title={title}
      showCheckbox={mode !== 'current-in'}
      showMoreVert={mode !== 'current-in'}
      usePagination={mode !== 'current-in'}
      headCells={columns}
      rows={rows}
      moreMenuItems={[
        {
          label: 'Edit',
          icon: <EditIcon fontSize="small" />,
          onClick: ({ id }: LogsTableData) => router.push(`/logs/edit/${id}`),
        },
        {
          label: 'Delete',
          icon: <DeleteIcon fontSize="small" />,
          onClick: (data: LogsTableData) => setLogToDelete(data),
        },
      ]}
    />
    <Dialog
      open={logToDelete !== undefined}
      onClose={handleDeleteConfirmClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        TimeLog with ID {logToDelete?.id} will be permanently deleted. Are you sure you want to proceed?
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          User: {`${logToDelete?.user.name} (${logToDelete?.user.id})`}
          <br />
          Start Time: {logToDelete?.inTime.toLocaleString()}
          <br />
          End Time: {logToDelete?.outTime === 'in' ? 'Currently Sign-In' : logToDelete?.outTime.time.toLocaleString()}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button color='error' onClick={async () => {
          if (logToDelete?.id) {
            deleteTimeLog(logToDelete.id);
          }
          handleDeleteConfirmClose();
        }}>Delete</Button>
        <Button onClick={handleDeleteConfirmClose} autoFocus>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  </>;
}
