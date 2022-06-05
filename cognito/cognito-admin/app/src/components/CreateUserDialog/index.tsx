import {
  Button, Container, Dialog, DialogContent, DialogContentText, DialogActions, Typography, useTheme, useMediaQuery, TextField, DialogTitle,
} from '@mui/material';
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import UserPoolClient from '../../service/UserPoolClient';
import { User } from '../../interfaces';

interface CreateUserDialogProps {
  /**
     * Injected by the documentation to work in an iframe.
     * You won't need it on your project.
     */
  container?: Element,
  client: UserPoolClient,
  onCreate?: (newUser: User) => void
}

const CreateUserDialog: React.FunctionComponent<CreateUserDialogProps> = ({ client, onCreate }): JSX.Element => {
    type Inputs = {
      username: string,
      email: string,
    };

    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const [open, setOpen] = useState<boolean>(false);

    // const { register, handleSubmit, formState: { errors } } = useForm<Inputs>();
    const { register, handleSubmit } = useForm<Inputs>();
    const onSubmit: SubmitHandler<Inputs> = (data: Inputs) => {
      client.createUser({
        ...data,
      }).then((user) => {
        if (onCreate !== undefined) {
          onCreate(user);
        }
      })
        .finally(() => {
          setOpen(false);
        });
    };

    const onClose = () => {
      setOpen(false);
    };

    return (
      <Container>
        <Button variant="contained" style={{ margin: 8 }} color="primary" onClick={() => setOpen(true)}>CREATE USER</Button>
        <Dialog fullScreen={fullScreen} open={open} aria-labelledby="responsive-dialog-title">
          <DialogContent>
            <DialogTitle id="create-user-dialog-title"><Typography variant="h3" component="span" gutterBottom>{'Create User'}</Typography></DialogTitle>
            <DialogContentText id="create-user-dialog" component="div">
              <Container>
                <form onSubmit={handleSubmit(onSubmit)}>
                  <TextField id="username" label="Username" type='username' style={{ margin: 8 }} margin="dense" {...register('username', { required: true })} />
                  <TextField id="email" label="Email Address" type="name" style={{ margin: 8 }} margin="dense" {...register('email', { required: true })} />
                  <DialogActions>
                    <Button type="reset" autoFocus style={{ margin: 8 }} onClick={onClose}>CLOSE</Button>
                    <Button type="submit" style={{ margin: 8 }} variant="contained" color="secondary">CREATE</Button>
                  </DialogActions>
                </form>
              </Container>
            </DialogContentText>
          </DialogContent>
        </Dialog>
      </Container>
    );
};

export default CreateUserDialog;
