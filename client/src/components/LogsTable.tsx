
import {
    Chip,
    Avatar,
    IconButton,
    Typography,
    Tooltip,
} from "@mui/material";

import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import LockClockIcon from '@mui/icons-material/LockClock';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';

import { ColumnInfo, EnhancedTable } from './EnhancedTable';
import { secondToString } from "@/util";
import { useMemo } from "react";

const headCells: ColumnInfo[] = [
    { key: "id", label: "ID", numeric: false, disablePadding: true, sortable: false },
    {
        key: "name", label: "Name", numeric: false, disablePadding: false,
        valueMap: (val: string) => (<Chip
            avatar={<Avatar alt={val} src="https://2.gravatar.com/avatar/7d153db9ab817d315b65e64e0fc78ff51b05f32673e1ff90696d398bc28adc43?size=512" />}
            label={val}
            variant="outlined"
        />),
    },
    {
        key: "signInTime", label: "Sign-In Time", numeric: false, disablePadding: false,
        valueMap: (val: Date) => val.toLocaleString(),
    },
    {
        key: "signOutTime", label: "Sign-Out Time", numeric: false, disablePadding: false,
        valueMap: (val: Date | undefined, data: SignInLog) => {
            const { lockStatus, lockedBy } = data;

            if (!val) return "";

            const str = val.toLocaleString();
            if (lockStatus !== undefined) {
                const label = lockStatus === "manual" ? `Locked by ${lockedBy ?? 'Moderator'}` : "Auto Locked";
                const tooltipTitle = `Locked at ${val.toLocaleString()}`;

                return <Tooltip title={tooltipTitle}>
                    <Chip icon={lockedBy ? <LockPersonIcon /> : <LockClockIcon />} label={label} />
                </Tooltip>;
            }

            return str;
        },
    },
    {
        key: "accumSec", label: "Accumulated Time", numeric: false, disablePadding: false,
        valueMap: (val: number | undefined, data: SignInLog) => {
            const { signOutTime, signInTime, lockStatus, accumNotes } = data;

            const realSec = !lockStatus && signOutTime ? ((signOutTime.getTime() - signInTime.getTime()) / 1000) : undefined;

            // Has accumulated time
            if (val !== undefined) {
                return <Tooltip title={accumNotes}>
                    <Typography component="span" color="warning">
                        {realSec ? <>
                            <Typography component="span" style={{ textDecoration: 'line-through' }}>{secondToString(realSec)}</Typography>
                            {" → "}
                        </> : null}
                        {secondToString(val)}
                    </Typography>
                </Tooltip>;
            }

            if (realSec) {
                return secondToString(realSec);
            }

            return <Tooltip title={lockStatus ? "Please contact Moderators" : undefined}>
                {
                    lockStatus ? <Chip color="error" label="No Data" />
                        : <Chip color="success" label="Currently Sign-In" />
                }
            </Tooltip>;
        }
    },
    { key: "season", label: "Season", numeric: false, disablePadding: false },
    {
        key: "actions", label: "Actions", numeric: false, disablePadding: true, sortable: false,
        valueMap: () => (<>
            <IconButton>
                <DeleteIcon />
            </IconButton>
            <IconButton>
                <LogoutIcon />
            </IconButton>
        </>),
    }
];

const dummyData: SignInLog[] = [
    {
        id: "66e92e53cef77100011f60be",
        name: "Alice Johnson",
        signInTime: new Date("2023-10-01T08:00:00"),
        signOutTime: new Date("2023-10-01T12:00:00"),
        season: "2023 Season",
    },
    {
        id: "66e92e53cef77100011f60be",
        name: "Bob Smith",
        signInTime: new Date("2023-10-01T09:00:00"),
        signOutTime: new Date("2023-10-01T17:00:00"),
        lockStatus: "auto",
        season: "2023 Season",
        accumSec: 10,
    },
    {
        id: "66e92e53cef77100011f60be",
        name: "Bob Smith",
        signInTime: new Date("2023-10-03T11:00:00"),
        signOutTime: new Date("2023-10-03T14:00:00"),
        lockStatus: "manual",
        lockedBy: "Alice Johnson",
        season: "2023 Season",
    },
    {
        id: "66e92e53cef77100011f60be",
        name: "Charlie Brown",
        signInTime: new Date("2023-10-01T10:00:00"),
        signOutTime: new Date("2023-10-01T17:00:00"),
        season: "2023 Season",
        accumSec: 70,
    },
    {
        id: "66e92e53cef77100011f60be",
        name: "Charlie Brown",
        signInTime: new Date("2023-10-01T10:00:00"),
        season: "2023 Season",
    }
];

export type SignInLog = {
    id: string;
    name: string;
    signInTime: Date;
    signOutTime?: Date;
    season: string;

    lockStatus?: "auto" | "manual";
    lockedBy?: string;

    accumSec?: number;
    accumNotes?: string;
}

export interface LogsTableProps {
    mode: "current-in" | "history";
    data?: SignInLog[];
}

export default function LogsTable(props: LogsTableProps) {
    const { mode, data } = props;

    const columns = useMemo(() => {
        if (mode === "current-in") {
            return headCells.filter((v) => v.key !== "id" && v.key !== "signOutTime" && v.key !== "accumSec");
        } else if (mode === "history") {
            return headCells.filter((v) => v.key !== "actions");
        }
        return headCells;
    }, [mode]);

    const rows = (data ?? dummyData).map((v) => ({
        key: v.id,
        data: v
    }));

    return <>
        <EnhancedTable
            // title={mode === "current-in" ? "Current Sign-In Logs" : "Logs"}
            hideCheckbox={mode === "current-in"}
            hideMoreVert={mode === "current-in"}
            headCells={columns}
            rows={rows}
        />
    </>;
}
