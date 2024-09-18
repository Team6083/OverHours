
import { useMemo } from "react";

import {
    alpha,
    Checkbox,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Toolbar,
    Tooltip,
    Typography
} from "@mui/material";

import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export type ColumnInfo = {
    key: string;
    label: string;
    numeric: boolean;
    disablePadding: boolean;
    sortable?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    valueMap?: (val: any, data: any) => JSX.Element | string;
};

export interface EnhancedTableToolbarProps {
    numSelected: number;
    title: string;
}

function EnhancedTableToolbar(props: EnhancedTableToolbarProps) {
    const { numSelected } = props;
    return (
        <Toolbar
            sx={[
                {
                    pl: { sm: 2 },
                    pr: { xs: 1, sm: 1 },
                },
                numSelected > 0 && {
                    bgcolor: (theme) =>
                        alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
                },
            ]}
        >
            {numSelected > 0 ? (
                <Typography
                    sx={{ flex: '1 1 100%' }}
                    color="inherit"
                    variant="subtitle1"
                    component="div"
                >
                    {numSelected} selected
                </Typography>
            ) : (
                <Typography
                    sx={{ flex: '1 1 100%' }}
                    variant="h6"
                    id="tableTitle"
                    component="div"
                >
                    {props.title}
                </Typography>
            )}
            {numSelected > 0 ? (
                <Tooltip title="Delete">
                    <IconButton>
                        <DeleteIcon />
                    </IconButton>
                </Tooltip>
            ) : (
                <Tooltip title="Filter list">
                    <IconButton>
                        <FilterListIcon />
                    </IconButton>
                </Tooltip>
            )}
        </Toolbar>
    );
}

export type TableRow = {
    key: string;
    data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any;
    };
}

export interface EnhancedTableProps {
    title: string;
    hideCheckbox?: boolean;
    hideMoreVert?: boolean;
    headCells: ColumnInfo[];
    rows: TableRow[];
}

export function EnhancedTable(props: EnhancedTableProps) {
    const { title, headCells, rows, hideCheckbox, hideMoreVert } = props;

    const processedRows = useMemo(() => {
        return rows;
    }, [rows]);

    return <>
        <EnhancedTableToolbar title={title} numSelected={0} />
        <TableContainer>
            <Table sx={{ minWidth: 650 }} aria-label="sing-in list table">
                <TableHead>
                    <TableRow>
                        {
                            hideCheckbox ? null : (
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        color="primary"
                                        // indeterminate={numSelected > 0 && numSelected < rowCount}
                                        // checked={rowCount > 0 && numSelected === rowCount}
                                        inputProps={{
                                            'aria-label': 'select all desserts',
                                        }}
                                    />
                                </TableCell>)
                        }
                        {
                            headCells.map((headCell) => (
                                <TableCell
                                    key={headCell.key}
                                    align={headCell.numeric ? 'right' : 'left'}
                                    padding={headCell.disablePadding ? 'none' : 'normal'}
                                // sortDirection={orderBy === headCell.id ? order : false}
                                >
                                    {headCell.sortable === false ? headCell.label :
                                        (
                                            <TableSortLabel
                                            // active={orderBy === headCell.id}
                                            // direction={orderBy === headCell.id ? order : 'asc'}
                                            // onClick={createSortHandler(headCell.id)}
                                            >
                                                {headCell.label}
                                                {/* {orderBy === headCell.id ? (
                                                <Box component="span" sx={visuallyHidden}>
                                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                </Box>
                                            ) : null} */}
                                            </TableSortLabel>
                                        )
                                    }
                                </TableCell>)
                            )
                        }
                        {
                            hideMoreVert ? null : (
                                <TableCell>
                                    {/* For MoreVertIcon */}
                                </TableCell>)
                        }
                    </TableRow>
                </TableHead>
                <TableBody>
                    {processedRows.map((row) => (
                        <TableRow
                            key={row.key}
                        >
                            {
                                hideCheckbox ? null : (
                                    <TableCell padding="checkbox">
                                        <Checkbox color="primary" />
                                    </TableCell>)
                            }
                            {
                                headCells.map((headCell, i) => (
                                    <TableCell
                                        key={headCell.key}
                                        padding={headCell.disablePadding ? 'none' : 'normal'}

                                        {...(i == 0 ? {
                                            component: "th",
                                            scope: "row",
                                        } : {})}
                                    >
                                        {headCell.valueMap ?
                                            headCell.valueMap(row.data[headCell.key], row.data)
                                            : row.data[headCell.key]}
                                    </TableCell>
                                ))
                            }
                            {
                                hideMoreVert ? null : (
                                    <TableCell>
                                        <IconButton aria-label="more">
                                            <MoreVertIcon />
                                        </IconButton>
                                    </TableCell>)
                            }
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    </>
}
