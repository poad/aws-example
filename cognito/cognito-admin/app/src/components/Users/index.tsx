import {
  Backdrop, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel, Container, Box, Dialog,
  DialogContent, DialogContentText, Theme,
} from '@mui/material';
import { createStyles, withStyles } from '@mui/styles';
import { Page, usePagenationTable } from 'hooks/usePagenationTable';
import { useUser } from 'hooks/useUser';
import { useUsers } from 'hooks/useUsers';
import React, { useEffect, useState } from 'react';
import Loader from 'react-loader';
import CreateUserDialog from '../../components/CreateUserDialog';
import UserDetail from '../../components/UserDetail';
import { ErrorDialog, User } from '../../interfaces';
import UserPoolClient from '../../service/UserPoolClient';

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

interface UsersProps {
  /**
     * Injected by the documentation to work in an iframe.
     * You won't need it on your project.
     */
  container?: Element,
  client: UserPoolClient,
  page: Page,
}

type TableHeadLabel = 'email' | 'username' | 'createdAt' | 'lastModifiedAt' | 'enabled' | 'status';

const Users: React.FunctionComponent<UsersProps> = ({ client, page: initPage }): JSX.Element => {
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

  const [errorDialog, setErrorDialog] = useState<ErrorDialog>({
    open: false,
  });
  const [openDetail, setOpenDetail] = useState<boolean>(false);
  const {
    users,
    errorStatus,
    loaded,
    create: onCreate,
    delete: onDelete,
  } = useUsers(client);

  const {
    user,
    setUser,
    loadUser,
  } = useUser(client);

  useEffect(() => {
    setErrorDialog({ open: errorStatus.error, message: errorStatus.message });
  }, [errorStatus]);

  const openUserDetail = (origin: User) => {
    loadUser(origin);
    setOpenDetail(true);
  };

  const backdropClose = () => setErrorDialog({ open: false });

  const handleCloseDetail = () => {
    setOpenDetail(false);
  };

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

  return (<React.Fragment>
    <LoadingBackdrop open={!loaded && !errorDialog.open} invisible={loaded || errorDialog.open}>
      <StyledSpinner loaded={loaded || errorDialog.open} />
    </LoadingBackdrop>
    <Dialog open={errorDialog.open} onClick={backdropClose}>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {errorDialog.message ? errorDialog.message : ''}
        </DialogContentText>
      </DialogContent>
    </Dialog>

    {
      user !== undefined
        ? (<UserDetail client={client} user={user} open={openDetail} onClose={handleCloseDetail} onUpdate={setUser} onDelete={onDelete} />)
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
          component="div"
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
