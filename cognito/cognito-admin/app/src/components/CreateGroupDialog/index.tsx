import {
  Button, Container, Dialog, DialogContent, DialogContentText, DialogActions, Typography, useTheme, useMediaQuery, DialogTitle,
  Paper, MenuItem, Select, FormControl, InputLabel, SelectChangeEvent,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import UserPoolClient from '../../service/UserPoolClient';
import { Group } from '../../interfaces';
import IamClient from '../../service/IamClient';
import { useListRoles } from '../../hooks/useListRoles';
import StyledTextField from '../styled/StyledTextField';

interface CreateGroupDialogProps {
  /**
     * Injected by the documentation to work in an iframe.
     * You won't need it on your project.
     */
  container?: Element,
  client: UserPoolClient,
  iamClient: IamClient,
  onCreate?: (newUser: Group) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError?: (error: any) => void
}

const CreateGroupDialog = ({ client, iamClient, onCreate, onError }: CreateGroupDialogProps): JSX.Element => {
  type Inputs = {
    groupName: string,
    description?: string,
    precedence?: number,
    roleArn?: string,
  };

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const { roles, error, loaded } = useListRoles(iamClient);

  const [open, setOpen] = useState<boolean>(false);
  const [role, setRole] = useState<string | undefined>(undefined);

  const {
    register, handleSubmit, reset, unregister,
  } = useForm<Inputs>();
  const onSubmit: SubmitHandler<Inputs> = (data: Inputs) => {
    const newGroup = {
      groupName: data.groupName,
      description: data.description,
      precedence: data.precedence || 0,
      roleArn: role === '' ? undefined : role,
    };
    client.createGroup(newGroup)
      .then((group) => {
        if (onCreate !== undefined) {
          onCreate(group);
        }
      })
      .catch((err) => {
        if (onError !== undefined) {
          onError(err);
        }
      })
      .finally(() => {
        reset({
          groupName: undefined,
          description: undefined,
          precedence: undefined,
          roleArn: undefined,
        });
        unregister(['groupName', 'description', 'groupName', 'roleArn']);
        setRole(undefined);
        setOpen(false);
      });
  };

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, loaded]);
  const onClose = () => {
    setRole(undefined);
    setOpen(false);
  };

  const handleRoleChange = (event: SelectChangeEvent<string>) => {
    setRole(event.target.value as string);
  };

  return (
    <Container>
      <Button variant="contained" style={{ margin: 8 }} color="primary" onClick={() => setOpen(true)}>CREATE GROUP</Button>
      <Dialog fullScreen={fullScreen} open={open} aria-labelledby="responsive-dialog-title">
        <DialogContent>
          <DialogTitle id="create-user-dialog-title"><Typography variant="h3" component="span" gutterBottom>{'Create Group'}</Typography></DialogTitle>
          <DialogContentText id="create-user-dialog" component="div">
            <Container>
              <form onSubmit={handleSubmit(onSubmit)}>
                <Paper variant="outlined">
                  <StyledTextField id="groupName" label="GroupName" type='groupName'
                    fullWidth {...register('groupName', { required: true })} />
                  <StyledTextField id="description" label="Description" type="text"
                    fullWidth {...register('description', { required: false })} />
                  <StyledTextField id="precedence" label="Precedence" type="number"
                    fullWidth {...register('precedence', { required: false })} />

                  <FormControl variant="outlined" fullWidth style={{ paddingLeft: 2, paddingRight: 2 }}>
                    <InputLabel id="roleArn-label" style={{ paddingLeft: 2, paddingRight: 2 }}>Role Arn</InputLabel>
                    <Select labelId="roleArn-label" style={{ paddingLeft: 2, paddingRight: 2 }} id="roleArn" value={role || ''} onChange={handleRoleChange} label="Role Arn" fullWidth>
                      <MenuItem key="None" value="" style={{ paddingLeft: 2, paddingRight: 2 }}><em>None</em></MenuItem>
                      {
                        roles?.map((iamRole) => (<MenuItem key={iamRole.arn} value={iamRole.arn} style={{
                          paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4,
                        }}><em>{iamRole.roleName}</em></MenuItem>))
                      }
                    </Select>
                  </FormControl>
                </Paper>
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

export default CreateGroupDialog;
