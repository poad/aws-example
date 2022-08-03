
import {
  Backdrop, useTheme, styled,
} from '@mui/material';
import Loader from 'react-loader';

export const StyledSpinner = styled(Loader)({
  root: {
    position: 'absolute',
    width: '40%',
    height: '40%',
    top: '50%',
    left: '50%',
    border: '1px solid #000',
  },
});

export const LoadingSpinner = ({ expose }: { expose: boolean }) => {
  const theme = useTheme();
  return (
    <Backdrop open={expose} invisible={!expose} color='#fff' sx={{
      zIndex: theme.zIndex.drawer + 1,
    }}>
      <StyledSpinner loaded={expose} />
    </Backdrop>);
};


export default LoadingSpinner;
