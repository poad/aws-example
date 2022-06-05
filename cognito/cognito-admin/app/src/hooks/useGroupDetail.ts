import { useCallback, useState } from 'react';
import { Group } from '../interfaces';
import UserPoolClient from '../service/UserPoolClient';

export const useGroupDetail = (
  client: UserPoolClient,
  group: Group | undefined,
  onUpdate?: (newGroup: Group) => void,
  onDelete?: (removeGroup: Group) => void,
): {
    detail?: Group,
    attacheRole?: string,
    changeGroupRole: (newRole: string) => void,
    updateGroupRole: () => void,
    deleteGroup: () => void,
    clearAttacheRole: () => void,
  } => {
  const [detail, setDetail] = useState<Group | undefined>(group);
  const [attacheRole, setAttacheRole] = useState<string | undefined>(undefined);


  const deleteGroup = useCallback(() => {
    if (detail) {
      client.deleteGroup(detail.groupName)
        .then(() => {
          if (onDelete) {
            onDelete(detail);
          }
          setDetail(undefined);
        });
    }
  }, []);

  const updateGroup = async (newGroup: Group) => {
    const result = await client.updateGroup(newGroup);
    if (onUpdate) {
      onUpdate(result);
    }
  };

  const changeGroupRole = useCallback((newRole: string) => {
    if ((!detail?.roleArn || detail?.roleArn?.length === 0) && newRole.length !== 0) {
      setAttacheRole(newRole);
    } else if (detail?.roleArn !== newRole) {
      updateGroup({ ...detail, roleArn: newRole.length > 0 ? newRole : undefined } as Group);
      setAttacheRole(undefined);
    }
  }, []);

  const updateGroupRole = useCallback(() => {
    updateGroup({ ...detail, roleArn: attacheRole } as Group);
    setAttacheRole(undefined);
  }, []);

  const clearAttacheRole = useCallback(() => {
    setAttacheRole(undefined);
  }, []);

  return {
    detail,
    attacheRole,
    changeGroupRole,
    updateGroupRole,
    deleteGroup,
    clearAttacheRole,
  };
};

