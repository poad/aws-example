import {
  SelectChangeEvent,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { User } from '../interfaces';
import UserPoolClient from '../service/UserPoolClient';

export const useListGroups = (initOpen: boolean, user: User | undefined, client: UserPoolClient, onClose: () => void,
    onUpdate?: (newUser: User) => void,
    onDelete?: (removeUser: User) => void): {
        open: boolean,
        detail: User | undefined,
        confirm: boolean,
        groups: string[],
        deleteUser: () => void,
        resetPassword: () => void,
        disableUser: () => void,
        enableUser: () => void,

        handleConfirm: () => void,
        handleCancel: () => void,
        handleGroupChange: (event: SelectChangeEvent<string[]>) => void,
    } => {
    const [open, setOpen] = useState<boolean>(initOpen);

    const [detail, setDetail] = useState<User | undefined>(user);

    const [confirm, setConfirm] = useState<boolean>(false);

    const [groups, setGroups] = useState<string[]>([]);

    useEffect(
        () => {
            client.listGroups()
                .then((items) => items.map((item) => item.groupName))
                .then(setGroups)
                .then(() => {
                    setOpen(initOpen);
                    setDetail(user);
                });
        }, [user, initOpen],
    );

    const deleteUser = () => {
        if (detail !== undefined) {
            client.deleteUser(detail.username)
                .then(() => {
                    if (onDelete !== undefined) {
                        onDelete(detail);
                    }
                    setDetail(undefined);
                });
        }
        setConfirm(false);
        setOpen(false);
    };

    const resetPassword = () => {
        if (detail !== undefined && detail.attributes.status !== 'FORCE_CHANGE_PASSWORD') {
            client.resetUserPassword(detail.username)
                .then(() => {
                    const newDetail = { ...detail };
                    newDetail.enabled = 'false';
                    setDetail(newDetail);
                    if (onUpdate !== undefined) {
                        onUpdate(newDetail);
                    }
                    onClose();
                });
        }
    };

    const disableUser = () => {
        if (detail !== undefined) {
            client.disableUser(detail.username)
                .then(() => {
                    const newDetail = { ...detail };
                    newDetail.enabled = 'false';
                    setDetail(newDetail);
                    if (onUpdate !== undefined) {
                        onUpdate(newDetail);
                    }
                    onClose();
                });
        }
    };

    const enableUser = () => {
        if (detail !== undefined) {
            client.enableUser(detail.username)
                .then(() => {
                    const newDetail = { ...detail };
                    newDetail.enabled = 'true';
                    setDetail(newDetail);
                    if (onUpdate !== undefined) {
                        onUpdate(newDetail);
                    }
                    onClose();
                });
        }
    };

    const handleConfirm = () => {
        setConfirm(true);
    };

    const handleCancel = () => {
        setConfirm(false);
    };

    const handleGroupChange = (event: SelectChangeEvent<string[]>) => {
        const newGroups = event.target.value as string[];
        if (detail !== undefined) {
            const currentGroups = detail.groups || [];

            const deletionGroups = currentGroups.filter((current) => newGroups.indexOf(current) === -1);
            const additionGroups = newGroups.filter((current) => currentGroups.indexOf(current) === -1);

            deletionGroups.forEach((group) => client.removeUserFromGroup({ username: detail.username || '', groupName: group }));
            additionGroups.forEach((group) => client.addUserToGroup({ username: detail.username || '', groupName: group }));

            setDetail({ ...detail, groups: newGroups });
        }
    };

    return {
        open,
        detail,
        confirm,
        groups,
        deleteUser,
        resetPassword,
        disableUser,
        enableUser,

        handleConfirm,
        handleCancel,
        handleGroupChange,
    };
};
