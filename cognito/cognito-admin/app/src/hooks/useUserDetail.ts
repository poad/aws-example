import { useEffect, useState } from 'react';
import { User } from '../interfaces';
import UserPoolClient from '../service/UserPoolClient';

export const useUserDetail = (initOpen: boolean, user: User | undefined, client: UserPoolClient, onClose: () => void,
  onUpdate?: (newUser: User) => void,
  onDelete?: (removeUser: User) => void): {
    open: boolean,
    detail: User | undefined,
    confirm: boolean,
    groups: string[],
    deleteUser: () => void,
    resetPassword: () => User | undefined,
    disableUser: () => User | undefined,
    enableUser: () => User | undefined,
    changeGroup: (newGroups: string[]) => User | undefined,

    handleConfirm: () => void,
    handleCancel: () => void
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
    if (detail) {
      client.deleteUser(detail.username)
        .then(() => {
          if (onDelete) {
            onDelete(detail);
          }
          setDetail(undefined);
        })
        .finally(() => {
          setConfirm(false);
          setOpen(false);
        });
    } else {
      setConfirm(false);
      setOpen(false);
    }
  };

  const resetPassword = () => {
    if (detail && detail.attributes.status !== 'FORCE_CHANGE_PASSWORD') {
      const newDetail = { ...detail };
      newDetail.status = 'FORCE_CHANGE_PASSWORD';
      client.resetUserPassword(detail.username)
        .then(() => {
          setDetail(newDetail);
          if (onUpdate) {
            onUpdate(newDetail);
          }
        })
        .finally(() => {
          onClose();
        });
      return newDetail;
    } else {
      onClose();
    }
    return undefined;
  };

  const disableUser = () => {
    if (detail) {
      const newDetail = { ...detail };
      newDetail.enabled = 'false';
      client.disableUser(detail.username)
        .then(() => {
          setDetail(newDetail);
          if (onUpdate) {
            onUpdate(newDetail);
          }
        })
        .finally(() => {
          onClose();
        });
      return newDetail;
    } else {
      onClose();
    }
    return undefined;
  };

  const enableUser = (): User | undefined => {
    if (detail) {
      const newDetail = { ...detail };
      newDetail.enabled = 'true';
      client.enableUser(detail.username)
        .then(() => {
          setDetail(newDetail);
          if (onUpdate) {
            onUpdate(newDetail);
          }
        })
        .finally(() => {
          onClose();
        });
      return newDetail;
    } else {
      onClose();
    }
    return undefined;
  };

  const changeGroup = (newGroups: string[]) => {
    if (detail) {
      const currentGroups = detail.groups || [];

      const deletionGroups = currentGroups.filter((current) => newGroups.indexOf(current) === -1);
      const additionGroups = newGroups.filter((current) => currentGroups.indexOf(current) === -1);

      deletionGroups.forEach((group) => client.removeUserFromGroup({ username: detail.username || '', groupName: group }));
      additionGroups.forEach((group) => client.addUserToGroup({ username: detail.username || '', groupName: group }));

      setDetail({ ...detail, groups: newGroups });
    }
    return detail;
  };

  const handleConfirm = () => {
    setConfirm(true);
  };

  const handleCancel = () => {
    setConfirm(false);
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
    changeGroup,

    handleConfirm,
    handleCancel,
  };
};

export default useUserDetail;
