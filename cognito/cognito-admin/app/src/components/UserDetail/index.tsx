import { Accordion, AccordionDetails, AccordionSummary, Button, Container, createStyles, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, List, ListItem, makeStyles, Paper, TextField, Theme, Typography, useMediaQuery, useTheme } from "@material-ui/core";
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

    useEffect(
        () => {
            setOpen(props.open);
            setDetail(props.user);
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
        console.trace(JSON.stringify(detail));
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

    return (
        <Container>
            <Dialog fullScreen={fullScreen} open={open} aria-labelledby="responsive-dialog-title">
                <DialogContent>
                    <DialogTitle id="user-detail-dialog-title"><Typography variant="h3" component="span" gutterBottom>{detail?.username}</Typography></DialogTitle>
                    <DialogContentText id="user-detail-dialog" component='div'>
                        <Container>
                            <Paper variant="outlined">
                                <TextField id="e-email" label="E-mail" style={{ margin: 8 }} margin="normal" fullWidth key='e-mail' InputProps={{ readOnly: true, }} defaultValue={detail?.email} />
                                <TextField id="createdAt" label="CreatedAt" style={{ margin: 8 }} margin="normal" fullWidth key='createdAt' InputProps={{ readOnly: true, }} defaultValue={detail?.createdAt?.toLocaleString()} />
                                <TextField id="lastModifiedAt" label="LastModifiedAt" style={{ margin: 8 }} margin="normal" fullWidth key='lastModifiedAt' InputProps={{ readOnly: true, }} defaultValue={detail?.lastModifiedAt?.toLocaleString()} />
                                <TextField id="enabled" label="Enabled" style={{ margin: 8 }} margin="normal" fullWidth key='enabled' InputProps={{ readOnly: true, }} defaultValue={detail?.enabled} />
                                <TextField id="status" label="Status" style={{ margin: 8 }} margin="normal" fullWidth key='status' InputProps={{ readOnly: true, }} defaultValue={detail?.status} />
                            </Paper>
                            <Paper variant="outlined">
                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="attributes-content" id="attributes-header">
                                        <Typography className={classes.heading}>Attributes</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails id="attributes-content">
                                        <List component="ul" id="attributes-list">
                                            {
                                                detail?.attributes !== undefined ? Object.keys(detail?.attributes!).filter(attribute => attribute !== 'email').map(attributeName => (
                                                    <ListItem component="li" key={`${detail?.email}-attr-${attributeName}`}>
                                                        <TextField id={attributeName} label={attributeName} style={{ margin: 8 }} margin="normal" fullWidth key={attributeName} InputProps={{ readOnly: true, }} defaultValue={detail?.attributes![attributeName]} />
                                                    </ListItem>
                                                )) : ('')
                                            }
                                        </List>
                                    </AccordionDetails>
                                </Accordion>
                            </Paper>
                            <Paper variant="outlined">
                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="groups-content" id="groups-header">
                                        <Typography className={classes.heading}>Groups</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <List component="ul" id="groups-content">
                                            {
                                                detail?.groups?.map(group => (
                                                    <ListItem component="li" key={`${detail?.email}-group-${group}`}>
                                                        {group}
                                                    </ListItem>
                                                ))
                                            }
                                        </List>
                                    </AccordionDetails>
                                </Accordion>
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
