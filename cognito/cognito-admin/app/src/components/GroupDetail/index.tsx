import { Accordion, AccordionDetails, AccordionSummary, Button, Container, createStyles, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, List, ListItem, makeStyles, Paper, TextField, Theme, Typography, useMediaQuery, useTheme } from "@material-ui/core";
import { Group, IamRole } from "../../interfaces";
import React, { useEffect, useState } from "react";
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import UserPoolClient from "../../service/UserPoolClient";
import IamClient from "../../service/IamClient";

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

const UserDetail: React.FunctionComponent<GroupDetailProps> = (props): JSX.Element => {
    const classes = useStyles();
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const [open, setOpen] = useState<boolean>(props.open);

    const [detail, setDetail] = useState<Group | undefined>(props.group);

    const [confirm, setConfirm] = useState<boolean>(false);

    const [roles, setRoles] = useState<IamRole[]>([]);

    useEffect(
        () => {
            props.iamClient.listRoles()
                .then(setRoles)
            setOpen(props.open);
            setDetail(props.group);
        }, [props.group, props.open]);


    const deleteGroup = () => {
        if (detail !== undefined) {
            props.client.deleteGroup(detail.groupName)
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
                    <DialogTitle id="user-detail-dialog-title"><Typography variant="h3" component="span" gutterBottom>{detail?.groupName}</Typography></DialogTitle>
                    <DialogContentText id="user-detail-dialog" component='div'>
                        <Container>
                            <Paper variant="outlined">
                                <TextField id="groupName" label="GroupName" style={{ margin: 8 }} margin="normal" fullWidth key='groupName' InputProps={{ readOnly: true, }} defaultValue={detail?.groupName} />
                                <TextField id="createdAt" label="CreatedAt" style={{ margin: 8 }} margin="normal" fullWidth key='createdAt' InputProps={{ readOnly: true, }} defaultValue={detail?.creationDate?.toLocaleString()} />
                                <TextField id="lastModifiedAt" label="LastModifiedAt" style={{ margin: 8 }} margin="normal" fullWidth key='lastModifiedAt' InputProps={{ readOnly: true, }} defaultValue={detail?.lastModifiedDate?.toLocaleString()} />
                                <TextField id="roleArn" label="Role Arn" style={{ margin: 8 }} margin="normal" fullWidth key='enabled' InputProps={{ readOnly: true, }} defaultValue={detail?.roleArn} />
                                <TextField id="precedence" label="Precedence" style={{ margin: 8 }} margin="normal" fullWidth key='precedence' InputProps={{ readOnly: true, }} defaultValue={detail?.precedence} />
                            </Paper>
                            <Paper variant="outlined">
                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="users-content" id="users-header">
                                        <Typography className={classes.heading}>Users</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails id="users-content">
                                        <List component="ul" id="users-list">
                                            {
                                                detail?.users !== undefined ? detail?.users.map(user => (
                                                    <ListItem component="li" key={`${detail?.groupName}-user-${user.username}`}>
                                                        <TextField id={user.username} label={user.username} style={{ margin: 8 }} margin="normal" fullWidth key={user.username} InputProps={{ readOnly: true, }} defaultValue={user.username} />
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
                    <Button onClick={deleteGroup} color="secondary">
                        DELETE
          </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default UserDetail;
