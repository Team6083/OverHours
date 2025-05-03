'use client';

import { useMemo, useState } from 'react';

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
} from '@mui/material';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import LockClockIcon from '@mui/icons-material/LockClock';
import LockPersonIcon from '@mui/icons-material/LockPerson';

import { secondToString } from '@/utils';

import { ColumnInfo, EnhancedTable, TableRow } from './EnhancedTable';

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
        avatar={<Avatar alt={val.name} src={val.avatar} />}
        label={val.name}
        variant="outlined"
      />
    ),
  },
  {
    key: 'inTime',
    label: 'Clock-In Time',
    numeric: false,
    disablePadding: false,
    mapToElement: (val: LogsTableData['inTime']) => val.toLocaleString(),
  },
  {
    key: 'outTime',
    label: 'Clock-Out Time',
    numeric: false,
    disablePadding: false,
    mapToElement: (val: LogsTableData['outTime']) => {
      if (val === 'in') return <Chip color="success" label="Currently Clocked-In" />;

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

function DeleteConfirmDialog(props: {
  logToDelete: LogsTableData | undefined;
  handleDeleteConfirmClose: () => void;
  handleDelete: (id: string) => Promise<void>;
}) {
  const { logToDelete, handleDeleteConfirmClose, handleDelete } = props;

  return (
    <Dialog
      open={logToDelete !== undefined}
      onClose={handleDeleteConfirmClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        TimeLog with ID
        {' '}
        {logToDelete?.id}
        {' '}
        will be permanently deleted. Are you sure you want to proceed?
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          User:
          {' '}
          {`${logToDelete?.user.name} (${logToDelete?.user.id})`}
          <br />
          Start Time:
          {' '}
          {logToDelete?.inTime.toLocaleString()}
          <br />
          End Time:
          {' '}
          {logToDelete?.outTime === 'in' ? 'Currently Clock-In' : logToDelete?.outTime.time.toLocaleString()}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          color="error"
          onClick={async () => {
            if (logToDelete?.id) {
              handleDelete(logToDelete.id);
            }
            handleDeleteConfirmClose();
          }}
        >
          Delete
        </Button>
        <Button onClick={handleDeleteConfirmClose} autoFocus>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export interface LogsTableProps {
  title?: string;
  mode: 'current-in' | 'history';
  data?: LogsTableData[];
  showAdminActions?: boolean;
  handleEdit?: (id: string) => Promise<void>;
  handleDelete?: (id: string) => Promise<void>;
}

export default function LogsTable(props: LogsTableProps) {
  const {
    title, mode, data, showAdminActions, handleEdit, handleDelete,
  } = props;

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

  const moreMenuItems = useMemo(() => {
    if (showAdminActions) {
      return [
        {
          label: 'Edit',
          icon: <EditIcon fontSize="small" />,
          onClick: ({ id }: LogsTableData) => handleEdit?.(id),
          disabled: Boolean(!handleEdit),
        },
        {
          label: 'Delete',
          icon: <DeleteIcon fontSize="small" />,
          onClick: setLogToDelete,
          disabled: Boolean(!handleDelete),
        },
      ];
    }

    return [];
  }, [handleDelete, handleEdit, showAdminActions]);

  return (
    <>
      <EnhancedTable
        title={title}
        showCheckbox={mode !== 'current-in' && Boolean(showAdminActions)}
        showMoreVert={mode !== 'current-in' && moreMenuItems.length > 0}
        usePagination={mode !== 'current-in'}
        headCells={columns}
        rows={rows}
        moreMenuItems={moreMenuItems}
      />

      {handleDelete ? (
        <DeleteConfirmDialog
          logToDelete={logToDelete}
          handleDeleteConfirmClose={handleDeleteConfirmClose}
          handleDelete={handleDelete}
        />
      ) : null}
    </>
  );
}
