import { useCallback, useEffect, useState } from 'react';
import { useAsync } from 'react-async';
import { ErrorStatus, User } from '../interfaces';
import UserPoolClient from '../service/UserPoolClient';

export const useUsers = (client: UserPoolClient) => {
  const [users, setUsers] = useState<User[]>([]);
  const { value, error, isPending } = useAsync(async () => {
    const items = await client.listUsers();
    return Promise.all((await items).map((item) => {
      const { attributes } = item;
      const { email } = attributes;
      return {
        username: item.username,
        attributes: item.attributes,
        createdAt: item.createdAt,
        lastModifiedAt: item.lastModifiedAt,
        enabled: item.enabled,
        status: item.status,
        mfa: item.mfa,
        email,
      } as User;
    }));
  }, []);
  const [errorStatus, setErrorStatus] = useState<ErrorStatus>({ error: false });
  const [loaded, setLoaded] = useState(false);

  useEffect(
    () => {
      setUsers(value && !error && !isPending ? value : []);
      setErrorStatus(error ? {
        error: true,
        message: JSON.stringify(error),
      } : { error: false });
      setLoaded(!isPending);
    },
    [value, errorStatus, isPending],
  );

  return {
    users,
    errorStatus,
    loaded,
    create: useCallback((user: User) => setUsers(users.concat(user)), []),
    delete: useCallback((target: User) => {
      const newUsers = users.filter((user) => user.email !== target.email);
      if (newUsers !== undefined) {
        setUsers(newUsers);
      }
    }, []),
  };
};
