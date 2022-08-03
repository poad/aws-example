import {
  TableSortLabel, styled,
} from '@mui/material';

export const StyledTableSortLabel = styled(TableSortLabel)(() => ({
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
}));

export default StyledTableSortLabel;
