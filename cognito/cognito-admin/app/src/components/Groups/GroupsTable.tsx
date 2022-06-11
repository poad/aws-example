import {
  Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow,
} from '@mui/material';
import StyledTableCell from '../styled/StyledTableCell';
import StyledTableSortLabel from '../styled/StyledTableSortLabel';
import React, {  } from 'react';
import { Group } from '../../interfaces';
import { Page, usePagenationTable } from '../../hooks/usePagenationTable';

type TableHeadLabel = 'groupName' | 'creationDate' | 'lastModifiedDate' | 'precedence';
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

interface GroupsTableProps {
  /**
   * Injected by the documentation to work in an iframe.
   * You won't need it on your project.
   */
  container?: Element,
  groups: Group[],
  page: Page,
  onOpenGroup: (origin: Group) => void,
}

export const GroupsTable = ({ groups, page: initPage, onOpenGroup }: GroupsTableProps) => {
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

  return (
    <>
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
    </>
  );
};

export default GroupsTable;
