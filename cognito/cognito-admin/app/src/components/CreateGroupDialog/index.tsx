import { Button, Container, Dialog, DialogContent, DialogContentText, DialogActions, Typography, useTheme, useMediaQuery, TextField, DialogTitle, Paper, MenuItem, Select, FormControl, InputLabel } from "@material-ui/core";
import UserPoolClient from "../../service/UserPoolClient";
import { Group, IamRole } from "../../interfaces";
import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import IamClient from "../../service/IamClient";
import { appConfig } from "../../aws-config";


interface CreateGroupDialogProps {
    /**
     * Injected by the documentation to work in an iframe.
     * You won't need it on your project.
     */
    container?: Element,
    client: UserPoolClient,
    iamClient: IamClient,
    onCreate?: (newUser: Group) => void
    onError?: (error: any) => void
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
    const [role, setRole] = useState<string | undefined>(undefined);

    const filterGroupRoles = (roles: IamRole[]): IamRole[] => {
        const name = appConfig.groupRoleClassificationTagName;
        const value = appConfig.groupRoleClassificationTagValue;
        const check = name !== undefined && value !== undefined;
        const filered = check ? roles.filter(role =>
            (role.tags?.find(tag => tag.key === name && tag.value === value)) !== undefined) : roles;
        return filered;
    }

    const listRoles = async (): Promise<IamRole[]> => {
        const roles = await props.iamClient.listRoles()
            .then(roles => Promise.resolve(roles));

        return Promise.all(roles.map((role) =>
            props.iamClient.getRole(role.roleName!)
        ));
    };


    useEffect(
        () => {
            listRoles()
                .then(filterGroupRoles)
                .then(setRoles);
        }, []);

    const { register, handleSubmit, reset, unregister } = useForm<Inputs>();
    const onSubmit: SubmitHandler<Inputs> = (data: Inputs) => {
        const newGroup = {
            groupName: data.groupName,
            description: data.description,
            precedence: data.precedence,
            roleArn: role === "" ? undefined : role,
        };
        props.client.createGroup(newGroup)
            .then((group) => {
                if (props.onCreate !== undefined) {
                    props.onCreate(group);
                }
            })
            .catch((error) => {
                if (props.onError !== undefined) {
                    props.onError(error);
                }
            })
            .finally(() => {
                reset({
                    groupName: undefined,
                    description: undefined,
                    precedence: undefined,
                    roleArn: undefined,
                });
                unregister(["groupName", "description", "groupName", "roleArn"]);
                setRole(undefined);
                setOpen(false);
            })
    };

    const onClose = () => {
        setRole(undefined);
        setOpen(false);
    }

    const handleRoleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        setRole(event.target.value as string);
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
                                    <TextField id="groupName" label="GroupName" type='groupName' style={{ paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4 }} fullWidth {...register("groupName", { required: true })} />
                                    <TextField id="description" label="Description" type="text" style={{ paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4 }} fullWidth {...register("description", { required: false })} />
                                    <TextField id="precedence" label="Precedence" type="number" style={{ paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4 }} fullWidth {...register("precedence", { required: false })} />

                                    <FormControl variant="outlined" fullWidth style={{ paddingLeft: 2, paddingRight: 2 }}>
                                        <InputLabel id="roleArn-label" style={{ paddingLeft: 2, paddingRight: 2 }}>Role Arn</InputLabel>
                                        <Select labelId="roleArn-label" style={{ paddingLeft: 2, paddingRight: 2 }} id="roleArn" value={role || ""} onChange={handleRoleChange} label="Role Arn" fullWidth>
                                            <MenuItem key="None" value="" style={{ paddingLeft: 2, paddingRight: 2 }}><em>None</em></MenuItem>
                                            {
                                                roles.map(role => (<MenuItem key={role.arn} value={role.arn} style={{ paddingLeft: 2, paddingRight: 2, paddingTop: 4, paddingBottom: 4, marginTop: 4, marginBottom: 4 }}><em>{role.roleName}</em></MenuItem>))
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
}

export default CreateGroupDialog;
