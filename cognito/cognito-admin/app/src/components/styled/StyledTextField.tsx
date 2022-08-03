import {
  TextField, styled,
} from '@mui/material';

export const StyledTextField = styled(TextField)(() => ({
  root: {
    paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4,
  },
}));

export default StyledTextField;
