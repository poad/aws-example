import { ICredentials } from "@aws-amplify/core";
import { AdminCreateUserCommand, AdminDeleteUserCommand, AdminDisableUserCommand, AdminEnableUserCommand, AdminListGroupsForUserCommand, AdminListGroupsForUserResponse, AdminResetUserPasswordCommand, CognitoIdentityProviderClient, CreateGroupCommand, DeleteGroupCommand, ListGroupsCommand, ListGroupsResponse, ListUsersCommand, ListUsersInGroupCommand, ListUsersInGroupResponse, ListUsersResponse, UserType } from "@aws-sdk/client-cognito-identity-provider";
import { User, Group } from "../../interfaces";

interface CreateUserParam {
    username: string,
    email: string,
}

interface CreateGroupParam {
    groupName: string,
    description?: string,
    precedence?: number,
    roleArn?: string,
  }

class UserPoolClient {
    private client: CognitoIdentityProviderClient;
    private userPoolId: string;

    constructor(credentials: ICredentials, userPoolId: string, region: string) {
        if (!credentials.authenticated) {
            console.error('unauthenticated');
            throw 'unauthenticated';
        }
        this.client = new CognitoIdentityProviderClient({
            region,
            credentials
        });
        this.userPoolId = userPoolId;
    }

    async createGroup(params: CreateGroupParam): Promise<Group> {
        const resp = await this.client.send(new CreateGroupCommand({
            UserPoolId: this.userPoolId,
            GroupName: params.groupName,
            Description: params.description,
            Precedence: params.precedence,
            RoleArn: params.roleArn,
        }));
        const newGroup = resp.Group!;
        return {
            groupName: newGroup.GroupName!,
            description: newGroup.Description,
            precedence: newGroup.Precedence,
            roleArn: newGroup.RoleArn,
            creationDate: newGroup.CreationDate,
            lastModifiedDate: newGroup.LastModifiedDate,
        };
    }

    async deleteGroup(groupName: string): Promise<void> {
        await this.client.send(new DeleteGroupCommand({
            UserPoolId: this.userPoolId,
            GroupName: groupName,
        }));
    }


    async createUser(params: CreateUserParam): Promise<User> {
        const resp = await this.client.send(new AdminCreateUserCommand({
            UserPoolId: this.userPoolId,
            Username: params.username,
            ForceAliasCreation: true,
            UserAttributes: [{
                Name: 'email',
                Value: params.email
            }],
        }));
        return this.userConversion([resp.User!])[0];
    }

    async deleteUser(username: string): Promise<void> {
        await this.client.send(new AdminDeleteUserCommand({
            UserPoolId: this.userPoolId,
            Username: username,
        }));
    }

    async enableUser(username: string): Promise<void> {
        await this.client.send(new AdminEnableUserCommand({
            UserPoolId: this.userPoolId,
            Username: username,
        }));
    }

    async disableUser(username: string): Promise<void> {
        await this.client.send(new AdminDisableUserCommand({
            UserPoolId: this.userPoolId,
            Username: username,
        }));
    }

    async resetUserPassword(username: string): Promise<void> {
        await this.client.send(new AdminResetUserPasswordCommand({
            UserPoolId: this.userPoolId,
            Username: username,
        }));
    }


    async listGroups(): Promise<Group[]> {
        let nextToken = undefined;
        let resps: ListGroupsResponse[] = [];
        do {
            const resp: ListGroupsResponse = await this.client.send(new ListGroupsCommand({
                UserPoolId: this.userPoolId,
                Limit: 60,
                NextToken: nextToken
            }));
            nextToken = resp.NextToken;
            resps.push(resp);
        } while (nextToken !== undefined);
        return resps
            .filter(resp => resp.Groups !== undefined && resp.Groups.length > 0)
            .map(resp => resp.Groups!.filter(group => group.GroupName !== undefined)
                .map(group => ({
                    groupName: group.GroupName!,
                    description: group.Description,
                    precedence: group.Precedence,
                    creationDate: group.CreationDate,
                    lastModifiedDate: group.LastModifiedDate,
                    roleArn: group.RoleArn,
                } as Group)))
            .reduce((cur, acc) => acc.concat(cur), []);
    }

    async listUsersInGroup(groupNName: string): Promise<User[]> {
        let nextToken = undefined;
        let resps: ListUsersInGroupResponse[] = [];
        do {
            const resp: ListUsersInGroupResponse = await this.client.send(new ListUsersInGroupCommand({
                GroupName: groupNName,
                UserPoolId: this.userPoolId,
                Limit: 60,
                NextToken: nextToken
            }));
            nextToken = resp.NextToken;
            resps.push(resp);
        } while (nextToken !== undefined);
        const users = resps
            .filter(resp => resp.Users !== undefined && resp.Users.length > 0)
            .map(resp => resp.Users!)
            .reduce((cur, acc) => acc.concat(cur), []);

        return this.userConversion(users, groupNName);
    }

    async listGroupsForUser(username: string): Promise<string[]> {
        let nextToken = undefined;
        let resps: AdminListGroupsForUserResponse[] = [];
        do {
            const resp: AdminListGroupsForUserResponse = await this.client.send(new AdminListGroupsForUserCommand({
                Username: username,
                UserPoolId: this.userPoolId,
                Limit: 60,
                NextToken: nextToken
            }));
            nextToken = resp.NextToken;
            resps.push(resp);
        } while (nextToken !== undefined);
        const groups = resps
            .filter(resp => resp.Groups !== undefined && resp.Groups.length > 0)
            .map(resp => resp.Groups!)
            .reduce((cur, acc) => acc.concat(cur), []);
        return groups.map(group => group.GroupName!);
    }

    async listUsers(): Promise<User[]> {
        let paginationToken = undefined;
        let resps: ListUsersResponse[] = [];
        do {
            const resp: ListUsersResponse = await this.client.send(new ListUsersCommand({
                UserPoolId: this.userPoolId,
                PaginationToken: paginationToken
            }));
            paginationToken = resp.PaginationToken;
            resps.push(resp);
        } while (paginationToken !== undefined);
        const users = resps
            .filter(resp => resp.Users !== undefined && resp.Users.length > 0)
            .map(resp => resp.Users!)
            .reduce((cur, acc) => acc.concat(cur), []);

        return this.userConversion(users);
    }

    private userConversion(users: UserType[], group: string | undefined = undefined): User[] {
        return users.map(user => {
            const attributes = user.Attributes?.filter(
                    attribute => attribute.Name !== undefined && attribute.Value !== undefined
                ).map(attribute => {
                    const entity: { [key: string]: string | undefined; } = {};
                    entity[attribute.Name!] = attribute.Value;
                    return entity;
                }).reduce((cur, acc) => ({ ...acc, ...cur })) || {};

            return ({
                email: attributes['email'],
                username: user.Username!,
                attributes: attributes,
                createdAt: user.UserCreateDate,
                lastModifiedAt: user.UserLastModifiedDate,
                enabled: `${user.Enabled !== undefined ? user.Enabled : true}`,
                status: user.UserStatus!,
                mfa: user.MFAOptions !== undefined ? user.MFAOptions.map(mfaOption => ({
                    deliveryMedium: mfaOption.DeliveryMedium,
                    ttributeName: mfaOption.AttributeName
                })) : [],
                group,
                groups: undefined
            } as User);
        });
    }
}

export default UserPoolClient;