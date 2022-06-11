
import {
  Backdrop, Theme,
} from '@mui/material';
import { createStyles, withStyles } from '@mui/styles';

export const LoadingBackdrop = withStyles((theme: Theme) => createStyles({
  root: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
}))(Backdrop);

import Loader from 'react-loader';

export const StyledSpinner = withStyles(() => createStyles({
  root: {
    position: 'absolute',
    width: '40%',
    height: '40%',
    top: '50%',
    left: '50%',
    border: '1px solid #000',
  },
}))(Loader);

export const LoadingSpinner = ({ expose }: { expose: boolean }) => 
  <LoadingBackdrop open={expose} invisible={!expose}>
    <StyledSpinner loaded={expose} />
  </LoadingBackdrop>
;

export default LoadingSpinner;
