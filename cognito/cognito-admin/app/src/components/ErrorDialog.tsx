import {
  Dialog,
  DialogContent, DialogContentText,
} from '@mui/material';
import { ErrorDialogProps } from '../interfaces';

export const ErrorDialog = ({ id, open, message, onClose }: ErrorDialogProps) =>
  <Dialog open={open} onClick={onClose}>
    <DialogContent>
      <DialogContentText id={id || 'alert-dialog-description'}>
        {message ? message : ''}
      </DialogContentText>
    </DialogContent>
  </Dialog>;

export default ErrorDialog;
