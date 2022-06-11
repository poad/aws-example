import {
  TextFieldProps,
} from '@mui/material';
import StyledTextField from './styled/StyledTextField';

export const ReadOnlyTextField = (props: TextFieldProps) => 
  <StyledTextField {...props} fullWidth InputProps={{ readOnly: true }} />;


export default ReadOnlyTextField;
