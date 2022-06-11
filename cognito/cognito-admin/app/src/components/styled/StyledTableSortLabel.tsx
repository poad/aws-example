import {
  TableSortLabel,
} from '@mui/material';
import { createStyles, withStyles } from '@mui/styles';

export const StyledTableSortLabel = withStyles(() => createStyles({
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

export default StyledTableSortLabel;
