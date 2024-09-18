
import {
    Chip,
    Avatar,
    IconButton,
} from "@mui/material";

import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';

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
        valueMap: (val?: Date) => val?.toLocaleString() ?? '',
    },
    {
        key: "accumSec", label: "Accumulated Time", numeric: false, disablePadding: false,
        valueMap: (val: number | undefined, data: SignInLog) => {
            if (val) {
                return secondToString(val);
            }

            const { signOutTime, signInTime } = data;
            if (signOutTime) {
                return secondToString((signOutTime.getTime() - signInTime.getTime()) / 1000);
            }

            return "";
        }
    },
    { key: "season", label: "Season", numeric: false, disablePadding: false },
    {
        key: "actions", label: "Actions", numeric: false, disablePadding: true, sortable: true,
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
        season: "2023 Season",
        accumSec: 10,
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
    accumSec?: number;
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
    }))

    return <>
        <EnhancedTable
            title="Logs"
            hideCheckbox={mode === "current-in"}
            hideMoreVert={mode === "current-in"}
            headCells={columns}
            rows={rows}
        />
    </>;
}
