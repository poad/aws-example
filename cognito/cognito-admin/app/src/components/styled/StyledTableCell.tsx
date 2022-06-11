import {
  TableCell, Theme,
} from '@mui/material';
import { createStyles, withStyles } from '@mui/styles';
export const StyledTableCell = withStyles((theme: Theme) => createStyles({
  root: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
}))(TableCell);

export default StyledTableCell;
