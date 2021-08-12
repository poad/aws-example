import {
  Accordion, AccordionDetails, AccordionSummary, Button, Container, createStyles, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, FormControl, InputLabel, List, ListItem, makeStyles, MenuItem, Paper, Select, TextField, Theme, Typography, useMediaQuery, useTheme,
} from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { Group, IamRole } from '../../interfaces';
import UserPoolClient from '../../service/UserPoolClient';
import IamClient from '../../service/IamClient';
import { appConfig } from '../../aws-config';

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

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    width: '100%',
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    fontWeight: theme.typography.fontWeightRegular,
  },
}));

const UserDetail: React.FunctionComponent<GroupDetailProps> = (props): JSX.Element => {
  const classes = useStyles();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [open, setOpen] = useState<boolean>(props.open);

  const [detail, setDetail] = useState<Group | undefined>(props.group);

  const [confirm, setConfirm] = useState<boolean>(false);

  const [roles, setRoles] = useState<IamRole[]>([]);

  const [error, setError] = useState<{
    title: string | undefined,
    message: string
  } | undefined>(undefined);

  const [attacheRole, setAttacheRole] = useState<string | undefined>(undefined);

  const filterGroupRoles = (iamRoles: IamRole[]): IamRole[] => {
    const name = appConfig.groupRoleClassificationTagName;
    const value = appConfig.groupRoleClassificationTagValue;
    const check = name !== undefined && value !== undefined;
    const filered = check ? iamRoles.filter((role) => (role.tags?.find((tag) => tag.key === name && tag.value === value)) !== undefined) : iamRoles;
    return filered;
  };

  const listRoles = async (): Promise<IamRole[]> => {
    const iamRoles = await props.iamClient.listRoles()
      .then((r) => Promise.resolve(r));

    return Promise
      .all(iamRoles
        .filter((r) => r.roleName !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .map((role) => props.iamClient.getRole(role.roleName!)));
  };

  useEffect(
    () => {
      listRoles()
        .then(filterGroupRoles)
        .then(setRoles);

      setDetail(props.group);
      setOpen(props.open);
    }, [props.group],
  );

  const deleteGroup = () => {
    if (detail !== undefined) {
      props.client.deleteGroup(detail.groupName)
        .then(() => {
          if (props.onDelete !== undefined) {
            props.onDelete(detail);
          }
          Promise.resolve(setDetail(undefined));
        });
    }
    setConfirm(false);
    setOpen(false);
  };

  const handleConfirm = () => {
    setConfirm(true);
  };

  const handleCancel = () => {
    setConfirm(false);
  };

  const handleRoleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newRole = event.target.value as string;
    if ((detail?.roleArn === undefined || detail?.roleArn?.length === 0) && newRole.length !== 0) {
      setAttacheRole(newRole);
    } else if (detail?.roleArn !== newRole) {
      props.client.updateGroup({ ...detail, roleArn: newRole.length > 0 ? newRole : undefined } as Group)
        .then((newGroup) => {
          if (props.onUpdate !== undefined) {
            props.onUpdate(newGroup);
          }
          setDetail(newGroup);
        });
    }
  };

  const onErrorClose = () => {
    setError(undefined);
  };

  const handleCancelAttacheRole = () => {
    setAttacheRole(undefined);
  };

  const atttachRoleToGroup = () => {
    props.client.updateGroup({ ...detail, roleArn: attacheRole } as Group)
      .then((newGroup) => {
        if (props.onUpdate !== undefined) {
          props.onUpdate(newGroup);
        }
        setDetail(newGroup);
        setAttacheRole(undefined);
      });
  };

  return (
    <Container>
      <Dialog open={error !== undefined} onClick={onErrorClose}>
        <DialogContent>
          {
            error?.title !== undefined ? (
              <DialogTitle id="user-detail-dialog-title">
                <Typography variant="h4" component="span" gutterBottom>{error.title}</Typography>
              </DialogTitle>
            ) : undefined
          }
          <DialogContentText id="alert-dialog-description" component='div'>
            {error?.message !== undefined ? error.message : ''}
          </DialogContentText>
        </DialogContent>
      </Dialog>

      <Dialog fullScreen={fullScreen} open={open} aria-labelledby="responsive-dialog-title">
        <DialogContent>
          <DialogTitle id="user-detail-dialog-title"><Typography variant="h4" component="span" gutterBottom>{detail?.groupName}</Typography></DialogTitle>
          <DialogContentText id="user-detail-dialog" component='div'>
            <Container>
              <Paper variant="outlined" style={{
                paddingLeft: 4, paddingRight: 4, paddingTop: 16, paddingBottom: 16,
              }}>
                <TextField id="groupName" label="GroupName" style={{
                  paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4,
                }} fullWidth variant="outlined" key='groupName' InputLabelProps={{ shrink: true }} InputProps={{ readOnly: true }} defaultValue={detail?.groupName} />
                <TextField id="createdAt" label="CreatedAt" style={{
                  paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4,
                }} fullWidth variant="outlined" key='createdAt' InputProps={{ readOnly: true }} defaultValue={detail?.creationDate?.toLocaleString()} />
                <TextField id="lastModifiedAt" label="LastModifiedAt" style={{
                  paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4,
                }} fullWidth variant="outlined" key='lastModifiedAt' InputProps={{ readOnly: true }} defaultValue={detail?.lastModifiedDate?.toLocaleString()} />
                <FormControl variant="outlined" fullWidth style={{ paddingLeft: 2, paddingRight: 2 }}>
                  <InputLabel id="roleArn-label" style={{ paddingLeft: 2, paddingRight: 2 }}>Role Arn</InputLabel>
                  <Select labelId="roleArn-label" style={{ paddingLeft: 2, paddingRight: 2 }} id="roleArn" value={detail?.roleArn || ''} onChange={handleRoleChange} label="Role Arn" fullWidth>
                    {
                      detail?.roleArn === undefined ? (<MenuItem key="None" value="" style={{ paddingLeft: 2, paddingRight: 2 }}><em>None</em></MenuItem>) : undefined
                    }
                    {
                      roles.map((role) => (
                        <MenuItem key={role.arn} value={role.arn} style={{
                          paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4,
                        }}><em>{role.roleName}</em></MenuItem>
                      ))
                    }
                  </Select>
                </FormControl>
                <TextField id="precedence" label="Precedence" style={{
                  paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4,
                }} fullWidth key='precedence' variant="outlined" InputProps={{ readOnly: true }} defaultValue={detail?.precedence} />

                <Accordion variant="outlined">
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="users-content" id="users-header">
                    <Typography className={classes.heading} style={{ paddingLeft: 2, paddingRight: 2 }}>Users</Typography>
                  </AccordionSummary>
                  <AccordionDetails id="users-content">
                    <List component="ul" id="users-list" style={{
                      paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4,
                    }}>
                      {
                        detail?.users !== undefined ? detail?.users.map((user) => (
                          <ListItem component="li" key={`${detail?.groupName}-user-${user.username}`}>
                            <TextField id={user.username} label={user.username} style={{
                              paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4,
                            }} fullWidth key={user.username} InputProps={{ readOnly: true }} defaultValue={user.username} />
                          </ListItem>
                        )) : ('')
                      }
                    </List>
                  </AccordionDetails>
                </Accordion>
              </Paper>
              <DialogActions>
                <Button autoFocus style={{ margin: 8 }} onClick={props.onClose}>CLOSE</Button>
                <Button style={{ margin: 8 }} variant="contained" color="secondary" onClick={handleConfirm}>DELETE</Button>
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
          <Button onClick={deleteGroup} color="secondary">
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
