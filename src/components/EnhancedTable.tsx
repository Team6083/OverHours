import { useMemo, useState } from 'react';

import {
  alpha,
  Box,
  Checkbox,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
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
  Typography,
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type anyObject = { [key: string]: any };

export type ColumnInfo = {
  key: string;
  label: string;
  numeric: boolean;
  disablePadding: boolean;
  sortable?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapToElement?: (val: any) => JSX.Element | string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sortFunc?: (a: any, b: any) => number;
};

export interface EnhancedTableToolbarProps {
  numSelected: number;
  title?: string;
}

function EnhancedTableToolbar(props: EnhancedTableToolbarProps) {
  const { numSelected, title } = props;
  return (
    <Toolbar
      sx={[
        {
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
        },
        numSelected > 0 && {
          bgcolor:
            (theme) => alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
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
          {numSelected}
          {' '}
          selected
        </Typography>
      ) : (
        <Typography
          sx={{ flex: '1 1 100%' }}
          variant="h6"
          id="tableTitle"
          component="div"
        >
          {title ?? ''}
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

export type TableRow<T extends anyObject> = {
  key: string;
  data: T;
}

export interface EnhancedTableProps<T extends anyObject> {
  title?: string;

  showCheckbox?: boolean;
  showMoreVert?: boolean;
  usePagination?: boolean;

  headCells: ColumnInfo[];
  rows: TableRow<T>[];
  moreMenuItems?: {
    label: string;
    icon: JSX.Element;
    onClick: (data: T) => void;
  }[];
}

export function EnhancedTable<T extends anyObject>(props: EnhancedTableProps<T>) {
  const {
    title, headCells, rows, moreMenuItems,
  } = props;

  // eslint-disable-next-line react/destructuring-assignment
  const showCheckbox = props.showCheckbox ?? true;
  // eslint-disable-next-line react/destructuring-assignment
  const showMoreVert = props.showMoreVert ?? true;
  // eslint-disable-next-line react/destructuring-assignment
  const usePagination = props.usePagination ?? true;

  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = useState<string>('');

  const [selected, setSelected] = useState<readonly string[]>([]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const handleClose = () => setAnchorEl(null);
  const [moreMenuRow, setMoreMenuRow] = useState<null | TableRow<T>>(null);

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
  };

  const handleSelectClick = (event: React.MouseEvent<unknown>, id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: readonly string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }
    setSelected(newSelected);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
    setSelected([]);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter and sort the rows
  const processedRows: TableRow<T>[] = useMemo(() => {
    const filteredRows = rows.filter(() => true);

    if (orderBy !== '') {
      const sortFunc = headCells.find((v) => v.key === orderBy)?.sortFunc;

      return filteredRows.toSorted(((a, b) => {
        const aVal = a.data[orderBy];
        const bVal = b.data[orderBy];

        // eslint-disable-next-line no-nested-ternary
        const result = sortFunc ? sortFunc(aVal, bVal)
          : (
            // eslint-disable-next-line no-nested-ternary
            aVal === bVal ? 0
              : (aVal > bVal ? 1 : -1)
          );

        return order === 'asc' ? result : -result;
      }));
    }

    return filteredRows;
  }, [rows, orderBy, headCells, order]);

  const rowCount = processedRows.length;
  const numSelected = selected.length;

  // Paginate the rows
  const paginatedRows: TableRow<T>[][] = useMemo(
    () => (!usePagination ? [processedRows]
      : processedRows.reduce((acc: TableRow<T>[][], cur) => {
        const lastPage = acc[acc.length - 1];
        if (!lastPage || lastPage.length >= rowsPerPage) {
          return [...acc, [cur]];
        }
        return [...acc.slice(0, -1), [...lastPage, cur]];
      }, [])),
    [processedRows, rowsPerPage, usePagination],
  );

  const paginatedRowCount = paginatedRows[page]?.length;

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = paginatedRows[page]?.map((n) => n.key);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  return (
    <>
      <EnhancedTableToolbar title={title} numSelected={numSelected} />
      <TableContainer>
        <Table sx={{ minWidth: 650 }} aria-label="sing-in list table">
          <TableHead>
            <TableRow>
              {
                !showCheckbox ? null : (
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      indeterminate={numSelected > 0 && numSelected < paginatedRowCount}
                      checked={paginatedRowCount > 0 && numSelected === paginatedRowCount}
                      onChange={handleSelectAllClick}
                      inputProps={{
                        'aria-label': 'select all desserts',
                      }}
                    />
                  </TableCell>
                )
              }
              {
                // Table Header Mapping
                headCells.map((headCell) => (
                  <TableCell
                    key={headCell.key}
                    align={headCell.numeric ? 'right' : 'left'}
                    padding={headCell.disablePadding ? 'none' : 'normal'}
                    sortDirection={orderBy === headCell.key ? order : false}
                  >
                    {headCell.sortable === false ? headCell.label
                      : (
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
                      )}
                  </TableCell>
                ))
              }
              {
                !showMoreVert ? null : (
                  <TableCell>
                    {/* For MoreVertIcon */}
                  </TableCell>
                )
              }
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedRows[page]?.map((row) => (
              <TableRow
                key={row.key}
              >
                {
                  !showCheckbox ? null : (
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={selected.indexOf(row.key) !== -1}
                        onClick={(event) => handleSelectClick(event, row.key)}
                      />
                    </TableCell>
                  )
                }
                {
                  headCells.map((headCell, i) => (
                    <TableCell
                      key={headCell.key}
                      padding={headCell.disablePadding ? 'none' : 'normal'}
                      {...(i === 0 ? {
                        component: 'th',
                        scope: 'row',
                      } : {})}
                    >
                      {headCell.mapToElement
                        ? headCell.mapToElement(row.data[headCell.key])
                        : row.data[headCell.key]}
                    </TableCell>
                  ))
                }
                {
                  !showMoreVert ? null : (
                    <TableCell>
                      <IconButton
                        aria-label="more"
                        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                          setAnchorEl(event.currentTarget);
                          setMoreMenuRow(row);
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                      <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleClose}
                        MenuListProps={{
                          'aria-labelledby': 'basic-button',
                        }}
                      >
                        {
                          moreMenuItems?.map((item) => (
                            <MenuItem
                              key={item.label}
                              onClick={() => {
                                if (moreMenuRow) {
                                  item.onClick(moreMenuRow.data);
                                }
                                handleClose();
                              }}
                            >
                              <ListItemIcon>
                                {item.icon}
                              </ListItemIcon>
                              <ListItemText>{item.label}</ListItemText>
                            </MenuItem>
                          ))
                        }
                      </Menu>
                    </TableCell>
                  )
                }
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {
        usePagination
          ? (
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
              component="div"
              count={rowCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          ) : null
      }
    </>
  );
}
