import {
  Accordion, AccordionDetails, AccordionSummary, Button, Container, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, FormControl, InputLabel, List, ListItem, MenuItem, Paper, Select, SelectChangeEvent, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Group } from '../../interfaces';
import UserPoolClient from '../../service/UserPoolClient';
import IamClient from '../../service/IamClient';
import { useListRoles } from '../../hooks/useListRoles';
import { useGroupDetail } from '../../hooks/useGroupDetail';
import StyledTextField from '../styled/StyledTextField';
import ReadOnlyTextField from '../ReadOnlyTextField';

interface DetailErrorDialog {
  title?: string,
  message: string
}

interface GroupDetailProps {
  /**
     * Injected by the documentation to work in an iframe.
     * You won't need it on your project.
     */
  container?: Element,
  client: UserPoolClient,
  iamClient: IamClient,
  group: Group | undefined,
  open: boolean,
  onClose: () => void,
  onUpdate?: (newGroup: Group) => void
  onDelete?: (removeGroup: Group) => void
}

const UserDetail = ({ client, iamClient, group, open, onClose, onUpdate, onDelete }: GroupDetailProps): JSX.Element => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [confirm, setConfirm] = useState<boolean>(false);

  const [detailErrorDialog, setDetailErrorDialog] = useState<DetailErrorDialog | undefined>(undefined);

  const { roles, error, loaded } = useListRoles(iamClient);

  const { detail, attacheRole, changeGroupRole, updateGroupRole, deleteGroup, clearAttacheRole } = useGroupDetail(client, group, onUpdate, onDelete);

  useEffect(() => {
    if (error) {
      setDetailErrorDialog({
        message: JSON.stringify(error),
      });
    }
  }, [error, loaded]);

  const onDeleteGroup = () => {
    deleteGroup();
    setConfirm(false);
    if (onDelete && detail) {
      onDelete(detail);
    }
  };

  const handleConfirm = () => setConfirm(true);

  const handleCancel = () => setConfirm(false);

  const handleRoleChange = (event: SelectChangeEvent<string>) => changeGroupRole(event.target.value as string);

  const onErrorClose = () => setDetailErrorDialog(undefined);

  const handleCancelAttacheRole = () => clearAttacheRole();

  const atttachRoleToGroup = () => updateGroupRole();

  return (
    <Container sx={{ width: '100%' }}>
      <Dialog open={detailErrorDialog !== undefined} onClick={onErrorClose}>
        <DialogContent>
          {
            detailErrorDialog?.title !== undefined ? (
              <DialogTitle id="user-detail-dialog-title">
                <Typography variant="h4" component="span" gutterBottom>{detailErrorDialog.title}</Typography>
              </DialogTitle>
            ) : undefined
          }
          <DialogContentText id="alert-dialog-description" component='div'>
            {detailErrorDialog?.message !== undefined ? detailErrorDialog.message : ''}
          </DialogContentText>
        </DialogContent>
      </Dialog>

      <Dialog fullScreen={fullScreen} open={open} aria-labelledby="responsive-dialog-title">
        <DialogContent>
          <DialogTitle id="user-detail-dialog-title"><Typography variant="h4" component="span" gutterBottom>{detail?.groupName}</Typography></DialogTitle>
          <DialogContentText id="user-detail-dialog" component='div'>
            <Container>
              <Paper variant="outlined" sx={{
                paddingLeft: 4, paddingRight: 4, paddingTop: 16, paddingBottom: 16,
              }}>
                <ReadOnlyTextField id="groupName" label="GroupName"
                  variant="outlined" key='groupName' InputLabelProps={{ shrink: true }} defaultValue={detail?.groupName} />
                <ReadOnlyTextField id="createdAt" label="CreatedAt"
                  variant="outlined" key='createdAt' defaultValue={detail?.creationDate?.toLocaleString()} />
                <ReadOnlyTextField id="lastModifiedAt" label="LastModifiedAt"
                  variant="outlined" key='lastModifiedAt' defaultValue={detail?.lastModifiedDate?.toLocaleString()} />
                <FormControl variant="outlined" fullWidth sx={{ paddingLeft: 2, paddingRight: 2 }}>
                  <InputLabel id="roleArn-label" sx={{ paddingLeft: 2, paddingRight: 2 }}>Role Arn</InputLabel>
                  <Select labelId="roleArn-label" sx={{ paddingLeft: 2, paddingRight: 2 }} id="roleArn" value={detail?.roleArn || ''} onChange={handleRoleChange} label="Role Arn" fullWidth>
                    {
                      detail?.roleArn === undefined ? (<MenuItem key="None" value="" sx={{ paddingLeft: 2, paddingRight: 2 }}><em>None</em></MenuItem>) : undefined
                    }
                    {
                      roles?.map((role) => (
                        <MenuItem key={role.arn} value={role.arn} sx={{
                          paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4,
                        }}><em>{role.roleName}</em></MenuItem>
                      ))
                    }
                  </Select>
                </FormControl>
                <ReadOnlyTextField id="precedence" label="Precedence"
                  key='precedence' variant="outlined" defaultValue={detail?.precedence} />

                <Accordion variant="outlined">
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="users-content" id="users-header">
                    <Typography sx={{
                      fontSize: theme.typography.pxToRem(15),
                      fontWeight: theme.typography.fontWeightRegular,
                      paddingLeft: 2, paddingRight: 2,
                    }}>Users</Typography>
                  </AccordionSummary>
                  <AccordionDetails id="users-content">
                    <List component="ul" id="users-list" sx={{
                      paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4,
                    }}>
                      {
                        detail?.users !== undefined ? detail?.users.map((user) => (
                          <ListItem component="li" key={`${detail?.groupName}-user-${user.username}`}>
                            <StyledTextField id={user.username} label={user.username}
                              fullWidth key={user.username} InputProps={{ readOnly: true }} defaultValue={user.username} />
                          </ListItem>
                        )) : ('')
                      }
                    </List>
                  </AccordionDetails>
                </Accordion>
              </Paper>
              <DialogActions>
                <Button autoFocus sx={{ margin: 8 }} onClick={onClose}>CLOSE</Button>
                <Button sx={{ margin: 8 }} variant="contained" color="secondary" onClick={handleConfirm}>DELETE</Button>
              </DialogActions>
            </Container>
          </DialogContentText>
        </DialogContent>
      </Dialog>
      <Dialog
        open={confirm}
        onClose={handleCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{'Delete Group?'}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Can&apos;t undo it. Do you want to delete group?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} color="primary" autoFocus>
            CANCEL
          </Button>
          <Button onClick={onDeleteGroup} color="secondary">
            DELETE
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={attacheRole !== undefined}
        onClose={handleCancelAttacheRole}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-group-role-dialog-title">{'Attache IAM role to Group?'}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-group-role-dialog-description">
            Once the IAM role is set for a group, it cannot be reverted to the state where the IAM role is not set, is that correct?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelAttacheRole} color="primary" autoFocus>
            CANCEL
          </Button>
          <Button onClick={atttachRoleToGroup} color="secondary">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserDetail;
