import { useState } from 'react';

export interface Page {
  page: number,
  rowsPerPage: number,
}

export type Order = 'asc' | 'desc';

export interface SortOrder<Label> {
  order: Order,
  orderBy: Label
}

export function usePagenationTable<T, Label extends keyof T>(initPage: Page, initOrder: SortOrder<Label>): {
  page: Page,
  handleChangePage: (_: unknown, newPage: number) => void,
  handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void,
  createSortHandler: (property: Label) => (event: React.MouseEvent<unknown>) => void,
  getComparator(
    order: Order,
    orderBy: Label,
  ): (a: { [key in Label]: number | string }, b: { [key in Label]: number | string }) => number,
  stableSort: (array: T[], comparator: (a: T, b: T) => number) => T[],
  sortOrder: SortOrder<Label>,
} {
  const [page, setPage] = useState<Page>(initPage);
  const [sortOrder, setSortOrder] = useState<SortOrder<Label>>(initOrder);

  const handleRequestSort = (_: React.MouseEvent<unknown>, property: Label) => {
    const isDesc = sortOrder.order === 'desc';
    setSortOrder({
      order: isDesc ? 'desc' : 'asc',
      orderBy: property,
    });
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage({
      page: newPage,
      rowsPerPage: page.rowsPerPage,
    });
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPage({
      page: page.page,
      rowsPerPage: (Number.parseInt(event.target.value, 10)),
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function descendingComparator(a: any, b: any, orderBy: keyof T) {
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  }

  const createSortHandler = (property: Label) => (event: React.MouseEvent<unknown>) => {
    handleRequestSort(event, property);
  };

  function getComparator<Key extends Label>(
    order: Order,
    orderBy: Key,
  ): (a: { [key in Key]: number | string }, b: { [key in Key]: number | string }) => number {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  }

  const stableSort = (array: T[], comparator: (a: T, b: T) => number): T[] => {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
  };

  return {
    page,
    handleChangePage,
    handleChangeRowsPerPage,
    createSortHandler,
    getComparator,
    stableSort,
    sortOrder,
  };
}
