import { ICredentials } from "@aws-amplify/core";
import { IAMClient, ListRolesCommand, ListRolesResponse } from '@aws-sdk/client-iam';
import { IamRole } from "../../interfaces";

class IamClient {
    
    private client: IAMClient;

    constructor(credentials: ICredentials, region: string) {
        if (!credentials.authenticated) {
            console.error('unauthenticated');
            throw 'unauthenticated';
        }
        this.client = new IAMClient({
            region,
            credentials
        });
    }

    listRoles = async (): Promise<IamRole[]> => {
        let marker = undefined;
        let isTruncated = undefined;
        let resps: ListRolesResponse[] = [];
        do {
            const resp: ListRolesResponse = await this.client.send(new ListRolesCommand({
                MaxItems: 1000,
                Marker: marker,
            }));
            marker = resp.Marker;
            resps.push(resp);
        } while (marker !== undefined && isTruncated !== true);

        const roles = resps
            .filter(resp => resp.Roles !== undefined && resp.Roles.length > 0)
            .map(resp => resp.Roles!)
            .reduce((cur, acc) => acc.concat(cur), []);
        return roles.map(role => ({
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
            tags: role.Tags?.map(tag => ({
                key: tag.Key,
                value: tag.Value,
            })),
            roleLastUsed: {
                lastUsedDate: role.RoleLastUsed?.LastUsedDate,
                region: role.RoleLastUsed?.Region,
            }
        } as IamRole));
    };
}

export default IamClient;
