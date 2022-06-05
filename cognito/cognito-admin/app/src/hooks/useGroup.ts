import { Group } from 'interfaces';
import { useState, useCallback } from 'react';
import UserPoolClient from 'service/UserPoolClient';

export const useGroup = (client: UserPoolClient): { group?: Group, loadGroup: (origin: Group) => void } => {
  const [group, setGroup] = useState<Group | undefined>(undefined);
  const loadGroup = useCallback(async (origin: Group) => {
    const users = await client.listUsersInGroup(origin.groupName);
    setGroup({ ...origin, users });
  }, []);
  return { group, loadGroup };
};