import {
  Backdrop, Box, Container, Dialog, DialogContent, DialogContentText, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, Theme,
} from '@mui/material';
import { createStyles, withStyles } from '@mui/styles';
import Loader from 'react-loader';
import React, { useState, useEffect } from 'react';
import IamClient from '../../service/IamClient';
import UserPoolClient from '../../service/UserPoolClient';
import { ErrorDialog, Group } from '../../interfaces';
import GroupDetail from '../../components/GroupDetail';
import CreateGroupDialog from '../../components/CreateGroupDialog';
import { Page, usePagenationTable } from 'hooks/usePagenationTable';
import { usePagenationGroups } from 'hooks/usePagenationGroups';
import { useGroup } from 'hooks/useGroup';

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

type TableHeadLabel = 'groupName' | 'creationDate' | 'lastModifiedDate' | 'precedence';

const Groups: React.FunctionComponent<GroupsProps> = ({ client, iamClient, page: initPage }): JSX.Element => {
  const {
    page,
    handleChangePage,
    handleChangeRowsPerPage,
    createSortHandler,
    getComparator,
    stableSort,
    sortOrder,
  } = usePagenationTable<{
    groupName: string,
    description: string,
    precedence: string | number,
    creationDate: string,
    lastModifiedDate: string,
    roleArn?: string,
    origin: Group,
  }, TableHeadLabel>(initPage, {
    order: 'asc',
    orderBy: 'groupName',
  });
  
  const {
    groups,
    error,
    loaded,
    create: onCreate,
    update,
    delete: onDelete,
  } = usePagenationGroups(client);

  const { group, loadGroup } = useGroup(client);

  const [openGroup, setOpenGroup] = useState<boolean>(false);

  const [errorDialog, setErrorDialog] = useState <ErrorDialog>({ open: false });

  useEffect(() => {
    setErrorDialog({ open: error.error, message: error.message });
  }, [error]);

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

  const backdropClose = () => setErrorDialog({ open: false });

  const onOpenGroup = (origin: Group) => {
    loadGroup(origin);
    setOpenGroup(true);
  };

  const handleCloseGroup = () => setOpenGroup(false);

  const onUpdate = (iamGroup: Group) => {
    const index = groups.findIndex((item) => group?.groupName === item.groupName);
    if (index === -1) {
      throw Error('Group not found');
    }
    groups[index] = iamGroup;
    loadGroup(iamGroup);
    update(groups);
  };

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const onError = (err: any) => {
    setErrorDialog({ open: true, message: err.name !== undefined ? err.name : JSON.stringify(err) });
  };

  return (
    <React.Fragment>
      <LoadingBackdrop open={!loaded && !errorDialog.open} invisible={loaded || errorDialog.open}>
        <StyledSpinner loaded={loaded || errorDialog.open} />
      </LoadingBackdrop>
      <Dialog open={errorDialog.open} onClick={backdropClose}>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {errorDialog.message}
          </DialogContentText>
        </DialogContent>
      </Dialog>

      {
        group !== undefined
          ? (<GroupDetail client={client} iamClient={iamClient} group={group} open={openGroup} onClose={handleCloseGroup} onUpdate={onUpdate} onDelete={onDelete} />)
          : ('')
      }

      <Box component="span" m={1}>
        <Container fixed>
          <CreateGroupDialog client={client} iamClient={iamClient} onCreate={onCreate} onError={onError} />
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
                  stableSort(groups.map((item) => ({
                    groupName: item.groupName,
                    description: item.description || '',
                    creationDate: item.creationDate?.toLocaleString() || '',
                    lastModifiedDate: item.lastModifiedDate?.toLocaleString() || '',
                    precedence: item.precedence || '',
                    origin: item,
                  })), getComparator(sortOrder.order, sortOrder.orderBy))
                    .slice(page.page * page.rowsPerPage, page.page * page.rowsPerPage + page.rowsPerPage)
                    .map((item) => <TableRow key={item.groupName} onClick={() => { onOpenGroup(item.origin); }}>
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