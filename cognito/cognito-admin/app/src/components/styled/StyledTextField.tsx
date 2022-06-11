import {
  TextField,
} from '@mui/material';
import { createStyles, withStyles } from '@mui/styles';

export const StyledTextField = withStyles(() => createStyles({
  root: {
    paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4,
  },
}))(TextField);

export default StyledTextField;
