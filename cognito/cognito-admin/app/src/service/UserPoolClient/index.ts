import { ICredentials } from '@aws-amplify/core';
import {
  AdminAddUserToGroupCommand, AdminCreateUserCommand, AdminDeleteUserCommand, AdminDisableUserCommand, AdminEnableUserCommand,
  AdminListGroupsForUserCommand, AdminListGroupsForUserResponse, AdminRemoveUserFromGroupCommand, AdminResetUserPasswordCommand,
  CognitoIdentityProviderClient, CreateGroupCommand, DeleteGroupCommand, ListGroupsCommand, ListGroupsResponse, ListUsersCommand,
  ListUsersInGroupCommand, ListUsersInGroupResponse, ListUsersResponse, UpdateGroupCommand, UserType,
} from '@aws-sdk/client-cognito-identity-provider';
import { User, Group } from '../../interfaces';

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

interface AddUserToGroupParam {
  groupName: string,
  username: string,
}

interface RemoveUserFromGroupParam {
  groupName: string,
  username: string,
}

class UserPoolClient {
  private client: CognitoIdentityProviderClient;

  private userPoolId: string;

  constructor(credentials: ICredentials, userPoolId: string, region: string) {
    if (!credentials.authenticated) {
      // eslint-disable-next-line no-console
      console.error('unauthenticated');
      throw Error('unauthenticated');
    }
    this.client = new CognitoIdentityProviderClient({
      region,
      credentials,
    });
    this.userPoolId = userPoolId;
  }

  private static userConversion(users: UserType[], group: string | undefined = undefined): User[] {
    return users.map((user) => {
      const attributes = user.Attributes?.filter(
        (attribute) => attribute.Name !== undefined && attribute.Value !== undefined,
      ).map((attribute) => {
        const entity: { [key: string]: string | undefined; } = {};
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        entity[attribute.Name!] = attribute.Value;
        return entity;
      }).reduce((cur, acc) => ({ ...acc, ...cur })) || {};

      return ({
        email: attributes.email,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        username: user.Username!,
        attributes,
        createdAt: user.UserCreateDate,
        lastModifiedAt: user.UserLastModifiedDate,
        enabled: `${user.Enabled !== undefined ? user.Enabled : true}`,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        status: user.UserStatus!,
        mfa: user.MFAOptions !== undefined ? user.MFAOptions.map((mfaOption) => ({
          deliveryMedium: mfaOption.DeliveryMedium,
          ttributeName: mfaOption.AttributeName,
        })) : [],
        group,
        groups: undefined,
      } as User);
    });
  }

  async createGroup(params: CreateGroupParam): Promise<Group> {
    const resp = await this.client.send(new CreateGroupCommand({
      UserPoolId: this.userPoolId,
      GroupName: params.groupName,
      Description: params.description,
      Precedence: params.precedence,
      RoleArn: params.roleArn,
    }));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const newGroup = resp.Group!;
    return {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      groupName: newGroup.GroupName!,
      description: newGroup.Description,
      precedence: newGroup.Precedence,
      roleArn: newGroup.RoleArn,
      creationDate: newGroup.CreationDate,
      lastModifiedDate: newGroup.LastModifiedDate,
    };
  }

  async updateGroup(group: Group): Promise<Group> {
    const resp = await this.client.send(new UpdateGroupCommand({
      UserPoolId: this.userPoolId,
      GroupName: group.groupName,
      Description: group.description,
      Precedence: group.precedence,
      RoleArn: group.roleArn,
    }));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const newGroup = resp.Group!;
    return {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      groupName: newGroup.GroupName!,
      description: newGroup.Description,
      precedence: newGroup.Precedence,
      roleArn: newGroup.RoleArn,
      creationDate: newGroup.CreationDate,
      lastModifiedDate: newGroup.LastModifiedDate,
    };
  }

  async deleteGroup(groupName: string): Promise<void> {
    Promise.resolve(await this.client.send(new DeleteGroupCommand({
      UserPoolId: this.userPoolId,
      GroupName: groupName,
    })));
  }

  async createUser(params: CreateUserParam): Promise<User> {
    const resp = await this.client.send(new AdminCreateUserCommand({
      UserPoolId: this.userPoolId,
      Username: params.username,
      ForceAliasCreation: true,
      UserAttributes: [{
        Name: 'email',
        Value: params.email,
      }],
    }));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return UserPoolClient.userConversion([resp.User!])[0];
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

  async addUserToGroup(params: AddUserToGroupParam): Promise<void> {
    await this.client.send(new AdminAddUserToGroupCommand({
      GroupName: params.groupName,
      Username: params.username,
      UserPoolId: this.userPoolId,
    }));
  }

  async removeUserFromGroup(params: RemoveUserFromGroupParam): Promise<void> {
    await this.client.send(new AdminRemoveUserFromGroupCommand({
      GroupName: params.groupName,
      Username: params.username,
      UserPoolId: this.userPoolId,
    }));
  }

  async listGroups(): Promise<Group[]> {
    let nextToken;
    const resps: ListGroupsResponse[] = [];
    const handler = (resp: ListGroupsResponse) => {
      nextToken = resp.NextToken;
      resps.push(resp);
    };
    do {
      this.client.send(new ListGroupsCommand({
        UserPoolId: this.userPoolId,
        Limit: 60,
        NextToken: nextToken,
      })).then(handler);
    } while (nextToken !== undefined);
    return resps
      .filter((resp) => resp.Groups !== undefined && resp.Groups.length > 0)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .map((resp) => resp.Groups!.filter((group) => group.GroupName !== undefined)
        .map((group) => ({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
    let nextToken;
    const resps: ListUsersInGroupResponse[] = [];
    const handler = (resp: ListUsersInGroupResponse) => {
      nextToken = resp.NextToken;
      resps.push(resp);
    };
    do {
      this.client.send(new ListUsersInGroupCommand({
        GroupName: groupNName,
        UserPoolId: this.userPoolId,
        Limit: 60,
        NextToken: nextToken,
      })).then(handler);
    } while (nextToken !== undefined);
    const users = resps
      .filter((resp) => resp.Users !== undefined && resp.Users.length > 0)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .map((resp) => resp.Users!)
      .reduce((cur, acc) => acc.concat(cur), []);

    return UserPoolClient.userConversion(users, groupNName);
  }

  async listGroupsForUser(username: string): Promise<string[]> {
    let nextToken;
    const resps: AdminListGroupsForUserResponse[] = [];
    const handler = (resp: AdminListGroupsForUserResponse) => {
      nextToken = resp.NextToken;
      resps.push(resp);
    };
    do {
      this.client.send(new AdminListGroupsForUserCommand({
        Username: username,
        UserPoolId: this.userPoolId,
        Limit: 60,
        NextToken: nextToken,
      })).then(handler);
    } while (nextToken !== undefined);
    const groups = resps
      .filter((resp) => resp.Groups !== undefined && resp.Groups.length > 0)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .map((resp) => resp.Groups!)
      .reduce((cur, acc) => acc.concat(cur), []);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return groups.map((group) => group.GroupName!);
  }

  async listUsers(): Promise<User[]> {
    let paginationToken;
    const resps: ListUsersResponse[] = [];
    const handler = (resp: ListUsersResponse) => {
      paginationToken = resp.PaginationToken;
      resps.push(resp);
    };
    do {
      this.client.send(new ListUsersCommand({
        UserPoolId: this.userPoolId,
        PaginationToken: paginationToken,
      })).then(handler);
    } while (paginationToken !== undefined);
    const users = resps
      .filter((resp) => resp.Users !== undefined && resp.Users.length > 0)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .map((resp) => resp.Users!)
      .reduce((cur, acc) => acc.concat(cur), []);

    return UserPoolClient.userConversion(users);
  }
}

export default UserPoolClient;
