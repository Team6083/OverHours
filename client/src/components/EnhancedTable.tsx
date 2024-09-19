
import { useMemo, useState } from "react";

import {
    alpha,
    Box,
    Checkbox,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TableSortLabel,
    Toolbar,
    Tooltip,
    Typography
} from "@mui/material";
import { visuallyHidden } from '@mui/utils';

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
    mapToElement?: (val: any) => JSX.Element | string;
    sortFunc?: (a: any, b: any) => number;
};

export interface EnhancedTableToolbarProps {
    numSelected: number;
    title?: string;
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
                    {props.title ?? ""}
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

export type TableRow<T extends { [key: string]: any }> = {
    key: string;
    data: T;
}

export interface EnhancedTableProps<T extends { [key: string]: any }> {
    title?: string;
    hideCheckbox?: boolean;
    hideMoreVert?: boolean;
    headCells: ColumnInfo[];
    rows: TableRow<T>[];
}

export function EnhancedTable<T extends { [key: string]: any }>(props: EnhancedTableProps<T>) {
    const { title, headCells, rows, hideCheckbox, hideMoreVert } = props;

    const [orderBy, setOrderBy] = useState<string>('');
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');

    const handleSortRequest = (key: string) => {
        if (orderBy === key) {
            if (order === 'asc') {
                setOrder('desc');
            } else if (order === 'desc') {
                setOrderBy('');
                setOrder('asc');
            }
        } else {
            setOrderBy(key);
            setOrder('asc');
        }
    }

    const processedRows = useMemo(() => {
        let filteredRows = rows.filter((v) => true);

        if (orderBy !== '') {
            const sortFunc = headCells.find((v) => v.key === orderBy)?.sortFunc;

            return filteredRows.toSorted(((a, b) => {
                const aVal = a.data[orderBy];
                const bVal = b.data[orderBy];

                const result = sortFunc ? sortFunc(aVal, bVal)
                    : (aVal === bVal ? 0 : aVal > bVal ? 1 : -1);

                return order === 'asc' ? result : -result;
            }));
        }

        return filteredRows;
    }, [rows, orderBy, order]);

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
                                    sortDirection={orderBy === headCell.key ? order : false}
                                >
                                    {headCell.sortable === false ? headCell.label :
                                        (
                                            <TableSortLabel
                                                active={orderBy === headCell.key}
                                                direction={orderBy === headCell.key ? order : 'asc'}
                                                onClick={() => handleSortRequest(headCell.key)}
                                            >
                                                {headCell.label}
                                                {orderBy === headCell.key ? (
                                                    <Box component="span" sx={visuallyHidden}>
                                                        {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                    </Box>
                                                ) : null}
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
                                        {headCell.mapToElement ?
                                            headCell.mapToElement(row.data[headCell.key])
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
        <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={rows.length}
            rowsPerPage={5}
            page={0}
            onPageChange={() => { }}
        // rowsPerPage={rowsPerPage}
        // page={page}
        // onPageChange={handleChangePage}
        // onRowsPerPageChange={handleChangeRowsPerPage}
        />
    </>
}
