import {
  Backdrop, Box, Container, Dialog, DialogContent, DialogContentText, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, Theme,
} from '@mui/material';
import { createStyles, withStyles } from '@mui/styles';
import Loader from 'react-loader';
import React, { useEffect, useState } from 'react';
import IamClient from '../../service/IamClient';
import UserPoolClient from '../../service/UserPoolClient';
import { Group } from '../../interfaces';
import GroupDetail from '../../components/GroupDetail';
import CreateGroupDialog from '../../components/CreateGroupDialog';

interface Page {
  page: number,
  rowsPerPage: number,
}

interface Error {
  error: boolean,
  message?: string
}

interface GroupsProps {
  /**
     * Injected by the documentation to work in an iframe.
     * You won't need it on your project.
     */
  container?: Element,
  client: UserPoolClient,
  iamClient: IamClient,
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

type TableHeadLabel = 'groupName' | 'creationDate' | 'lastModifiedDate' | 'precedence';

type Order = 'asc' | 'desc';

interface SortOrder {
  order: Order,
  orderBy: TableHeadLabel
}

const Groups: React.FunctionComponent<GroupsProps> = (props): JSX.Element => {
  const [sortOrder, setSortOrder] = useState<SortOrder>({
    order: 'asc',
    orderBy: 'groupName',
  });
  const [error, setError] = useState<Error>({
    error: false,
  });
  const [loaded, setLoaded] = useState<boolean>(false);
  const [page, setPage] = useState<Page>({
    page: 0,
    rowsPerPage: 10,
  });
  const [client] = useState<UserPoolClient>(props.client);
  const [openDetail, setOpenDetail] = useState<boolean>(false);

  const [groups, setGroups] = useState<Group[]>([]);
  const [detail, setDetail] = useState<Group | undefined>(undefined);

  useEffect(
    () => {
      client.listGroups()
        .then((items) => {
          setGroups(items);
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
      id: 'groupName' as TableHeadLabel, numeric: false, disablePadding: false, label: 'group name',
    },
    {
      id: 'description' as TableHeadLabel, numeric: false, disablePadding: false, label: 'description',
    },
    {
      id: 'precedence' as TableHeadLabel, numeric: false, disablePadding: false, label: 'precedence',
    },
    {
      id: 'creationDate' as TableHeadLabel, numeric: false, disablePadding: false, label: 'created at',
    },
    {
      id: 'lastModifiedDate' as TableHeadLabel, numeric: false, disablePadding: false, label: 'last modified at',
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
  const backdropClose = () => {
    setError({ error: false });
  };

  const openGroupDetail = (origin: Group) => {
    client.listUsersInGroup(origin.groupName)
      .then((users) => {
        setDetail({ ...origin, users });
        setOpenDetail(true);
      });
  };

  const handleCloseDetail = () => {
    setOpenDetail(false);
    setDetail(undefined);
  };

  const onDelete = (target: Group) => {
    const newUsers = groups.filter((group) => group.groupName !== target.groupName);
    if (newUsers !== undefined) {
      setGroups(newUsers);
    }
  };

  const onCreate = (group: Group) => {
    setGroups(groups.concat(group));
  };

  const onUpdate = (iamGroup: Group) => {
    const index = groups.findIndex((group) => detail?.groupName === group.groupName);
    if (index === -1) {
      throw Error('Group not found');
    }
    groups[index] = iamGroup;
    setDetail(iamGroup);
    setGroups(groups);
  };

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const onError = (err: any) => {
    setError({ error: true, message: err.name !== undefined ? err.name : JSON.stringify(err) });
  };

  return (
    <React.Fragment>
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
          ? (<GroupDetail client={client} iamClient={props.iamClient} group={detail} open={openDetail} onClose={handleCloseDetail} onUpdate={onUpdate} onDelete={onDelete} />)
          : ('')
      }

      <Box component="span" m={1}>
        <Container fixed>
          <CreateGroupDialog client={client} iamClient={props.iamClient} onCreate={onCreate} onError={onError} />
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
                      {headCell.id === 'groupName' ? headCell.label : (
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
                  stableSort(groups.map((group) => ({
                    groupName: group.groupName,
                    description: group.description || '',
                    creationDate: group.creationDate?.toLocaleString() || '',
                    lastModifiedDate: group.lastModifiedDate?.toLocaleString() || '',
                    precedence: group.precedence || '',
                    origin: group,
                  })), getComparator(sortOrder.order, sortOrder.orderBy))
                    .slice(page.page * page.rowsPerPage, page.page * page.rowsPerPage + page.rowsPerPage)
                    .map((item) => <TableRow key={item.groupName} onClick={() => { openGroupDetail(item.origin); }}>
                      <TableCell>{item.groupName}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.precedence}</TableCell>
                      <TableCell>{item.creationDate}</TableCell>
                      <TableCell>{item.lastModifiedDate}</TableCell>
                    </TableRow>)}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="span"
            count={groups.length}
            rowsPerPage={page.rowsPerPage}
            rowsPerPageOptions={[10, 25, 100]}
            page={page.page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Container>
      </Box>

    </React.Fragment>
  );
};

export default Groups;
