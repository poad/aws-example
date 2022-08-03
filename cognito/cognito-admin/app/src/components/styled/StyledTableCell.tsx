import {
  TableCell, styled, useTheme,
} from '@mui/material';

export const StyledTableCell = styled(TableCell)(() => {
  const theme = useTheme();
  return (({
    root: {
      backgroundColor: theme.palette.common.black,
      color: theme.palette.common.white,
    },
  }));
});

export default StyledTableCell;
