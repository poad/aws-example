import { Button, Container, Dialog, DialogContent, DialogContentText, DialogActions, Typography, useTheme, useMediaQuery, TextField, DialogTitle, Paper, Accordion, AccordionDetails, AccordionSummary, List, ListItem, MenuItem, Select } from "@material-ui/core";
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import UserPoolClient from "../../service/UserPoolClient";
import { Group, IamRole } from "../../interfaces";
import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import IamClient from "../../service/IamClient";


interface CreateGroupDialogProps {
    /**
     * Injected by the documentation to work in an iframe.
     * You won't need it on your project.
     */
    container?: Element,
    client: UserPoolClient,
    iamClient: IamClient,
    onCreate?: (newUser: Group) => void
}

const CreateGroupDialog: React.FunctionComponent<CreateGroupDialogProps> = (props): JSX.Element => {

    type Inputs = {
        groupName: string,
        description?: string,
        precedence?: number,
        roleArn?: string,
    };
      
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const [open, setOpen] = useState<boolean>(false);
    const [roles, setRoles] = useState<IamRole[]>([]);

    
    useEffect(
        () => {
            props.iamClient.listRoles()
                .then(setRoles)
        }, []);

    // const { register, handleSubmit, formState: { errors } } = useForm<Inputs>();
    const { register, handleSubmit } = useForm<Inputs>();
    const onSubmit: SubmitHandler<Inputs> = (data: Inputs) => {
        props.client.createGroup({
            ...data,
            roleArn: data.roleArn === "" ? undefined : data.roleArn,
        }).then((group) => {
            if (props.onCreate !== undefined) {
                props.onCreate(group);
            }
        })
        .finally(() => {
            setOpen(false);
        })
    };
  
    const onClose = () => {
        setOpen(false);
    }

    const handleRoleChange = () => {

    }

    return (
        <Container>
            <Button variant="contained" style={{ margin: 8 }} color="primary" onClick={() => setOpen(true)}>CREATE GROUP</Button>
            <Dialog fullScreen={fullScreen} open={open} aria-labelledby="responsive-dialog-title">
                <DialogContent>
                    <DialogTitle id="create-user-dialog-title"><Typography variant="h3" component="span" gutterBottom>{'Create User'}</Typography></DialogTitle>
                    <DialogContentText id="create-user-dialog" component="div">
                        <Container>
                            <form onSubmit={handleSubmit(onSubmit)}>
                                <Paper variant="outlined">
                                    <TextField id="groupName" label="GroupName" type='groupName' style={{ margin: 8 }} margin="dense" {...register("groupName", { required: true })} />
                                    <TextField id="description" label="Description" type="text" style={{ margin: 8 }} margin="dense" {...register("description", { required: false })} />
                                    <TextField id="precedence" label="Precedence" type="number" style={{ margin: 8 }} margin="dense" {...register("precedence", { required: false })} />
                                </Paper>
                                <Paper variant="outlined">
                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="role-content" id="role-header">
                                        <Typography component="div">Role</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails id="role-content">
                                    <Select
                                        labelId="role-select-label"
                                        id="role-select"
                                        autoWidth={true}
                                        value=""
                                        onChange={handleRoleChange}
                                        >
                                            {
                                                [undefined].concat(roles).map(role => role === undefined
                                                    ? (<MenuItem id="unselected" key="unselected" value="" />)
                                                    : (<MenuItem id={role.roleId} key={role.arn} value={role.arn} />)
                                                )
                                            }
                                        </Select>
                                    </AccordionDetails>
                                </Accordion>
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
}

export default CreateGroupDialog;
