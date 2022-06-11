import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Box,
} from '@mui/material';
import { Page, usePagenationTable } from '../../hooks/usePagenationTable';
import { User } from '../../interfaces';
import StyledTableCell from '../styled/StyledTableCell';
import StyledTableSortLabel from '../styled/StyledTableSortLabel';

type TableHeadLabel = 'email' | 'username' | 'createdAt' | 'lastModifiedAt' | 'enabled' | 'status';

const headCells = [
  {
    id: 'email' as TableHeadLabel, numeric: false, disablePadding: false, label: 'email',
  },
  {
    id: 'username' as TableHeadLabel, numeric: false, disablePadding: false, label: 'username',
  },
  {
    id: 'createdAt' as TableHeadLabel, numeric: false, disablePadding: false, label: 'created at',
  },
  {
    id: 'lastModifiedAt' as TableHeadLabel, numeric: false, disablePadding: false, label: 'last modified at',
  },
  {
    id: 'enabled' as TableHeadLabel, numeric: false, disablePadding: false, label: 'enabled',
  },
  {
    id: 'status' as TableHeadLabel, numeric: false, disablePadding: false, label: 'status',
  },
];

interface UsersTableProps {
  /**
   * Injected by the documentation to work in an iframe.
   * You won't need it on your project.
   */
  container?: Element,
  users: User[],
  initPage: Page,
  onClick: (user: User) => void,
}

export const UsersTable = ({ users, initPage, onClick }: UsersTableProps): JSX.Element => {
  const {
    page,
    handleChangePage,
    handleChangeRowsPerPage,
    createSortHandler,
    getComparator,
    stableSort,
    sortOrder,
  } = usePagenationTable<{
    username: string,
    attributes?: {
      [key: string]: string,
    },
    createdAt: string,
    lastModifiedAt: string,
    enabled: string,
    status: string,
    mfa?: {
      deliveryMedium?: string,
      attributeName?: string,
    }[],
    group?: string,
    groups?: string[],
    email: string,
    origin: User,
  }, TableHeadLabel>(initPage, {
    order: 'asc',
    orderBy: 'email',
  });

  return (
    <Box>
      <TableContainer>
        <Table size='small' stickyHeader>
          <TableHead>
            <TableRow>
              {headCells.map(({ id, numeric, disablePadding, label }) => (
                <StyledTableCell
                  key={id}
                  align={numeric ? 'right' : 'left'}
                  padding={disablePadding ? 'none' : 'normal'}
                  sortDirection={sortOrder.orderBy === id ? sortOrder.order : false}
                >
                  {id === 'email' ? label : (
                    <StyledTableSortLabel
                      active={sortOrder.orderBy === id}
                      direction={sortOrder.orderBy === id ? sortOrder.order : 'asc'}
                      onClick={createSortHandler(id)}
                    >
                      {label}
                    </StyledTableSortLabel>)
                  }
                </StyledTableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {
              stableSort(users.map((item) => ({
                email: item.email || '',
                username: item.username,
                createdAt: item.createdAt?.toLocaleString() || '',
                lastModifiedAt: item.lastModifiedAt?.toLocaleString() || '',
                enabled: item.enabled,
                status: item.status,
                origin: item,
              })), getComparator(sortOrder.order, sortOrder.orderBy))
                .slice(page.page * page.rowsPerPage, page.page * page.rowsPerPage + page.rowsPerPage)
                .map(({
                  email,
                  origin,
                  username,
                  createdAt,
                  lastModifiedAt,
                  enabled,
                  status,
                }) => (<TableRow key={email} onClick={() => { onClick(origin); }}>
                  <TableCell>{email}</TableCell>
                  <TableCell>{username}</TableCell>
                  <TableCell>{createdAt}</TableCell>
                  <TableCell>{lastModifiedAt}</TableCell>
                  <TableCell>{enabled}</TableCell>
                  <TableCell>{status}</TableCell>
                </TableRow>))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={users.length}
        rowsPerPage={page.rowsPerPage}
        page={page.page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>);
};

export default UsersTable;
