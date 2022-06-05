import { useState, useEffect, useCallback } from 'react';
import { useAsync } from 'react-async';
import UserPoolClient from 'service/UserPoolClient';
import { ErrorStatus, Group } from '../interfaces';

export const usePagenationGroups = (client: UserPoolClient): {
  groups: Group[],
  error: ErrorStatus,
  loaded: boolean,
  create: (group: Group) => void,
  delete: (group: Group) => void,
  update: (groups: Group[]) => void
} => {
  const { value, error, isPending } = useAsync(client.listGroups, []);
  const [groups, setGroups] = useState<Group[]>([]);
  const [errorStatus, setErrorStatus] = useState<ErrorStatus>({ error: false });
  const [loaded, setLoaded] = useState(false);

  useEffect(
    () => {
      const status = error ? {
        error: true,
        message: JSON.stringify(error),
      } : { error: false };
      setGroups(value && !error && !isPending ? value : []);
      setErrorStatus(status);
      setLoaded(!isPending);
    },
    [value, error, isPending],
  );

  return {
    groups,
    error: errorStatus,
    loaded,
    create: useCallback((group: Group) => groups.concat(group), []),
    delete: useCallback((target: Group) => {
      const newGroups = groups.filter((group) => group.groupName !== target.groupName);
      if (newGroups) {
        setGroups(newGroups);
      }
    }, []),
    update: useCallback((newGroups: Group[]) => setGroups(newGroups), []),
  };
};

