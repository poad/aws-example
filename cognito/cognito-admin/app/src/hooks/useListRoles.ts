import { IamRole } from '../interfaces';
import IamClient from '../service/IamClient';
import { appConfig } from '../aws-config';
import { useState, useEffect } from 'react';

export const useListRoles = (iamClient: IamClient): { roles?: IamRole[], error?: Error, loaded: boolean } => {
  const [state, setState] = useState<{
    data?: IamRole[],
    error?: Error,
    loaded: boolean,
  }>({ loaded: false });

  const filterGroupRoles = (iamRoles: IamRole[]): IamRole[] => {
    const name = appConfig.groupRoleClassificationTagName;
    const value = appConfig.groupRoleClassificationTagValue;
    const check = name !== undefined && value !== undefined;
    const filered = check ? iamRoles
      .filter((iamRole) => (iamRole.tags?.find((tag) => tag.key === name && tag.value === value)) !== undefined) : iamRoles;
    return filered;
  };

  const loadRoles = async () =>
    iamClient.listRoles()
      .then(items => {
        return items;
      })
      .then(items => items
        .filter((item) => item.roleName !== undefined)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .map(async item => iamClient.getRole(item.roleName!)))
      .then(async (items) => {
        const roles = (await Promise.all((items)));
        const s = {
          data: filterGroupRoles(roles),
          loaded: true,
        };
        setState(s);
        return s;
      },
      )
      .catch((error) => setState({ error, loaded: false }));

  useEffect(() => {
    loadRoles();
  }, []);

  return { roles: state.data, error: state.error, loaded: state.loaded };
};
