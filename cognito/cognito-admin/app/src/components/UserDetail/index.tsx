import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Container, createStyles, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, Input, InputLabel, List, ListItem, makeStyles, MenuItem, Paper, Select, TextField, Theme, Typography, useMediaQuery, useTheme } from "@material-ui/core";
import { User } from "../../interfaces";
import React, { useEffect, useState } from "react";
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import UserPoolClient from "../../service/UserPoolClient";
import { appConfig } from "../../aws-config";

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

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            width: '100%',
        },
        heading: {
            fontSize: theme.typography.pxToRem(15),
            fontWeight: theme.typography.fontWeightRegular,
        },
    }),
);

const UserDetail: React.FunctionComponent<UsersDetailProps> = (props): JSX.Element => {
    const classes = useStyles();
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const [open, setOpen] = useState<boolean>(props.open);

    const [detail, setDetail] = useState<User | undefined>(props.user);

    const [confirm, setConfirm] = useState<boolean>(false);
    const [client,] = useState<UserPoolClient>(props.client);

    const [groups, setGroups] = useState<string[]>([]);

    useEffect(
        () => {
            client.listGroups()
                .then(items => items.map(item => item.groupName))
                .then(setGroups)
                .then(() => {
                    setOpen(props.open);
                    setDetail(props.user);
                });
        }, [props.user, props.open]);


    const deleteUser = () => {
        if (detail !== undefined) {
            props.client.deleteUser(detail.username)
                .then(() => {
                    if (props.onDelete !== undefined) {
                        props.onDelete(detail);
                    }
                    setDetail(undefined);
                });
        }
        setConfirm(false);
        setOpen(false);
    };

    const resetPassword = () => {
        if (detail !== undefined && detail.attributes.status !== 'FORCE_CHANGE_PASSWORD') {
            props.client.resetUserPassword(detail.username)
                .then(() => {
                    const newDetail = { ...detail };
                    newDetail.enabled = 'false'
                    setDetail(newDetail);
                    if (props.onUpdate !== undefined) {
                        props.onUpdate(newDetail);
                    }
                    props.onClose();
                });
        }

    }

    const disableUser = () => {
        if (detail !== undefined) {
            props.client.disableUser(detail.username)
                .then(() => {
                    const newDetail = { ...detail };
                    newDetail.enabled = 'false'
                    setDetail(newDetail);
                    if (props.onUpdate !== undefined) {
                        props.onUpdate(newDetail);
                    }
                    props.onClose();
                });
        }
    };

    const enableUser = () => {
        if (detail !== undefined) {
            props.client.enableUser(detail.username)
                .then(() => {
                    const newDetail = { ...detail };
                    newDetail.enabled = 'true'
                    setDetail(newDetail);
                    if (props.onUpdate !== undefined) {
                        props.onUpdate(newDetail);
                    }
                    props.onClose();
                });
        }
    };

    const handleConfirm = () => {
        setConfirm(true);
    };

    const handleCancel = () => {
        setConfirm(false);
    };

    const handleGroupChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        const newGroups = event.target.value as string[];
        if (detail !== undefined) {

            const currentGroups = detail!.groups || [];

            const deletionGroups = currentGroups.filter(current => newGroups.indexOf(current) === -1);
            const additionGroups = newGroups.filter(current => currentGroups.indexOf(current) === -1);

            deletionGroups.forEach(group => props.client.removeUserFromGroup({ username: detail?.username!, groupName: group }));
            additionGroups.forEach(group => props.client.addUserToGroup({ username: detail?.username!, groupName: group }));

            setDetail({ ...detail!, groups: newGroups });
        }
    };

    return (
        <Container>
            <Dialog fullScreen={fullScreen} open={open} aria-labelledby="responsive-dialog-title">
                <DialogContent>
                    <DialogTitle id="user-detail-dialog-title"><Typography variant="h3" component="span" gutterBottom>{detail?.username}</Typography></DialogTitle>
                    <DialogContentText id="user-detail-dialog" component='div'>
                        <Container>
                            <Paper variant="outlined" style={{ paddingLeft: 4, paddingRight: 4, paddingTop: 16, paddingBottom: 16 }}>
                                <TextField id="e-email" label="E-mail" style={{ paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4 }} fullWidth variant="outlined" key='e-mail' InputProps={{ readOnly: true, }} defaultValue={detail?.email} />
                                <TextField id="createdAt" label="CreatedAt" style={{ paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4 }} fullWidth variant="outlined" key='createdAt' InputProps={{ readOnly: true, }} defaultValue={detail?.createdAt?.toLocaleString()} />
                                <TextField id="lastModifiedAt" label="LastModifiedAt" style={{ paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4 }} fullWidth variant="outlined" key='lastModifiedAt' InputProps={{ readOnly: true, }} defaultValue={detail?.lastModifiedAt?.toLocaleString()} />
                                <TextField id="enabled" label="Enabled" style={{ paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4 }} fullWidth variant="outlined" key='enabled' InputProps={{ readOnly: true, }} defaultValue={detail?.enabled} />
                                <TextField id="status" label="Status" style={{ paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4 }} fullWidth variant="outlined" key='status' InputProps={{ readOnly: true, }} defaultValue={detail?.status} />

                                <Accordion style={{ marginBottom: 16 }}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="attributes-content" id="attributes-header">
                                        <Typography className={classes.heading}>Attributes</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails id="attributes-content">
                                    <Box border={1}>
                                        <List component="ul" id="attributes-list" dense={true} disablePadding={true}>
                                            {
                                                detail?.attributes !== undefined ? Object.keys(detail?.attributes!).filter(attribute => attribute !== 'email').map(attributeName => (
                                                    <ListItem component="li" dense={true} key={`${detail?.email}-attr-${attributeName}`} button={false} disabled={true}>
                                                        <TextField id={attributeName} label={attributeName} style={{ paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4 }} fullWidth variant="outlined" key={attributeName} InputProps={{ readOnly: true, }} defaultValue={detail?.attributes![attributeName]} />
                                                    </ListItem>
                                                )) : ('')
                                            }
                                        </List>
                                    </Box>
                                    </AccordionDetails>
                                </Accordion>
                                <FormControl variant="outlined" fullWidth style={{ paddingLeft: 2, paddingRight: 2 }}>
                                    <InputLabel id="groups-label" style={{ paddingLeft: 2, paddingRight: 2 }}>Groups</InputLabel>
                                    <Select labelId="groups-label" style={{ paddingLeft: 2, paddingRight: 2 }} id="groups" value={detail?.groups || []} onChange={handleGroupChange} label="Groups" fullWidth multiple input={<Input />} renderValue={(selected) => (selected as string[]).join(', ')}>
                                        {
                                            groups.map(group => (
                                                <MenuItem key={group} value={group} style={{ paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4 }}><em>{group}</em></MenuItem>
                                            )
                                            )
                                        }
                                    </Select>
                                </FormControl>
                            </Paper>
                            <DialogActions>
                                <Button autoFocus style={{ margin: 8 }} onClick={props.onClose}>CLOSE</Button>
                                <Button style={{ margin: 8 }} variant="contained" color="secondary" disabled={detail?.attributes?.identities !== undefined && JSON.parse(detail.attributes.identities).providerName === appConfig.protectedIdPName} onClick={handleConfirm}>DELETE</Button>
                                {detail?.enabled === 'true' ? (<Button style={{ margin: 8 }} variant="contained" onClick={disableUser}>DISABLE</Button>) : (<Button style={{ margin: 8 }} variant="contained" color="primary" onClick={enableUser}>ENABLE</Button>)}
                                <Button style={{ margin: 8 }} variant="contained" color="primary" onClick={resetPassword} disabled={detail?.status === "FORCE_CHANGE_PASSWORD"}>RESET PASSWORD</Button>
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
                <DialogTitle id="alert-dialog-title">{"Delete User?"}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Can't undo it. Do you want to delete user?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancel} color="primary" autoFocus>
                        CANCEL
                    </Button>
                    <Button onClick={deleteUser} color="secondary">
                        DELETE
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default UserDetail;
