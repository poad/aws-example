import { useMemo } from 'react';
import { IamRole } from '../interfaces';
import IamClient from '../service/IamClient';
import { useAsync } from 'react-async';
import { appConfig } from 'aws-config';

export const useListRoles = (iamClient: IamClient): { roles: IamRole[], error?: Error, loaded: boolean } => {
  const filterGroupRoles = (iamRoles: IamRole[]): IamRole[] => {
    const name = appConfig.groupRoleClassificationTagName;
    const value = appConfig.groupRoleClassificationTagValue;
    const check = name !== undefined && value !== undefined;
    const filered = check ? iamRoles
      .filter((iamRole) => (iamRole.tags?.find((tag) => tag.key === name && tag.value === value)) !== undefined) : iamRoles;
    return filered;
  };

  return useMemo(() => {
    const { value, error, isPending } = useAsync(async () => {
      return Promise.all((await iamClient.listRoles())
        .filter(async (r) => r.roleName !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .map((r) => iamClient.getRole(r.roleName!)));
    });
    const roles = value && !error && !isPending ? filterGroupRoles(value) : [];
    return { roles, error, loaded: !isPending };
  }, []);
};
