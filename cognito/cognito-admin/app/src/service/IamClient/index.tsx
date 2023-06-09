import {
  GetRoleCommand, GetRoleResponse, IAMClient, ListRolesCommand, ListRolesResponse,
} from '@aws-sdk/client-iam';
import { IamRole } from '../../interfaces';

export interface ICredentials {
  accessKeyId: string;
  sessionToken: string;
  secretAccessKey: string;
  identityId: string;
  authenticated: boolean;
  expiration?: Date;
}

class IamClient {
  private client: IAMClient;

  constructor(credentials: ICredentials, region: string) {
    if (!credentials.authenticated) {
      // eslint-disable-next-line no-console
      console.error('unauthenticated');
      throw Error('unauthenticated');
    }
    this.client = new IAMClient({
      region,
      credentials,
    });
  }

  private listRole = (marker: string | undefined): Promise<ListRolesResponse> => this.client.send(new ListRolesCommand({
    MaxItems: 1000,
    Marker: marker,
  })).then((resp: ListRolesResponse) => resp);

  listRoles = async (): Promise<IamRole[]> => {
    let marker;
    let isTruncated;
    const resps: ListRolesResponse[] = [];
    const mapper = (resp: ListRolesResponse) => {
      marker = resp.Marker;
      resps.push(resp);
    };
    do {
      this.listRole(marker).then(mapper);
    } while (marker !== undefined && isTruncated !== true);

    const roles = resps
      .filter((resp) => resp.Roles !== undefined && resp.Roles.length > 0)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .map((resp) => resp.Roles!)
      .reduce((cur, acc) => acc.concat(cur), []);
    return roles.map((role) => ({
      path: role.Path,
      roleName: role.RoleName,
      roleId: role.RoleId,
      arn: role.Arn,
      createDate: role.CreateDate,
      assumeRolePolicyDocument: role.AssumeRolePolicyDocument,
      description: role.Description,
      maxSessionDuration: role.MaxSessionDuration,
      permissionsBoundary: {
        permissionsBoundaryType: role.PermissionsBoundary?.PermissionsBoundaryType,
        permissionsBoundaryArn: role.PermissionsBoundary?.PermissionsBoundaryArn,
      },
      tags: role.Tags?.map((tag) => ({
        key: tag.Key,
        value: tag.Value,
      })),
      roleLastUsed: {
        lastUsedDate: role.RoleLastUsed?.LastUsedDate,
        region: role.RoleLastUsed?.Region,
      },
    } as IamRole));
  };

  getRole = async (roleName: string): Promise<IamRole> => {
    const resp: GetRoleResponse = await this.client.send(new GetRoleCommand({
      RoleName: roleName,
    }));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const role = resp.Role!;
    return {
      path: role.Path,
      roleName: role.RoleName,
      roleId: role.RoleId,
      arn: role.Arn,
      createDate: role.CreateDate,
      assumeRolePolicyDocument: role.AssumeRolePolicyDocument,
      description: role.Description,
      maxSessionDuration: role.MaxSessionDuration,
      permissionsBoundary: {
        permissionsBoundaryType: role.PermissionsBoundary?.PermissionsBoundaryType,
        permissionsBoundaryArn: role.PermissionsBoundary?.PermissionsBoundaryArn,
      },
      tags: role.Tags?.map((tag) => ({
        key: tag.Key,
        value: tag.Value,
      })),
      roleLastUsed: {
        lastUsedDate: role.RoleLastUsed?.LastUsedDate,
        region: role.RoleLastUsed?.Region,
      },
    } as IamRole;
  };
}

export default IamClient;
