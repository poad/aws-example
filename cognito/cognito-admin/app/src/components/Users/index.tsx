import {
  Backdrop, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel, Container, Box, Dialog,
  DialogContent, DialogContentText, createStyles, Theme,
} from '@mui/material';
import { withStyles } from '@mui/styles';
import React, { useEffect, useState } from 'react';
import Loader from 'react-loader';
import CreateUserDialog from '../../components/CreateUserDialog';
import UserDetail from '../../components/UserDetail';
import { User } from '../../interfaces';
import UserPoolClient from '../../service/UserPoolClient';

interface Page {
  page: number,
  rowsPerPage: number,
}

interface Error {
  error: boolean,
  message?: string
}

interface UsersProps {
  /**
     * Injected by the documentation to work in an iframe.
     * You won't need it on your project.
     */
  container?: Element,
  client: UserPoolClient,
  page: Page,
}

const StyledTableCell = withStyles((theme: Theme) => createStyles({
  root: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
}))(TableCell);

const StyledTableSortLabel = withStyles(() => createStyles({
  root: {
    '&$active': {
      color: '#ff9',
    },
  },
  active: {
  },
  icon: {
    '&$iconDirectionAsc': {
      color: '#ff9',
    },
  },
  iconDirectionAsc: {},
}))(TableSortLabel);

const StyledSpinner = withStyles(() => createStyles({
  root: {
    position: 'absolute',
    width: '40%',
    height: '40%',
    top: '50%',
    left: '50%',
    border: '1px solid #000',
  },
}))(Loader);

const LoadingBackdrop = withStyles((theme: Theme) => createStyles({
  root: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
}))(Backdrop);

type TableHeadLabel = 'email' | 'username' | 'createdAt' | 'lastModifiedAt' | 'enabled' | 'status';

type Order = 'asc' | 'desc';

interface SortOrder {
  order: Order,
  orderBy: TableHeadLabel
}

// const groupBy = <K extends PropertyKey, V>(
//     array: readonly V[],
//     getKey: (cur: V, idx: number, src: readonly V[]) => K
// ) =>
//     array.reduce((obj, cur, idx, src) => {
//         const key = getKey(cur, idx, src);
//         (obj[key] || (obj[key] = []))!.push(cur);
//         return obj;
//     }, {} as Partial<Record<K, V[]>>);

const Users: React.FunctionComponent<UsersProps> = (props): JSX.Element => {
  const [sortOrder, setSortOrder] = useState<SortOrder>({
    order: 'asc',
    orderBy: 'email',
  });
  const [error, setError] = useState<Error>({
    error: false,
  });
  const [loaded, setLoaded] = useState<boolean>(false);
  const [page, setPage] = useState<Page>({
    page: 0,
    rowsPerPage: 10,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [openDetail, setOpenDetail] = useState<boolean>(false);
  const [client] = useState<UserPoolClient>(props.client);

  const [detail, setDetail] = useState<User | undefined>(undefined);

  useEffect(
    () => {
      client.listUsers()
        .then((items) => {
          setUsers(items.map((item) => {
            const { attributes } = item;
            const { email } = attributes;
            return {
              username: item.username,
              attributes: item.attributes,
              createdAt: item.createdAt,
              lastModifiedAt: item.lastModifiedAt,
              enabled: item.enabled,
              status: item.status,
              mfa: item.mfa,
              email,
            } as User;
          }));
          return items;
        })
        .then((items) => {
          if (items.length > 0) {
            setPage({
              page: 0,
              rowsPerPage: page.rowsPerPage,
            });
          }
          setLoaded(true);
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error(err);
          setError({
            error: true,
            message: JSON.stringify(err),
          });
        });
    }, [loaded, openDetail],
  );

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

  const handleRequestSort = (_: React.MouseEvent<unknown>, property: TableHeadLabel) => {
    const isDesc = sortOrder.order === 'desc';
    setSortOrder({
      order: isDesc ? 'desc' : 'asc',
      orderBy: property,
    });
  };

  const setRowsPerPage = (newRowsPerPage: number) => {
    setPage({
      page: page.page,
      rowsPerPage: newRowsPerPage,
    });
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage({
      page: newPage,
      rowsPerPage: page.rowsPerPage,
    });
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number.parseInt(event.target.value, 10));
  };

  function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  }

  const createSortHandler = (property: TableHeadLabel) => (event: React.MouseEvent<unknown>) => {
    handleRequestSort(event, property);
  };

  function getComparator<Key extends TableHeadLabel>(
    order: Order,
    orderBy: Key,
  ): (a: { [key in Key]: number | string }, b: { [key in Key]: number | string }) => number {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  }

  function stableSort<T>(array: T[], comparator: (a: T, b: T) => number) {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
  }

  const openUserDetail = (origin: User) => {
    client.listGroupsForUser(origin.username)
      .then((groups) => {
        setDetail({ ...origin, groups });
        setOpenDetail(true);
      });
  };

  const backdropClose = () => {
    setError({ error: false });
  };

  const handleCloseDetail = () => {
    setOpenDetail(false);
    setDetail(undefined);
  };

  const onCreate = (user: User) => {
    setUsers(users.concat(user));
  };

  const onDelete = (target: User) => {
    const newUsers = users.filter((user) => user.email !== target.email);
    if (newUsers !== undefined) {
      setUsers(newUsers);
    }
  };

  return (<React.Fragment>
    <LoadingBackdrop open={!loaded && !error.error} invisible={loaded || error.error}>
      <StyledSpinner loaded={loaded || error.error} />
    </LoadingBackdrop>
    <Dialog open={error.error} onClick={backdropClose}>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {error.message ? error.message : ''}
        </DialogContentText>
      </DialogContent>
    </Dialog>

    {
      detail !== undefined
        ? (<UserDetail client={client} user={detail} open={openDetail} onClose={handleCloseDetail} onUpdate={setDetail} onDelete={onDelete} />)
        : ('')
    }

    <Box component="span" m={1}>
      <Container fixed>
        <CreateUserDialog client={client} onCreate={onCreate} />
        <TableContainer>
          <Table size='small' stickyHeader>
            <TableHead>
              <TableRow>
                {headCells.map((headCell) => (
                  <StyledTableCell
                    key={headCell.id}
                    align={headCell.numeric ? 'right' : 'left'}
                    padding={headCell.disablePadding ? 'none' : 'normal'}
                    sortDirection={sortOrder.orderBy === headCell.id ? sortOrder.order : false}
                  >
                    {headCell.id === 'email' ? headCell.label : (
                      <StyledTableSortLabel
                        active={sortOrder.orderBy === headCell.id}
                        direction={sortOrder.orderBy === headCell.id ? sortOrder.order : 'asc'}
                        onClick={createSortHandler(headCell.id)}
                      >
                        {headCell.label}
                      </StyledTableSortLabel>)
                    }
                  </StyledTableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {
                stableSort(users.map((user) => ({
                  email: user.email || '',
                  username: user.username,
                  createdAt: user.createdAt?.toLocaleString() || '',
                  lastModifiedAt: user.lastModifiedAt?.toLocaleString() || '',
                  enabled: user.enabled,
                  status: user.status,
                  origin: user,
                })), getComparator(sortOrder.order, sortOrder.orderBy))
                  .slice(page.page * page.rowsPerPage, page.page * page.rowsPerPage + page.rowsPerPage)
                  .map((item) => <TableRow key={item.email} onClick={() => { openUserDetail(item.origin); }}>
                    <TableCell>{item.email}</TableCell>
                    <TableCell>{item.username}</TableCell>
                    <TableCell>{item.createdAt}</TableCell>
                    <TableCell>{item.lastModifiedAt}</TableCell>
                    <TableCell>{item.enabled}</TableCell>
                    <TableCell>{item.status}</TableCell>
                  </TableRow>)}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 100]}
          count={users.length}
          rowsPerPage={page.rowsPerPage}
          page={page.page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Container>
    </Box>
  </React.Fragment>
  );
};

export default Users;
