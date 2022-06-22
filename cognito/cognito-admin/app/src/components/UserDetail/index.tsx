import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Container, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, FormControl, Input, InputLabel, List, ListItem, MenuItem, Paper, Select, Typography, useMediaQuery, useTheme,
  SelectChangeEvent,
} from '@mui/material';
import React, { useDeferredValue } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { User } from '../../interfaces';
import UserPoolClient from '../../service/UserPoolClient';
import { appConfig } from '../../aws-config';
import { useUserDetail } from '../../hooks/useUserDetail';
import ReadOnlyTextField from '../ReadOnlyTextField';

interface UsersDetailProps {
  /**
   * Injected by the documentation to work in an iframe.
   * You won't need it on your project.
   */
  container?: Element,
  client: UserPoolClient,
  user: User | undefined,
  open: boolean,
  onClose: () => void,
  onUpdate?: (newUser: User) => void
  onDelete?: (removeUser: User) => void
}

const UserDetail = ({ client, user, open: initOpen, onClose, onUpdate, onDelete }: UsersDetailProps): JSX.Element => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    open,
    detail,
    confirm,
    groups,
    deleteUser,
    resetPassword,
    disableUser,
    enableUser,
    changeGroup,

    handleConfirm,
    handleCancel,
  } = useUserDetail(initOpen, user, client, onClose);

  const detailValue = typeof useDeferredValue !== 'undefined' ? useDeferredValue(detail) : detail;

  const handleResetPassword = () => {
    const newDetail = resetPassword();
    if (onUpdate && newDetail) {
      onUpdate(newDetail);
    }
  };

  const handleEnable = () => {
    const newDetail = enableUser();
    if (onUpdate && newDetail) {
      onUpdate(newDetail);
    }
  };

  const handleDisable = () => {
    const newDetail = disableUser();
    if (onUpdate && newDetail) {
      onUpdate(newDetail);
    }
  };

  const handleDelete = () => {
    deleteUser();
    if (onDelete && detailValue) {
      onDelete(detailValue);
    }
  };

  const handleGroupChange = (event: SelectChangeEvent<string[]>) => {
    const newGroups = event.target.value as string[];
    const newDetail = changeGroup(newGroups);
    if (onUpdate && newDetail) {
      onUpdate(newDetail);
    }
  };

  return (
    <Container sx={{ width: '100%' }}>
      <Dialog fullScreen={fullScreen} open={open} aria-labelledby="responsive-dialog-title">
        <DialogContent>
          <DialogTitle id="user-detail-dialog-title"><Typography variant="h3" component="span" gutterBottom>{detailValue?.username}</Typography></DialogTitle>
          <DialogContentText id="user-detail-dialog" component='div'>
            <Container>
              <Paper variant="outlined" style={{
                paddingLeft: 4, paddingRight: 4, paddingTop: 16, paddingBottom: 16,
              }}>
                <ReadOnlyTextField id="e-email" label="E-mail" variant="outlined" key='e-mail' defaultValue={detailValue?.email} />
                <ReadOnlyTextField id="createdAt" label="CreatedAt"
                  variant="outlined" key='createdAt' defaultValue={detailValue?.createdAt?.toLocaleString()} />
                <ReadOnlyTextField id="lastModifiedAt" label="LastModifiedAt"
                  variant="outlined" key='lastModifiedAt' defaultValue={detailValue?.lastModifiedAt?.toLocaleString()} />
                <ReadOnlyTextField id="enabled" label="Enabled" variant="outlined" key='enabled' defaultValue={detailValue?.enabled} />
                <ReadOnlyTextField id="status" label="Status" variant="outlined" key='status' defaultValue={detailValue?.status} />

                <Accordion style={{ marginBottom: 16 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="attributes-content" id="attributes-header">
                    <Typography sx={{ fontSize: theme.typography.pxToRem(15), fontWeight: theme.typography.fontWeightRegular }}>Attributes</Typography>
                  </AccordionSummary>
                  <AccordionDetails id="attributes-content">
                    <Box border={1}>
                      <List component="ul" id="attributes-list" dense={true} disablePadding={true}>
                        {
                          detailValue?.attributes !== undefined ? Object.keys(detailValue.attributes).filter((attribute) => attribute !== 'email').map((attributeName) => (
                            <ListItem component="li" dense={true} key={`${detailValue.email}-attr-${attributeName}`} button={false} disabled={true}>
                              <ReadOnlyTextField id={attributeName} label={attributeName}
                                variant="outlined" key={attributeName} defaultValue={detailValue.attributes[attributeName]} />
                            </ListItem>
                          )) : ('')
                        }
                      </List>
                    </Box>
                  </AccordionDetails>
                </Accordion>
                <FormControl variant="outlined" fullWidth style={{ paddingLeft: 2, paddingRight: 2 }}>
                  <InputLabel id="groups-label" style={{ paddingLeft: 2, paddingRight: 2 }}>Groups</InputLabel>
                  <Select
                    labelId="groups-label"
                    style={{ paddingLeft: 2, paddingRight: 2 }}
                    id="groups" value={detailValue?.groups || []}
                    onChange={handleGroupChange}
                    label="Groups"
                    fullWidth
                    multiple
                    input={<Input />}
                    renderValue={(selected) => (selected as string[]).join(', ')}>
                    {
                      groups.map((group) => (
                        <MenuItem key={group} value={group} style={{
                          paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4,
                        }}><em>{group}</em></MenuItem>
                      ))
                    }
                  </Select>
                </FormControl>
              </Paper>
              <DialogActions>
                <Button autoFocus style={{ margin: 8 }} onClick={onClose}>CLOSE</Button>
                <Button
                  style={{ margin: 8 }}
                  variant="contained"
                  color="secondary"
                  disabled={detailValue?.attributes?.identities !== undefined && JSON.parse(detailValue.attributes.identities).providerName === appConfig.protectedIdPName}
                  onClick={handleConfirm}>
                  DELETE
                </Button>
                {
                  detailValue?.enabled === 'true' ? (
                    <Button
                      style={{ margin: 8 }}
                      variant="contained"
                      onClick={handleDisable}>
                      DISABLE
                    </Button>
                  ) : (
                    <Button
                      style={{ margin: 8 }}
                      variant="contained"
                      color="primary"
                      onClick={handleEnable}>
                      ENABLE
                    </Button>
                  )
                }
                <Button
                  style={{ margin: 8 }}
                  variant="contained"
                  color="primary"
                  onClick={handleResetPassword}
                  disabled={detailValue?.status === 'FORCE_CHANGE_PASSWORD'}>
                  RESET PASSWORD
                </Button>
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
        <DialogTitle id="alert-dialog-title">{'Delete User?'}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Can&apost undo it. Do you want to delete user?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} color="primary" autoFocus>
            CANCEL
          </Button>
          <Button onClick={handleDelete} color="secondary">
            DELETE
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserDetail;
