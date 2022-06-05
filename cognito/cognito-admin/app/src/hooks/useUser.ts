import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { User } from '../interfaces';
import UserPoolClient from '../service/UserPoolClient';


export const useUser = (client: UserPoolClient): { user?: User, setUser: Dispatch<SetStateAction<User | undefined>>, loadUser: (origin: User) => void } => {
  const [user, setUser] = useState<User | undefined>(undefined);
  const loadUser = useCallback(async (origin: User) => {
    const groups = await client.listGroupsForUser(origin.username);
    setUser({ ...origin, groups });
  }, []);
  return { user, setUser, loadUser };
};
